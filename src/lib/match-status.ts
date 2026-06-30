import { DateTime } from "luxon"

/** Minutos antes del pitazo en que se cierran los pronósticos por defecto. */
const CIERRE_DEFAULT_MINUTES = 15
const BOGOTA_TZ = "America/Bogota"

export function formatBogota(isoUtc: string, fmt = "dd/MM/yyyy HH:mm"): string {
  if (!isoUtc) return "—"
  const dt = DateTime.fromISO(isoUtc, { zone: "utc" })
  if (!dt.isValid) return "—"
  return dt.setZone(BOGOTA_TZ).toFormat(fmt)
}

// ─── Encuentros (nuevo modelo continentes/equipos) ─────────────────────────────
// Estados: ABIERTO (se puede pronosticar) · CERRADO (pasó la fecha límite) ·
// FINALIZADO (resultado registrado). El pronóstico se bloquea al iniciar el
// encuentro o en CierreUtc si se definió una fecha límite previa.

export type EncuentroStatus = "ABIERTO" | "CERRADO" | "FINALIZADO"

/**
 * Timestamp (ms) en que se bloquean los pronósticos.
 * Si hay CierreUtc explícito se usa tal cual; si no, 15 minutos antes del pitazo.
 */
export function deadlineEncuentro(kickoffUtc: string, cierreUtc: string | null): number {
  if (cierreUtc) {
    const dt = DateTime.fromISO(cierreUtc, { zone: "utc" })
    return dt.isValid ? dt.toMillis() : Number.MAX_SAFE_INTEGER
  }
  const dt = DateTime.fromISO(kickoffUtc, { zone: "utc" })
  return dt.isValid ? dt.minus({ minutes: CIERRE_DEFAULT_MINUTES }).toMillis() : Number.MAX_SAFE_INTEGER
}

export function estadoEncuentro(
  kickoffUtc: string,
  cierreUtc: string | null,
  golesLocal: number | null,
  golesVisitante: number | null
): EncuentroStatus {
  if (golesLocal !== null && golesVisitante !== null) return "FINALIZADO"
  return Date.now() >= deadlineEncuentro(kickoffUtc, cierreUtc) ? "CERRADO" : "ABIERTO"
}
