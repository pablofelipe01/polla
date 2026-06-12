"use client"

import { useState, useTransition, useEffect } from "react"
import { submitPrediction } from "@/app/actions/public"
import type { Participant } from "./ParticipantForm"
import Countdown from "./Countdown"

interface StoredPicks {
  [matchId: string]: { col: number; opp: number }
}

function picksKey(cedula: string) { return `polla:picks:${cedula}` }

function loadPick(matchId: string, cedula: string): { col: number; opp: number } | null {
  try {
    const raw = localStorage.getItem(picksKey(cedula))
    if (!raw) return null
    return (JSON.parse(raw) as StoredPicks)[matchId] ?? null
  } catch { return null }
}

function savePick(matchId: string, cedula: string, col: number, opp: number) {
  try {
    const key = picksKey(cedula)
    const raw = localStorage.getItem(key)
    const picks: StoredPicks = raw ? JSON.parse(raw) : {}
    picks[matchId] = { col, opp }
    localStorage.setItem(key, JSON.stringify(picks))
  } catch {}
}

interface Props {
  matchId: string
  leftTeam: string
  rightTeam: string
  isColLeft: boolean
  closeTimestampMs: number
  participant: Participant
  onStatusChange?: () => void
}

export default function ScoreSelector({
  matchId,
  leftTeam,
  rightTeam,
  isColLeft,
  closeTimestampMs,
  participant,
  onStatusChange,
}: Props) {
  const [leftScore,  setLeft]  = useState(0)
  const [rightScore, setRight] = useState(0)
  const [hasPick,   setHasPick] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]  = useState<string | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const pick = loadPick(matchId, participant.cedula)
    if (pick) {
      setHasPick(true)
      setLeft(isColLeft ? pick.col : pick.opp)
      setRight(isColLeft ? pick.opp : pick.col)
    }
  }, [matchId, isColLeft, participant.cedula])

  function adjust(side: "left" | "right", delta: number) {
    if (side === "left")  setLeft((v)  => Math.max(0, Math.min(20, v + delta)))
    else                  setRight((v) => Math.max(0, Math.min(20, v + delta)))
  }

  function handleSave() {
    setError(null)
    const scoreCol = isColLeft ? leftScore : rightScore
    const scoreOpp = isColLeft ? rightScore : leftScore

    startTransition(async () => {
      const result = await submitPrediction({
        matchId,
        fullName: participant.fullName,
        cedula: participant.cedula,
        scoreCol,
        scoreOpp,
      })
      if (result.ok) {
        savePick(matchId, participant.cedula, scoreCol, scoreOpp)
        setHasPick(true)
      } else {
        setError(result.error ?? "Error desconocido")
      }
    })
  }

  if (closed) {
    return (
      <div className="polla-locked">
        Las apuestas para este partido ya cerraron
      </div>
    )
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* Countdown */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, marginBottom: 10, fontSize: 12, color: "var(--gris)",
      }}>
        <span>Cierra en:</span>
        <Countdown closeMs={closeTimestampMs} onClose={() => { setClosed(true); onStatusChange?.() }} />
      </div>

      {/* Tablero */}
      <div className="polla-board">
        <div className="polla-board-row">
          <div className={`polla-team${isColLeft ? " col" : ""}`}>
            <div className="polla-team-name">{leftTeam}</div>
            <div className="polla-stepper">
              <div className="polla-digit">{leftScore}</div>
              <div className="polla-pm">
                <button onClick={() => adjust("left", -1)}>−</button>
                <button onClick={() => adjust("left", 1)}>+</button>
              </div>
            </div>
          </div>

          <div className="polla-sep">:</div>

          <div className={`polla-team${!isColLeft ? " col" : ""}`}>
            <div className="polla-team-name">{rightTeam}</div>
            <div className="polla-stepper">
              <div className="polla-digit">{rightScore}</div>
              <div className="polla-pm">
                <button onClick={() => adjust("right", -1)}>−</button>
                <button onClick={() => adjust("right", 1)}>+</button>
              </div>
            </div>
          </div>
        </div>

        <button
          className="polla-btn polla-btn-amar"
          style={{ marginTop: 14, position: "relative", zIndex: 1 }}
          onClick={handleSave}
          disabled={pending}
        >
          {pending ? "Guardando…" : hasPick ? "Actualizar mi marcador" : "Guardar mi marcador"}
        </button>

        {hasPick && (
          <p style={{
            marginTop: 8, textAlign: "center", fontSize: 11,
            color: "rgba(255,255,255,.45)", position: "relative", zIndex: 1,
          }}>
            Se tomará el último pronóstico realizado.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" style={{
          marginTop: 8, textAlign: "center",
          fontSize: 13, fontWeight: 600, color: "var(--rojo)",
        }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: 8, textAlign: "center", fontSize: 12, color: "var(--gris)" }}>
        Pronóstico de <strong style={{ color: "var(--tinta)" }}>{participant.fullName}</strong>
      </p>
    </div>
  )
}
