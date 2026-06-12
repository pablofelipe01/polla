import "server-only"

// ─── Airtable REST client ────────────────────────────────────────────────────
// • Throttle: ~4 req/s (conservador frente al límite de 5/s por base)
// • Reintento automático con backoff en HTTP 429
// • Toda mutación de pronósticos usa patrón buscar→upsert
// ─────────────────────────────────────────────────────────────────────────────

const AIRTABLE_URL = "https://api.airtable.com/v0"
const MIN_GAP_MS = 260 // ≈ 4 req/s

let lastReqAt = 0

async function throttle() {
  const wait = MIN_GAP_MS - (Date.now() - lastReqAt)
  if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait))
  lastReqAt = Date.now()
}

// ─── Core fetch ──────────────────────────────────────────────────────────────

async function at<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown,
  attempt = 0
): Promise<T> {
  await throttle()

  const url = path.startsWith("http") ? path : `${AIRTABLE_URL}/${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  if (res.status === 429) {
    if (attempt >= 5) throw new Error("Airtable: rate limit persistente tras 5 reintentos")
    const after = parseInt(res.headers.get("Retry-After") ?? "30", 10)
    await new Promise<void>((r) => setTimeout(r, after * 1000))
    return at<T>(path, method, body, attempt + 1)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "(sin cuerpo)")
    throw new Error(`Airtable ${res.status} en ${method} ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Generic list con paginación ─────────────────────────────────────────────

interface ATRecord<F> {
  id: string
  createdTime: string
  fields: F
}
interface ATPage<F> {
  records: ATRecord<F>[]
  offset?: string
}

async function listAll<F>(
  table: string,
  formula?: string,
  sort?: { field: string; direction: "asc" | "desc" }
): Promise<ATRecord<F>[]> {
  const base = process.env.AIRTABLE_BASE_ID
  const all: ATRecord<F>[] = []
  let offset: string | undefined

  do {
    const q = new URLSearchParams({ pageSize: "100" })
    if (formula) q.set("filterByFormula", formula)
    if (sort) {
      q.set("sort[0][field]", sort.field)
      q.set("sort[0][direction]", sort.direction)
    }
    if (offset) q.set("offset", offset)
    const page = await at<ATPage<F>>(`${base}/${table}?${q}`)
    all.push(...page.records)
    offset = page.offset
  } while (offset)

  return all
}

async function createOne<F>(table: string, fields: Partial<F>): Promise<ATRecord<F>> {
  const base = process.env.AIRTABLE_BASE_ID
  const res = await at<{ records: ATRecord<F>[] }>(
    `${base}/${table}`,
    "POST",
    { records: [{ fields }] }
  )
  return res.records[0]
}

async function updateOne<F>(
  table: string,
  id: string,
  fields: Partial<F>
): Promise<ATRecord<F>> {
  const base = process.env.AIRTABLE_BASE_ID
  const res = await at<{ records: ATRecord<F>[] }>(
    `${base}/${table}`,
    "PATCH",
    { records: [{ id, fields }] }
  )
  return res.records[0]
}

async function deleteOne(table: string, id: string): Promise<void> {
  const base = process.env.AIRTABLE_BASE_ID
  await at(`${base}/${table}/${id}`, "DELETE")
}

async function deleteBatch(table: string, ids: string[]): Promise<void> {
  const base = process.env.AIRTABLE_BASE_ID
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10)
    const q = new URLSearchParams()
    chunk.forEach((id) => q.append("records[]", id))
    await at(`${base}/${table}?${q}`, "DELETE")
  }
}

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export interface AdminRecord {
  id: string
  Email: string
  HashContrasena: string
  Nombre: string
}

export interface MatchRecord {
  id: string
  Rival: string
  Fase: string
  EsLocal: boolean
  FechaHoraUtc: string
  GolesCol: number | null
  GolesRival: number | null
  CreatedAt: string
}

export interface PredictionRecord {
  id: string
  IdPartido: string
  NombreCompleto: string
  Cedula: string
  GolesCol: number
  GolesRival: number
  ActualizadoEn: string
}

// Tipos de campos Airtable (sin id/timestamps)
type AdminFields = {
  Email: string
  HashContrasena: string
  Nombre: string
}

type MatchFields = {
  Rival: string
  Fase: string
  EsLocal: boolean
  FechaHoraUtc: string
  GolesCol: number | null
  GolesRival: number | null
}

type PredictionFields = {
  IdPartido: string
  NombreCompleto: string
  Cedula: string
  GolesCol: number
  GolesRival: number
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function findAdminByEmail(email: string): Promise<AdminRecord | null> {
  const safe = email.replace(/"/g, "")
  const recs = await listAll<AdminFields>("Admin", `{Email}="${safe}"`)
  if (!recs.length) return null
  const { id, fields } = recs[0]
  return {
    id,
    Email: fields.Email,
    HashContrasena: fields.HashContrasena,
    Nombre: fields.Nombre,
  }
}

export async function upsertAdmin(
  email: string,
  passwordHash: string,
  name: string
): Promise<void> {
  const existing = await findAdminByEmail(email)
  if (existing) {
    await updateOne<AdminFields>("Admin", existing.id, {
      HashContrasena: passwordHash,
      Nombre: name,
    })
  } else {
    await createOne<AdminFields>("Admin", {
      Email: email,
      HashContrasena: passwordHash,
      Nombre: name,
    })
  }
}

// ─── Partidos ──────────────────────────────────────────────────────────────────

function toMatch(r: ATRecord<MatchFields>): MatchRecord {
  return {
    id: r.id,
    Rival: r.fields.Rival ?? "",
    Fase: r.fields.Fase ?? "",
    EsLocal: r.fields.EsLocal ?? false,
    FechaHoraUtc: r.fields.FechaHoraUtc ?? "",
    GolesCol: r.fields.GolesCol ?? null,
    GolesRival: r.fields.GolesRival ?? null,
    CreatedAt: r.createdTime,
  }
}

export async function listMatches(): Promise<MatchRecord[]> {
  const recs = await listAll<MatchFields>("Partidos")
  return recs
    .map(toMatch)
    .sort((a, b) => new Date(a.FechaHoraUtc).getTime() - new Date(b.FechaHoraUtc).getTime())
}

export async function getMatch(id: string): Promise<MatchRecord | null> {
  const base = process.env.AIRTABLE_BASE_ID
  try {
    const r = await at<ATRecord<MatchFields>>(`${base}/Partidos/${id}`)
    return toMatch(r)
  } catch {
    return null
  }
}

export async function createMatch(
  data: Omit<MatchRecord, "id" | "CreatedAt">
): Promise<MatchRecord> {
  const r = await createOne<MatchFields>("Partidos", {
    Rival: data.Rival,
    Fase: data.Fase,
    EsLocal: data.EsLocal,
    FechaHoraUtc: data.FechaHoraUtc,
    GolesCol: data.GolesCol,
    GolesRival: data.GolesRival,
  })
  return toMatch(r)
}

export async function updateMatch(
  id: string,
  data: Partial<Omit<MatchRecord, "id" | "CreatedAt">>
): Promise<MatchRecord> {
  const r = await updateOne<MatchFields>("Partidos", id, data as Partial<MatchFields>)
  return toMatch(r)
}

export async function deleteMatch(id: string): Promise<void> {
  const preds = await listAll<PredictionFields>("Pronosticos", `{IdPartido}="${id}"`)
  if (preds.length) {
    await deleteBatch("Pronosticos", preds.map((p) => p.id))
  }
  await deleteOne("Partidos", id)
}

// ─── Pronósticos ──────────────────────────────────────────────────────────────

function toPrediction(r: ATRecord<PredictionFields>): PredictionRecord {
  return {
    id: r.id,
    IdPartido: r.fields.IdPartido,
    NombreCompleto: r.fields.NombreCompleto,
    Cedula: r.fields.Cedula,
    GolesCol: r.fields.GolesCol,
    GolesRival: r.fields.GolesRival,
    ActualizadoEn: r.createdTime,
  }
}

export async function upsertPrediction(data: {
  matchId: string
  fullName: string
  cedula: string
  scoreCol: number
  scoreOpp: number
}): Promise<PredictionRecord> {
  const safeCedula = data.cedula.replace(/"/g, "")
  const formula = `AND({IdPartido}="${data.matchId}", {Cedula}="${safeCedula}")`
  const existing = await listAll<PredictionFields>("Pronosticos", formula)

  if (existing.length) {
    const r = await updateOne<PredictionFields>("Pronosticos", existing[0].id, {
      NombreCompleto: data.fullName,
      GolesCol: data.scoreCol,
      GolesRival: data.scoreOpp,
    })
    return toPrediction(r)
  }

  const r = await createOne<PredictionFields>("Pronosticos", {
    IdPartido: data.matchId,
    NombreCompleto: data.fullName,
    Cedula: data.cedula,
    GolesCol: data.scoreCol,
    GolesRival: data.scoreOpp,
  })
  return toPrediction(r)
}

export async function listPredictions(matchId: string): Promise<PredictionRecord[]> {
  const recs = await listAll<PredictionFields>(
    "Pronosticos",
    `{IdPartido}="${matchId}"`
  )
  return recs.map(toPrediction)
}

export async function listAllPredictions(): Promise<PredictionRecord[]> {
  const recs = await listAll<PredictionFields>("Pronosticos")
  return recs.map(toPrediction)
}

// ─── Roster (opcional, detrás de VALIDATE_ROSTER=true) ───────────────────────

export async function validateCedula(cedula: string): Promise<boolean> {
  if (process.env.VALIDATE_ROSTER !== "true") return true
  const rosterId = process.env.ROSTER_BASE_ID
  if (!rosterId) return true

  const safeCedula = cedula.replace(/"/g, "")
  try {
    const q = new URLSearchParams({
      filterByFormula: `{Cédula}="${safeCedula}"`,
      pageSize: "1",
    })
    const res = await at<ATPage<Record<string, unknown>>>(
      `${rosterId}/Colaboradores?${q}`
    )
    return res.records.length > 0
  } catch {
    return true // falla abierta: si no se puede consultar, no bloquear
  }
}
