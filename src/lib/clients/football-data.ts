import "server-only"
import { ApiError } from "@/types/errors"

// Cliente para football-data.org API v4 (tier gratuito: 10 req/min).
// Documentación: https://www.football-data.org/documentation/quickstart

const BASE_URL = "https://api.football-data.org/v4"
// El Mundial 2026 usa el código "WC" en football-data.org
const WC_CODE = "WC"

export type FDMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED"

export interface FDMatch {
  id: number
  utcDate: string
  status: FDMatchStatus
  stage: string
  homeTeam: { id: number | null; name: string | null; shortName: string | null }
  awayTeam: { id: number | null; name: string | null; shortName: string | null }
  score: {
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
}

interface FDMatchesResponse {
  matches: FDMatch[]
}

async function fdFetch<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_API_KEY
  if (!token) throw new ApiError(500, "FOOTBALL_DATA_API_KEY no configurada")

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: 300 }, // cache 5 min — free tier es 10 req/min
  })

  if (res.status === 429) throw new ApiError(429, "Límite de tasa de football-data.org (10 req/min)")
  if (res.status === 403) throw new ApiError(403, "Token inválido o sin acceso al recurso")
  if (!res.ok) {
    const text = await res.text().catch(() => "(sin cuerpo)")
    throw new ApiError(res.status, `football-data.org ${path}: ${text}`)
  }

  return res.json() as Promise<T>
}

/**
 * Obtiene todos los partidos del Mundial 2026 desde football-data.org.
 * Requiere FOOTBALL_DATA_API_KEY en variables de entorno.
 *
 * @returns Lista de partidos con estado, fecha UTC y marcador (si está disponible)
 */
export async function fetchPartidosMundial(): Promise<FDMatch[]> {
  const data = await fdFetch<FDMatchesResponse>(`/competitions/${WC_CODE}/matches`)
  return data.matches
}

/** Mapea el stage de football-data.org a la fase legible del torneo. */
export function mapearFase(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: "Fase de grupos",
    // Mundial 2026 (48 equipos): LAST_32 → 32avos, LAST_16 → Octavos
    LAST_32: "32avos de final",
    LAST_16: "Octavos de final",
    ROUND_OF_16: "Octavos de final",
    QUARTER_FINALS: "Cuartos de final",
    SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "Tercer puesto",
    FINAL: "Final",
  }
  return map[stage] ?? stage
}
