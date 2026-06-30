#!/usr/bin/env node
/**
 * Test ejecutable de la lógica de puntuación (sin runner externo).
 * Uso: npm test
 */
import assert from "node:assert/strict"
import { calcularPuntos } from "../src/lib/services/puntuacion.ts"

const casos: Array<[string, Parameters<typeof calcularPuntos>, 0 | 1 | 3]> = [
  ["marcador exacto", [{ golesLocal: 2, golesVisitante: 1 }, { golesLocal: 2, golesVisitante: 1 }], 3],
  ["acierta ganador local", [{ golesLocal: 3, golesVisitante: 0 }, { golesLocal: 2, golesVisitante: 1 }], 1],
  ["acierta ganador visitante", [{ golesLocal: 0, golesVisitante: 2 }, { golesLocal: 1, golesVisitante: 4 }], 1],
  ["acierta empate (no exacto)", [{ golesLocal: 1, golesVisitante: 1 }, { golesLocal: 2, golesVisitante: 2 }], 1],
  ["empate exacto", [{ golesLocal: 0, golesVisitante: 0 }, { golesLocal: 0, golesVisitante: 0 }], 3],
  ["falla ganador", [{ golesLocal: 2, golesVisitante: 0 }, { golesLocal: 0, golesVisitante: 1 }], 0],
  ["predijo empate, fue victoria", [{ golesLocal: 1, golesVisitante: 1 }, { golesLocal: 2, golesVisitante: 0 }], 0],
]

let ok = 0
for (const [nombre, args, esperado] of casos) {
  const got = calcularPuntos(...args)
  assert.equal(got, esperado, `${nombre}: esperado ${esperado}, obtenido ${got}`)
  console.log(`✓ ${nombre} → ${got}`)
  ok++
}
console.log(`\n${ok}/${casos.length} casos OK`)
