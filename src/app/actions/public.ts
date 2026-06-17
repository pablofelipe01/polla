"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import {
  listMatches,
  listPredictions,
  upsertPrediction,
  validateCedula,
  lookupEmployee,
  upsertFinalistPrediction,
  getFinalistPrediction,
  type MatchRecord,
  type Sede,
} from "@/lib/airtable"
import { computeMatchStatus, formatBogota, closeTimestamp } from "@/lib/match-status"

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type MatchStatus = "PROXIMO" | "ABIERTO" | "CERRADO" | "FINALIZADO"

export interface MatchWithStatus extends MatchRecord {
  status: MatchStatus
  kickoffBogota: string
  closeTimestampMs: number
}

export interface WinnerEntry {
  name: string
  sede: Sede
}

export interface Winner {
  matchId: string
  rival: string
  phase: string
  kickoffBogota: string
  scoreCol: number
  scoreOpp: number
  totalCorrect: number                        // total de aciertos
  allCorrect: WinnerEntry[]                   // todos los que acertaron
  sedeWinners: WinnerEntry[]                  // ganadores por sede (≤3 Forzosa / ≤1 Brisas-Guadualito)
  sedeTotals: Partial<Record<Sede, number>>   // candidatos por sede antes del sorteo
}

// ─── Límites de premios por sede ─────────────────────────────────────────────

const SEDE_MAX: Partial<Record<Sede, number>> = { FORZOSA: 3, BRISAS: 1, GUADUALITO: 1, GENERAL: 20 }

// Sorteo determinístico: misma semilla → mismo resultado en cada carga
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(1664525, h) + 1013904223 | 0
    const j = (h >>> 0) % (i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─── lookupParticipant ────────────────────────────────────────────────────────

export type LookupResult =
  | { status: "found"; fullName: string; sede: Sede }
  | { status: "not_found" }
  | { status: "roster_disabled" }
  | { status: "api_error"; message: string }

export async function lookupParticipant(cedula: string): Promise<LookupResult> {
  if (process.env.VALIDATE_ROSTER !== "true") return { status: "roster_disabled" }
  try {
    const employee = await lookupEmployee(cedula)
    if (!employee) return { status: "not_found" }
    return { status: "found", fullName: employee.fullName, sede: employee.sede }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { status: "api_error", message }
  }
}

// ─── getMatches ───────────────────────────────────────────────────────────────

export async function getMatches(): Promise<MatchWithStatus[]> {
  const matches = await listMatches()
  return matches.map((m) => ({
    ...m,
    status: computeMatchStatus(m.FechaHoraUtc, m.GolesCol, m.GolesRival),
    kickoffBogota: formatBogota(m.FechaHoraUtc),
    closeTimestampMs: closeTimestamp(m.FechaHoraUtc),
  }))
}

// ─── getWinners ───────────────────────────────────────────────────────────────

export async function getWinners(): Promise<Winner[]> {
  const matches = await listMatches()
  const finished = matches.filter(
    (m) => m.GolesCol !== null && m.GolesRival !== null
  )

  const results: Winner[] = []
  for (const m of finished) {
    const preds = await listPredictions(m.id)
    const allCorrect: WinnerEntry[] = preds
      .filter((p) => p.GolesCol === m.GolesCol && p.GolesRival === m.GolesRival)
      .map((p) => ({ name: p.NombreCompleto, sede: p.Sede }))

    // Sorteo por sede: barajar candidatos de cada sede con semilla, tomar los primeros N
    const sedeWinners: WinnerEntry[] = []
    const sedeTotals: Partial<Record<Sede, number>> = {}
    for (const [sede, max] of Object.entries(SEDE_MAX) as [Sede, number][]) {
      const candidates = allCorrect.filter((w) => w.sede === sede)
      sedeTotals[sede as Sede] = candidates.length
      sedeWinners.push(...seededShuffle(candidates, m.id + sede).slice(0, max))
    }

    results.push({
      matchId: m.id,
      rival: m.Rival,
      phase: m.Fase,
      kickoffBogota: formatBogota(m.FechaHoraUtc),
      scoreCol: m.GolesCol!,
      scoreOpp: m.GolesRival!,
      totalCorrect: allCorrect.length,
      allCorrect,
      sedeWinners,
      sedeTotals,
    })
  }
  return results
}

// ─── submitPrediction ─────────────────────────────────────────────────────────

const SEDES = ["FORZOSA", "BRISAS", "GUADUALITO", "GENERAL"] as const

const PredictionSchema = z.object({
  matchId: z.string().min(1, "matchId requerido"),
  fullName: z
    .string()
    .trim()
    .min(1)
    .refine(
      (v) => v.trim().split(/\s+/).filter(Boolean).length >= 2,
      "Ingresa tu nombre completo (mínimo dos palabras)"
    ),
  cedula: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "La cédula debe ser numérica (6-12 dígitos)"),
  sede: z.enum(SEDES).default("GENERAL"),
  scoreCol: z.coerce.number().int().min(0).max(20),
  scoreOpp: z.coerce.number().int().min(0).max(20),
})

export type PredictionInput = z.infer<typeof PredictionSchema>

export interface SubmitResult {
  ok: boolean
  error?: string
}

export async function submitPrediction(
  input: PredictionInput
): Promise<SubmitResult> {
  // 1. Validar payload
  const parsed = PredictionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }
  const { matchId, fullName, cedula, sede, scoreCol, scoreOpp } = parsed.data

  // 2. Verificar cédula en nómina (si VALIDATE_ROSTER=true)
  const cedulaValid = await validateCedula(cedula)
  if (!cedulaValid) {
    return { ok: false, error: "Tu cédula no aparece en la nómina de Guaicaramo. Comunícate con Bienestar Social." }
  }

  // 3. Re-verificar estado del partido en servidor
  const { getMatch } = await import("@/lib/airtable")
  const match = await getMatch(matchId)
  if (!match) return { ok: false, error: "Partido no encontrado" }

  const status = computeMatchStatus(match.FechaHoraUtc, match.GolesCol, match.GolesRival)
  if (status !== "ABIERTO") {
    return {
      ok: false,
      error:
        status === "PROXIMO"
          ? "Las apuestas aún no han abierto para este partido"
          : status === "CERRADO"
          ? "Las apuestas para este partido ya cerraron"
          : "Este partido ya finalizó",
    }
  }

  // 4. Guardar o actualizar pronóstico (permitido mientras el partido esté ABIERTO)
  try {
    await upsertPrediction({ matchId, fullName, cedula, sede, scoreCol, scoreOpp })
    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    console.error("[submitPrediction]", err)
    return { ok: false, error: "Error guardando el pronóstico. Intenta de nuevo." }
  }
}

// ─── Finalistas ───────────────────────────────────────────────────────────────

// Cierre: 27 jun 2026 23:59:59 Colombia (UTC-5) = 28 jun 04:59:59 UTC
const FINALIST_CLOSE_MS = new Date("2026-06-28T04:59:59Z").getTime()

const FinalistSchema = z.object({
  cedula:    z.string().trim().regex(/^\d{6,12}$/),
  fullName:  z.string().trim().min(2),
  sede:      z.enum(["FORZOSA", "BRISAS", "GUADUALITO", "GENERAL"] as const).default("GENERAL"),
  finalist1: z.string().min(1, "Elige el primer finalista"),
  finalist2: z.string().min(1, "Elige el segundo finalista"),
}).refine((d) => d.finalist1 !== d.finalist2, {
  message: "Los dos finalistas deben ser diferentes",
  path: ["finalist2"],
})

export type FinalistInput = z.infer<typeof FinalistSchema>

export async function submitFinalistPrediction(input: FinalistInput): Promise<SubmitResult> {
  if (Date.now() > FINALIST_CLOSE_MS) {
    return { ok: false, error: "La apuesta de finalistas ya cerró el 27 de junio." }
  }

  const parsed = FinalistSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message }
  }

  const { cedula, fullName, sede, finalist1, finalist2 } = parsed.data

  const cedulaValid = await validateCedula(cedula)
  if (!cedulaValid) {
    return { ok: false, error: "Tu cédula no aparece en la nómina. Comunícate con Gestión Humana." }
  }

  try {
    await upsertFinalistPrediction({ cedula, fullName, sede, finalist1, finalist2 })
    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    console.error("[submitFinalistPrediction]", err)
    return { ok: false, error: "Error guardando. Intenta de nuevo." }
  }
}

export async function getMyFinalistPrediction(
  cedula: string
): Promise<{ finalist1: string; finalist2: string } | null> {
  const rec = await getFinalistPrediction(cedula)
  if (!rec) return null
  return { finalist1: rec.Finalista1, finalist2: rec.Finalista2 }
}
