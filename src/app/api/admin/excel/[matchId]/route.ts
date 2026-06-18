import { type NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { auth, isAdmin } from "@/lib/auth"
import { getMatch, listPredictions } from "@/lib/airtable"
import { formatBogota } from "@/lib/match-status"

// ─── Paleta (colores de la página) ───────────────────────────────────────────

const C = {
  azul:       "FF00205B",
  azulMed:    "FF0D3382",
  azulClaro:  "FFE8EDF7",
  amarillo:   "FFFFCD00",
  rojo:       "FFCE1126",
  verde:      "FF1D6F42",
  verdeClaro: "FFE6F6EC",
  blanco:     "FFFFFFFF",
  gris:       "FFF5F5F5",
  grisTexto:  "FF888888",
  tinta:      "FF0A0E1A",
}

const SEDE_LABEL: Record<string, string> = {
  FORZOSA:    "Alojamiento Forzosa",
  BRISAS:     "Alojamiento Brisas",
  GUADUALITO: "Alojamiento Guadualito",
  GENERAL:    "Sin alojamiento",
}

// ─── Helpers de estilo ───────────────────────────────────────────────────────

type BorderStyle = "thin" | "medium" | "thick"

function border(
  cell: ExcelJS.Cell,
  color = C.azul,
  style: BorderStyle = "thin"
) {
  const side = { style, color: { argb: color } }
  cell.border = { top: side, bottom: side, left: side, right: side }
}

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb } }
}

function font(
  cell: ExcelJS.Cell,
  opts: {
    argb?: string
    size?: number
    bold?: boolean
    italic?: boolean
    name?: string
  }
) {
  cell.font = {
    name:   opts.name   ?? "Calibri",
    size:   opts.size   ?? 11,
    bold:   opts.bold   ?? false,
    italic: opts.italic ?? false,
    color:  { argb: opts.argb ?? C.tinta },
  }
}

function center(cell: ExcelJS.Cell, vertical: ExcelJS.Alignment["vertical"] = "middle") {
  cell.alignment = { horizontal: "center", vertical, wrapText: false }
}

function left(cell: ExcelJS.Cell) {
  cell.alignment = { horizontal: "left", vertical: "middle", wrapText: false }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  // Auth
  const session = await auth()
  if (!isAdmin(session)) {
    return new NextResponse("No autorizado", { status: 401 })
  }

  const { matchId } = await params

  // Datos
  const match = await getMatch(matchId)
  if (!match) {
    return new NextResponse("Partido no encontrado", { status: 404 })
  }

  const preds = await listPredictions(matchId)
  const hasResult = match.GolesCol !== null && match.GolesRival !== null

  const winners = hasResult
    ? preds.filter(
        (p) => p.GolesCol === match.GolesCol && p.GolesRival === match.GolesRival
      )
    : []

  // ── Workbook ───────────────────────────────────────────────────────────────

  const wb = new ExcelJS.Workbook()
  wb.creator = "Polla Tricolor · Guaicaramo"

  const sheetTitle = `COL vs ${match.Rival}`.slice(0, 31)
  const ws = wb.addWorksheet(sheetTitle, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  })

  // Anchos de columna: Nombre | Cédula | Sede | Pronóstico | Registrado
  ws.columns = [
    { width: 36 },
    { width: 16 },
    { width: 24 },
    { width: 14 },
    { width: 24 },
  ]

  // ── Fila 1: Título ─────────────────────────────────────────────────────────
  ws.mergeCells("A1:E1")
  const titleCell = ws.getCell("A1")
  titleCell.value = `COLOMBIA vs ${match.Rival.toUpperCase()}`
  font(titleCell, { argb: C.amarillo, size: 20, bold: true })
  fill(titleCell, C.azul)
  center(titleCell)
  ws.getRow(1).height = 42

  // ── Fila 2: Info del partido ────────────────────────────────────────────────
  ws.mergeCells("A2:E2")
  const infoCell = ws.getCell("A2")
  infoCell.value = hasResult
    ? `${match.Fase}  •  ${formatBogota(match.FechaHoraUtc)}  •  Resultado: ${match.GolesCol} - ${match.GolesRival}`
    : `${match.Fase}  •  ${formatBogota(match.FechaHoraUtc)}  •  Partido sin resultado registrado`
  font(infoCell, { argb: C.blanco, size: 11 })
  fill(infoCell, C.azulMed)
  center(infoCell)
  ws.getRow(2).height = 24

  // ── Fila 3: Separador ──────────────────────────────────────────────────────
  ws.getRow(3).height = 8

  // ── Fila 4: Tarjetas de estadísticas ───────────────────────────────────────
  ws.getRow(4).height = 34
  ws.mergeCells("A4:B4")
  ws.mergeCells("D4:E4")

  // Participantes — etiqueta
  const lblPart = ws.getCell("A4")
  lblPart.value = "TOTAL PARTICIPANTES"
  font(lblPart, { argb: C.amarillo, size: 11, bold: true })
  fill(lblPart, C.azul)
  center(lblPart)
  border(lblPart, C.azul, "medium")

  // Participantes — número
  const numPart = ws.getCell("C4")
  numPart.value = preds.length
  font(numPart, { argb: C.azul, size: 18, bold: true })
  fill(numPart, C.amarillo)
  center(numPart)
  border(numPart, C.azul, "medium")

  // Ganadores — etiqueta
  const lblWin = ws.getCell("D4")
  lblWin.value = "GANADORES"
  font(lblWin, { argb: C.blanco, size: 11, bold: true })
  fill(lblWin, C.verde)
  center(lblWin)
  border(lblWin, C.verde, "medium")

  // Ganadores — número
  const numWin = ws.getCell("E4")
  numWin.value = winners.length
  font(numWin, { argb: C.blanco, size: 18, bold: true })
  fill(numWin, C.verde)
  center(numWin)
  border(numWin, C.verde, "medium")

  // ── Fila 5: Separador ──────────────────────────────────────────────────────
  ws.getRow(5).height = 8

  // ── Fila 6: Encabezado de tabla ────────────────────────────────────────────
  ws.getRow(6).height = 26
  const HEADERS = ["NOMBRE COMPLETO", "CÉDULA / DOC.", "SEDE", "PRONÓSTICO", "REGISTRADO"]

  HEADERS.forEach((h, i) => {
    const cell = ws.getCell(6, i + 1)
    cell.value = h
    font(cell, { argb: C.amarillo, size: 11, bold: true })
    fill(cell, C.azul)
    center(cell)
    border(cell, C.azul, "medium")
  })

  // ── Filas de ganadores ─────────────────────────────────────────────────────
  if (winners.length === 0) {
    ws.mergeCells("A7:E7")
    const emptyCell = ws.getCell("A7")
    emptyCell.value = hasResult
      ? "Nadie acertó el marcador exacto en este partido."
      : "El partido aún no tiene resultado registrado."
    font(emptyCell, { argb: C.grisTexto, size: 11, italic: true })
    center(emptyCell)
    ws.getRow(7).height = 28
  } else {
    winners.forEach((w, idx) => {
      const rowNum = 7 + idx
      ws.getRow(rowNum).height = 22
      const bgArgb = idx % 2 === 0 ? C.blanco : C.gris
      const borderArgb = "FFD0D5DD"

      const values: (string | number)[] = [
        w.NombreCompleto,
        w.Cedula,
        SEDE_LABEL[w.Sede] ?? w.Sede,
        `${w.GolesCol} – ${w.GolesRival}`,
        w.ActualizadoEn ? formatBogota(w.ActualizadoEn) : "–",
      ]

      values.forEach((val, colIdx) => {
        const cell = ws.getCell(rowNum, colIdx + 1)
        cell.value = val
        fill(cell, bgArgb)
        border(cell, borderArgb, "thin")

        if (colIdx === 0) {
          font(cell, { bold: true, size: 11 })
          left(cell)
        } else if (colIdx === 3) {
          // Pronóstico — destacar en verde claro si hay resultado
          font(cell, { argb: C.verde, bold: true, size: 12 })
          fill(cell, C.verdeClaro)
          center(cell)
          border(cell, C.verde, "thin")
        } else {
          font(cell, { size: 11 })
          center(cell)
        }
      })
    })
  }

  // ── Fila final: nota de pie ────────────────────────────────────────────────
  const footerRow = winners.length > 0 ? 8 + winners.length : 9
  ws.mergeCells(`A${footerRow}:E${footerRow}`)
  const footerCell = ws.getCell(`A${footerRow}`)
  footerCell.value = "Reporte generado automáticamente · Polla Tricolor · Guaicaramo"
  font(footerCell, { argb: C.grisTexto, size: 9, italic: true })
  center(footerCell)
  ws.getRow(footerRow).height = 18

  // ── Generar buffer y responder ────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const slug = match.Rival.toLowerCase().replace(/[\s/\\]/g, "-")
  const filename = `ganadores-col-vs-${slug}.xlsx`

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
