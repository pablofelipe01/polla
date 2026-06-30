import {
  listEquipos,
  listContinentes,
  listEncuentros,
  listPronosticos,
  listUsuarios,
} from "@/lib/clients/airtable"
import { calcularPuntos } from "./puntuacion"

// Lógica de agregación del ranking. Agnóstica a Next.js.

export type FilaRanking = {
  equipoId: string
  equipo: string
  continente: string
  puntos: number
  aciertosExactos: number
  pronosticos: number
  jugados: number
}

/**
 * Construye la tabla de posiciones por equipo sumando 3/1/0 sobre los encuentros
 * ya finalizados. Cada pronóstico pertenece a un usuario habilitado; se cruza
 * usuarioId → equipoId para acumular los puntos al equipo correspondiente.
 * Con 2 habilitados por equipo, cada uno contribuye independientemente.
 * Ordena por puntos desc, luego por marcadores exactos desc.
 *
 * @returns Filas del ranking ordenadas (incluye equipos sin puntos).
 */
export async function calcularRanking(): Promise<FilaRanking[]> {
  const [equipos, continentes, encuentros, pronosticos, usuarios] = await Promise.all([
    listEquipos(),
    listContinentes(),
    listEncuentros(),
    listPronosticos(),
    listUsuarios(),
  ])

  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))
  // Mapa usuarioId → equipoId para resolver a qué equipo pertenece cada pronóstico
  const usuarioEquipo = new Map(
    usuarios.filter((u) => u.EquipoId).map((u) => [u.id, u.EquipoId!])
  )
  const finalizados = encuentros.filter(
    (e) => e.GolesLocal !== null && e.GolesVisitante !== null
  )
  const resultado = new Map(finalizados.map((e) => [e.id, e]))

  const filas = new Map<string, FilaRanking>(
    equipos.map((eq) => [
      eq.id,
      {
        equipoId: eq.id,
        equipo: eq.Nombre,
        continente: eq.ContinenteId ? contNombre.get(eq.ContinenteId) ?? "—" : "—",
        puntos: 0,
        aciertosExactos: 0,
        pronosticos: 0,
        jugados: 0,
      },
    ])
  )

  for (const p of pronosticos) {
    if (!p.UsuarioId) continue
    const equipoId = usuarioEquipo.get(p.UsuarioId)
    if (!equipoId) continue
    const fila = filas.get(equipoId)
    if (!fila) continue
    fila.pronosticos++
    const enc = p.EncuentroId ? resultado.get(p.EncuentroId) : undefined
    if (!enc) continue
    fila.jugados++
    const pts = calcularPuntos(
      { golesLocal: p.GolesLocal, golesVisitante: p.GolesVisitante },
      { golesLocal: enc.GolesLocal!, golesVisitante: enc.GolesVisitante! }
    )
    fila.puntos += pts
    if (pts === 3) fila.aciertosExactos++
  }

  return [...filas.values()].sort(
    (a, b) => b.puntos - a.puntos || b.aciertosExactos - a.aciertosExactos
  )
}
