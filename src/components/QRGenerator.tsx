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
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Descargar como
            </p>
            <div className="flex gap-3">
              <button
                onClick={downloadPng}
                className="flex-1 flex flex-col items-center gap-1 bg-col-blue text-white rounded-xl py-3 px-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="text-sm font-bold leading-none">PNG</span>
                <span className="text-[10px] opacity-75 leading-none">512 × 512 px</span>
              </button>
              <button
                onClick={downloadSvg}
                className="flex-1 flex flex-col items-center gap-1 border-2 border-col-blue text-col-blue rounded-xl py-3 px-2 hover:bg-col-blue/5 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span className="text-sm font-bold leading-none">SVG</span>
                <span className="text-[10px] opacity-75 leading-none">Vectorial</span>
              </button>
            </div>
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
