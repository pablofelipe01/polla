"use server"

import { z } from "zod"
import { revalidatePath, revalidateTag } from "next/cache"
import { auth, canPredict, isAdmin } from "@/lib/auth"
import { ForbiddenError, UnauthorizedError } from "@/types/errors"
import { logger } from "@/lib/logger"
import { registrarPronostico } from "@/lib/services/pronosticos"
import {
  obtenerEncuentros,
  type EncuentroConEstado,
} from "@/lib/services/encuentros"
import {
  listPronosticos,
  listEquipos,
  getEquipo,
  listContinentes,
  listUsuariosByEquipoNombre,
  CACHE_TAGS,
  type Pronostico,
  type Usuario,
} from "@/lib/clients/airtable"

export interface ActionState {
  error?: string
  success?: boolean
}

const PronosticoSchema = z.object({
  encuentroId: z.string().trim().min(1),
  equipoId: z.string().trim().min(1),
  golesLocal: z.coerce.number().int().min(0).max(50),
  golesVisitante: z.coerce.number().int().min(0).max(50),
})

/**
 * Registra el pronóstico oficial de un equipo. Solo el DT o Cuerpo Técnico del
 * continente del equipo puede hacerlo. Valida que el equipo sea de su continente
 * para impedir pronosticar por equipos ajenos.
 */
export async function registrarPronosticoAction(
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  if (!canPredict(session)) throw new ForbiddenError("Tu rol no permite registrar pronósticos")

  const registradoPorId = session.user.id
  if (!registradoPorId) {
    return { error: "No se pudo identificar tu usuario. Vuelve a iniciar sesión." }
  }

  const parsed = PronosticoSchema.safeParse({
    encuentroId: fd.get("encuentroId"),
    equipoId: fd.get("equipoId"),
    golesLocal: fd.get("golesLocal"),
    golesVisitante: fd.get("golesVisitante"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // El ayudante (CuerpoTecnico) solo pronostica por su equipo asignado; el DT por
  // cualquier equipo de su continente (Admin no llega: canPredict = isDT).
  const equipo = await getEquipo(parsed.data.equipoId)
  if (!equipo) return { error: "Equipo no encontrado" }
  if (session.user.role === "CuerpoTecnico") {
    if (equipo.id !== (session.user.equipoId ?? null)) {
      return { error: "Solo puedes pronosticar por tu equipo asignado" }
    }
  } else if (equipo.ContinenteId !== (session.user.continenteId ?? null)) {
    return { error: "Ese equipo no pertenece a tu continente" }
  }

  const res = await registrarPronostico({
    encuentroId: parsed.data.encuentroId,
    equipoId: parsed.data.equipoId,
    registradoPorId,
    registradoPor: session.user.email ?? "",
    golesLocal: parsed.data.golesLocal,
    golesVisitante: parsed.data.golesVisitante,
  })
  if (!res.ok) {
    logger.warn("registrarPronostico rechazado", { error: res.error.code })
    return { error: res.error.message }
  }
  revalidateTag(CACHE_TAGS.pronosticos, "max")
  revalidatePath("/pronosticos")
  return { success: true }
}

export interface EquipoOpcion {
  id: string
  nombre: string
}

export interface DatosPanel {
  equipos: EquipoOpcion[] // equipos del continente del DT (para el selector)
  equipoId: string | null
  equipoNombre: string
  encuentros: EncuentroConEstado[]
  misPronosticos: Record<string, Pronostico> // encuentroId → pronóstico del equipo
}

/**
 * Carga los datos del panel de pronósticos del DT/Cuerpo Técnico para un equipo:
 * los equipos de su continente (para el selector) y los pronósticos ya registrados
 * del equipo seleccionado, junto con los encuentros aún abiertos.
 *
 * @param equipoIdSel - Equipo elegido en el selector; si no es del continente, usa el primero.
 */
export async function getDatosPanel(equipoIdSel?: string): Promise<DatosPanel> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  const continenteId = session.user.continenteId ?? null

  const [encuentros, equipos, todos] = await Promise.all([
    obtenerEncuentros(),
    listEquipos(),
    listPronosticos(),
  ])

  // Equipos visibles: Admin todos (no edita); el ayudante (CuerpoTecnico) solo su
  // equipo asignado; el DT todos los de su continente.
  const delContinente = isAdmin(session)
    ? equipos
    : session.user.role === "CuerpoTecnico"
      ? equipos.filter((e) => e.id === (session.user.equipoId ?? null))
      : equipos.filter((e) => e.ContinenteId === continenteId)
  const opciones = delContinente.map((e) => ({ id: e.id, nombre: e.Nombre }))

  // Equipo seleccionado: el pedido si pertenece al continente, si no el primero.
  const equipoId =
    equipoIdSel && delContinente.some((e) => e.id === equipoIdSel)
      ? equipoIdSel
      : delContinente[0]?.id ?? null
  const equipo = delContinente.find((e) => e.id === equipoId) ?? null

  const misPronosticos: Record<string, Pronostico> = {}
  if (equipoId) {
    for (const p of todos) {
      if (p.EquipoId === equipoId && p.EncuentroId) misPronosticos[p.EncuentroId] = p
    }
  }

  // Solo partidos aún abiertos a pronóstico — excluye CERRADO y FINALIZADO
  const abiertos = encuentros.filter((e) => e.status === "ABIERTO")

  return {
    equipos: opciones,
    equipoId,
    equipoNombre: equipo?.Nombre ?? "(sin equipo)",
    encuentros: abiertos,
    misPronosticos,
  }
}

export interface VistaPronosticos {
  equipos: EquipoOpcion[] // equipos que el espectador puede elegir (Admin: todos; usuario: solo el suyo)
  equipoId: string | null
  equipoNombre: string
  continenteNombre: string | null // continente al que pertenece el equipo seleccionado
  miembros: Usuario[] // integrantes (plantilla) del equipo seleccionado
  encuentros: EncuentroConEstado[]
  pronosticosEquipo: Record<string, Pronostico> // encuentroId → pronóstico oficial del equipo
}

/**
 * Vista de solo lectura de los pronósticos oficiales de un equipo.
 * - Usuario regular: ve su propio equipo (integrantes + pronósticos).
 * - Admin: puede ver cualquier equipo mediante un selector (no pertenece a ninguno).
 *
 * @param equipoIdSel - Equipo elegido en el selector (solo aplica al Admin).
 */
export async function getVistaPronosticos(equipoIdSel?: string): Promise<VistaPronosticos> {
  const session = await auth()
  if (!session?.user) throw new UnauthorizedError()
  const admin = isAdmin(session)

  // Admin ve cualquier equipo (selector con todos); el usuario regular solo el suyo.
  const todosEquipos = admin ? await listEquipos() : []
  const opciones = todosEquipos.map((e) => ({ id: e.id, nombre: e.Nombre }))

  const equipoId = admin
    ? equipoIdSel && todosEquipos.some((e) => e.id === equipoIdSel)
      ? equipoIdSel
      : todosEquipos[0]?.id ?? null
    : session.user.equipoId ?? null

  const [encuentros, equipo, todos, continentes] = await Promise.all([
    obtenerEncuentros(),
    equipoId ? getEquipo(equipoId) : Promise.resolve(null),
    listPronosticos(),
    listContinentes(),
  ])

  const continenteNombre = equipo?.ContinenteId
    ? continentes.find((c) => c.id === equipo.ContinenteId)?.Nombre ?? null
    : null

  // Integrantes (plantilla): solo jugadores (Rol=Usuario), sin DT ni ayudante.
  const miembros = equipo
    ? (await listUsuariosByEquipoNombre(equipo.Nombre)).filter((u) => u.Rol === "Usuario")
    : []

  const pronosticosEquipo: Record<string, Pronostico> = {}
  if (equipoId) {
    for (const p of todos) {
      if (p.EncuentroId && p.EquipoId === equipoId) pronosticosEquipo[p.EncuentroId] = p
    }
  }

  return {
    equipos: opciones,
    equipoId,
    equipoNombre: equipo?.Nombre ?? "(sin equipo)",
    continenteNombre,
    miembros,
    encuentros,
    pronosticosEquipo,
  }
}
