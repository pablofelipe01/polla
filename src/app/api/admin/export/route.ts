import ExcelJS from "exceljs"
import { auth, isAdmin } from "@/lib/auth"
import {
  listContinentes,
  listEquipos,
  listIntegrantes,
  listUsuarios,
} from "@/lib/clients/airtable"
import { calcularRanking } from "@/lib/services/ranking"
import { obtenerFilasPronosticos } from "@/lib/services/reportes"

export const dynamic = "force-dynamic"

const HEADER_FILL = "FF00205B" // azul
const HEADER_FONT = "FFFFCD00" // amarillo

function styleHeader(ws: ExcelJS.Worksheet) {
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
  })
}

/**
 * Exporta toda la competencia a un Excel con 4 hojas:
 * Ranking · Pronósticos · Equipos e integrantes · Usuarios. Solo Admin.
 */
export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return new Response("No autorizado", { status: 401 })

  const [ranking, filas, continentes, equipos, integrantes, usuarios] = await Promise.all([
    calcularRanking(),
    obtenerFilasPronosticos(),
    listContinentes(),
    listEquipos(),
    listIntegrantes(),
    listUsuarios(),
  ])
  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))
  const eqMap = new Map(equipos.map((e) => [e.id, e]))

  const wb = new ExcelJS.Workbook()
  wb.creator = "Pronóstico Mundialista · Guaicaramo"

  // Hoja 1 — Ranking
  const sR = wb.addWorksheet("Ranking")
  sR.columns = [
    { header: "Pos", key: "pos", width: 6 },
    { header: "Equipo", key: "equipo", width: 26 },
    { header: "Continente", key: "continente", width: 18 },
    { header: "PJ", key: "jugados", width: 8 },
    { header: "Puntos", key: "puntos", width: 10 },
    { header: "Aciertos exactos", key: "aciertosExactos", width: 18 },
  ]
  ranking.forEach((f, i) => sR.addRow({ pos: i + 1, ...f }))
  styleHeader(sR)

  // Hoja 2 — Pronósticos
  const sP = wb.addWorksheet("Pronósticos")
  sP.columns = [
    { header: "Fase", key: "fase", width: 16 },
    { header: "Encuentro", key: "encuentro", width: 28 },
    { header: "Inicio (Bogotá)", key: "inicio", width: 18 },
    { header: "Equipo", key: "equipo", width: 24 },
    { header: "Continente", key: "continente", width: 16 },
    { header: "Pronóstico", key: "pronostico", width: 12 },
    { header: "Resultado", key: "resultado", width: 12 },
    { header: "Puntos", key: "puntos", width: 9 },
    { header: "Registrado por", key: "registradoPor", width: 26 },
  ]
  filas.forEach((f) => sP.addRow(f))
  styleHeader(sP)

  // Hoja 3 — Equipos e integrantes
  const sE = wb.addWorksheet("Equipos e integrantes")
  sE.columns = [
    { header: "Continente", key: "continente", width: 18 },
    { header: "Equipo", key: "equipo", width: 24 },
    { header: "Países", key: "paises", width: 24 },
    { header: "Integrante", key: "integrante", width: 28 },
    { header: "Cédula", key: "cedula", width: 16 },
  ]
  for (const it of integrantes) {
    const eq = it.EquipoId ? eqMap.get(it.EquipoId) : undefined
    sE.addRow({
      continente: eq?.ContinenteId ? contNombre.get(eq.ContinenteId) ?? "—" : "—",
      equipo: eq?.Nombre ?? "—",
      paises: eq?.Paises ?? "",
      integrante: it.Nombre,
      cedula: it.Cedula,
    })
  }
  styleHeader(sE)

  // Hoja 4 — Usuarios (sin contraseñas)
  const sU = wb.addWorksheet("Usuarios")
  sU.columns = [
    { header: "Nombre", key: "nombre", width: 26 },
    { header: "Email", key: "email", width: 30 },
    { header: "Rol", key: "rol", width: 12 },
    { header: "Equipo", key: "equipo", width: 24 },
    { header: "Continente", key: "continente", width: 18 },
    { header: "Activo", key: "activo", width: 10 },
  ]
  for (const u of usuarios) {
    sU.addRow({
      nombre: u.Nombre,
      email: u.Email,
      rol: u.Rol,
      equipo: u.EquipoId ? eqMap.get(u.EquipoId)?.Nombre ?? "—" : "",
      continente: u.ContinenteId ? contNombre.get(u.ContinenteId) ?? "—" : "",
      activo: u.Activo ? "Sí" : "No",
    })
  }
  styleHeader(sU)

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pronostico-mundialista.xlsx"`,
    },
  })
}
