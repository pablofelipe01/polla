"use client"

import { useEffect, useState } from "react"
import { lookupParticipant } from "@/app/actions/public"
import type { Sede } from "@/lib/airtable"

const STORAGE_KEY = "polla_participant"

export interface Participant {
  fullName: string
  cedula: string
  sede: Sede
}

const SEDE_INFO: Record<Sede, { label: string; bg: string; text: string }> = {
  FORZOSA:    { label: "Alojamiento Forzosa",    bg: "#00205B", text: "#FFCD00" },
  BRISAS:     { label: "Alojamiento Brisas",     bg: "#0a3aa8", text: "#ffffff" },
  GUADUALITO: { label: "Alojamiento Guadualito", bg: "#CE1126", text: "#ffffff" },
  GENERAL:    { label: "Sin alojamiento", bg: "#e2e8f0", text: "#475569" },
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useParticipant(): [Participant | null, (p: Participant | null) => void] {
  const [participant, setParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        // compatibilidad con registros anteriores sin campo sede
        setParticipant({ sede: "GENERAL", ...parsed })
      }
    } catch {}
  }, [])

  function save(p: Participant | null) {
    try {
      if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setParticipant(p)
  }

  return [participant, save]
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

type Step = "cedula" | "confirm" | "manual"

interface GateProps {
  onSave: (p: Participant) => void
}

export default function NameGate({ onSave }: GateProps) {
  const [step, setStep]       = useState<Step>("cedula")
  const [cedula, setCedula]   = useState("")
  const [found, setFound]     = useState<{ fullName: string; sede: Sede } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [fullName, setFullName]   = useState("")    // solo en modo manual
  const [manualSede, setManualSede] = useState<Sede>("GENERAL") // solo en modo manual

  // ── Paso 1: verificar cédula ───────────────────────────────────────────────
  async function handleVerify(e: { preventDefault(): void }) {
    e.preventDefault()
    const ced = cedula.trim()
    if (!/^\d{6,12}$/.test(ced)) {
      setError("La cédula debe tener entre 6 y 12 dígitos numéricos")
      return
    }
    setError("")
    setLoading(true)
    try {
      const result = await lookupParticipant(ced)
      if (result.status === "roster_disabled") {
        setStep("manual")
      } else if (result.status === "found") {
        setFound({ fullName: result.fullName, sede: result.sede })
        setStep("confirm")
      } else if (result.status === "api_error") {
        setError("Error al verificar la nómina. Intenta de nuevo o comunícate con Bienestar social.")
      } else {
        setError("Tu cédula no aparece en la nómina. Comunícate con Gestión Humana.")
      }
    } catch {
      setError("Error al verificar. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // ── Paso 2: confirmar identidad ────────────────────────────────────────────
  function handleConfirm() {
    if (!found) return
    onSave({ fullName: found.fullName, cedula: cedula.trim(), sede: found.sede })
  }

  function handleBack() {
    setStep("cedula")
    setFound(null)
    setError("")
  }

  // ── Modo manual (VALIDATE_ROSTER desactivado) ──────────────────────────────
  function handleManualSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const name = fullName.trim()
    if (name.split(/\s+/).filter(Boolean).length < 2) {
      setError("Escribe tu nombre y al menos un apellido")
      return
    }
    setError("")
    onSave({ fullName: name, cedula: cedula.trim(), sede: manualSede })
  }

  // ── Render: paso cédula ────────────────────────────────────────────────────
  if (step === "cedula") {
    return (
      <div className="polla-gate">
        <form onSubmit={handleVerify}>
          <label className="polla-label" htmlFor="ced">
            Número de cédula
          </label>
          <input
            id="ced"
            type="text"
            inputMode="numeric"
            pattern="\d*"
            className="polla-input"
            placeholder="Ej: 12345678"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
            disabled={loading}
            autoFocus
          />
          <p className="polla-hint">
            Solo pueden participar colaboradores activos de Guaicaramo y SIAGRI.
          </p>

          {error && (
            <p style={{ fontSize: 12, color: "var(--rojo)", marginTop: 6, fontWeight: 600 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="polla-btn polla-btn-primary"
            style={{ marginTop: 12 }}
            disabled={loading}
          >
            {loading ? "Verificando…" : "Verificar →"}
          </button>
        </form>
      </div>
    )
  }

  // ── Render: confirmación de identidad ──────────────────────────────────────
  if (step === "confirm" && found) {
    const info = SEDE_INFO[found.sede]
    return (
      <div className="polla-gate">
        <p className="polla-label" style={{ marginBottom: 14 }}>¿Eres tú?</p>

        <div style={{
          background: "#f8f9fb",
          border: "1.5px solid var(--linea)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 16,
        }}>
          <p style={{
            fontWeight: 800,
            fontSize: 16,
            color: "var(--tinta)",
            marginBottom: 4,
            lineHeight: 1.3,
          }}>
            {found.fullName}
          </p>
          <p style={{ fontSize: 12, color: "var(--gris)", marginBottom: 12 }}>
            Cédula: {cedula}
          </p>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: info.bg,
            color: info.text,
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}>
            🏠 {info.label}
          </span>
        </div>

        <button
          className="polla-btn polla-btn-primary"
          onClick={handleConfirm}
        >
          ✓ Sí, soy yo — Entrar a pronosticar
        </button>

        <button
          onClick={handleBack}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            background: "none",
            border: "none",
            color: "var(--gris)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            padding: "8px 0",
          }}
        >
          ← No soy yo, ingresar otra cédula
        </button>
      </div>
    )
  }

  // ── Render: modo manual (sin validación de nómina) ─────────────────────────
  return (
    <div className="polla-gate">
      <form onSubmit={handleManualSubmit}>
        <label className="polla-label" htmlFor="nm">Nombre completo</label>
        <input
          id="nm"
          type="text"
          className="polla-input"
          placeholder="Ej: María Fernanda Gómez Ruiz"
          autoComplete="off"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoFocus
        />

        <div style={{ height: 12 }} />

        <label className="polla-label" htmlFor="ced-ro">Número de cédula</label>
        <input
          id="ced-ro"
          type="text"
          className="polla-input"
          value={cedula}
          readOnly
          style={{ background: "#f3f4f6", color: "var(--gris)" }}
        />

        <div style={{ height: 12 }} />

        <label className="polla-label" htmlFor="sede-sel">¿Dónde te alojas?</label>
        <select
          id="sede-sel"
          className="polla-input"
          value={manualSede}
          onChange={(e) => setManualSede(e.target.value as Sede)}
        >
          <option value="GENERAL">Sin alojamiento</option>
          <option value="FORZOSA">Alojamiento Forzosa</option>
          <option value="BRISAS">Alojamiento Brisas</option>
          <option value="GUADUALITO">Alojamiento Guadualito</option>
        </select>

        <p className="polla-hint">
          Necesitamos tu nombre completo para identificar al ganador en Gestión Humana.
          Solo se pide una vez por dispositivo.
        </p>

        {error && (
          <p style={{ fontSize: 12, color: "var(--rojo)", marginTop: 6, fontWeight: 600 }}>
            {error}
          </p>
        )}

        <button type="submit" className="polla-btn polla-btn-primary" style={{ marginTop: 12 }}>
          Entrar a pronosticar
        </button>

        <button
          type="button"
          onClick={handleBack}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            background: "none",
            border: "none",
            color: "var(--gris)",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            padding: "8px 0",
          }}
        >
          ← Cambiar cédula
        </button>
      </form>
    </div>
  )
}
