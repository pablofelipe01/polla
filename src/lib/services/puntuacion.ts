// Lógica de puntuación del torneo. Función pura, testeable, sin dependencias de Next.js.

export type Marcador = { golesLocal: number; golesVisitante: number }

const signo = (a: number, b: number): -1 | 0 | 1 => (a > b ? 1 : a < b ? -1 : 0)

/**
 * Calcula los puntos de un pronóstico contra el resultado oficial.
 * - 3 puntos: marcador exacto.
 * - 1 punto: acierta el ganador (solo cuando el resultado no es empate).
 * - 0 puntos: resultado empate sin marcador exacto, o ganador errado.
 *
 * Los empates no tienen ganador, por lo tanto no otorgan el punto de "acertar ganador"
 * aunque el pronóstico también sea empate.
 *
 * @param pred Marcador pronosticado por el equipo.
 * @param resultado Marcador oficial del encuentro.
 * @returns 3, 1 o 0.
 */
export function calcularPuntos(pred: Marcador, resultado: Marcador): 0 | 1 | 3 {
  if (
    pred.golesLocal === resultado.golesLocal &&
    pred.golesVisitante === resultado.golesVisitante
  ) {
    return 3
  }
  const hayGanador = resultado.golesLocal !== resultado.golesVisitante
  if (
    hayGanador &&
    signo(pred.golesLocal, pred.golesVisitante) === signo(resultado.golesLocal, resultado.golesVisitante)
  ) {
    return 1
  }
  return 0
}
