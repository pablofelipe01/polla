"use server"

import { z } from "zod"
import { revalidatePath, revalidateTag } from "next/cache"
import { DateTime } from "luxon"
import { auth, isAdmin } from "@/lib/auth"
import { UnauthorizedError } from "@/types/errors"
import { logger } from "@/lib/logger"
import {
  obtenerContinentes,
  crearContinente,
  editarContinente,
  eliminarContinente,
  obtenerEquipos,
  crearEquipo,
  editarEquipo,
  eliminarEquipo,
  agregarIntegrante,
  eliminarIntegrante,
  vincularCuerpoTecnico,
} from "@/lib/services/torneo"
import {
  obtenerEncuentros,
  crearEncuentro,
  editarEncuentro,
  eliminarEncuentro,
  registrarResultado,
} from "@/lib/services/encuentros"
import { sincronizarPartidos } from "@/lib/services/sincronizacion"
import { asignarMiembro, retirarMiembro } from "@/lib/services/dt"
import {
  createUsuario,
  deleteUsuario,
  findUsuarioByCedula,
  searchUsuarios,
  listUsuariosByEquipoNombre,
  listUsuariosPagina,
  CACHE_TAGS,
  type Usuario,
} from "@/lib/clients/airtable"
import { listTodosLosPaises } from "@/lib/data/confederaciones"

// ─── Guard ──────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth()
  if (!isAdmin(session)) throw new UnauthorizedError()
}

export interface ActionState {
  error?: string
  success?: boolean
}

/**
 * Invalida rutas + la Data Cache de las entidades pequeñas (baratas de recargar).
 * NO invalida `usuarios` (lectura cara ~2.179): las acciones que cambian usuarios
 * llaman además a `revalidateTag(CACHE_TAGS.usuarios, "max")`.
 */
function revalidarTodo() {
  revalidateTag(CACHE_TAGS.continentes, "max")
  revalidateTag(CACHE_TAGS.equipos, "max")
  revalidateTag(CACHE_TAGS.encuentros, "max")
  revalidateTag(CACHE_TAGS.pronosticos, "max")
  revalidatePath("/admin")
  revalidatePath("/panel")
  revalidatePath("/")
}

/** datetime-local (hora Colombia) → ISO UTC. */
function aUtc(raw: string): string {
  if (!raw) return raw
  const s = raw.trim()
  if (s.endsWith("Z") || s.includes("+")) return s
  const bogota = DateTime.fromISO(s, { zone: "America/Bogota" })
  return bogota.isValid ? bogota.toUTC().toISO() ?? s : s
}

// ─── Lectores de datos para el panel ──────────────────────────────────────────────

/**
 * Datos del panel admin. NO incluye la tabla de usuarios (~2.179): la pestaña
 * Usuarios la consulta paginada/por búsqueda bajo demanda, para que `/admin`
 * cargue rápido siempre. Solo trae tablas pequeñas.
 */
export async function getDatosAdmin() {
  await requireAdmin()
  const [continentes, equipos, encuentros] = await Promise.all([
    obtenerContinentes(),
    obtenerEquipos(),
    obtenerEncuentros(),
  ])
  // Lista estática completa — todos los miembros FIFA por confederación, no solo los del Mundial.
  const paises = listTodosLosPaises()
  return { continentes, equipos, encuentros, paises }
}

// ─── Sincronización football-data.org ─────────────────────────────────────────

export type SincronizacionState = {
  error?: string
  resultado?: { creados: number; actualizados: number; errores: number; totalPartidos: number }
}

/**
 * Sincroniza los partidos del Mundial 2026 desde football-data.org.
 * Requiere FOOTBALL_DATA_API_KEY en el entorno.
 * Crea partidos nuevos y actualiza marcadores de los FINISHED.
 */
export async function sincronizarPartidosAction(_p: SincronizacionState): Promise<SincronizacionState> {
  await requireAdmin()
  try {
    const resultado = await sincronizarPartidos()
    revalidarTodo()
    return { resultado }
  } catch (e) {
    logger.error(e, { action: "sincronizarPartidos" })
    const msg = e instanceof Error ? e.message : "Error sincronizando partidos"
    return { error: msg }
  }
}

// ─── Continentes ────────────────────────────────────────────────────────────────

const ContinenteSchema = z.object({
  Nombre: z.string().trim().min(1, "El nombre es requerido"),
  DT: z.string().trim().default(""),
  CuerpoTecnico: z.string().trim().default(""),
})

/** IDs de los usuarios elegidos: el DT (Rol=DT) y su cuerpo técnico (Rol=CuerpoTecnico). */
const VinculoSchema = z.object({
  DTUsuarioId: z.string().trim().default(""),
  CuerpoTecnicoIds: z.string().trim().default(""), // ids separados por salto de línea
})

export async function crearContinenteAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = ContinenteSchema.safeParse({
    Nombre: fd.get("Nombre"),
    DT: fd.get("DT") ?? "",
    CuerpoTecnico: fd.get("CuerpoTecnico") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  try {
    await crearContinente({ ...parsed.data, Activo: true })
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "crearContinente" })
    return { error: "Error creando el continente" }
  }
}

export async function editarContinenteAction(
  id: string,
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  await requireAdmin()
  const parsed = ContinenteSchema.safeParse({
    Nombre: fd.get("Nombre"),
    DT: fd.get("DT") ?? "",
    CuerpoTecnico: fd.get("CuerpoTecnico") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const vinculo = VinculoSchema.safeParse({
    DTUsuarioId: fd.get("DTUsuarioId") ?? "",
    CuerpoTecnicoIds: fd.get("CuerpoTecnicoIds") ?? "",
  })
  const dtUsuarioId = vinculo.success ? vinculo.data.DTUsuarioId : ""
  const cuerpoTecnicoIds = vinculo.success ? vinculo.data.CuerpoTecnicoIds.split("\n") : []

  try {
    await editarContinente(id, parsed.data)
    // Promueve al DT (Rol=DT) y a su cuerpo técnico (Rol=CuerpoTecnico) y les asigna el continente.
    await vincularCuerpoTecnico(id, dtUsuarioId, cuerpoTecnicoIds)
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "editarContinente" })
    return { error: "Error actualizando el continente" }
  }
}

export async function eliminarContinenteAction(id: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await eliminarContinente(id)
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "eliminarContinente" })
    return { error: "Error eliminando el continente" }
  }
}

// ─── Equipos ─────────────────────────────────────────────────────────────────────

const EquipoSchema = z.object({
  Nombre: z.string().trim().min(1, "El nombre es requerido"),
  ContinenteId: z.string().trim().min(1, "Selecciona un continente"),
  Paises: z.string().trim().default(""),
})

export async function crearEquipoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = EquipoSchema.safeParse({
    Nombre: fd.get("Nombre"),
    ContinenteId: fd.get("ContinenteId"),
    Paises: fd.get("Paises") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  try {
    await crearEquipo({
      Nombre: parsed.data.Nombre,
      ContinenteId: parsed.data.ContinenteId,
      Paises: parsed.data.Paises,
      Activo: true,
    })
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "crearEquipo" })
    return { error: "Error creando el equipo" }
  }
}

export async function editarEquipoAction(
  id: string,
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  await requireAdmin()
  const parsed = EquipoSchema.safeParse({
    Nombre: fd.get("Nombre"),
    ContinenteId: fd.get("ContinenteId"),
    Paises: fd.get("Paises") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  try {
    await editarEquipo(id, parsed.data)
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "editarEquipo" })
    return { error: "Error actualizando el equipo" }
  }
}

export async function eliminarEquipoAction(id: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await eliminarEquipo(id)
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "eliminarEquipo" })
    return { error: "Error eliminando el equipo" }
  }
}

// ─── Integrantes ──────────────────────────────────────────────────────────────────

const IntegranteSchema = z.object({
  Nombre: z.string().trim().min(1, "El nombre es requerido"),
  Cedula: z.string().trim().default(""),
  EquipoId: z.string().trim().min(1, "Selecciona un equipo"),
})

export async function agregarIntegranteAction(
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  await requireAdmin()
  const parsed = IntegranteSchema.safeParse({
    Nombre: fd.get("Nombre"),
    Cedula: fd.get("Cedula") ?? "",
    EquipoId: fd.get("EquipoId"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const res = await agregarIntegrante(parsed.data)
  if (!res.ok) return { error: res.error.message }
  revalidarTodo()
  return { success: true }
}

export async function eliminarIntegranteAction(id: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await eliminarIntegrante(id)
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "eliminarIntegrante" })
    return { error: "Error eliminando el integrante" }
  }
}

/**
 * Asigna un usuario de la base de datos a un equipo (escribe su EquipoId).
 * Reutiliza la lógica de negocio del servicio DT.
 */
export async function asignarUsuarioEquipoAction(
  usuarioId: string,
  equipoId: string
): Promise<ActionState> {
  await requireAdmin()
  const res = await asignarMiembro(usuarioId, equipoId)
  if (!res.ok) return { error: res.error.message }
  revalidateTag(CACHE_TAGS.usuarios, "max")
  revalidarTodo()
  return { success: true }
}

/**
 * Busca usuarios de la base de datos por nombre o cédula (filtrado en servidor).
 * No carga la tabla completa: usa `searchUsuarios` con filterByFormula.
 */
export async function buscarUsuariosAction(
  query: string
): Promise<{ usuarios?: Usuario[]; error?: string }> {
  await requireAdmin()
  try {
    return { usuarios: await searchUsuarios(query) }
  } catch (e) {
    logger.error(e, { action: "buscarUsuarios" })
    return { error: "Error buscando usuarios" }
  }
}

/**
 * Lista los integrantes de un equipo filtrando en servidor por su nombre.
 */
export async function listarMiembrosEquipoAction(
  equipoNombre: string
): Promise<{ miembros?: Usuario[]; error?: string }> {
  await requireAdmin()
  try {
    return { miembros: await listUsuariosByEquipoNombre(equipoNombre) }
  } catch (e) {
    logger.error(e, { action: "listarMiembrosEquipo" })
    return { error: "Error cargando integrantes" }
  }
}

/**
 * Devuelve una página de usuarios (orden por nombre) para navegar la lista sin
 * cargar la tabla completa. `offset` encadena la página siguiente.
 */
export async function listarUsuariosPaginaAction(
  offset?: string
): Promise<{ usuarios?: Usuario[]; offset?: string; error?: string }> {
  await requireAdmin()
  try {
    const { usuarios, offset: next } = await listUsuariosPagina(offset)
    return { usuarios, offset: next }
  } catch (e) {
    logger.error(e, { action: "listarUsuariosPagina" })
    return { error: "Error cargando usuarios" }
  }
}

/**
 * Retira a un usuario de su equipo (limpia EquipoId y desactiva pronósticos).
 */
export async function quitarUsuarioEquipoAction(usuarioId: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await retirarMiembro(usuarioId)
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "quitarUsuarioEquipo" })
    return { error: "Error retirando el usuario del equipo" }
  }
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────────

const UsuarioSchema = z
  .object({
    Cedula: z.string().trim().min(4, "La cédula es requerida"),
    Nombre: z.string().trim().min(1, "El nombre es requerido"),
    Rol: z.enum(["Admin", "DT", "CuerpoTecnico", "Usuario"]),
    EquipoId: z.string().trim().optional().default(""),
    ContinenteId: z.string().trim().optional().default(""),
  })
  .refine((d) => (d.Rol !== "DT" && d.Rol !== "CuerpoTecnico") || d.ContinenteId.length > 0, {
    message: "Un DT o Cuerpo Técnico debe tener un continente asignado",
    path: ["ContinenteId"],
  })

export async function crearUsuarioAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = UsuarioSchema.safeParse({
    Cedula: fd.get("Cedula"),
    Nombre: fd.get("Nombre"),
    Rol: fd.get("Rol"),
    EquipoId: fd.get("EquipoId") ?? "",
    ContinenteId: fd.get("ContinenteId") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data

  if (await findUsuarioByCedula(d.Cedula)) {
    return { error: "Ya existe un usuario con esa cédula" }
  }

  try {
    await createUsuario({
      Cedula: d.Cedula,
      Nombre: d.Nombre,
      Rol: d.Rol,
      EquipoId: null,
      ContinenteId: (d.Rol === "DT" || d.Rol === "CuerpoTecnico") ? d.ContinenteId || null : null,
      Activo: true,
      PuedePronosticar: false,
    })
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "crearUsuario" })
    return { error: "Error creando el usuario" }
  }
}

export async function eliminarUsuarioAction(id: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await deleteUsuario(id)
    revalidateTag(CACHE_TAGS.usuarios, "max")
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "eliminarUsuario" })
    return { error: "Error eliminando el usuario" }
  }
}

// ─── Encuentros ───────────────────────────────────────────────────────────────────

const EncuentroSchema = z.object({
  Local: z.string().trim().min(1, "El equipo local es requerido"),
  Visitante: z.string().trim().min(1, "El visitante es requerido"),
  Fase: z.string().trim().min(1, "La fase es requerida"),
  FechaHoraUtc: z.string().trim().min(1, "La fecha es requerida"),
  CierreUtc: z.string().trim().optional().default(""),
})

function parseEncuentro(fd: FormData) {
  return EncuentroSchema.safeParse({
    Local: fd.get("Local"),
    Visitante: fd.get("Visitante"),
    Fase: fd.get("Fase"),
    FechaHoraUtc: fd.get("FechaHoraUtc"),
    CierreUtc: fd.get("CierreUtc") ?? "",
  })
}

export async function crearEncuentroAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const parsed = parseEncuentro(fd)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data
  try {
    await crearEncuentro({
      Local: d.Local,
      Visitante: d.Visitante,
      Fase: d.Fase,
      FechaHoraUtc: aUtc(d.FechaHoraUtc),
      CierreUtc: d.CierreUtc ? aUtc(d.CierreUtc) : null,
    })
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "crearEncuentro" })
    return { error: "Error creando el encuentro" }
  }
}

export async function editarEncuentroAction(
  id: string,
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  await requireAdmin()
  const parsed = parseEncuentro(fd)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const d = parsed.data
  try {
    await editarEncuentro(id, {
      Local: d.Local,
      Visitante: d.Visitante,
      Fase: d.Fase,
      FechaHoraUtc: aUtc(d.FechaHoraUtc),
      CierreUtc: d.CierreUtc ? aUtc(d.CierreUtc) : null,
    })
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "editarEncuentro" })
    return { error: "Error actualizando el encuentro" }
  }
}

export async function eliminarEncuentroAction(id: string): Promise<ActionState> {
  await requireAdmin()
  try {
    await eliminarEncuentro(id)
    revalidarTodo()
    return { success: true }
  } catch (e) {
    logger.error(e, { action: "eliminarEncuentro" })
    return { error: "Error eliminando el encuentro" }
  }
}

const ResultadoSchema = z.object({
  golesLocal: z.coerce.number().int().min(0).max(50),
  golesVisitante: z.coerce.number().int().min(0).max(50),
})

export async function registrarResultadoAction(
  id: string,
  _p: ActionState,
  fd: FormData
): Promise<ActionState> {
  await requireAdmin()
  const parsed = ResultadoSchema.safeParse({
    golesLocal: fd.get("golesLocal"),
    golesVisitante: fd.get("golesVisitante"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const forzar = fd.get("forzar") === "true"
  const res = await registrarResultado(id, parsed.data.golesLocal, parsed.data.golesVisitante, forzar)
  if (!res.ok) return { error: res.error.message }
  revalidarTodo()
  return { success: true }
}
