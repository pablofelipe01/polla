"use client"

import { useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"

const DEFAULT_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? ""

export default function QRGenerator() {
  const [url, setUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL || DEFAULT_URL || "https://tu-app.vercel.app"
  )
  const svgRef = useRef<HTMLDivElement>(null)

  function downloadSvg() {
    const svgEl = svgRef.current?.querySelector("svg")
    if (!svgEl) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const blob = new Blob([svgStr], { type: "image/svg+xml" })
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
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!
    const img = new Image()
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" })
    img.onload = () => {
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement("a")
      link.download = "polla-tricolor-qr.png"
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = URL.createObjectURL(svgBlob)
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-100 p-5">
      <h2 className="font-display font-bold text-lg text-col-blue uppercase mb-4">
        Generar código QR
      </h2>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Input URL */}
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
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-col-blue"
            placeholder="https://polla.guaicaramo.com"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={downloadPng}
              className="flex-1 bg-col-blue text-white text-sm font-semibold py-2 rounded-lg hover:bg-col-blue-light transition"
            >
              Descargar PNG
            </button>
            <button
              onClick={downloadSvg}
              className="flex-1 border border-col-blue text-col-blue text-sm font-semibold py-2 rounded-lg hover:bg-col-blue/5 transition"
            >
              Descargar SVG
            </button>
          </div>
        </div>

        {/* QR preview */}
        <div
          ref={svgRef}
          className="bg-white p-3 rounded-xl border-2 border-col-yellow shadow-sm mx-auto"
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
