import {
  listEncuentros,
  getEncuentro,
  createEncuentro,
  updateEncuentro,
  deleteEncuentro,
  type Encuentro,
} from "@/lib/clients/airtable"
import { estadoEncuentro, formatBogota, type EncuentroStatus } from "@/lib/match-status"
import { ok, err, type Result } from "@/types/result"
import { NotFoundError, ValidationError } from "@/types/errors"

// Lógica de encuentros (partidos del torneo). Sin Next.js.

export interface EncuentroConEstado extends Encuentro {
  status: EncuentroStatus
  inicioBogota: string
}

const decorar = (e: Encuentro): EncuentroConEstado => ({
  ...e,
  status: estadoEncuentro(e.FechaHoraUtc, e.CierreUtc, e.GolesLocal, e.GolesVisitante),
  inicioBogota: formatBogota(e.FechaHoraUtc),
})

export async function obtenerEncuentros(): Promise<EncuentroConEstado[]> {
  return (await listEncuentros()).map(decorar)
}

export const crearEncuentro = createEncuentro
export const editarEncuentro = updateEncuentro
export const eliminarEncuentro = deleteEncuentro

/**
 * Registra el resultado oficial de un encuentro.
 * @returns Result con el encuentro actualizado, o error si no existe / aún no inicia.
 */
export async function registrarResultado(
  id: string,
  golesLocal: number,
  golesVisitante: number,
  forzar = false
): Promise<Result<Encuentro>> {
  const enc = await getEncuentro(id)
  if (!enc) return err(new NotFoundError("Encuentro"))
  if (!forzar && enc.FechaHoraUtc) {
    const inicio = new Date(enc.FechaHoraUtc).getTime()
    if (Number.isFinite(inicio) && Date.now() < inicio) {
      return err(
        new ValidationError(
          `El encuentro aún no inicia (${formatBogota(enc.FechaHoraUtc)}). Registra el resultado cuando termine.`
        )
      )
    }
  }
  return ok(await updateEncuentro(id, { GolesLocal: golesLocal, GolesVisitante: golesVisitante }))
}
