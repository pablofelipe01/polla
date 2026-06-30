import {
  listContinentes,
  createContinente,
  updateContinente,
  deleteContinente,
  listEquipos,
  getEquipo,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  listIntegrantes,
  listIntegrantesByEquipo,
  createIntegrante,
  deleteIntegrante,
  countHabilitadosByEquipo,
  updateUsuario,
  type Continente,
  type Equipo,
  type Integrante,
} from "@/lib/clients/airtable"
import { ok, err, type Result } from "@/types/result"
import { NotFoundError, ValidationError } from "@/types/errors"

// Reglas de negocio del torneo (continentes, equipos, integrantes). Sin Next.js.

export const MIN_INTEGRANTES = 20
export const MAX_INTEGRANTES = 30
export const MAX_DELEGADOS = 2

// ─── Continentes ────────────────────────────────────────────────────────────────

export const obtenerContinentes = listContinentes
export const crearContinente = (d: Omit<Continente, "id">) => createContinente(d)
export const editarContinente = (id: string, d: Partial<Omit<Continente, "id">>) =>
  updateContinente(id, d)
export const eliminarContinente = deleteContinente

/**
 * Vincula a los usuarios indicados (DT y cuerpo técnico) con un continente:
 * les asigna Rol="DT" y su ContinenteId. Así obtienen acceso al módulo Equipos
 * y aterrizan en su continente al iniciar sesión.
 *
 * @param continenteId - Continente al que se vinculan
 * @param usuarioIds   - IDs de usuarios a promover a DT (DT + cuerpo técnico)
 */
export async function vincularCuerpoTecnico(
  continenteId: string,
  usuarioIds: string[]
): Promise<void> {
  const ids = usuarioIds.filter(Boolean)
  if (ids.length === 0) return
  await Promise.all(
    ids.map((id) => updateUsuario(id, { Rol: "DT", ContinenteId: continenteId }))
  )
}

// ─── Equipos ─────────────────────────────────────────────────────────────────────

export const obtenerEquipos = listEquipos

export async function crearEquipo(d: {
  Nombre: string
  ContinenteId: string | null
  Paises: string
  Activo: boolean
}): Promise<Equipo> {
  return createEquipo(d)
}
export const editarEquipo = updateEquipo
export const eliminarEquipo = deleteEquipo

// ─── Integrantes ──────────────────────────────────────────────────────────────────

export const obtenerIntegrantes = listIntegrantes
export const obtenerIntegrantesDeEquipo = listIntegrantesByEquipo

/**
 * Agrega un integrante a un equipo, respetando el máximo de {@link MAX_INTEGRANTES}.
 * @returns Result con el integrante creado o ValidationError si se supera el máximo.
 */
export async function agregarIntegrante(d: {
  Nombre: string
  Cedula: string
  EquipoId: string
}): Promise<Result<Integrante>> {
  const equipo = await getEquipo(d.EquipoId)
  if (!equipo) return err(new NotFoundError("Equipo"))
  const actuales = await listIntegrantesByEquipo(d.EquipoId)
  if (actuales.length >= MAX_INTEGRANTES) {
    return err(new ValidationError(`Un equipo no puede superar ${MAX_INTEGRANTES} integrantes`))
  }
  return ok(await createIntegrante(d))
}

export const eliminarIntegrante = deleteIntegrante

/** Valida que el equipo tenga entre MIN y MAX integrantes (para cerrar inscripciones). */
export async function validarTamanoEquipo(equipoId: string): Promise<Result<true>> {
  const n = (await listIntegrantesByEquipo(equipoId)).length
  if (n < MIN_INTEGRANTES || n > MAX_INTEGRANTES) {
    return err(
      new ValidationError(
        `El equipo debe tener entre ${MIN_INTEGRANTES} y ${MAX_INTEGRANTES} integrantes (tiene ${n})`
      )
    )
  }
  return ok(true)
}

/** Indica si el equipo aún tiene cupo para habilitar pronósticos (máx 2). */
export async function equipoTieneCupoHabilitado(equipoId: string): Promise<boolean> {
  return (await countHabilitadosByEquipo(equipoId)) < MAX_DELEGADOS
}
