#!/usr/bin/env node
/**
 * Crea o actualiza el único administrador en la tabla Usuarios de Airtable.
 *
 * Uso:
 *   npm run seed:admin
 *
 * Variables de entorno requeridas (.env.local):
 *   AIRTABLE_API_KEY   Personal Access Token
 *   AIRTABLE_BASE_ID   ID de la base Polla-Tricolor
 *   ADMIN_CEDULA       Cédula del administrador (o ADMIN_EMAIL como alias)
 *   ADMIN_NAME         Nombre visible del administrador
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// ─── Carga de variables de entorno ─────────────────────────────────────────

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
        const rawVal = trimmed.slice(eqIdx + 1).trim()
        const unquoted = rawVal.replace(/^["'].*["']$/, "")
        const value = (unquoted === rawVal ? rawVal.replace(/\s+#.*$/, "") : rawVal)
          .trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = value
      }
      console.log(`✓ Variables cargadas desde ${p}`)
      break
    } catch { /* archivo no encontrado, continuar */ }
  }
}

// ─── Validación de configuración ───────────────────────────────────────────

function leerConfig() {
  const cedula = process.env.ADMIN_CEDULA ?? process.env.ADMIN_EMAIL
  const name   = process.env.ADMIN_NAME
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID

  if (!cedula || !name || !apiKey || !baseId) {
    console.error("✗ Faltan variables: ADMIN_CEDULA (o ADMIN_EMAIL), ADMIN_NAME, AIRTABLE_API_KEY, AIRTABLE_BASE_ID")
    process.exit(1)
  }
  return { cedula, name, apiKey, baseId }
}

// ─── Operaciones Airtable ──────────────────────────────────────────────────

async function buscarAdmin(baseId: string, headers: Record<string, string>, cedula: string) {
  const url = `https://api.airtable.com/v0/${baseId}/Usuarios?filterByFormula=${encodeURIComponent(`{Cedula}="${cedula}"`)}`
  const res = await fetch(url, { headers })
  if (!res.ok) { console.error("✗ Error consultando Airtable:", await res.text()); process.exit(1) }
  const { records } = (await res.json()) as { records: { id: string }[] }
  return records[0]?.id ?? null
}

async function actualizarAdmin(baseId: string, headers: Record<string, string>, recordId: string, name: string) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Usuarios`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ records: [{ id: recordId, fields: { Nombre: name, Rol: "Admin", Activo: true } }] }),
  })
  if (!res.ok) { console.error("✗ Error actualizando admin:", await res.text()); process.exit(1) }
  console.log("✓ Administrador actualizado correctamente")
}

async function crearAdmin(baseId: string, headers: Record<string, string>, cedula: string, name: string) {
  const res = await fetch(`https://api.airtable.com/v0/${baseId}/Usuarios`, {
    method: "POST",
    headers,
    body: JSON.stringify({ records: [{ fields: { Email: cedula, Cedula: cedula, Nombre: name, Rol: "Admin", Activo: true } }] }),
  })
  if (!res.ok) { console.error("✗ Error creando admin:", await res.text()); process.exit(1) }
  console.log("✓ Administrador creado correctamente")
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()
  const { cedula, name, apiKey, baseId } = leerConfig()

  console.log(`\nSembrando administrador: ${cedula} (${name})`)

  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
  const existingId = await buscarAdmin(baseId, headers, cedula)

  if (existingId) {
    await actualizarAdmin(baseId, headers, existingId, name)
  } else {
    await crearAdmin(baseId, headers, cedula, name)
  }

  console.log("\n¡Listo! Ya puedes iniciar sesión en /login")
}

await main()
