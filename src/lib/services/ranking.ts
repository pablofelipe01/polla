import {
  listEquipos,
  listContinentes,
  listEncuentros,
  listPronosticos,
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
 * ya finalizados. Cada pronóstico es el oficial del equipo (registrado por su DT
 * o Cuerpo Técnico) y ya trae su EquipoId, así que se acumula directo.
 * Ordena por puntos desc, luego por marcadores exactos desc.
 *
 * @returns Filas del ranking ordenadas (incluye equipos sin puntos).
 */
export async function calcularRanking(): Promise<FilaRanking[]> {
  const [equipos, continentes, encuentros, pronosticos] = await Promise.all([
    listEquipos(),
    listContinentes(),
    listEncuentros(),
    listPronosticos(),
  ])

  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))
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
    if (!p.EquipoId) continue
    const fila = filas.get(p.EquipoId)
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
