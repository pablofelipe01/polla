import {
  listEquipos,
  listContinentes,
  listUsuariosByEquipoNombre,
  searchUsuarios,
  getUsuario,
  getEquipo,
  createEquipo,
  updateEquipo,
  updateUsuario,
  type Equipo,
  type Usuario,
} from "@/lib/clients/airtable"
import { listPaisesDeConfederacion } from "@/lib/data/confederaciones"
import { ok, err, type Result } from "@/types/result"
import { NotFoundError, ValidationError } from "@/types/errors"

// Gestión del panel del Director Técnico. Sin Next.js.

export type DatosEquipoDT = {
  equipo: Equipo
  /** Plantilla del equipo: solo jugadores (Rol=Usuario), sin DT ni ayudante. */
  miembros: Usuario[]
  /** Ayudante de cuerpo técnico encargado del equipo (Rol=CuerpoTecnico), si existe. */
  ayudante: Usuario | null
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
  // El ayudante (Rol=CuerpoTecnico) también queda vinculado al equipo, así que
  // se separa de la plantilla de jugadores (Rol=Usuario).
  const equipos = await Promise.all(
    equiposDeContinente.map(async (equipo) => {
      const usuarios = await listUsuariosByEquipoNombre(equipo.Nombre)
      const ayudante = usuarios.find((u) => u.Rol === "CuerpoTecnico") ?? null
      const miembros = usuarios.filter((u) => u.Rol === "Usuario")
      return { equipo, miembros, ayudante }
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
 * Retira a un usuario del equipo (limpia EquipoId).
 */
export async function retirarMiembro(usuarioId: string): Promise<Usuario> {
  return updateUsuario(usuarioId, { EquipoId: null })
}

/**
 * Asigna a un usuario como ayudante de cuerpo técnico de un equipo: lo promueve
 * a Rol=CuerpoTecnico y lo vincula al equipo y su continente. El ayudante solo
 * podrá agregar integrantes y editar los pronósticos de ese equipo.
 *
 * Se permite un único ayudante por equipo: si ya existe otro, devuelve
 * ValidationError para forzar a retirarlo primero.
 *
 * @returns Result con el usuario actualizado, NotFoundError o ValidationError.
 */
export async function asignarAyudante(
  usuarioId: string,
  equipoId: string,
  continenteId: string
): Promise<Result<Usuario>> {
  const [usuario, equipo] = await Promise.all([getUsuario(usuarioId), getEquipo(equipoId)])
  if (!usuario) return err(new NotFoundError("Usuario"))
  if (!equipo) return err(new NotFoundError("Equipo"))

  const existentes = await listUsuariosByEquipoNombre(equipo.Nombre)
  if (existentes.some((u) => u.Rol === "CuerpoTecnico" && u.id !== usuarioId)) {
    return err(
      new ValidationError("Este equipo ya tiene un ayudante. Retíralo antes de asignar otro.")
    )
  }

  return ok(
    await updateUsuario(usuarioId, {
      Rol: "CuerpoTecnico",
      EquipoId: equipoId,
      ContinenteId: continenteId,
    })
  )
}

/**
 * Retira al ayudante de un equipo: revierte su rol a Usuario y limpia su
 * vínculo de equipo y continente.
 */
export async function quitarAyudante(usuarioId: string): Promise<Usuario> {
  return updateUsuario(usuarioId, { Rol: "Usuario", EquipoId: null, ContinenteId: null })
}
