import "server-only"
import { unstable_cache } from "next/cache"
import { ApiError } from "@/types/errors"
import { traducirPais } from "@/lib/data/paises-es"

// ─── Cliente REST de Airtable (nuevo modelo) ──────────────────────────────────
// • Throttle ~4 req/s (límite 5/s por base) · retry con backoff en 429
// • Las relaciones son linked records: se leen/escriben como arrays de record IDs
// ──────────────────────────────────────────────────────────────────────────────

const AIRTABLE_URL = "https://api.airtable.com/v0"
const MIN_GAP_MS = 260

let lastReqAt = 0
async function throttle() {
  const wait = MIN_GAP_MS - (Date.now() - lastReqAt)
  if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait))
  lastReqAt = Date.now()
}

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
    if (attempt >= 5) throw new ApiError(429, "rate limit persistente tras 5 reintentos")
    const after = parseInt(res.headers.get("Retry-After") ?? "30", 10)
    await new Promise<void>((r) => setTimeout(r, after * 1000))
    return at<T>(path, method, body, attempt + 1)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "(sin cuerpo)")
    throw new ApiError(res.status, `${method} ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

interface ATRecord<F> {
  id: string
  createdTime: string
  fields: F
}
interface ATPage<F> {
  records: ATRecord<F>[]
  offset?: string
}

const base = () => process.env.AIRTABLE_BASE_ID

async function listAll<F>(
  table: string,
  formula?: string,
  sort?: { field: string; direction: "asc" | "desc" }
): Promise<ATRecord<F>[]> {
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
    const page = await at<ATPage<F>>(`${base()}/${table}?${q}`)
    all.push(...page.records)
    offset = page.offset
  } while (offset)
  return all
}

/** Consulta acotada: filtra en el servidor y devuelve como máximo `maxRecords`. */
async function listLimited<F>(
  table: string,
  formula: string,
  maxRecords: number
): Promise<ATRecord<F>[]> {
  const q = new URLSearchParams({
    pageSize: String(Math.min(maxRecords, 100)),
    maxRecords: String(maxRecords),
    filterByFormula: formula,
  })
  const page = await at<ATPage<F>>(`${base()}/${table}?${q}`)
  return page.records
}

async function createOne<F>(table: string, fields: Partial<F>): Promise<ATRecord<F>> {
  const res = await at<{ records: ATRecord<F>[] }>(`${base()}/${table}`, "POST", {
    records: [{ fields }],
  })
  return res.records[0]
}

async function updateOne<F>(
  table: string,
  id: string,
  fields: Partial<F>
): Promise<ATRecord<F>> {
  const res = await at<{ records: ATRecord<F>[] }>(`${base()}/${table}`, "PATCH", {
    records: [{ id, fields }],
  })
  return res.records[0]
}

async function deleteOne(table: string, id: string): Promise<void> {
  await at(`${base()}/${table}/${id}`, "DELETE")
}

async function getOne<F>(table: string, id: string): Promise<ATRecord<F> | null> {
  try {
    return await at<ATRecord<F>>(`${base()}/${table}/${id}`)
  } catch {
    return null
  }
}

// Helpers de linked records
const firstLink = (v: unknown): string | null =>
  Array.isArray(v) && v.length > 0 ? (v[0] as string) : null
const toLink = (id?: string | null): string[] => (id ? [id] : [])
const esc = (s: string) => s.replace(/"/g, "")

// ─── Caché de lecturas pesadas ───────────────────────────────────────────────
// Las listas completas (sobre todo Usuarios, ~2.179 filas ≈ 22 páginas con
// throttle) se cachean con la Data Cache de Next. En un acierto, la función
// envuelta NO se ejecuta: se evitan la paginación y los waits de throttle.
// Las mutaciones invalidan el tag correspondiente con revalidateTag.
export const CACHE_TAGS = {
  usuarios: "at:usuarios",
  equipos: "at:equipos",
  continentes: "at:continentes",
  encuentros: "at:encuentros",
  pronosticos: "at:pronosticos",
} as const

// ─── Tipos de dominio ──────────────────────────────────────────────────────────

export type Rol = "Admin" | "DT" | "CuerpoTecnico" | "Usuario"

export interface Continente {
  id: string
  Nombre: string
  DT: string
  CuerpoTecnico: string
  Activo: boolean
}
export interface Equipo {
  id: string
  Nombre: string
  ContinenteId: string | null
  Paises: string
  Activo: boolean
}
export interface Integrante {
  id: string
  Nombre: string
  Cedula: string
  EquipoId: string | null
}
export interface Usuario {
  id: string
  Email: string
  Cedula: string
  Nombre: string
  Rol: Rol
  EquipoId: string | null
  ContinenteId: string | null
  Activo: boolean
  PuedePronosticar: boolean
}
export interface Encuentro {
  id: string
  Local: string
  Visitante: string
  Fase: string
  FechaHoraUtc: string
  CierreUtc: string | null
  GolesLocal: number | null
  GolesVisitante: number | null
  ExternalId: string | null
  CreatedAt: string
}
export interface Pronostico {
  id: string
  Clave: string
  EncuentroId: string | null
  UsuarioId: string | null
  GolesLocal: number
  GolesVisitante: number
  RegistradoPor: string
  ActualizadoEn: string
}

// ─── Continentes ────────────────────────────────────────────────────────────────

type ContinenteFields = { Nombre: string; DT?: string; CuerpoTecnico?: string; Activo?: boolean }

const toContinente = (r: ATRecord<ContinenteFields>): Continente => ({
  id: r.id,
  Nombre: r.fields.Nombre ?? "",
  DT: r.fields.DT ?? "",
  CuerpoTecnico: r.fields.CuerpoTecnico ?? "",
  Activo: r.fields.Activo ?? false,
})

async function fetchContinentes(): Promise<Continente[]> {
  const recs = await listAll<ContinenteFields>("Continentes", undefined, {
    field: "Nombre",
    direction: "asc",
  })
  return recs.map(toContinente)
}
export const listContinentes = unstable_cache(fetchContinentes, ["at:listContinentes"], {
  tags: [CACHE_TAGS.continentes],
  revalidate: 600,
})
export async function createContinente(d: Omit<Continente, "id">): Promise<Continente> {
  return toContinente(await createOne<ContinenteFields>("Continentes", d))
}
export async function updateContinente(
  id: string,
  d: Partial<Omit<Continente, "id">>
): Promise<Continente> {
  return toContinente(await updateOne<ContinenteFields>("Continentes", id, d))
}
export async function deleteContinente(id: string): Promise<void> {
  await deleteOne("Continentes", id)
}

// ─── Equipos ─────────────────────────────────────────────────────────────────────

type EquipoFields = { Nombre: string; Continente?: string[]; Paises?: string; Activo?: boolean }

const toEquipo = (r: ATRecord<EquipoFields>): Equipo => ({
  id: r.id,
  // El nombre del equipo es el país que representa: se traduce al español en
  // la lectura (igual que toEncuentro) para mostrarlo localizado en todo el sitio.
  Nombre: traducirPais(r.fields.Nombre ?? ""),
  ContinenteId: firstLink(r.fields.Continente),
  Paises: r.fields.Paises ?? "",
  Activo: r.fields.Activo ?? false,
})

async function fetchEquipos(): Promise<Equipo[]> {
  const recs = await listAll<EquipoFields>("Equipos", undefined, {
    field: "Nombre",
    direction: "asc",
  })
  return recs.map(toEquipo)
}
export const listEquipos = unstable_cache(fetchEquipos, ["at:listEquipos"], {
  tags: [CACHE_TAGS.equipos],
  revalidate: 600,
})
export async function getEquipo(id: string): Promise<Equipo | null> {
  const r = await getOne<EquipoFields>("Equipos", id)
  return r ? toEquipo(r) : null
}
export async function createEquipo(d: {
  Nombre: string
  ContinenteId: string | null
  Paises: string
  Activo: boolean
}): Promise<Equipo> {
  return toEquipo(
    await createOne<EquipoFields>("Equipos", {
      Nombre: d.Nombre,
      Continente: toLink(d.ContinenteId),
      Paises: d.Paises,
      Activo: d.Activo,
    })
  )
}
export async function updateEquipo(
  id: string,
  d: Partial<{ Nombre: string; ContinenteId: string | null; Paises: string; Activo: boolean }>
): Promise<Equipo> {
  const fields: Partial<EquipoFields> = {}
  if (d.Nombre !== undefined) fields.Nombre = d.Nombre
  if (d.ContinenteId !== undefined) fields.Continente = toLink(d.ContinenteId)
  if (d.Paises !== undefined) fields.Paises = d.Paises
  if (d.Activo !== undefined) fields.Activo = d.Activo
  return toEquipo(await updateOne<EquipoFields>("Equipos", id, fields))
}
export async function deleteEquipo(id: string): Promise<void> {
  await deleteOne("Equipos", id)
}

// ─── Integrantes ──────────────────────────────────────────────────────────────────

type IntegranteFields = { Nombre: string; Cedula?: string; Equipo?: string[] }

const toIntegrante = (r: ATRecord<IntegranteFields>): Integrante => ({
  id: r.id,
  Nombre: r.fields.Nombre ?? "",
  Cedula: r.fields.Cedula ?? "",
  EquipoId: firstLink(r.fields.Equipo),
})

export async function listIntegrantes(): Promise<Integrante[]> {
  const recs = await listAll<IntegranteFields>("Integrantes")
  return recs.map(toIntegrante)
}
export async function listIntegrantesByEquipo(equipoId: string): Promise<Integrante[]> {
  const all = await listIntegrantes()
  return all.filter((i) => i.EquipoId === equipoId)
}
export async function createIntegrante(d: {
  Nombre: string
  Cedula: string
  EquipoId: string
}): Promise<Integrante> {
  return toIntegrante(
    await createOne<IntegranteFields>("Integrantes", {
      Nombre: d.Nombre,
      Cedula: d.Cedula,
      Equipo: toLink(d.EquipoId),
    })
  )
}
export async function deleteIntegrante(id: string): Promise<void> {
  await deleteOne("Integrantes", id)
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────────

type UsuarioFields = {
  Email: string
  Cedula?: string
  Nombre?: string
  Rol?: Rol
  Equipo?: string[]
  Continente?: string[]
  Activo?: boolean
  PuedePronosticar?: boolean
}

const toUsuario = (r: ATRecord<UsuarioFields>): Usuario => ({
  id: r.id,
  Email: r.fields.Email ?? "",
  Cedula: r.fields.Cedula ?? "",
  Nombre: r.fields.Nombre ?? "",
  Rol: (r.fields.Rol as Rol) ?? "Usuario",
  EquipoId: firstLink(r.fields.Equipo),
  ContinenteId: firstLink(r.fields.Continente),
  Activo: r.fields.Activo ?? false,
  PuedePronosticar: r.fields.PuedePronosticar ?? false,
})

export async function findUsuarioByEmail(email: string): Promise<Usuario | null> {
  const recs = await listAll<UsuarioFields>("Usuarios", `LOWER({Email})="${esc(email).toLowerCase()}"`)
  return recs.length ? toUsuario(recs[0]) : null
}

/** Busca un usuario por número de cédula (login sin contraseña). */
export async function findUsuarioByCedula(cedula: string): Promise<Usuario | null> {
  const recs = await listAll<UsuarioFields>("Usuarios", `{Cedula}="${esc(cedula.trim())}"`)
  return recs.length ? toUsuario(recs[0]) : null
}
async function fetchUsuarios(): Promise<Usuario[]> {
  const recs = await listAll<UsuarioFields>("Usuarios")
  return recs.map(toUsuario)
}
/**
 * Lista todos los usuarios (~2.179). Cacheado con tag `usuarios` para evitar
 * repaginar en cada carga. Se invalida con `revalidateTag(CACHE_TAGS.usuarios)`
 * al crear/editar/eliminar/asignar usuarios.
 */
export const listUsuarios = unstable_cache(fetchUsuarios, ["at:listUsuarios"], {
  tags: [CACHE_TAGS.usuarios],
  revalidate: 600,
})

/** Lee un único usuario por su record ID (1 request, sin paginar). */
export async function getUsuario(id: string): Promise<Usuario | null> {
  const r = await getOne<UsuarioFields>("Usuarios", id)
  return r ? toUsuario(r) : null
}
/**
 * Cuenta usuarios habilitados para pronósticos en un equipo (máx 2).
 * Consulta filtrada en el servidor (getEquipo + miembros del equipo) en lugar
 * de escanear toda la tabla de usuarios. Siempre fresco: es el guard del límite.
 */
export async function countHabilitadosByEquipo(equipoId: string): Promise<number> {
  const equipo = await getEquipo(equipoId)
  if (!equipo) return 0
  const miembros = await listUsuariosByEquipoNombre(equipo.Nombre)
  return miembros.filter((u) => u.PuedePronosticar).length
}
export async function createUsuario(d: {
  Cedula: string
  Nombre: string
  Rol: Rol
  EquipoId: string | null
  ContinenteId: string | null
  Activo: boolean
  PuedePronosticar?: boolean
}): Promise<Usuario> {
  return toUsuario(
    await createOne<UsuarioFields>("Usuarios", {
      Email: d.Cedula,
      Cedula: d.Cedula,
      Nombre: d.Nombre,
      Rol: d.Rol,
      Equipo: toLink(d.EquipoId),
      Continente: toLink(d.ContinenteId),
      Activo: d.Activo,
      PuedePronosticar: d.PuedePronosticar ?? false,
    })
  )
}
export async function updateUsuario(
  id: string,
  d: Partial<{
    Nombre: string
    Cedula: string
    Rol: Rol
    EquipoId: string | null
    ContinenteId: string | null
    Activo: boolean
    PuedePronosticar: boolean
  }>
): Promise<Usuario> {
  const fields: Partial<UsuarioFields> = {}
  if (d.Nombre !== undefined) fields.Nombre = d.Nombre
  if (d.Cedula !== undefined) { fields.Cedula = d.Cedula; fields.Email = d.Cedula }
  if (d.Rol !== undefined) fields.Rol = d.Rol
  if (d.EquipoId !== undefined) fields.Equipo = toLink(d.EquipoId)
  if (d.ContinenteId !== undefined) fields.Continente = toLink(d.ContinenteId)
  if (d.Activo !== undefined) fields.Activo = d.Activo
  if (d.PuedePronosticar !== undefined) fields.PuedePronosticar = d.PuedePronosticar
  return toUsuario(await updateOne<UsuarioFields>("Usuarios", id, fields))
}
export async function deleteUsuario(id: string): Promise<void> {
  await deleteOne("Usuarios", id)
}

export async function listUsuariosByEquipo(equipoId: string): Promise<Usuario[]> {
  const all = await listUsuarios()
  return all.filter((u) => u.EquipoId === equipoId)
}

/**
 * Lista los miembros de un equipo filtrando en el servidor por el nombre del
 * equipo (campo vinculado). Evita descargar toda la tabla de usuarios.
 *
 * @param nombre - Nombre del equipo (campo primario, único = país)
 */
export async function listUsuariosByEquipoNombre(nombre: string): Promise<Usuario[]> {
  const recs = await listAll<UsuarioFields>("Usuarios", `ARRAYJOIN({Equipo})="${esc(nombre)}"`)
  return recs.map(toUsuario)
}

/**
 * Busca usuarios por nombre o cédula filtrando en el servidor (máx. `limit`).
 * Devuelve [] si la consulta tiene menos de 2 caracteres.
 *
 * @param query - Texto de búsqueda (nombre o cédula)
 * @param limit - Máximo de resultados a traer
 */
export async function searchUsuarios(query: string, limit = 25): Promise<Usuario[]> {
  const raw = query.trim()
  if (raw.length < 2) return []
  const q = esc(raw)
  const ql = esc(raw.toLowerCase())
  const formula = `OR(FIND("${ql}", LOWER({Nombre})), FIND("${q}", {Cedula} & ""))`
  const recs = await listLimited<UsuarioFields>("Usuarios", formula, limit)
  return recs.map(toUsuario)
}

/**
 * Devuelve una página de usuarios ordenados por nombre, para navegar sin
 * descargar toda la tabla. `offset` encadena la siguiente página.
 */
export async function listUsuariosPagina(
  offset?: string,
  pageSize = 50
): Promise<{ usuarios: Usuario[]; offset?: string }> {
  const q = new URLSearchParams({ pageSize: String(pageSize) })
  q.set("sort[0][field]", "Nombre")
  q.set("sort[0][direction]", "asc")
  if (offset) q.set("offset", offset)
  const page = await at<ATPage<UsuarioFields>>(`${base()}/Usuarios?${q}`)
  return { usuarios: page.records.map(toUsuario), offset: page.offset }
}

export async function listUsuariosSinEquipo(): Promise<Usuario[]> {
  const all = await listUsuarios()
  return all.filter((u) => !u.EquipoId && u.Activo)
}

// ─── Encuentros ───────────────────────────────────────────────────────────────────

type EncuentroFields = {
  Local: string
  Visitante?: string
  Fase?: string
  FechaHoraUtc?: string
  CierreUtc?: string
  GolesLocal?: number | null
  GolesVisitante?: number | null
  ExternalId?: string
}

const toEncuentro = (r: ATRecord<EncuentroFields>): Encuentro => ({
  id: r.id,
  Local: traducirPais(r.fields.Local ?? ""),
  Visitante: traducirPais(r.fields.Visitante ?? ""),
  Fase: r.fields.Fase ?? "",
  FechaHoraUtc: r.fields.FechaHoraUtc ?? "",
  CierreUtc: r.fields.CierreUtc ?? null,
  GolesLocal: r.fields.GolesLocal ?? null,
  GolesVisitante: r.fields.GolesVisitante ?? null,
  ExternalId: r.fields.ExternalId ?? null,
  CreatedAt: r.createdTime,
})

async function fetchEncuentros(): Promise<Encuentro[]> {
  const recs = await listAll<EncuentroFields>("Encuentros")
  return recs
    .map(toEncuentro)
    .sort((a, b) => new Date(a.FechaHoraUtc).getTime() - new Date(b.FechaHoraUtc).getTime())
}
export const listEncuentros = unstable_cache(fetchEncuentros, ["at:listEncuentros"], {
  tags: [CACHE_TAGS.encuentros],
  revalidate: 600,
})
export async function getEncuentro(id: string): Promise<Encuentro | null> {
  const r = await getOne<EncuentroFields>("Encuentros", id)
  return r ? toEncuentro(r) : null
}
export async function createEncuentro(d: {
  Local: string
  Visitante: string
  Fase: string
  FechaHoraUtc: string
  CierreUtc: string | null
  ExternalId?: string
}): Promise<Encuentro> {
  return toEncuentro(
    await createOne<EncuentroFields>("Encuentros", {
      Local: d.Local,
      Visitante: d.Visitante,
      Fase: d.Fase,
      FechaHoraUtc: d.FechaHoraUtc,
      CierreUtc: d.CierreUtc ?? undefined,
      GolesLocal: null,
      GolesVisitante: null,
      ExternalId: d.ExternalId,
    })
  )
}
export async function updateEncuentro(
  id: string,
  d: Partial<{
    Local: string
    Visitante: string
    Fase: string
    FechaHoraUtc: string
    CierreUtc: string | null
    GolesLocal: number | null
    GolesVisitante: number | null
    ExternalId: string
  }>
): Promise<Encuentro> {
  return toEncuentro(await updateOne<EncuentroFields>("Encuentros", id, d as Partial<EncuentroFields>))
}

/** Busca un encuentro por su ExternalId (ID del partido en football-data.org). */
export async function findEncuentroByExternalId(externalId: string): Promise<Encuentro | null> {
  const recs = await listAll<EncuentroFields>("Encuentros", `{ExternalId}="${esc(externalId)}"`)
  return recs.length ? toEncuentro(recs[0]) : null
}
/** Devuelve los nombres únicos de todos los países participantes (de Local + Visitante). */
export async function listPaisesMundial(): Promise<string[]> {
  const encuentros = await listEncuentros()
  const set = new Set<string>()
  for (const e of encuentros) {
    if (e.Local) set.add(e.Local)
    if (e.Visitante) set.add(e.Visitante)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

export async function deleteEncuentro(id: string): Promise<void> {
  const pe = await listPronosticosByEncuentro(id)
  for (const p of pe) await deleteOne("PronosticosPaises", p.id)
  await deleteOne("Encuentros", id)
}

// ─── PronosticosPaises ─────────────────────────────────────────────────────────────

type PronosticoFields = {
  Clave: string
  Encuentro?: string[]
  UsuarioId?: string
  GolesLocal?: number
  GolesVisitante?: number
  RegistradoPor?: string
}

const toPronostico = (r: ATRecord<PronosticoFields>): Pronostico => ({
  id: r.id,
  Clave: r.fields.Clave ?? "",
  EncuentroId: firstLink(r.fields.Encuentro),
  UsuarioId: r.fields.UsuarioId ?? null,
  GolesLocal: r.fields.GolesLocal ?? 0,
  GolesVisitante: r.fields.GolesVisitante ?? 0,
  RegistradoPor: r.fields.RegistradoPor ?? "",
  ActualizadoEn: r.createdTime,
})

async function fetchPronosticos(): Promise<Pronostico[]> {
  const recs = await listAll<PronosticoFields>("PronosticosPaises")
  return recs.map(toPronostico)
}
export const listPronosticos = unstable_cache(fetchPronosticos, ["at:listPronosticos"], {
  tags: [CACHE_TAGS.pronosticos],
  revalidate: 600,
})
export async function listPronosticosByEncuentro(encuentroId: string): Promise<Pronostico[]> {
  // Clave = `${encuentroId}_${usuarioId}` → filtramos por prefijo con la fórmula de Airtable.
  const recs = await listAll<PronosticoFields>(
    "PronosticosPaises",
    `LEFT({Clave}, ${encuentroId.length + 1})="${esc(encuentroId)}_"`
  )
  return recs.map(toPronostico)
}

/** Upsert por clave `${encuentroId}_${usuarioId}` — garantiza un único pronóstico por usuario/encuentro. */
export async function upsertPronostico(d: {
  encuentroId: string
  usuarioId: string
  golesLocal: number
  golesVisitante: number
  registradoPor: string
}): Promise<Pronostico> {
  const clave = `${d.encuentroId}_${d.usuarioId}`
  const existing = await listAll<PronosticoFields>("PronosticosPaises", `{Clave}="${esc(clave)}"`)
  if (existing.length) {
    return toPronostico(
      await updateOne<PronosticoFields>("PronosticosPaises", existing[0].id, {
        GolesLocal: d.golesLocal,
        GolesVisitante: d.golesVisitante,
        RegistradoPor: d.registradoPor,
      })
    )
  }
  return toPronostico(
    await createOne<PronosticoFields>("PronosticosPaises", {
      Clave: clave,
      Encuentro: toLink(d.encuentroId),
      UsuarioId: d.usuarioId,
      GolesLocal: d.golesLocal,
      GolesVisitante: d.golesVisitante,
      RegistradoPor: d.registradoPor,
    })
  )
}
