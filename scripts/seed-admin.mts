#!/usr/bin/env node
/**
 * Crea o actualiza el único administrador en la tabla Admin de Airtable.
 *
 * Uso:
 *   npm run seed:admin
 *
 * Variables de entorno requeridas (.env.local):
 *   AIRTABLE_API_KEY   Personal Access Token
 *   AIRTABLE_BASE_ID   ID de la base Polla-Tricolor
 *   ADMIN_EMAIL        Email del administrador
 *   ADMIN_PASSWORD     Contraseña en texto plano (se hashea aquí)
 *   ADMIN_NAME         Nombre visible del administrador
 */

import { readFileSync } from "fs"
import { resolve, join } from "path"

// Cargar .env.local manualmente (no queremos depender de dotenv en un script)
function loadEnv() {
  const paths = [".env.local", ".env"]
  for (const p of paths) {
    try {
      const full = resolve(process.cwd(), p)
      const content = readFileSync(full, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) continue
        const key = trimmed.slice(0, eqIdx).trim()
        const rawVal = trimmed.slice(eqIdx + 1).trim()
        // strip inline comments (# ...) but only outside quoted strings
        const unquoted = rawVal.replace(/^["'].*["']$/, "")
        const value = (unquoted === rawVal ? rawVal.replace(/\s+#.*$/, "") : rawVal)
          .trim()
          .replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = value
      }
      console.log(`✓ Variables cargadas desde ${p}`)
      break
    } catch {
      // archivo no encontrado, continuar
    }
  }
}

loadEnv()

const { hash } = await import("bcryptjs")

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME
const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!email || !password || !name || !apiKey || !baseId) {
  console.error(
    "✗ Faltan variables de entorno: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, AIRTABLE_API_KEY, AIRTABLE_BASE_ID"
  )
  process.exit(1)
}

console.log(`\nSembrando administrador: ${email} (${name})`)

const passwordHash = await hash(password, 12)

// Buscar admin existente
const searchUrl = `https://api.airtable.com/v0/${baseId}/Admin?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
}

const searchRes = await fetch(searchUrl, { headers })
if (!searchRes.ok) {
  console.error("✗ Error consultando Airtable:", await searchRes.text())
  process.exit(1)
}

const { records } = (await searchRes.json()) as { records: { id: string }[] }

if (records.length > 0) {
  // Actualizar
  const updateRes = await fetch(`https://api.airtable.com/v0/${baseId}/Admin`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      records: [{ id: records[0].id, fields: { HashContrasena: passwordHash, Nombre: name } }],
    }),
  })
  if (!updateRes.ok) {
    console.error("✗ Error actualizando admin:", await updateRes.text())
    process.exit(1)
  }
  console.log("✓ Administrador actualizado correctamente")
} else {
  // Crear
  const createRes = await fetch(`https://api.airtable.com/v0/${baseId}/Admin`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      records: [{ fields: { Email: email, HashContrasena: passwordHash, Nombre: name } }],
    }),
  })
  if (!createRes.ok) {
    console.error("✗ Error creando admin:", await createRes.text())
    process.exit(1)
  }
  console.log("✓ Administrador creado correctamente")
}

console.log("\n¡Listo! Ya puedes iniciar sesión en /admin/login")
