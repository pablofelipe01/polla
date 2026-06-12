"use client"

import { useState, useEffect } from "react"
import type { MatchWithStatus } from "@/app/actions/public"
import ScoreSelector from "./ScoreSelector"
import type { Participant } from "./ParticipantForm"
import Countdown from "./Countdown"

function picksKey(cedula: string) { return `polla:picks:${cedula}` }

function loadPick(matchId: string, cedula: string): { col: number; opp: number } | null {
  try {
    const raw = localStorage.getItem(picksKey(cedula))
    if (!raw) return null
    return JSON.parse(raw)[matchId] ?? null
  } catch {
    return null
  }
}

function pickStr(col: number, opp: number, isHome: boolean): string {
  return isHome ? `${col} : ${opp}` : `${opp} : ${col}`
}

interface Props {
  match: MatchWithStatus
  participant: Participant | null
  onNeedName: () => void
}

export default function MatchCard({ match, participant, onNeedName }: Props) {
  const [status, setStatus] = useState(match.status)
  const [myPick, setMyPick] = useState<{ col: number; opp: number } | null>(null)

  // Leer pick guardado del localStorage (por cédula del participante)
  useEffect(() => {
    if (participant) setMyPick(loadPick(match.id, participant.cedula))
    else setMyPick(null)
  }, [match.id, participant])

  const isHome     = match.EsLocal
  const leftTeam   = isHome ? "COLOMBIA" : match.Rival.toUpperCase()
  const rightTeam  = isHome ? match.Rival.toUpperCase() : "COLOMBIA"
  const isColLeft  = isHome

  const isFinal   = status === "FINALIZADO"
  const isOpen    = status === "ABIERTO"
  const isClosed  = status === "CERRADO"
  const isUpcoming = status === "PROXIMO"

  // Badge por estado
  const badge = (() => {
    const openTimestampMs =
      new Date(match.FechaHoraUtc).getTime() - 48 * 60 * 60 * 1000
    const closeMs = match.closeTimestampMs
    const now = Date.now()

    if (isUpcoming) {
      const remainOpen = openTimestampMs - now
      return (
        <span className="polla-badge b-prox">
          Abre en <Countdown closeMs={openTimestampMs} />
          {/* fallback si ya pasó */}
          {remainOpen <= 0 ? "Próximo" : ""}
        </span>
      )
    }
    if (isOpen)   return <span className="polla-badge b-open">Abierta</span>
    if (isClosed) return <span className="polla-badge b-close">Cerrada</span>
    return <span className="polla-badge b-final">Final</span>
  })()

  // Foot info
  const foot = (() => {
    if (isUpcoming) return "Las apuestas abren 48 h antes."
    if (isOpen) {
      return (
        <>
          Cierra en{" "}
          <Countdown
            closeMs={match.closeTimestampMs}
            onClose={() => setStatus("CERRADO")}
          />
        </>
      )
    }
    if (isClosed) return "Apuestas cerradas. Esperando resultado."
    return null
  })()

  // Cuerpo del card
  const body = (() => {
    if (isOpen) {
      if (!participant) {
        return (
          <button
            className="polla-btn polla-btn-amar"
            style={{ marginTop: 12 }}
            onClick={onNeedName}
          >
            ¡Quiero pronosticar!
          </button>
        )
      }
      return (
        <ScoreSelector
          matchId={match.id}
          leftTeam={leftTeam}
          rightTeam={rightTeam}
          isColLeft={isColLeft}
          closeTimestampMs={match.closeTimestampMs}
          participant={participant}
          onStatusChange={() => setStatus("CERRADO")}
        />
      )
    }

    if (isUpcoming) {
      return (
        <div className="polla-locked">
          ⏳ Vuelve cuando se abran las apuestas.
        </div>
      )
    }

    if (isClosed) {
      if (myPick) {
        return (
          <div className="polla-locked">
            Tu marcador:{" "}
            <span className="polla-mypick">
              {pickStr(myPick.col, myPick.opp, isHome)}
            </span>
          </div>
        )
      }
      return (
        <div className="polla-locked">
          No alcanzaste a pronosticar este partido.
        </div>
      )
    }

    if (isFinal && match.GolesCol !== null && match.GolesRival !== null) {
      const resultLeft  = isHome ? match.GolesCol : match.GolesRival
      const resultRight = isHome ? match.GolesRival : match.GolesCol
      const acerto =
        myPick &&
        myPick.col === match.GolesCol &&
        myPick.opp === match.GolesRival

      return (
        <div
          className="polla-locked"
          style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}
        >
          <div>Resultado oficial</div>
          <div className="polla-res">
            {resultLeft} : {resultRight}
          </div>
          {myPick && (
            <div>
              Tu marcador:{" "}
              <span className="polla-mypick">
                {pickStr(myPick.col, myPick.opp, isHome)}
              </span>{" "}
              {acerto ? "✓ ¡Acertaste!" : "✗"}
            </div>
          )}
        </div>
      )
    }

    return null
  })()

  return (
    <div className="polla-card">
      <div className="polla-mhead">
        <span className="polla-fase">{match.Fase}</span>
        {badge}
      </div>

      <div className="polla-vs">
        {leftTeam}{" "}
        <span style={{ color: "var(--gris)" }}>vs</span>{" "}
        {rightTeam}
      </div>

      <div className="polla-when">
        {match.kickoffBogota}
        {foot ? <> · {foot}</> : null}
      </div>

      {body}
    </div>
  )
}
