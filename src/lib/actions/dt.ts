"use server"

import { z } from "zod"
import { revalidatePath, revalidateTag } from "next/cache"
import { auth, isAdmin } from "@/lib/auth"
import { UnauthorizedError, ForbiddenError } from "@/types/errors"
import { logger } from "@/lib/logger"
import {
  getDatosDT,
  buscarDisponibles,
  actualizarPaisesEquipo,
  crearEquipoDeContinente,
  asignarMiembro,
  retirarMiembro,
  asignarAyudante,
  quitarAyudante,
  type DatosDT,
} from "@/lib/services/dt"
import { listEquipos, getUsuario, CACHE_TAGS, type Usuario } from "@/lib/clients/airtable"

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireDT() {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  if (!isAdmin(session) && session.user.role !== "DT" && session.user.role !== "CuerpoTecnico") {
    throw new ForbiddenError("Solo los DT y Cuerpo Técnico pueden acceder a este panel")
  }
  return session
}

/**
 * Guard para acciones que solo el DT (o Admin) puede ejecutar, no el ayudante.
 * El ayudante (CuerpoTecnico) gestiona su equipo pero no asigna otros ayudantes.
 */
async function requireDTPrincipal() {
  const session = await requireDT()
  if (!isAdmin(session) && session.user.role !== "DT") {
    throw new ForbiddenError("Solo el Director Técnico puede asignar ayudantes")
  }
  return session
}

/** True si la sesión es de un ayudante de equipo (CuerpoTecnico vinculado a un equipo). */
function esAyudante(session: { user: { role?: string; equipoId?: string | null } }): boolean {
  return session.user.role === "CuerpoTecnico"
}

export interface ActionState {
  error?: string
  success?: boolean
}

// ─── Datos ────────────────────────────────────────────────────────────────────

/**
 * Carga los datos del panel DT: equipos del continente + pool de usuarios sin equipo.
 * Admin puede pasar cualquier continenteId; DT solo puede ver el suyo.
 */
export async function getDatosPanelDT(): Promise<DatosDT> {
  const session = await requireDT()
  const continenteId = session.user.continenteId ?? null

  if (!continenteId && !isAdmin(session)) {
    return { equipos: [], continenteNombre: "", paisesDisponibles: [] }
  }

  // Admin sin continente específico → retorna todos los equipos (usa primer continente disponible)
  if (!continenteId && isAdmin(session)) {
    const equipos = await listEquipos()
    return getDatosDT(equipos[0]?.ContinenteId ?? "")
  }

  const datos = await getDatosDT(continenteId!)

  // El ayudante solo gestiona su equipo asignado: se le oculta el resto del
  // continente y la opción de tomar nuevos países (no crea equipos).
  if (esAyudante(session)) {
    const equipoId = session.user.equipoId ?? null
    return {
      ...datos,
      equipos: datos.equipos.filter((e) => e.equipo.id === equipoId),
      paisesDisponibles: [],
    }
  }

  return datos
}

// ─── Equipos ──────────────────────────────────────────────────────────────────

const CrearEquipoSchema = z.object({
  pais: z.string().trim().min(1, "Selecciona un país"),
})

/**
 * Crea el equipo del DT con el país elegido dentro de su continente asignado.
 * Valida sesión DT y que el DT tenga un continente. El equipo se crea en ese continente.
 */
export async function crearEquipoDTAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const session = await requireDT()
  const continenteId = session.user.continenteId ?? null
  if (!continenteId) {
    return { error: "No tienes un continente asignado. Contacta al administrador." }
  }
  const parsed = CrearEquipoSchema.safeParse({ pais: fd.get("pais") })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const res = await crearEquipoDeContinente(parsed.data.pais, continenteId)
  if (!res.ok) return { error: res.error.message }
  revalidateTag(CACHE_TAGS.equipos, "max")
  revalidatePath("/equipos")
  revalidatePath("/admin")
  return { success: true }
}

const PaisesSchema = z.object({
  equipoId: z.string().trim().min(1),
  paises: z.string().trim().max(500),
})

/**
 * Actualiza el campo Paises de un equipo del continente del DT.
 * Valida que el equipo pertenezca al continente del DT autenticado.
 */
export async function actualizarPaisesAction(
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  const session = await requireDT()
  const parsed = PaisesSchema.safeParse({
    equipoId: fd.get("equipoId"),
    paises: fd.get("paises") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await actualizarPaisesEquipo(parsed.data.equipoId, parsed.data.paises)
    revalidateTag(CACHE_TAGS.equipos, "max")
    revalidatePath("/panel")
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "actualizarPaises", userId: session.user.id })
    return { error: "Error actualizando los países" }
  }
}

// ─── Miembros ─────────────────────────────────────────────────────────────────

/**
 * Busca usuarios disponibles (activos y sin equipo) para agregarlos al equipo.
 * Filtra en el servidor; no descarga la tabla completa de usuarios.
 *
 * @param query - Texto de búsqueda (nombre o cédula, mín. 2 caracteres)
 * @returns Lista acotada de coincidencias o error sanitizado
 */
export async function buscarMiembrosDisponiblesAction(
  query: string
): Promise<{ usuarios?: Usuario[]; error?: string }> {
  await requireDT()
  if (query.trim().length < 2) return { usuarios: [] }
  try {
    return { usuarios: await buscarDisponibles(query) }
  } catch (e) {
    logger.error(e, { action: "buscarMiembrosDisponibles" })
    return { error: "Error buscando usuarios" }
  }
}

/**
 * Asigna un usuario del pool al equipo indicado.
 * El ayudante solo puede agregar integrantes a su propio equipo.
 */
export async function asignarMiembroAction(
  usuarioId: string,
  equipoId: string
): Promise<ActionState> {
  const session = await requireDT()
  if (esAyudante(session) && equipoId !== (session.user.equipoId ?? null)) {
    return { error: "Solo puedes gestionar integrantes de tu equipo asignado" }
  }
  const res = await asignarMiembro(usuarioId, equipoId)
  if (!res.ok) return { error: res.error.message }
  revalidateTag(CACHE_TAGS.usuarios, "max")
  revalidatePath("/panel")
  revalidatePath("/admin")
  return { success: true }
}

/**
 * Retira a un miembro del equipo (limpia su equipo).
 * El ayudante solo puede retirar integrantes de su propio equipo.
 */
export async function retirarMiembroAction(usuarioId: string): Promise<ActionState> {
  const session = await requireDT()
  try {
    if (esAyudante(session)) {
      const objetivo = await getUsuario(usuarioId)
      if (!objetivo || objetivo.EquipoId !== (session.user.equipoId ?? null)) {
        return { error: "Solo puedes gestionar integrantes de tu equipo asignado" }
      }
    }
    await retirarMiembro(usuarioId)
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidatePath("/panel")
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "retirarMiembro" })
    return { error: "Error retirando el miembro" }
  }
}

// ─── Asistente técnico ───────────────────────────────────────────────────────────

/**
 * Asigna a un usuario como ayudante de un equipo del continente del DT.
 * Solo el DT (o Admin) puede hacerlo. Valida que el equipo sea de su continente.
 *
 * @param usuarioId - Usuario a promover a ayudante (Rol=CuerpoTecnico)
 * @param equipoId  - Equipo que quedará a cargo del ayudante
 */
export async function asignarAyudanteAction(
  usuarioId: string,
  equipoId: string
): Promise<ActionState> {
  const session = await requireDTPrincipal()
  const continenteId = session.user.continenteId ?? null

  try {
    const equipos = await listEquipos()
    const equipo = equipos.find((e) => e.id === equipoId)
    if (!equipo) return { error: "Equipo no encontrado" }
    if (!isAdmin(session) && equipo.ContinenteId !== continenteId) {
      return { error: "Ese equipo no pertenece a tu continente" }
    }

    const res = await asignarAyudante(usuarioId, equipoId, equipo.ContinenteId ?? continenteId ?? "")
    if (!res.ok) return { error: res.error.message }
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidatePath("/panel")
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "asignarAyudante", usuarioId, equipoId })
    return { error: "No se pudo asignar el ayudante. Verifica que el rol exista en la base de datos." }
  }
}

/**
 * Retira al ayudante de un equipo (revierte su rol a Usuario y limpia su vínculo).
 * Solo el DT (o Admin) puede hacerlo.
 */
export async function quitarAyudanteAction(usuarioId: string): Promise<ActionState> {
  await requireDTPrincipal()
  try {
    await quitarAyudante(usuarioId)
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidatePath("/panel")
    revalidatePath("/admin")
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "quitarAyudante" })
    return { error: "Error retirando el ayudante" }
  }
}
