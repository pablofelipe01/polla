#!/usr/bin/env node
/**
 * Provisiona las tablas del nuevo modelo (Continentes/Equipos/RBAC) en la base de Airtable.
 *
 * Uso:
 *   npm run setup:airtable
 *
 * Variables de entorno requeridas (.env / .env.local):
 *   AIRTABLE_API_KEY   Personal Access Token (necesita scope data.records:* Y schema.bases:write)
 *   AIRTABLE_BASE_ID   ID de la base donde se crearán las tablas
 *
 * Idempotente: las tablas que ya existen se omiten (no se modifican sus campos).
 * Si el PAT no tiene scope schema.bases:write, Airtable responde 403 y el script
 * imprime la instrucción para agregarlo en https://airtable.com/create/tokens
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// ─── Carga de .env (sin dotenv) ───────────────────────────────────────────────
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
    } catch {
      /* archivo no encontrado, continuar */
    }
  }
}

loadEnv()

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

if (!apiKey || !baseId) {
  console.error("✗ Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID")
  process.exit(1)
}

const META = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
}

// ─── Helpers de campo ──────────────────────────────────────────────────────────
type Field = { name: string; type: string; options?: Record<string, unknown> }

const text = (name: string): Field => ({ name, type: "singleLineText" })
const multiline = (name: string): Field => ({ name, type: "multilineText" })
const check = (name: string): Field => ({
  name,
  type: "checkbox",
  options: { icon: "check", color: "greenBright" },
})
const num = (name: string): Field => ({
  name,
  type: "number",
  options: { precision: 0 },
})
const datetime = (name: string): Field => ({
  name,
  type: "dateTime",
  options: {
    dateFormat: { name: "iso", format: "YYYY-MM-DD" },
    timeFormat: { name: "24hour", format: "HH:mm" },
    timeZone: "utc",
  },
})
const select = (name: string, choices: string[]): Field => ({
  name,
  type: "singleSelect",
  options: { choices: choices.map((c) => ({ name: c })) },
})
const link = (name: string, linkedTableId: string): Field => ({
  name,
  type: "multipleRecordLinks",
  options: { linkedTableId },
})

// ─── Definición de tablas (en orden de dependencia por los links) ──────────────
// `build` recibe el mapa nombre→tableId ya conocido para resolver los links.
type TableDef = {
  name: string
  description: string
  build: (ids: Record<string, string>) => Field[]
}

const TABLES: TableDef[] = [
  {
    name: "Continentes",
    description: "Los 6 continentes con su Director Técnico y cuerpo técnico",
    build: () => [text("Nombre"), text("DT"), multiline("CuerpoTecnico"), check("Activo")],
  },
  {
    name: "Equipos",
    description: "Equipos por continente con países asignados",
    build: (ids) => [
      text("Nombre"),
      link("Continente", ids["Continentes"]),
      multiline("Paises"),
      check("Activo"),
    ],
  },
  {
    name: "Integrantes",
    description: "Integrantes de cada equipo (10–30 por equipo)",
    build: (ids) => [text("Nombre"), text("Cedula"), link("Equipo", ids["Equipos"])],
  },
  {
    name: "Usuarios",
    description: "Usuarios con RBAC: Admin, DT, Delegado",
    build: (ids) => [
      text("Email"),
      text("HashContrasena"),
      text("Nombre"),
      select("Rol", ["Admin", "DT", "Delegado"]),
      link("Equipo", ids["Equipos"]),
      link("Continente", ids["Continentes"]),
      check("Activo"),
    ],
  },
  {
    name: "Encuentros",
    description: "Partidos del torneo (país vs país)",
    build: () => [
      text("Local"),
      text("Visitante"),
      text("Fase"),
      datetime("FechaHoraUtc"),
      datetime("CierreUtc"),
      num("GolesLocal"),
      num("GolesVisitante"),
    ],
  },
  {
    name: "PronosticosEquipo",
    description: "Un único pronóstico oficial por equipo por encuentro",
    build: (ids) => [
      text("Clave"),
      link("Encuentro", ids["Encuentros"]),
      link("Equipo", ids["Equipos"]),
      num("GolesLocal"),
      num("GolesVisitante"),
      text("RegistradoPor"),
    ],
  },
]

// ─── Provisión ───────────────────────────────────────────────────────────────
async function getExisting(): Promise<Record<string, string>> {
  const res = await fetch(META, { headers })
  if (!res.ok) {
    const body = await res.text()
    if (res.status === 403) {
      console.error(
        "\n✗ El PAT no tiene permiso de esquema. Agrega el scope 'schema.bases:write'\n" +
          "  (y 'schema.bases:read') al token en https://airtable.com/create/tokens\n" +
          `  con acceso a la base ${baseId}, y vuelve a ejecutar.\n`
      )
    }
    throw new Error(`GET tablas falló (${res.status}): ${body}`)
  }
  const { tables } = (await res.json()) as { tables: { id: string; name: string }[] }
  return Object.fromEntries(tables.map((t) => [t.name, t.id]))
}

async function createTable(def: TableDef, ids: Record<string, string>): Promise<string> {
  const res = await fetch(META, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: def.name,
      description: def.description,
      fields: def.build(ids),
    }),
  })
  const body = await res.text()
  if (!res.ok) {
    if (res.status === 403) {
      console.error(
        "\n✗ 403: el PAT necesita scope 'schema.bases:write'. Agrégalo en\n" +
          "  https://airtable.com/create/tokens y reintenta.\n"
      )
    }
    throw new Error(`Crear ${def.name} falló (${res.status}): ${body}`)
  }
  const created = JSON.parse(body) as { id: string }
  return created.id
}

async function main() {
  console.log(`\nProvisionando tablas en base ${baseId}…\n`)
  const ids = await getExisting()

  for (const def of TABLES) {
    if (ids[def.name]) {
      console.log(`• ${def.name} ya existe (${ids[def.name]}) — omitida`)
      continue
    }
    const id = await createTable(def, ids)
    ids[def.name] = id
    console.log(`✓ ${def.name} creada (${id})`)
  }

  console.log("\n¡Listo! Tablas del nuevo modelo provisionadas.")
  console.log("Siguiente paso: npm run seed:admin\n")
}

main().catch((e) => {
  console.error("\n" + (e instanceof Error ? e.message : String(e)))
  process.exit(1)
})
