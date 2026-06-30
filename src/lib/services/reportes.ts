import {
  listContinentes,
  listEquipos,
  listIntegrantes,
  listUsuarios,
  listEncuentros,
  listPronosticos,
  type Usuario,
} from "@/lib/clients/airtable"
import { formatBogota } from "@/lib/match-status"
import { calcularPuntos } from "./puntuacion"
import { calcularRanking, type FilaRanking } from "./ranking"

// Agregaciones para export Excel, respaldo JSON y estadísticas. Sin Next.js.

/** Carga cruda de todas las tablas (una sola pasada, en paralelo). */
async function cargarTodo() {
  const [continentes, equipos, integrantes, usuarios, encuentros, pronosticos] = await Promise.all([
    listContinentes(),
    listEquipos(),
    listIntegrantes(),
    listUsuarios(),
    listEncuentros(),
    listPronosticos(),
  ])
  return { continentes, equipos, integrantes, usuarios, encuentros, pronosticos }
}

export type FilaPronostico = {
  fase: string
  encuentro: string
  inicio: string
  equipo: string
  continente: string
  pronostico: string
  resultado: string
  puntos: number | "—"
  registradoPor: string
}

/** Filas detalladas de pronósticos con puntos calculados, para la hoja de Excel. */
export async function obtenerFilasPronosticos(): Promise<FilaPronostico[]> {
  const { continentes, equipos, usuarios, encuentros, pronosticos } = await cargarTodo()
  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))
  const eqMap = new Map(equipos.map((e) => [e.id, e]))
  const encMap = new Map(encuentros.map((e) => [e.id, e]))
  // Resuelve equipoId desde el usuario que hizo el pronóstico
  const usuarioEquipo = new Map(usuarios.filter((u) => u.EquipoId).map((u) => [u.id, u.EquipoId!]))

  return pronosticos.map((p) => {
    const enc = p.EncuentroId ? encMap.get(p.EncuentroId) : undefined
    const equipoId = p.UsuarioId ? usuarioEquipo.get(p.UsuarioId) : undefined
    const eq = equipoId ? eqMap.get(equipoId) : undefined
    const finalizado = enc && enc.GolesLocal !== null && enc.GolesVisitante !== null
    return {
      fase: enc?.Fase ?? "—",
      encuentro: enc ? `${enc.Local} vs ${enc.Visitante}` : "—",
      inicio: enc ? formatBogota(enc.FechaHoraUtc) : "—",
      equipo: eq?.Nombre ?? "—",
      continente: eq?.ContinenteId ? contNombre.get(eq.ContinenteId) ?? "—" : "—",
      pronostico: `${p.GolesLocal} - ${p.GolesVisitante}`,
      resultado: finalizado ? `${enc!.GolesLocal} - ${enc!.GolesVisitante}` : "—",
      puntos: finalizado
        ? calcularPuntos(
            { golesLocal: p.GolesLocal, golesVisitante: p.GolesVisitante },
            { golesLocal: enc!.GolesLocal!, golesVisitante: enc!.GolesVisitante! }
          )
        : "—",
      registradoPor: p.RegistradoPor,
    }
  })
}

/** Snapshot completo para respaldo JSON. Omite el hash de contraseña de los usuarios. */
export async function obtenerRespaldo() {
  const data = await cargarTodo()
  const usuarios = data.usuarios.map((u: Usuario) => ({
    id: u.id,
    Email: u.Email,
    Nombre: u.Nombre,
    Rol: u.Rol,
    EquipoId: u.EquipoId,
    ContinenteId: u.ContinenteId,
    Activo: u.Activo,
  }))
  return {
    generadoEn: new Date().toISOString(),
    ...data,
    usuarios,
  }
}

export type Estadisticas = {
  totalEquipos: number
  totalIntegrantes: number
  totalEncuentros: number
  encuentrosFinalizados: number
  totalPronosticos: number
  promedioPuntos: number
  aciertosExactos: number
  lider: FilaRanking | null
  porContinente: { continente: string; equipos: number; puntos: number }[]
}

/** Métricas agregadas de la competencia para la página de estadísticas. */
export async function calcularEstadisticas(): Promise<Estadisticas> {
  const [{ integrantes, encuentros, pronosticos }, ranking] = await Promise.all([
    cargarTodo(),
    calcularRanking(),
  ])

  const finalizados = encuentros.filter((e) => e.GolesLocal !== null && e.GolesVisitante !== null)
  const totalPuntos = ranking.reduce((s, f) => s + f.puntos, 0)
  const aciertosExactos = ranking.reduce((s, f) => s + f.aciertosExactos, 0)

  const contMap = new Map<string, { equipos: number; puntos: number }>()
  for (const f of ranking) {
    const c = contMap.get(f.continente) ?? { equipos: 0, puntos: 0 }
    c.equipos++
    c.puntos += f.puntos
    contMap.set(f.continente, c)
  }

  return {
    totalEquipos: ranking.length,
    totalIntegrantes: integrantes.length,
    totalEncuentros: encuentros.length,
    encuentrosFinalizados: finalizados.length,
    totalPronosticos: pronosticos.length,
    promedioPuntos: ranking.length ? Math.round((totalPuntos / ranking.length) * 10) / 10 : 0,
    aciertosExactos,
    lider: ranking[0] ?? null,
    porContinente: [...contMap.entries()]
      .map(([continente, v]) => ({ continente, ...v }))
      .sort((a, b) => b.puntos - a.puntos),
  }
}
