"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth, isAdmin, signIn, signOut } from "@/lib/auth"
import { AuthError } from "next-auth"
import {
  listMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatch,
  updateMatch as updateMatchResult,
  listPredictions,
  listAllPredictions,
  type MatchRecord,
} from "@/lib/airtable"
import { computeMatchStatus, formatBogota } from "@/lib/match-status"
import { DateTime } from "luxon"

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth()
  if (!isAdmin(session)) throw new Error("No autorizado")
  return session
}

// ─── Login / Logout ───────────────────────────────────────────────────────────

export interface LoginState {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" }
    }
    throw err // Re-lanzar errores de redirect
  }
  return {}
}

export async function logoutAction() {
  await signOut({ redirectTo: "/admin/login" })
}

// ─── Match CRUD ───────────────────────────────────────────────────────────────

function normalizeUtcDate(raw: string): string {
  // datetime-local da YYYY-MM-DDTHH:mm en hora Colombia → convertir a UTC
  if (!raw) return raw
  const s = raw.trim()
  if (s.endsWith("Z") || s.includes("+")) return s
  const bogota = DateTime.fromISO(s, { zone: "America/Bogota" })
  if (!bogota.isValid) return s
  return bogota.toUTC().toISO({ suppressMilliseconds: false }) ?? s
}

const MatchSchema = z.object({
  Rival: z.string().trim().min(1, "El rival es requerido"),
  Fase: z.string().trim().min(1, "La fase es requerida"),
  EsLocal: z.coerce.boolean(),
  FechaHoraUtc: z
    .string()
    .transform(normalizeUtcDate)
    .pipe(
      z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          "Fecha/hora inválida (usa formato YYYY-MM-DDTHH:mm)"
        )
    ),
})

type MatchInput = z.infer<typeof MatchSchema>

export interface MatchActionState {
  error?: string
  success?: boolean
}

export async function createMatchAction(
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  await requireAdmin()

  const raw: MatchInput = {
    Rival: formData.get("Rival") as string,
    Fase: formData.get("Fase") as string,
    EsLocal: formData.get("EsLocal") === "true",
    FechaHoraUtc: formData.get("FechaHoraUtc") as string,
  }

  const parsed = MatchSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await createMatch({
      Rival: parsed.data.Rival,
      Fase: parsed.data.Fase,
      EsLocal: parsed.data.EsLocal,
      FechaHoraUtc: parsed.data.FechaHoraUtc,
      GolesCol: null,
      GolesRival: null,
    })
    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    console.error("[createMatchAction]", err)
    return { error: "Error creando el partido" }
  }
}

export async function updateMatchAction(
  id: string,
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  await requireAdmin()

  const raw = {
    Rival: formData.get("Rival") as string,
    Fase: formData.get("Fase") as string,
    EsLocal: formData.get("EsLocal") === "true",
    FechaHoraUtc: formData.get("FechaHoraUtc") as string,
  }

  const parsed = MatchSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await updateMatch(id, parsed.data)
    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch {
    return { error: "Error actualizando el partido" }
  }
}

export async function deleteMatchAction(id: string): Promise<MatchActionState> {
  await requireAdmin()
  try {
    await deleteMatch(id)
    revalidatePath("/admin")
    revalidatePath("/")
    return { success: true }
  } catch {
    return { error: "Error eliminando el partido" }
  }
}

// ─── Resultado ────────────────────────────────────────────────────────────────

const ResultSchema = z.object({
  resultCol: z.coerce.number().int().min(0).max(20),
  resultOpp: z.coerce.number().int().min(0).max(20),
})

export async function setResultAction(
  id: string,
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  await requireAdmin()

  const parsed = ResultSchema.safeParse({
    resultCol: formData.get("resultCol"),
    resultOpp: formData.get("resultOpp"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Verificar que el partido ya haya comenzado
  const match = await getMatch(id)
  if (!match) return { error: "Partido no encontrado" }

  const kickoff = DateTime.fromISO(match.FechaHoraUtc, { zone: "utc" })
  if (kickoff.isValid && DateTime.utc() < kickoff) {
    return {
      error: `El partido aún no ha comenzado (${formatBogota(match.FechaHoraUtc)}). Registra el resultado cuando termine.`,
    }
  }

  try {
    await updateMatchResult(id, {
      GolesCol: parsed.data.resultCol,
      GolesRival: parsed.data.resultOpp,
    })
    revalidatePath("/admin")
    revalidatePath("/")
    revalidatePath("/ganadores")
    return { success: true }
  } catch {
    return { error: "Error guardando el resultado" }
  }
}

/**
 * Igual a setResultAction pero omite la validación de hora de inicio.
 * Solo para pruebas en desarrollo/staging.
 */
export async function setResultForceAction(
  id: string,
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  await requireAdmin()

  const parsed = ResultSchema.safeParse({
    resultCol: formData.get("resultCol"),
    resultOpp: formData.get("resultOpp"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const match = await getMatch(id)
  if (!match) return { error: "Partido no encontrado" }

  try {
    await updateMatchResult(id, {
      GolesCol: parsed.data.resultCol,
      GolesRival: parsed.data.resultOpp,
    })
    revalidatePath("/admin")
    revalidatePath("/")
    revalidatePath("/ganadores")
    return { success: true }
  } catch {
    return { error: "Error guardando el resultado" }
  }
}

// ─── Data para el panel ───────────────────────────────────────────────────────

export interface AdminMatch extends MatchRecord {
  status: ReturnType<typeof computeMatchStatus>
  kickoffBogota: string
}

export async function getAdminMatches(): Promise<AdminMatch[]> {
  await requireAdmin()
  const matches = await listMatches()
  return matches.map((m) => ({
    ...m,
    status: computeMatchStatus(m.FechaHoraUtc, m.GolesCol, m.GolesRival),
    kickoffBogota: formatBogota(m.FechaHoraUtc),
  }))
}

export async function getMatchPredictions(matchId: string) {
  await requireAdmin()
  return listPredictions(matchId)
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportPredictionsCsv(): Promise<string> {
  await requireAdmin()

  const matches = await listMatches()
  const matchMap = new Map(matches.map((m) => [m.id, m]))
  const preds = await listAllPredictions()

  const rows = [
    "Partido,Rival,Fase,Fecha (Bogotá),Nombre,Cédula,Col,Opp,Actualizado",
    ...preds.map((p) => {
      const m = matchMap.get(p.IdPartido)
      const rival = m?.Rival ?? p.IdPartido
      const phase = m?.Fase ?? "-"
      const date = m ? formatBogota(m.FechaHoraUtc) : "-"
      const updated = p.ActualizadoEn ? formatBogota(p.ActualizadoEn) : "-"
      return [
        `"${p.IdPartido}"`,
        `"${rival}"`,
        `"${phase}"`,
        `"${date}"`,
        `"${p.NombreCompleto}"`,
        `"${p.Cedula}"`,
        p.GolesCol,
        p.GolesRival,
        `"${updated}"`,
      ].join(",")
    }),
  ]

  return rows.join("\n")
}
