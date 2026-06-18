import { type NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { auth, isAdmin } from "@/lib/auth"
import { listAllFinalistPredictions } from "@/lib/airtable"
import { formatBogota } from "@/lib/match-status"

// ─── Paleta (mismos colores de la página) ────────────────────────────────────

const C = {
  azul:      "FF00205B",
  azulMed:   "FF0D3382",
  azulClaro: "FFE8EDF7",
  amarillo:  "FFFFCD00",
  rojo:      "FFCE1126",
  verde:     "FF1D6F42",
  blanco:    "FFFFFFFF",
  gris:      "FFF5F5F5",
  grisTexto: "FF888888",
  tinta:     "FF0A0E1A",
}

const SEDE_LABEL: Record<string, string> = {
  FORZOSA:    "Alojamiento Forzosa",
  BRISAS:     "Alojamiento Brisas",
  GUADUALITO: "Alojamiento Guadualito",
  GENERAL:    "Sin alojamiento",
}

// ─── Helpers de estilo (mismos que route de partidos) ────────────────────────

type BorderStyle = "thin" | "medium" | "thick"

function border(cell: ExcelJS.Cell, color = C.azul, style: BorderStyle = "thin") {
  const side = { style, color: { argb: color } }
  cell.border = { top: side, bottom: side, left: side, right: side }
}

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb } }
}

function font(
  cell: ExcelJS.Cell,
  opts: { argb?: string; size?: number; bold?: boolean; italic?: boolean }
) {
  cell.font = {
    name:   "Calibri",
    size:   opts.size   ?? 11,
    bold:   opts.bold   ?? false,
    italic: opts.italic ?? false,
    color:  { argb: opts.argb ?? C.tinta },
  }
}

function center(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false }
}

function left(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: false }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const records = await listAllFinalistPredictions()

  // ── Workbook ───────────────────────────────────────────────────────────────

  const wb = new ExcelJS.Workbook()
  wb.creator = "Polla Tricolor · Guaicaramo"

  const ws = wb.addWorksheet("Pronósticos Finalistas", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  })

  // Anchos: Nombre | Cédula | Sede | Finalista 1 | Finalista 2 | Registrado
  ws.columns = [
    { width: 36 },
    { width: 16 },
    { width: 24 },
    { width: 22 },
    { width: 22 },
    { width: 24 },
  ]

  // ── Fila 1: Título ─────────────────────────────────────────────────────────
  ws.mergeCells("A1:F1")
  const titleCell = ws.getCell("A1")
  titleCell.value = "PRONÓSTICOS · FINALISTAS MUNDIAL 2026"
  font(titleCell, { argb: C.amarillo, size: 20, bold: true })
  fill(titleCell, C.azul)
  center(titleCell)
  ws.getRow(1).height = 42

  // ── Fila 2: Subtítulo ──────────────────────────────────────────────────────
  ws.mergeCells("A2:F2")
  const subCell = ws.getCell("A2")
  subCell.value = "Cierre de apuestas: 27 de junio de 2026  •  Guaicaramo"
  font(subCell, { argb: C.blanco, size: 11 })
  fill(subCell, C.azulMed)
  center(subCell)
  ws.getRow(2).height = 24

  // ── Fila 3: Separador ──────────────────────────────────────────────────────
  ws.getRow(3).height = 8

  // ── Fila 4: Estadística de participantes ───────────────────────────────────
  ws.getRow(4).height = 34
  ws.mergeCells("A4:C4")
  ws.mergeCells("D4:F4")

  const lblPart = ws.getCell("A4")
  lblPart.value = "TOTAL PARTICIPANTES"
  font(lblPart, { argb: C.amarillo, size: 11, bold: true })
  fill(lblPart, C.azul)
  center(lblPart)
  border(lblPart, C.azul, "medium")

  const numPart = ws.getCell("D4")
  numPart.value = records.length
  font(numPart, { argb: C.azul, size: 22, bold: true })
  fill(numPart, C.amarillo)
  center(numPart)
  border(numPart, C.azul, "medium")

  // ── Fila 5: Separador ──────────────────────────────────────────────────────
  ws.getRow(5).height = 8

  // ── Fila 6: Encabezado de tabla ────────────────────────────────────────────
  ws.getRow(6).height = 26
  const HEADERS = [
    "NOMBRE COMPLETO",
    "CÉDULA / DOC.",
    "SEDE",
    "FINALISTA 1",
    "FINALISTA 2",
    "REGISTRADO",
  ]
  HEADERS.forEach((h, i) => {
    const cell = ws.getCell(6, i + 1)
    cell.value = h
    font(cell, { argb: C.amarillo, size: 11, bold: true })
    fill(cell, C.azul)
    center(cell)
    border(cell, C.azul, "medium")
  })

  // ── Filas de pronósticos ───────────────────────────────────────────────────
  if (records.length === 0) {
    ws.mergeCells("A7:F7")
    const emptyCell = ws.getCell("A7")
    emptyCell.value = "Aún no hay pronósticos de finalistas registrados."
    font(emptyCell, { argb: C.grisTexto, size: 11, italic: true })
    center(emptyCell)
    ws.getRow(7).height = 28
  } else {
    records.forEach((rec, idx) => {
      const rowNum = 7 + idx
      ws.getRow(rowNum).height = 22
      const bgArgb = idx % 2 === 0 ? C.blanco : C.gris
      const borderArgb = "FFD0D5DD"

      const values: string[] = [
        rec.NombreCompleto,
        rec.Cedula,
        SEDE_LABEL[rec.Sede] ?? rec.Sede,
        rec.Finalista1,
        rec.Finalista2,
        formatBogota(rec.ActualizadoEn),
      ]

      values.forEach((val, colIdx) => {
        const cell = ws.getCell(rowNum, colIdx + 1)
        cell.value = val
        fill(cell, bgArgb)
        border(cell, borderArgb, "thin")

        if (colIdx === 0) {
          font(cell, { bold: true, size: 11 })
          left(cell)
        } else if (colIdx === 3 || colIdx === 4) {
          // Finalistas — resaltar en azul claro
          font(cell, { argb: C.azul, bold: true, size: 11 })
          fill(cell, C.azulClaro)
          center(cell)
          border(cell, C.azulMed, "thin")
        } else {
          font(cell, { size: 11 })
          center(cell)
        }
      })
    })
  }

  // ── Pie de página ──────────────────────────────────────────────────────────
  const footerRow = records.length > 0 ? 8 + records.length : 9
  ws.mergeCells(`A${footerRow}:F${footerRow}`)
  const footerCell = ws.getCell(`A${footerRow}`)
  footerCell.value = "Reporte generado automáticamente · Polla Tricolor · Guaicaramo"
  font(footerCell, { argb: C.grisTexto, size: 9, italic: true })
  center(footerCell)
  ws.getRow(footerRow).height = 18

  // ── Generar buffer y responder ─────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="finalistas-mundial-2026.xlsx"',
    },
  })
}
