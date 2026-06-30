import {
  listEncuentros,
  createEncuentro,
  updateEncuentro,
  findEncuentroByExternalId,
} from "@/lib/clients/airtable"
import { fetchPartidosMundial, mapearFase } from "@/lib/clients/football-data"
import { traducirPais } from "@/lib/data/paises-es"
import { logger } from "@/lib/logger"

// Sincronización de partidos desde football-data.org → Airtable Encuentros.

/** Traduce el nombre de equipo de la API (puede ser null para equipos TBD en eliminatorias). */
function nombreEquipo(shortName: string | null, name: string | null): string {
  const raw = shortName || name || ""
  return raw ? traducirPais(raw) : ""
}

export type ResultadoSincronizacion = {
  creados: number
  actualizados: number
  errores: number
  totalPartidos: number
}

/**
 * Sincroniza los partidos del Mundial 2026 con la tabla Encuentros de Airtable.
 *
 * - Si el partido ya existe (por ExternalId): actualiza marcador si está FINISHED.
 * - Si no existe: crea el encuentro.
 * - No elimina encuentros existentes.
 *
 * @returns Resumen de la operación con conteos de creados/actualizados/errores.
 */
export async function sincronizarPartidos(): Promise<ResultadoSincronizacion> {
  const [partidos, encuentrosActuales] = await Promise.all([
    fetchPartidosMundial(),
    listEncuentros(),
  ])

  const porExternalId = new Map(
    encuentrosActuales
      .filter((e) => e.ExternalId)
      .map((e) => [e.ExternalId!, e])
  )

  let creados = 0
  let actualizados = 0
  let errores = 0

  for (const partido of partidos) {
    try {
      const externalId = String(partido.id)
      const existente = porExternalId.get(externalId) ?? await findEncuentroByExternalId(externalId)

      if (existente) {
        const localNuevo = nombreEquipo(partido.homeTeam.shortName, partido.homeTeam.name)
        const visitanteNuevo = nombreEquipo(partido.awayTeam.shortName, partido.awayTeam.name)
        const cambios: Partial<Parameters<typeof updateEncuentro>[1]> = {}

        // Corrige nombres de equipo si estaban vacíos o no traducidos (equipos TBD al crear el registro)
        if (localNuevo && localNuevo !== existente.Local) cambios.Local = localNuevo
        if (visitanteNuevo && visitanteNuevo !== existente.Visitante) cambios.Visitante = visitanteNuevo

        if (partido.status === "FINISHED") {
          const home = partido.score.fullTime.home
          const away = partido.score.fullTime.away
          const yaTieneResultado =
            existente.GolesLocal !== null && existente.GolesVisitante !== null
          const cambioResultado =
            existente.GolesLocal !== home || existente.GolesVisitante !== away

          if (!yaTieneResultado || cambioResultado) {
            cambios.GolesLocal = home
            cambios.GolesVisitante = away
          }
        }

        if (Object.keys(cambios).length > 0) {
          await updateEncuentro(existente.id, cambios)
          actualizados++
        }
      } else {
        await createEncuentro({
          Local: nombreEquipo(partido.homeTeam.shortName, partido.homeTeam.name),
          Visitante: nombreEquipo(partido.awayTeam.shortName, partido.awayTeam.name),
          Fase: mapearFase(partido.stage),
          FechaHoraUtc: partido.utcDate,
          CierreUtc: null,
          ExternalId: externalId,
        })
        creados++
      }
    } catch (e) {
      logger.error(e, { action: "sincronizarPartidos", partidoId: partido.id })
      errores++
    }
  }

  return { creados, actualizados, errores, totalPartidos: partidos.length }
}
