import {
  listEquipos,
  listContinentes,
  listUsuariosByEquipoNombre,
  searchUsuarios,
  getUsuario,
  createEquipo,
  updateEquipo,
  updateUsuario,
  countHabilitadosByEquipo,
  type Equipo,
  type Usuario,
} from "@/lib/clients/airtable"
import { listPaisesDeConfederacion } from "@/lib/data/confederaciones"
import { ok, err, type Result } from "@/types/result"
import { NotFoundError, ValidationError } from "@/types/errors"

// Gestión del panel del Director Técnico. Sin Next.js.

export const MAX_HABILITADOS = 2

export type DatosEquipoDT = {
  equipo: Equipo
  miembros: Usuario[]
  habilitados: number
}

export type DatosDT = {
  equipos: DatosEquipoDT[]
  continenteNombre: string
  paisesDisponibles: string[]
}

/**
 * Carga los equipos del continente del DT con sus miembros y los países del
 * continente aún sin asignar (para que el DT cree su equipo).
 *
 * No descarga la tabla completa de usuarios: los miembros de cada equipo se
 * consultan con un filtro en el servidor (1 página por equipo). El pool para
 * agregar miembros se busca bajo demanda con {@link buscarDisponibles}.
 *
 * @param continenteId - Continente asignado al DT
 */
export async function getDatosDT(continenteId: string): Promise<DatosDT> {
  const [todosEquipos, continentes] = await Promise.all([
    listEquipos(),
    listContinentes(),
  ])

  const continente = continentes.find((c) => c.id === continenteId)
  const continenteNombre = continente?.Nombre ?? ""

  const equiposDeContinente = todosEquipos.filter((e) => e.ContinenteId === continenteId)

  // Todos los países de la confederación del DT, menos los ya asignados a algún equipo.
  const asignados = new Set(todosEquipos.map((e) => e.Nombre))
  const paisesDisponibles = listPaisesDeConfederacion(continenteNombre).filter(
    (p) => !asignados.has(p)
  )

  // Miembros por equipo filtrando en el servidor por nombre del equipo
  // (≤30 filas, 1 página) en vez de escanear las ~2.179 filas de Usuarios.
  const equipos = await Promise.all(
    equiposDeContinente.map(async (equipo) => {
      const miembros = await listUsuariosByEquipoNombre(equipo.Nombre)
      return {
        equipo,
        miembros,
        habilitados: miembros.filter((u) => u.PuedePronosticar).length,
      }
    })
  )

  return { equipos, continenteNombre, paisesDisponibles }
}

/**
 * Busca usuarios disponibles (activos y sin equipo) por nombre o cédula.
 * Filtra en el servidor con un límite; no descarga la tabla completa.
 *
 * @param query - Texto de búsqueda (mín. 2 caracteres)
 * @returns Hasta 20 usuarios sin equipo que coinciden con la búsqueda
 */
export async function buscarDisponibles(query: string): Promise<Usuario[]> {
  const encontrados = await searchUsuarios(query, 40)
  return encontrados.filter((u) => !u.EquipoId && u.Activo).slice(0, 20)
}

/**
 * Crea el equipo del DT eligiendo un país de su continente.
 * El nombre del equipo es el país. Valida que el país no esté ya tomado.
 *
 * @returns Result con el equipo creado o ValidationError si el país ya existe.
 */
export async function crearEquipoDeContinente(
  pais: string,
  continenteId: string
): Promise<Result<Equipo>> {
  const equipos = await listEquipos()
  if (equipos.some((e) => e.Nombre === pais)) {
    return err(new ValidationError("Ese país ya fue asignado a un equipo"))
  }
  return ok(
    await createEquipo({ Nombre: pais, ContinenteId: continenteId, Paises: pais, Activo: true })
  )
}

/**
 * Actualiza los países representados por el equipo.
 *
 * @param equipoId - ID del equipo a actualizar
 * @param paises   - Texto libre con los países
 */
export async function actualizarPaisesEquipo(
  equipoId: string,
  paises: string
): Promise<Equipo> {
  return updateEquipo(equipoId, { Paises: paises })
}

/**
 * Asigna un usuario al equipo. Solo si el usuario no tiene equipo ya.
 *
 * @returns Result con el usuario actualizado o ValidationError si ya tiene equipo.
 */
export async function asignarMiembro(
  usuarioId: string,
  equipoId: string
): Promise<Result<Usuario>> {
  // Lectura puntual del usuario (1 request) en lugar de escanear toda la tabla.
  const usuario = await getUsuario(usuarioId)
  if (!usuario) return err(new NotFoundError("Usuario"))
  if (usuario.EquipoId === equipoId) {
    return err(new ValidationError("El usuario ya pertenece a este equipo"))
  }
  return ok(await updateUsuario(usuarioId, { EquipoId: equipoId }))
}

/**
 * Retira a un usuario del equipo (limpia EquipoId y desactiva PuedePronosticar).
 */
export async function retirarMiembro(usuarioId: string): Promise<Usuario> {
  return updateUsuario(usuarioId, { EquipoId: null, PuedePronosticar: false })
}

/**
 * Habilita a un usuario para registrar pronósticos.
 * Máximo {@link MAX_HABILITADOS} por equipo.
 *
 * @returns Result con el usuario, o ValidationError si ya se alcanzó el límite.
 */
export async function habilitarPronosticador(
  usuarioId: string,
  equipoId: string
): Promise<Result<Usuario>> {
  const actuales = await countHabilitadosByEquipo(equipoId)
  if (actuales >= MAX_HABILITADOS) {
    return err(
      new ValidationError(
        `Solo se permiten ${MAX_HABILITADOS} pronosticadores por equipo. Deshabilita uno primero.`
      )
    )
  }
  return ok(await updateUsuario(usuarioId, { PuedePronosticar: true }))
}

/**
 * Deshabilita a un usuario para registrar pronósticos.
 */
export async function deshabilitarPronosticador(usuarioId: string): Promise<Usuario> {
  return updateUsuario(usuarioId, { PuedePronosticar: false })
}
