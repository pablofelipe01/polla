"use server"

import { z } from "zod"
import { revalidatePath, revalidateTag } from "next/cache"
import { auth, canPredict } from "@/lib/auth"
import { ForbiddenError, UnauthorizedError } from "@/types/errors"
import { logger } from "@/lib/logger"
import { registrarPronostico } from "@/lib/services/pronosticos"
import {
  obtenerEncuentros,
  type EncuentroConEstado,
} from "@/lib/services/encuentros"
import {
  listPronosticos,
  getEquipo,
  listUsuariosByEquipo,
  CACHE_TAGS,
  type Pronostico,
} from "@/lib/clients/airtable"

export interface ActionState {
  error?: string
  success?: boolean
}

const PronosticoSchema = z.object({
  encuentroId: z.string().trim().min(1),
  golesLocal: z.coerce.number().int().min(0).max(50),
  golesVisitante: z.coerce.number().int().min(0).max(50),
})

/**
 * Registra el pronóstico del usuario habilitado autenticado.
 * El usuarioId se toma de la sesión para impedir pronosticar por otros.
 */
export async function registrarPronosticoAction(
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  if (!canPredict(session)) throw new ForbiddenError("Tu rol no permite registrar pronósticos")

  const usuarioId = session.user.id
  if (!usuarioId) {
    return { error: "No se pudo identificar tu usuario. Vuelve a iniciar sesión." }
  }

  const parsed = PronosticoSchema.safeParse({
    encuentroId: fd.get("encuentroId"),
    golesLocal: fd.get("golesLocal"),
    golesVisitante: fd.get("golesVisitante"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const res = await registrarPronostico({
    encuentroId: parsed.data.encuentroId,
    usuarioId,
    golesLocal: parsed.data.golesLocal,
    golesVisitante: parsed.data.golesVisitante,
    registradoPor: session.user.email ?? "",
  })
  if (!res.ok) {
    logger.warn("registrarPronostico rechazado", { error: res.error.code })
    return { error: res.error.message }
  }
  revalidateTag(CACHE_TAGS.pronosticos, "max")
  revalidatePath("/panel")
  return { success: true }
}

export interface DatosPanel {
  equipoNombre: string
  encuentros: EncuentroConEstado[]
  misPronosticos: Record<string, Pronostico> // encuentroId → pronóstico
}

/** Carga los encuentros y los pronósticos ya registrados por el usuario autenticado. */
export async function getDatosPanel(): Promise<DatosPanel> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  const usuarioId = session.user.id ?? null
  const equipoId = session.user.equipoId ?? null

  const [encuentros, equipo, todos] = await Promise.all([
    obtenerEncuentros(),
    equipoId ? getEquipo(equipoId) : Promise.resolve(null),
    listPronosticos(),
  ])

  const misPronosticos: Record<string, Pronostico> = {}
  if (usuarioId) {
    for (const p of todos) {
      if (p.UsuarioId === usuarioId && p.EncuentroId) misPronosticos[p.EncuentroId] = p
    }
  }

  // Solo partidos aún abiertos a pronóstico — excluye CERRADO y FINALIZADO
  const abiertos = encuentros.filter((e) => e.status === "ABIERTO")

  return {
    equipoNombre: equipo?.Nombre ?? "(sin equipo)",
    encuentros: abiertos,
    misPronosticos,
  }
}

export interface VistaPronosticos {
  equipoNombre: string
  encuentros: EncuentroConEstado[]
  pronosticosEquipo: Record<string, Pronostico> // encuentroId → pronóstico oficial del equipo
}

/**
 * Vista de solo lectura de los pronósticos oficiales del equipo del usuario,
 * realizados por sus integrantes habilitados. Para roles de consulta (Admin, DT
 * y usuarios no habilitados) que solo visualizan, sin editar.
 */
export async function getVistaPronosticos(): Promise<VistaPronosticos> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  const equipoId = session.user.equipoId ?? null

  const [encuentros, equipo, miembros, todos] = await Promise.all([
    obtenerEncuentros(),
    equipoId ? getEquipo(equipoId) : Promise.resolve(null),
    equipoId ? listUsuariosByEquipo(equipoId) : Promise.resolve([]),
    listPronosticos(),
  ])

  const idsEquipo = new Set(miembros.map((u) => u.id))
  const pronosticosEquipo: Record<string, Pronostico> = {}
  for (const p of todos) {
    if (p.EncuentroId && p.UsuarioId && idsEquipo.has(p.UsuarioId)) {
      pronosticosEquipo[p.EncuentroId] = p
    }
  }

  return {
    equipoNombre: equipo?.Nombre ?? "(sin equipo)",
    encuentros,
    pronosticosEquipo,
  }
}
