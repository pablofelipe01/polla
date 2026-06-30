#!/usr/bin/env node
/**
 * Crea los 6 continentes del Mundial 2026 en la tabla Continentes de Airtable.
 * Idempotente: si el continente ya existe (por nombre), lo omite.
 *
 * Uso:
 *   npm run seed:continentes
 */

import { readFileSync } from "fs"
import { resolve } from "path"

function loadEnv() {
  for (const p of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), p), "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = value
      }
      console.log(`✓ Variables cargadas desde ${p}`)
      break
    } catch { /* continuar */ }
  }
}

loadEnv()

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.error("✗ Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID")
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
}

const CONTINENTES = [
  { Nombre: "UEFA — Europa",              DT: "", CuerpoTecnico: "" },
  { Nombre: "CONMEBOL — Sudamérica",      DT: "", CuerpoTecnico: "" },
  { Nombre: "CONCACAF — América del Norte y Centro",  DT: "", CuerpoTecnico: "" },
  { Nombre: "CAF — África",               DT: "", CuerpoTecnico: "" },
  { Nombre: "AFC — Asia",                 DT: "", CuerpoTecnico: "" },
  { Nombre: "OFC — Oceanía",              DT: "", CuerpoTecnico: "" },
]

// Leer continentes existentes
const listRes = await fetch(`https://api.airtable.com/v0/${baseId}/Continentes`, { headers })
if (!listRes.ok) { console.error("✗ Error leyendo Continentes:", await listRes.text()); process.exit(1) }
const { records: existentes } = await listRes.json() as { records: { id: string; fields: { Nombre: string } }[] }
const nombresExistentes = new Set(existentes.map((r) => r.fields.Nombre))

let creados = 0
let omitidos = 0

for (const c of CONTINENTES) {
  if (nombresExistentes.has(c.Nombre)) {
    console.log(`⏭  Ya existe: ${c.Nombre}`)
    omitidos++
    continue
  }
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Continentes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ records: [{ fields: { Nombre: c.Nombre, DT: c.DT, CuerpoTecnico: c.CuerpoTecnico, Activo: true } }] }),
  })
  if (!res.ok) { console.error(`✗ Error creando ${c.Nombre}:`, await res.text()); continue }
  console.log(`✓ Creado: ${c.Nombre}`)
  creados++
  await new Promise((r) => setTimeout(r, 300)) // throttle
}

console.log(`\n✅ Listo — ${creados} creados, ${omitidos} ya existían.`)
console.log("Ahora puedes asignar DTs y crear equipos desde el panel de admin.")
