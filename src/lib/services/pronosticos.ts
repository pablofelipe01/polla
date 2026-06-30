import {
  getEncuentro,
  upsertPronostico,
  listPronosticosByEncuentro,
  type Pronostico,
} from "@/lib/clients/airtable"
import { estadoEncuentro } from "@/lib/match-status"
import { ok, err, type Result } from "@/types/result"
import { NotFoundError, ValidationError } from "@/types/errors"

// Registro del pronóstico oficial de un equipo. Sin Next.js.

export const obtenerPronosticosDeEncuentro = listPronosticosByEncuentro

/**
 * Registra (o actualiza) el único pronóstico oficial de un equipo para un encuentro.
 * Lo registra el DT o Cuerpo Técnico del continente del equipo.
 * Solo se permite mientras el encuentro está ABIERTO (se bloquea al iniciar / en CierreUtc).
 *
 * @returns Result con el pronóstico, o ValidationError si el encuentro ya cerró/finalizó.
 */
export async function registrarPronostico(d: {
  encuentroId: string
  equipoId: string
  registradoPorId: string
  registradoPor: string
  golesLocal: number
  golesVisitante: number
}): Promise<Result<Pronostico>> {
  const enc = await getEncuentro(d.encuentroId)
  if (!enc) return err(new NotFoundError("Encuentro"))

  const estado = estadoEncuentro(enc.FechaHoraUtc, enc.CierreUtc, enc.GolesLocal, enc.GolesVisitante)
  if (estado !== "ABIERTO") {
    return err(
      new ValidationError(
        estado === "CERRADO"
          ? "Los pronósticos para este encuentro ya cerraron"
          : "Este encuentro ya finalizó"
      )
    )
  }

  return ok(
    await upsertPronostico({
      encuentroId: d.encuentroId,
      equipoId: d.equipoId,
      registradoPorId: d.registradoPorId,
      registradoPor: d.registradoPor,
      golesLocal: d.golesLocal,
      golesVisitante: d.golesVisitante,
    })
  )
}
