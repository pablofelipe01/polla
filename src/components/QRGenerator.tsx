"use client"

import { useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"

const DEFAULT_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? ""

// Coordenadas lógicas del diseño (invariantes)
const W = 512
const H = 660
const CARD_X = 76
const CARD_Y = 110
const CARD_SIZE = 360
const QR_PAD = 24
const QR_SIZE = CARD_SIZE - QR_PAD * 2

// Escala de salida: 3× → PNG 1536×1980 px (calidad impresión)
const PNG_SCALE = 3

function buildBrandedSvgString(qrSvgEl: SVGElement, url: string): string {
  const serializer = new XMLSerializer()
  const qrStr = serializer.serializeToString(qrSvgEl)
  const qrDataUri = `data:image/svg+xml;base64,${btoa(new TextEncoder().encode(qrStr).reduce((s, b) => s + String.fromCharCode(b), ""))}`
  const safeUrl = url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W * PNG_SCALE}" height="${H * PNG_SCALE}" viewBox="0 0 ${W} ${H}">
  <!-- Fondo azul -->
  <rect width="${W}" height="${H}" fill="#00205B"/>

  <!-- Barra tricolor superior -->
  <rect x="0"         y="0" width="${W / 3}"       height="10" fill="#FFCD00"/>
  <rect x="${W / 3}"  y="0" width="${W / 3}"       height="10" fill="#0a3aa8"/>
  <rect x="${(W * 2) / 3}" y="0" width="${W / 3}"  height="10" fill="#CE1126"/>

  <!-- Tarjeta blanca -->
  <rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_SIZE}" height="${CARD_SIZE}" rx="20" ry="20" fill="white"/>

  <!-- QR code -->
  <image href="${qrDataUri}" x="${CARD_X + QR_PAD}" y="${CARD_Y + QR_PAD}" width="${QR_SIZE}" height="${QR_SIZE}"/>

  <!-- Título -->
  <text x="${W / 2}" y="${CARD_Y + CARD_SIZE + 52}"
    text-anchor="middle"
    font-family="Anton, Impact, sans-serif"
    font-size="28"
    font-weight="bold"
    fill="#FFCD00"
    letter-spacing="1">PRONOSTICO MUNDIALISTA</text>

  <!-- URL -->
  <text x="${W / 2}" y="${CARD_Y + CARD_SIZE + 82}"
    text-anchor="middle"
    font-family="Inter, system-ui, sans-serif"
    font-size="13"
    fill="#a0b4d6">${safeUrl}</text>

  <!-- Barra tricolor inferior -->
  <rect x="0"         y="${H - 14}" width="${W / 3}"       height="14" fill="#FFCD00"/>
  <rect x="${W / 3}"  y="${H - 14}" width="${W / 3}"       height="14" fill="#0a3aa8"/>
  <rect x="${(W * 2) / 3}" y="${H - 14}" width="${W / 3}"  height="14" fill="#CE1126"/>
</svg>`
}

export default function QRGenerator() {
  const [url, setUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || DEFAULT_URL || "https://tu-app.vercel.app"
  )
  const svgRef = useRef<HTMLDivElement>(null)

  function downloadSvg() {
    const svgEl = svgRef.current?.querySelector("svg")
    if (!svgEl) return
    const branded = buildBrandedSvgString(svgEl, url)
    const blob = new Blob([branded], { type: "image/svg+xml" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "polla-tricolor-qr.svg"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function downloadPng() {
    const svgEl = svgRef.current?.querySelector("svg")
    if (!svgEl) return

    const canvas = document.createElement("canvas")
    canvas.width  = W * PNG_SCALE
    canvas.height = H * PNG_SCALE
    const ctx = canvas.getContext("2d")!

    // Escalar todos los trazados a PNG_SCALE sin cambiar coordenadas lógicas
    ctx.scale(PNG_SCALE, PNG_SCALE)

    // Fondo azul
    ctx.fillStyle = "#00205B"
    ctx.fillRect(0, 0, W, H)

    // Barra tricolor superior
    ctx.fillStyle = "#FFCD00";       ctx.fillRect(0,         0, W / 3,  10)
    ctx.fillStyle = "#0a3aa8";       ctx.fillRect(W / 3,     0, W / 3,  10)
    ctx.fillStyle = "#CE1126";       ctx.fillRect((W * 2) / 3, 0, W / 3, 10)

    // Tarjeta blanca con esquinas redondeadas
    const r = 20
    ctx.fillStyle = "#FFFFFF"
    ctx.beginPath()
    ctx.moveTo(CARD_X + r, CARD_Y)
    ctx.lineTo(CARD_X + CARD_SIZE - r, CARD_Y)
    ctx.quadraticCurveTo(CARD_X + CARD_SIZE, CARD_Y, CARD_X + CARD_SIZE, CARD_Y + r)
    ctx.lineTo(CARD_X + CARD_SIZE, CARD_Y + CARD_SIZE - r)
    ctx.quadraticCurveTo(CARD_X + CARD_SIZE, CARD_Y + CARD_SIZE, CARD_X + CARD_SIZE - r, CARD_Y + CARD_SIZE)
    ctx.lineTo(CARD_X + r, CARD_Y + CARD_SIZE)
    ctx.quadraticCurveTo(CARD_X, CARD_Y + CARD_SIZE, CARD_X, CARD_Y + CARD_SIZE - r)
    ctx.lineTo(CARD_X, CARD_Y + r)
    ctx.quadraticCurveTo(CARD_X, CARD_Y, CARD_X + r, CARD_Y)
    ctx.closePath()
    ctx.fill()

    // QR sobre la tarjeta
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, CARD_X + QR_PAD, CARD_Y + QR_PAD, QR_SIZE, QR_SIZE)
      URL.revokeObjectURL(img.src)

      // Título
      ctx.fillStyle = "#FFCD00"
      ctx.font = "bold 28px Anton, Impact, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("POLLA MUNDIALISTA", W / 2, CARD_Y + CARD_SIZE + 52)

      // URL
      ctx.fillStyle = "#a0b4d6"
      ctx.font = "13px Inter, system-ui, sans-serif"
      ctx.fillText(url, W / 2, CARD_Y + CARD_SIZE + 80)

      // Barra tricolor inferior
      ctx.fillStyle = "#FFCD00";       ctx.fillRect(0,           H - 14, W / 3,  14)
      ctx.fillStyle = "#0a3aa8";       ctx.fillRect(W / 3,       H - 14, W / 3,  14)
      ctx.fillStyle = "#CE1126";       ctx.fillRect((W * 2) / 3, H - 14, W / 3,  14)

      const link = document.createElement("a")
      link.download = "polla-tricolor-qr.png"
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = URL.createObjectURL(svgBlob)
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 p-5">
      <h2 className="font-display font-bold text-lg uppercase mb-4" style={{ color: "#00205B" }}>
        Generar código QR
      </h2>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-1">
          <label
            htmlFor="qr-url"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1"
          >
            URL pública de la app
          </label>
          <input
            id="qr-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#00205B" } as React.CSSProperties}
            placeholder="https://polla.guaicaramo.com"
          />
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Descargar como
            </p>
            <div className="flex gap-3">
              <button
                onClick={downloadPng}
                style={{ background: "#00205B", color: "#fff" }}
                className="flex-1 flex flex-col items-center gap-1 rounded-xl py-3 px-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="text-sm font-bold leading-none">PNG</span>
                <span className="text-[10px] leading-none" style={{ opacity: 0.7 }}>1536 × 1980 px</span>
              </button>
              <button
                onClick={downloadSvg}
                style={{ background: "#FFCD00", color: "#0a0e1a" }}
                className="flex-1 flex flex-col items-center gap-1 rounded-xl py-3 px-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="text-sm font-bold leading-none">SVG</span>
                <span className="text-[10px] leading-none" style={{ opacity: 0.6 }}>Vectorial</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vista previa del QR */}
        <div
          ref={svgRef}
          className="bg-white p-3 rounded-xl shadow-sm mx-auto"
          style={{ border: "2px solid #FFCD00" }}
        >
          <QRCodeSVG
            value={url || "https://example.com"}
            size={160}
            bgColor="white"
            fgColor="#00205B"
            level="M"
          />
        </div>
      </div>
    </section>
  )
}
