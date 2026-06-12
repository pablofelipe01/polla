"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import {
  listMatches,
  listPredictions,
  upsertPrediction,
  validateCedula,
  type MatchRecord,
} from "@/lib/airtable"
import { computeMatchStatus, formatBogota, closeTimestamp } from "@/lib/match-status"

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type MatchStatus = "PROXIMO" | "ABIERTO" | "CERRADO" | "FINALIZADO"

export interface MatchWithStatus extends MatchRecord {
  status: MatchStatus
  kickoffBogota: string
  closeTimestampMs: number
}

export interface Winner {
  matchId: string
  rival: string
  phase: string
  kickoffBogota: string
  scoreCol: number
  scoreOpp: number
  winners: string[]
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
    const winners = preds
      .filter(
        (p) => p.GolesCol === m.GolesCol && p.GolesRival === m.GolesRival
      )
      .map((p) => p.NombreCompleto)

    results.push({
      matchId: m.id,
      rival: m.Rival,
      phase: m.Fase,
      kickoffBogota: formatBogota(m.FechaHoraUtc),
      scoreCol: m.GolesCol!,
      scoreOpp: m.GolesRival!,
      winners,
    })
  }
  return results
}

// ─── submitPrediction ─────────────────────────────────────────────────────────

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
  const { matchId, fullName, cedula, scoreCol, scoreOpp } = parsed.data

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
    await upsertPrediction({ matchId, fullName, cedula, scoreCol, scoreOpp })
    revalidatePath("/")
    return { ok: true }
  } catch (err) {
    console.error("[submitPrediction]", err)
    return { ok: false, error: "Error guardando el pronóstico. Intenta de nuevo." }
  }
}
