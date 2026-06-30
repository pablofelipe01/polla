#!/usr/bin/env node
/**
 * Migra la tabla Colaboradores → Usuarios para el sistema Mundial 2026.
 *
 * Login por cédula (sin contraseña). Por cada colaborador crea un Usuario con:
 *   - Email: cédula (campo primario de Airtable)
 *   - Cedula: cédula
 *   - Nombre: nombre completo
 *   - Rol: "Usuario"
 *   - PuedePronosticar: false
 *   - Activo: true
 *
 * Idempotente: omite colaboradores cuya cédula ya existe en Usuarios.
 *
 * Uso: npm run migrate:colaboradores
 */

import { readFileSync } from "fs"
import { resolve } from "path"

function loadEnv() {
  for (const p of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), p), "utf-8")
      for (const line of content.split("\n")) {
        const t = line.trim()
        if (!t || t.startsWith("#")) continue
        const eq = t.indexOf("=")
        if (eq === -1) continue
        const key = t.slice(0, eq).trim()
        const raw = t.slice(eq + 1).trim()
        const unquoted = raw.replace(/^["'].*["']$/, "")
        const value = (unquoted === raw ? raw.replace(/\s+#.*$/, "") : raw)
          .trim()
          .replace(/^["']|["']$/g, "")
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
  console.error("✗ Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID en .env")
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
}

const TABLA_USUARIOS      = "tbl8vzN9fZ5c7tQZR"
const TABLA_COLABORADORES = "tbluUMBIZxT0cpyDL"
const FIELD_ROL_ID        = "fldHHnMNNAxtZog7W"

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Paso 1: verificar que la opción "Usuario" existe en Rol ─────────────────

console.log("\n[1/4] Verificando opción 'Usuario' en campo Rol…")

const schemaRes = await fetch(
  `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${TABLA_USUARIOS}/fields/${FIELD_ROL_ID}`,
  { headers }
)

if (schemaRes.ok) {
  const schema = await schemaRes.json() as { options?: { choices?: { name: string }[] } }
  const choices = schema.options?.choices?.map((c) => c.name) ?? []
  if (!choices.includes("Usuario")) {
    console.error("✗ La opción 'Usuario' no existe en el campo Rol.")
    console.error("  Agrégala manualmente en Airtable: tabla Usuarios → campo Rol → + Usuario")
    process.exit(1)
  }
  console.log("✓ Opción 'Usuario' confirmada:", choices.join(", "))
} else {
  // Si no se puede leer el schema, continuar e intentar crear registros de igual manera
  console.log("⚠ No se pudo verificar el schema (continuando de todas formas)…")
}
await delay(260)

// ── Paso 2: cargar cédulas existentes en Usuarios ────────────────────────────

console.log("\n[2/4] Cargando cédulas ya existentes en Usuarios…")

const existentes = new Set<string>()
let offsetU: string | undefined

do {
  const url = `https://api.airtable.com/v0/${baseId}/${TABLA_USUARIOS}?fields[]=Cedula&pageSize=100${offsetU ? `&offset=${offsetU}` : ""}`
  const res = await fetch(url, { headers })
  if (!res.ok) { console.error("✗ Error:", await res.text()); process.exit(1) }
  const data = await res.json() as { records: { fields: { Cedula?: string } }[]; offset?: string }
  for (const r of data.records) {
    if (r.fields.Cedula) existentes.add(r.fields.Cedula.trim())
  }
  offsetU = data.offset
  await delay(260)
} while (offsetU)

console.log(`✓ ${existentes.size} cédulas ya registradas (se omitirán)`)

// ── Paso 3: cargar todos los Colaboradores ───────────────────────────────────

console.log("\n[3/4] Leyendo tabla Colaboradores…")

type Colaborador = { cedula: string; nombre: string }
const colaboradores: Colaborador[] = []
let offsetC: string | undefined

do {
  const url = `https://api.airtable.com/v0/${baseId}/${TABLA_COLABORADORES}?fields[]=Cedula&fields[]=NombreCompleto&pageSize=100${offsetC ? `&offset=${offsetC}` : ""}`
  const res = await fetch(url, { headers })
  if (!res.ok) { console.error("✗ Error:", await res.text()); process.exit(1) }
  const data = await res.json() as {
    records: { fields: { Cedula?: string; NombreCompleto?: string } }[]
    offset?: string
  }
  for (const r of data.records) {
    const cedula = r.fields.Cedula?.trim()
    const nombre = r.fields.NombreCompleto?.trim()
    if (cedula && nombre) colaboradores.push({ cedula, nombre })
  }
  offsetC = data.offset
  await delay(260)
} while (offsetC)

console.log(`✓ ${colaboradores.length} colaboradores leídos`)

// ── Paso 4: crear Usuarios en lotes de 10 ───────────────────────────────────

const nuevos = colaboradores.filter((c) => !existentes.has(c.cedula))
console.log(`\n[4/4] Creando ${nuevos.length} usuarios nuevos (${colaboradores.length - nuevos.length} omitidos por duplicado)…`)

let creados = 0
let errores = 0
const BATCH = 10

for (let i = 0; i < nuevos.length; i += BATCH) {
  const lote = nuevos.slice(i, i + BATCH)

  const records = lote.map(({ cedula, nombre }) => ({
    fields: {
      Email: cedula,           // campo primario de Airtable
      Nombre: nombre,
      Cedula: cedula,
      Rol: "Usuario",
      Activo: true,
      // PuedePronosticar queda false por defecto
    },
  }))

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${TABLA_USUARIOS}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ records }),
  })

  if (!res.ok) {
    console.error(`  ✗ Lote ${Math.floor(i / BATCH) + 1} falló:`, await res.text())
    errores += lote.length
  } else {
    creados += lote.length
    const pct = Math.round((creados / nuevos.length) * 100)
    process.stdout.write(`\r  Progreso: ${creados}/${nuevos.length} (${pct}%)   `)
  }

  await delay(260)
}

console.log(`\n\n✓ Migración completada`)
console.log(`  Creados:  ${creados}`)
console.log(`  Omitidos: ${colaboradores.length - nuevos.length} (ya existían)`)
console.log(`  Errores:  ${errores}`)
console.log("\n¡Listo! Los usuarios pueden iniciar sesión con su número de cédula.\n")
