"use client"

import { useState } from "react"
import type { MatchWithStatus, Winner } from "./actions/public"
import type { Sede } from "@/lib/airtable"
import { getWinners } from "./actions/public"
import MatchCard from "@/components/MatchCard"
import NameGate, { useParticipant, type Participant } from "@/components/ParticipantForm"
import FinalistPicker from "@/components/FinalistPicker"
import Link from "next/link"

type Tab = "partidos" | "ganadores" | "admin"

interface Props {
  matches: MatchWithStatus[]
}

export default function MatchListClient({ matches }: Props) {
  const [tab, setTab] = useState<Tab>("partidos")
  const [participant, setParticipant] = useParticipant()
  const [showGate, setShowGate]       = useState(false)
  const [gateKey,  setGateKey]        = useState(0)
  const [winners, setWinners]         = useState<Winner[] | null>(null)
  const [loadingWin, setLoadingWin]   = useState(false)

  function handleNeedName() { setShowGate(true) }

  function handleSaveName(p: Participant) {
    setParticipant(p)
    setShowGate(false)
  }

  async function handleTabGanadores() {
    setTab("ganadores")
    if (winners === null) {
      setLoadingWin(true)
      const w = await getWinners()
      setWinners(w)
      setLoadingWin(false)
    }
  }

  return (
    <div className="polla-wrap">
      {/* ── Hero ── */}
      <header className="polla-hero" style={{ position: "relative" }}>
        <div className="brandbar">
          <span /><span /><span />
        </div>
        <div className="eyebrow">Mundial 2026 · Bienestar Social</div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          letterSpacing: ".5px",
          fontSize: 38,
          lineHeight: .92,
          margin: 0,
          textTransform: "uppercase",
        }}>
          La Polla<br />
          <span style={{ color: "var(--amarillo)" }}>Tricolor</span>
        </h1>
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.7)", fontSize: 13.5, maxWidth: "36ch", lineHeight: 1.55 }}>
          Pronostica el marcador exacto de la Selección Colombia. Solo gana quien clava el resultado clavado.
        </p>
      </header>

      {/* ── Tabs ── */}
      <nav className="polla-tabs" role="tablist">
        <button
          className={`polla-tab${tab === "partidos" ? " active" : ""}`}
          onClick={() => setTab("partidos")}
          role="tab"
          aria-selected={tab === "partidos"}
        >
          Partidos
        </button>
        <button
          className={`polla-tab${tab === "ganadores" ? " active" : ""}`}
          onClick={handleTabGanadores}
          role="tab"
          aria-selected={tab === "ganadores"}
        >
          Ganadores
        </button>
        <button
          className={`polla-tab${tab === "admin" ? " active" : ""}`}
          onClick={() => setTab("admin")}
          role="tab"
          aria-selected={tab === "admin"}
        >
          Admin
        </button>
      </nav>

      {/* ── Content ── */}
      <main className="polla-main">

        {/* PARTIDOS */}
        {tab === "partidos" && (
          <div>
            {showGate || !participant ? (
              <NameGate key={gateKey} onSave={handleSaveName} />
            ) : (
              <>
                {/* Who bar */}
                <div className="polla-who">
                  <div>
                    <div className="polla-who-lbl">Jugando como</div>
                    <div className="polla-who-name">{participant.fullName}</div>
                  </div>
                  <button
                    className="polla-link"
                    onClick={() => { setParticipant(null); setGateKey((k) => k + 1); setShowGate(true) }}
                  >
                    Cambiar
                  </button>
                </div>

                {/* Apuesta especial: finalistas */}
                <FinalistPicker participant={participant} onNeedName={handleNeedName} />

                {/* Match list */}
                {matches.length === 0 ? (
                  <div className="polla-empty">
                    <strong>Aún no hay partidos</strong>
                    El administrador debe cargar los partidos de la Selección.
                  </div>
                ) : (
                  matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      participant={participant}
                      onNeedName={handleNeedName}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* GANADORES */}
        {tab === "ganadores" && (
          <div>
            <div className="polla-prize">
              <div className="polla-prize-icon">🏅</div>
              <div>
                <div className="polla-prize-title">¿Acertaste el marcador exacto?</div>
                <div className="polla-prize-sub">
                  En los próximos días nos acercaremos para entregarte tu premio.
                </div>
              </div>
            </div>

            {loadingWin && (
              <div className="polla-empty">Cargando ganadores…</div>
            )}

            {!loadingWin && winners !== null && (
              winners.length === 0 ? (
                <div className="polla-empty">
                  <strong>Todavía no hay resultados</strong>
                  Cuando el administrador registre un marcador final aparecerán aquí los ganadores.
                </div>
              ) : (
                winners
                  .slice()
                  .sort((a, b) => new Date(b.kickoffBogota).getTime() - new Date(a.kickoffBogota).getTime())
                  .map((w) => (
                    <WinnerCard
                      key={w.matchId}
                      winner={w}
                      participantSede={participant?.sede ?? "GENERAL"}
                      participantName={participant?.fullName ?? ""}
                    />
                  ))
              )
            )}
          </div>
        )}

        {/* ADMIN */}
        {tab === "admin" && (
          <div style={{
            background: "var(--tinta-2)",
            border: "1px solid rgba(255,255,255,.07)",
            borderRadius: 16,
            padding: "28px 20px",
            textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52,
              background: "rgba(255,255,255,.06)",
              borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, margin: "0 auto 14px",
            }}>🔐</div>
            <p style={{ fontSize: 14, color: "var(--gris-2)", marginBottom: 20, lineHeight: 1.55 }}>
              El panel de administración está protegido<br />con usuario y contraseña.
            </p>
            <Link
              href="/admin/login"
              style={{
                display: "inline-block",
                textDecoration: "none",
                background: "var(--amarillo)",
                color: "var(--tinta)",
                fontWeight: 800,
                fontSize: 14,
                padding: "13px 32px",
                borderRadius: 12,
                letterSpacing: ".3px",
              }}
            >
              Ir al panel de Admin →
            </Link>
          </div>
        )}

      </main>

      <footer style={{
        textAlign: "center",
        fontSize: 11,
        color: "rgba(255,255,255,.25)",
        padding: "14px 14px 20px",
        background: "var(--tinta)",
        letterSpacing: ".3px",
      }}>
        Polla Tricolor · Los datos se guardan en Airtable.
      </footer>
    </div>
  )
}

/* ── WinnerCard ──────────────────────────────────────────── */

const SEDE_STYLE: Partial<Record<Sede, { bg: string; text: string; label: string }>> = {
  FORZOSA:    { bg: "#00205B", text: "#FFCD00", label: "Alojamiento Forzosa" },
  BRISAS:     { bg: "#0a3aa8", text: "#ffffff", label: "Alojamiento Brisas" },
  GUADUALITO: { bg: "#CE1126", text: "#ffffff", label: "Alojamiento Guadualito" },
}

function WinnerCard({
  winner,
  participantSede,
  participantName,
}: {
  winner: Winner
  participantSede: Sede
  participantName: string
}) {
  const resStr        = `${winner.scoreCol} : ${winner.scoreOpp}`
  const showSede      = participantSede !== "GENERAL"
  const mySedeWinners = winner.sedeWinners.filter((e) => e.sede === participantSede)
  const hadLottery    = winner.totalCorrect > winner.generalWinners.length
  const sedeStyle     = SEDE_STYLE[participantSede]

  const iAmGeneral = !!participantName && winner.generalWinners.some((e) => e.name === participantName)
  const iAmSede    = !!participantName && mySedeWinners.some((e) => e.name === participantName)

  return (
    <div className="polla-card">
      <div className="polla-mhead">
        <span className="polla-fase">{winner.phase}</span>
        <span className="polla-badge b-final">Final {resStr}</span>
      </div>
      <div className="polla-vs">
        COLOMBIA <span style={{ color: "var(--gris)" }}>vs</span> {winner.rival.toUpperCase()}
      </div>

      {/* Premio alojamiento — PRIMERO y destacado */}
      {showSede && sedeStyle && (
        <div style={{
          marginTop: 12,
          background: sedeStyle.bg,
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <p style={{
            fontSize: 10, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: "0.8px", color: sedeStyle.text, opacity: 0.75, marginBottom: 4,
          }}>
            Tu alojamiento · {sedeStyle.label}
          </p>
          {(() => {
            const total = winner.sedeTotals[participantSede] ?? mySedeWinners.length
            return total > mySedeWinners.length && mySedeWinners.length > 0 ? (
              <p style={{ fontSize: 10, color: sedeStyle.text, opacity: 0.65, marginBottom: 6 }}>
                Sorteo entre {total} aciertos · {mySedeWinners.length}{" "}
                {mySedeWinners.length === 1 ? "seleccionado" : "seleccionados"}
              </p>
            ) : null
          })()}
          {mySedeWinners.length === 0 ? (
            <p style={{ fontSize: 13, color: sedeStyle.text, opacity: 0.7, margin: 0 }}>
              Nadie de tu alojamiento acertó este marcador.
            </p>
          ) : (
            mySedeWinners.map((e, i) => {
              const isMe = participantName && e.name === participantName
              return (
                <div key={i} style={{
                  background: isMe ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                  border: isMe ? "1.5px solid rgba(255,255,255,0.5)" : "1.5px solid transparent",
                  borderRadius: 8, padding: "7px 10px", marginBottom: 4,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ color: sedeStyle.text, fontWeight: isMe ? 800 : 600, fontSize: 13 }}>
                    {isMe ? "⭐ " : ""}{e.name}
                  </span>
                  {isMe && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.2)",
                      color: sedeStyle.text, padding: "2px 8px", borderRadius: 20,
                    }}>¡Eres tú!</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Ganadores */}
      <div style={{ marginTop: showSede ? 10 : 12 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.6px", color: "var(--gris)", marginBottom: 1,
        }}>
          {winner.totalCorrect === 0
            ? "Sin aciertos"
            : `${winner.totalCorrect} ${winner.totalCorrect === 1 ? "persona acertó" : "personas acertaron"} el marcador exacto`}
        </p>
        {hadLottery && (
          <p style={{ fontSize: 10, color: "var(--gris)", marginBottom: 6 }}>
            Sorteo · {winner.generalWinners.length} seleccionados
          </p>
        )}
        {winner.generalWinners.length === 0 ? (
          <div className="polla-empty" style={{ padding: "10px 0" }}>
            Nadie acertó el marcador exacto.
          </div>
        ) : (
          winner.generalWinners.map((e, i) => {
            const isMe = participantName && e.name === participantName
            return (
              <div key={i} className="polla-winner-row" style={isMe ? {
                background: "rgba(255,205,0,0.12)",
                border: "1.5px solid rgba(255,205,0,0.45)",
                borderRadius: 8, padding: "6px 10px", marginBottom: 3,
              } : {}}>
                <span className="polla-winner-name">
                  {isMe ? "⭐ " : ""}{e.name}
                </span>
                {isMe
                  ? <span style={{ fontSize: 11, fontWeight: 800, color: "var(--amarillo)" }}>¡Eres tú!</span>
                  : <span className="polla-crown">Ganó</span>
                }
              </div>
            )
          })
        )}
        {iAmGeneral && (
          <p style={{ fontSize: 11, color: "var(--amarillo)", fontWeight: 700, marginTop: 6 }}>
            🎉 ¡Ganaste el premio general! Acércate a Bienestar Social.
          </p>
        )}
        {iAmSede && (
          <p style={{ fontSize: 11, color: "var(--amarillo)", fontWeight: 700, marginTop: 4 }}>
            🎉 ¡Ganaste el premio de tu alojamiento!
          </p>
        )}
      </div>
    </div>
  )
}
