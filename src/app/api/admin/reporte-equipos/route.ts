import ExcelJS from "exceljs"
import { auth, isAdmin } from "@/lib/auth"
import { listContinentes, listEquipos, listUsuarios } from "@/lib/clients/airtable"

export const dynamic = "force-dynamic"

// ─── Paleta de marca ──────────────────────────────────────────────────────────
const NAVY = "FF00205B" // azul Guaicaramo
const GOLD = "FFFFCD00" // amarillo
const WHITE = "FFFFFFFF"
const INK = "FF1F2937" // gris tinta para texto
const BAND = "FFF2F5FA" // franja clara alterna
const SUBTOTAL_FILL = "FFE3E9F3" // fila de subtotal
const TOTAL_FILL = "FF00205B"
const ZERO_RED = "FFC0392B" // integrantes = 0
const FONT = "Segoe UI"

const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD7DEEA" } }
const boxBorder = { top: thin, left: thin, bottom: thin, right: thin }

type FilaEquipo = {
  continente: string
  equipo: string
  paises: string
  integrantes: number
  activo: boolean
}

/**
 * Exporta un Excel con todos los equipos existentes y la cantidad de integrantes
 * (usuarios con rol "Usuario") que conforman cada uno. Agrupado por continente
 * con subtotales, más una hoja resumen. Solo Admin.
 */
export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return new Response("No autorizado", { status: 401 })

  const [continentes, equipos, usuarios] = await Promise.all([
    listContinentes(),
    listEquipos(),
    listUsuarios(),
  ])
  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))

  // Integrantes reales = usuarios con Rol "Usuario" vinculados al equipo.
  const conteo = new Map<string, number>()
  for (const u of usuarios) {
    if (u.Rol === "Usuario" && u.EquipoId) {
      conteo.set(u.EquipoId, (conteo.get(u.EquipoId) ?? 0) + 1)
    }
  }

  const filas: FilaEquipo[] = equipos
    .map((eq) => ({
      continente: eq.ContinenteId ? contNombre.get(eq.ContinenteId) ?? "Sin continente" : "Sin continente",
      equipo: eq.Nombre,
      paises: eq.Paises ?? "",
      integrantes: conteo.get(eq.id) ?? 0,
      activo: eq.Activo,
    }))
    .sort((a, b) => a.continente.localeCompare(b.continente) || a.equipo.localeCompare(b.equipo))

  const wb = new ExcelJS.Workbook()
  wb.creator = "Pronóstico Mundialista · Guaicaramo"
  wb.created = new Date()

  construirHojaEquipos(wb, filas, equipos.length)
  construirHojaResumen(wb, filas)

  const buf = await wb.xlsx.writeBuffer()
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-equipos.xlsx"`,
    },
  })
}

/** Hoja principal: equipos agrupados por continente con subtotales y total general. */
function construirHojaEquipos(wb: ExcelJS.Workbook, filas: FilaEquipo[], totalEquipos: number) {
  const ws = wb.addWorksheet("Equipos", {
    views: [{ state: "frozen", ySplit: 4 }],
    properties: { defaultRowHeight: 20 },
  })
  ws.columns = [
    { key: "continente", width: 34 },
    { key: "equipo", width: 28 },
    { key: "integrantes", width: 16 },
    { key: "activo", width: 12 },
  ]
  const NCOLS = 4

  // Fila 1 — Título
  ws.mergeCells(1, 1, 1, NCOLS)
  const titulo = ws.getCell(1, 1)
  titulo.value = "REPORTE DE EQUIPOS"
  titulo.font = { name: FONT, size: 20, bold: true, color: { argb: GOLD } }
  titulo.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
  ws.getRow(1).height = 40

  // Fila 2 — Subtítulo
  ws.mergeCells(2, 1, 2, NCOLS)
  const sub = ws.getCell(2, 1)
  const fecha = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
  sub.value = `Pronóstico Mundialista · Guaicaramo   —   ${totalEquipos} equipos   ·   generado el ${fecha}`
  sub.font = { name: FONT, size: 10, italic: true, color: { argb: WHITE } }
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
  ws.getRow(2).height = 20

  // Fila 3 — separador delgado
  ws.getRow(3).height = 6

  // Fila 4 — Encabezados
  const headers = ["Continente", "Equipo", "Integrantes", "Estado"]
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { vertical: "middle", horizontal: i >= 2 ? "center" : "left", indent: i < 2 ? 1 : 0 }
    cell.border = boxBorder
  })
  headerRow.height = 26

  // Datos con agrupación por continente + subtotales
  let r = 5
  let banda = false
  let i = 0
  while (i < filas.length) {
    const cont = filas[i].continente
    let equiposCont = 0
    let integrantesCont = 0

    while (i < filas.length && filas[i].continente === cont) {
      const f = filas[i]
      const row = ws.getRow(r)
      row.getCell(1).value = f.continente
      row.getCell(2).value = f.equipo
      row.getCell(3).value = f.integrantes
      row.getCell(4).value = f.activo ? "Activo" : "Inactivo"

      const fill = banda ? BAND : WHITE
      for (let c = 1; c <= NCOLS; c++) {
        const cell = row.getCell(c)
        cell.font = { name: FONT, size: 10, color: { argb: INK } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
        cell.border = boxBorder
        cell.alignment = { vertical: "middle", horizontal: c >= 3 ? "center" : "left", indent: c < 3 ? 1 : 0 }
      }
      // Resaltar equipos sin integrantes
      if (f.integrantes === 0) {
        row.getCell(3).font = { name: FONT, size: 10, bold: true, color: { argb: ZERO_RED } }
      }
      // Estado inactivo tenue
      if (!f.activo) {
        row.getCell(4).font = { name: FONT, size: 10, color: { argb: "FF9AA5B4" } }
      }
      row.height = 19

      equiposCont += 1
      integrantesCont += f.integrantes
      banda = !banda
      r += 1
      i += 1
    }

    // Fila de subtotal del continente
    const subRow = ws.getRow(r)
    ws.mergeCells(r, 1, r, 2)
    subRow.getCell(1).value = `Subtotal · ${cont}  (${equiposCont} equipos)`
    subRow.getCell(3).value = integrantesCont
    subRow.getCell(4).value = ""
    for (let c = 1; c <= NCOLS; c++) {
      const cell = subRow.getCell(c)
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBTOTAL_FILL } }
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } }
      cell.border = boxBorder
      cell.alignment = { vertical: "middle", horizontal: c >= 3 ? "center" : "left", indent: c < 3 ? 1 : 0 }
    }
    subRow.height = 21
    r += 1
    banda = false
  }

  // Total general
  const totalIntegrantes = filas.reduce((s, f) => s + f.integrantes, 0)
  const totalRow = ws.getRow(r)
  ws.mergeCells(r, 1, r, 2)
  totalRow.getCell(1).value = `TOTAL GENERAL  (${totalEquipos} equipos)`
  totalRow.getCell(3).value = totalIntegrantes
  totalRow.getCell(4).value = ""
  for (let c = 1; c <= NCOLS; c++) {
    const cell = totalRow.getCell(c)
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } }
    cell.font = { name: FONT, size: 12, bold: true, color: { argb: GOLD } }
    cell.border = boxBorder
    cell.alignment = { vertical: "middle", horizontal: c >= 3 ? "center" : "left", indent: c < 3 ? 1 : 0 }
  }
  totalRow.height = 28

  // Filtro sobre encabezados (solo columnas de datos individuales)
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: NCOLS } }
}

/** Hoja resumen: totales por continente. */
function construirHojaResumen(wb: ExcelJS.Workbook, filas: FilaEquipo[]) {
  const ws = wb.addWorksheet("Resumen por continente", {
    views: [{ state: "frozen", ySplit: 3 }],
  })
  ws.columns = [
    { key: "continente", width: 34 },
    { key: "equipos", width: 14 },
    { key: "integrantes", width: 16 },
    { key: "promedio", width: 16 },
  ]
  const NCOLS = 4

  // Título
  ws.mergeCells(1, 1, 1, NCOLS)
  const titulo = ws.getCell(1, 1)
  titulo.value = "RESUMEN POR CONTINENTE"
  titulo.font = { name: FONT, size: 16, bold: true, color: { argb: GOLD } }
  titulo.alignment = { vertical: "middle", horizontal: "left", indent: 1 }
  titulo.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
  ws.getRow(1).height = 34
  ws.getRow(2).height = 6

  // Encabezados
  const headers = ["Continente", "Equipos", "Integrantes", "Promedio / equipo"]
  const hr = ws.getRow(3)
  headers.forEach((h, idx) => {
    const cell = hr.getCell(idx + 1)
    cell.value = h
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { vertical: "middle", horizontal: idx >= 1 ? "center" : "left", indent: idx < 1 ? 1 : 0 }
    cell.border = boxBorder
  })
  hr.height = 24

  // Agregar por continente
  const agg = new Map<string, { equipos: number; integrantes: number }>()
  for (const f of filas) {
    const a = agg.get(f.continente) ?? { equipos: 0, integrantes: 0 }
    a.equipos += 1
    a.integrantes += f.integrantes
    agg.set(f.continente, a)
  }
  const entradas = [...agg.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  let r = 4
  let banda = false
  for (const [cont, a] of entradas) {
    const row = ws.getRow(r)
    row.getCell(1).value = cont
    row.getCell(2).value = a.equipos
    row.getCell(3).value = a.integrantes
    row.getCell(4).value = a.equipos ? Math.round((a.integrantes / a.equipos) * 10) / 10 : 0
    const fill = banda ? BAND : WHITE
    for (let c = 1; c <= NCOLS; c++) {
      const cell = row.getCell(c)
      cell.font = { name: FONT, size: 10, color: { argb: INK } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
      cell.border = boxBorder
      cell.alignment = { vertical: "middle", horizontal: c >= 2 ? "center" : "left", indent: c < 2 ? 1 : 0 }
    }
    row.height = 19
    banda = !banda
    r += 1
  }

  // Total
  const totEquipos = filas.length
  const totIntegrantes = filas.reduce((s, f) => s + f.integrantes, 0)
  const totalRow = ws.getRow(r)
  totalRow.getCell(1).value = "TOTAL"
  totalRow.getCell(2).value = totEquipos
  totalRow.getCell(3).value = totIntegrantes
  totalRow.getCell(4).value = totEquipos ? Math.round((totIntegrantes / totEquipos) * 10) / 10 : 0
  for (let c = 1; c <= NCOLS; c++) {
    const cell = totalRow.getCell(c)
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } }
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: GOLD } }
    cell.border = boxBorder
    cell.alignment = { vertical: "middle", horizontal: c >= 2 ? "center" : "left", indent: c < 2 ? 1 : 0 }
  }
  totalRow.height = 26
}
