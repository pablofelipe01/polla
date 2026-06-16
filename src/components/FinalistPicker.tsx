"use client"

import { useState, useEffect, useTransition } from "react"
import { submitFinalistPrediction, getMyFinalistPrediction } from "@/app/actions/public"

// Cierre: 27 jun 2026 23:59:59 Colombia (UTC-5) = 28 jun 04:59:59 UTC
const FINALIST_CLOSE_MS = new Date("2026-06-28T04:59:59Z").getTime()
import type { Participant } from "./ParticipantForm"

// ─── Equipos clasificados Mundial 2026 ────────────────────────────────────────

// 48 selecciones clasificadas al Mundial 2026 (fuente: FIFA / worldcuppass.com)
const TEAMS: string[] = [
  // CONMEBOL (6)
  "Argentina", "Brasil", "Colombia", "Uruguay", "Ecuador", "Paraguay",
  // CONCACAF (6)
  "Estados Unidos", "México", "Canadá", "Panamá", "Curazao", "Haití",
  // UEFA (16)
  "España", "Francia", "Alemania", "Inglaterra", "Portugal", "Países Bajos",
  "Bélgica", "Croacia", "Suiza", "Austria", "Suecia", "República Checa",
  "Turquía", "Noruega", "Escocia", "Bosnia y Herzegovina",
  // CAF (10)
  "Marruecos", "Senegal", "Egipto", "Costa de Marfil", "Túnez",
  "Argelia", "RD Congo", "Sudáfrica", "Cabo Verde", "Ghana",
  // AFC (9)
  "Japón", "Irán", "Corea del Sur", "Australia", "Arabia Saudita",
  "Qatar", "Uzbekistán", "Jordania", "Irak",
  // OFC (1)
  "Nueva Zelanda",
].sort((a, b) => a.localeCompare(b, "es"))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountdown(targetMs: number) {
  const [left, setLeft] = useState(targetMs - Date.now())
  useEffect(() => {
    const id = setInterval(() => setLeft(targetMs - Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetMs])
  return left
}

function formatLeft(ms: number): string {
  if (ms <= 0) return "Cerrado"
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  participant: Participant | null
  onNeedName: () => void
}

export default function FinalistPicker({ participant, onNeedName }: Props) {
  const [finalist1, setFinalist1] = useState("")
  const [finalist2, setFinalist2] = useState("")
  const [saved, setSaved]         = useState<{ finalist1: string; finalist2: string } | null>(null)
  const [loadingPick, setLoadingPick] = useState(false)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState(false)
  const [isPending, startTransition] = useTransition()

  const msLeft  = useCountdown(FINALIST_CLOSE_MS)
  const isClosed = msLeft <= 0

  // Carga el pronóstico guardado cuando el participante se identifica
  useEffect(() => {
    if (!participant) return
    setLoadingPick(true)
    getMyFinalistPrediction(participant.cedula).then((pick) => {
      if (pick) {
        setSaved(pick)
        setFinalist1(pick.finalist1)
        setFinalist2(pick.finalist2)
      }
      setLoadingPick(false)
    })
  }, [participant?.cedula])

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!participant) { onNeedName(); return }
    if (!finalist1 || !finalist2) {
      setError("Elige los dos equipos finalistas.")
      return
    }
    if (finalist1 === finalist2) {
      setError("Los dos finalistas deben ser equipos diferentes.")
      return
    }
    setError("")
    setSuccess(false)

    startTransition(async () => {
      const result = await submitFinalistPrediction({
        cedula:    participant.cedula,
        fullName:  participant.fullName,
        sede:      participant.sede,
        finalist1,
        finalist2,
      })
      if (result.ok) {
        setSaved({ finalist1, finalist2 })
        setSuccess(true)
      } else {
        setError(result.error ?? "Error desconocido")
      }
    })
  }

  return (
    <div style={{
      background: "#fff",
      border: "2px solid #FFCD00",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        background: "#00205B",
        padding: "14px 18px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.2px",
            textTransform: "uppercase", color: "#FFCD00", marginBottom: 3 }}>
            Apuesta especial
          </p>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
            ¿Quiénes serán los finalistas?
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {isClosed ? (
            <span style={{
              fontSize: 11, fontWeight: 700, background: "#CE1126",
              color: "#fff", borderRadius: 8, padding: "4px 10px",
            }}>
              Cerrada
            </span>
          ) : (
            <div>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,.6)", textTransform: "uppercase",
                letterSpacing: "0.8px", marginBottom: 1 }}>Cierra en</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#FFCD00",
                fontVariantNumeric: "tabular-nums" }}>
                {formatLeft(msLeft)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px" }}>

        {/* Pronóstico guardado */}
        {saved && (
          <div style={{
            background: "#00205B",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
          }}>
            <p style={{
              fontSize: 9, fontWeight: 700, color: "#FFCD00",
              textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {/* Trophy icon */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="#FFCD00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4a2 2 0 0 1-2-2V5h4"/>
                <path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/>
                <path d="M12 17v4"/>
                <path d="M8 21h8"/>
                <path d="M6 5h12v4a6 6 0 0 1-12 0V5z"/>
              </svg>
              Tu apuesta guardada
            </p>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10,
            }}>
              <span style={{
                flex: 1, textAlign: "right",
                fontSize: 13, fontWeight: 800, color: "#fff",
                lineHeight: 1.2,
              }}>
                {saved.finalist1}
              </span>
              <span style={{
                flexShrink: 0,
                background: "#FFCD00", color: "#00205B",
                fontSize: 10, fontWeight: 900,
                borderRadius: 6, padding: "3px 7px",
                letterSpacing: "0.5px",
              }}>
                VS
              </span>
              <span style={{
                flex: 1, textAlign: "left",
                fontSize: 13, fontWeight: 800, color: "#fff",
                lineHeight: 1.2,
              }}>
                {saved.finalist2}
              </span>
            </div>
          </div>
        )}

        {/* Formulario */}
        {!isClosed ? (
          <>
            {!participant ? (
              <button
                className="polla-btn polla-btn-primary"
                onClick={onNeedName}
                style={{ marginTop: 0 }}
              >
                Identificarme para apostar
              </button>
            ) : loadingPick ? (
              <p style={{ fontSize: 13, color: "var(--gris)", textAlign: "center", padding: "8px 0" }}>
                Cargando…
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      color: "var(--gris)", marginBottom: 5 }}>
                      Primer finalista
                    </label>
                    <select
                      value={finalist1}
                      onChange={(e) => { setFinalist1(e.target.value); setSuccess(false) }}
                      style={{
                        width: "100%", fontSize: 14, padding: "10px 12px",
                        border: "1.5px solid var(--linea)", borderRadius: 10,
                        background: "#fff", color: "var(--tinta)",
                        fontFamily: "var(--font-body)", outline: "none",
                      }}
                    >
                      <option value="">— Elige un equipo —</option>
                      {TEAMS.filter((t) => t !== finalist2).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                      color: "var(--gris)", marginBottom: 5 }}>
                      Segundo finalista
                    </label>
                    <select
                      value={finalist2}
                      onChange={(e) => { setFinalist2(e.target.value); setSuccess(false) }}
                      style={{
                        width: "100%", fontSize: 14, padding: "10px 12px",
                        border: "1.5px solid var(--linea)", borderRadius: 10,
                        background: "#fff", color: "var(--tinta)",
                        fontFamily: "var(--font-body)", outline: "none",
                      }}
                    >
                      <option value="">— Elige un equipo —</option>
                      {TEAMS.filter((t) => t !== finalist1).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <p style={{ fontSize: 12, color: "var(--rojo)", marginTop: 8,
                    fontWeight: 600 }}>{error}</p>
                )}
                {success && (
                  <p style={{ fontSize: 12, color: "var(--ok)", marginTop: 8,
                    fontWeight: 700 }}>¡Apuesta guardada! Puedes cambiarla antes del cierre.</p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="polla-btn polla-btn-amar"
                  style={{ marginTop: 14 }}
                >
                  {isPending ? "Guardando…" : saved ? "Actualizar apuesta" : "Guardar apuesta"}
                </button>
              </form>
            )}
          </>
        ) : (
          /* Apuesta cerrada */
          !saved && (
            <p style={{ fontSize: 13, color: "var(--gris)", textAlign: "center",
              padding: "6px 0" }}>
              La apuesta cerró el 27 de junio. Si habías apostado, tu pronóstico fue registrado.
            </p>
          )
        )}
      </div>
    </div>
  )
}
