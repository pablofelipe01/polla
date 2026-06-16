import { DateTime } from "luxon"

export type MatchStatus = "PROXIMO" | "ABIERTO" | "CERRADO" | "FINALIZADO"

const OPEN_BEFORE_HOURS = 48
const CLOSE_BEFORE_MINUTES = 30
const BOGOTA_TZ = "America/Bogota"

export function computeMatchStatus(
  kickoffUtc: string,
  resultCol: number | null,
  resultOpp: number | null
): MatchStatus {
  if (resultCol !== null && resultOpp !== null) return "FINALIZADO"
  if (!kickoffUtc) return "PROXIMO"

  const now = DateTime.utc()
  const kickoff = DateTime.fromISO(kickoffUtc, { zone: "utc" })
  if (!kickoff.isValid) return "PROXIMO"

  const opens = kickoff.minus({ hours: OPEN_BEFORE_HOURS })
  const closes = kickoff.minus({ minutes: CLOSE_BEFORE_MINUTES })

  if (now < opens) return "PROXIMO"
  if (now < closes) return "ABIERTO"
  return "CERRADO"
}

export function formatBogota(isoUtc: string, fmt = "dd/MM/yyyy HH:mm"): string {
  if (!isoUtc) return "—"
  const dt = DateTime.fromISO(isoUtc, { zone: "utc" })
  if (!dt.isValid) return "—"
  return dt.setZone(BOGOTA_TZ).toFormat(fmt)
}

export function closeTimestamp(kickoffUtc: string): number {
  if (!kickoffUtc) return 0
  const dt = DateTime.fromISO(kickoffUtc, { zone: "utc" })
  if (!dt.isValid) return 0
  return dt.minus({ minutes: CLOSE_BEFORE_MINUTES }).toMillis()
}

export function openTimestamp(kickoffUtc: string): number {
  if (!kickoffUtc) return 0
  const dt = DateTime.fromISO(kickoffUtc, { zone: "utc" })
  if (!dt.isValid) return 0
  return dt.minus({ hours: OPEN_BEFORE_HOURS }).toMillis()
}
