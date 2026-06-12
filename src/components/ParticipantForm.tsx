"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "polla_participant"

export interface Participant {
  fullName: string
  cedula: string
}

export function useParticipant(): [Participant | null, (p: Participant | null) => void] {
  const [participant, setParticipant] = useState<Participant | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setParticipant(JSON.parse(raw))
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

interface GateProps {
  onSave: (p: Participant) => void
}

export default function NameGate({ onSave }: GateProps) {
  const [fullName, setFullName] = useState("")
  const [cedula,   setCedula]   = useState("")
  const [error,    setError]    = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = fullName.trim()
    const ced  = cedula.trim()

    if (name.split(/\s+/).filter(Boolean).length < 2) {
      setError("Escribe tu nombre y al menos un apellido")
      return
    }
    if (!/^\d{6,12}$/.test(ced)) {
      setError("La cédula debe tener entre 6 y 12 dígitos numéricos")
      return
    }
    setError("")
    onSave({ fullName: name, cedula: ced })
  }

  return (
    <div className="polla-gate">
      <form onSubmit={handleSubmit}>
        <label className="polla-label" htmlFor="nm">Nombre completo</label>
        <input
          id="nm"
          type="text"
          className="polla-input"
          placeholder="Ej: María Fernanda Gómez Ruiz"
          autoComplete="off"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <div style={{ height: 12 }} />

        <label className="polla-label" htmlFor="ced">Número de cédula</label>
        <input
          id="ced"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          className="polla-input"
          placeholder="Ej: 12345678"
          value={cedula}
          onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
        />

        <p className="polla-hint">
          Necesitamos tu nombre completo para identificar al ganador en Bienestar Social.
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
      </form>
    </div>
  )
}
