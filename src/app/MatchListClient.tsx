"use client"

import { useState, useRef } from "react"
import type { MatchWithStatus, Winner, WinnerEntry } from "./actions/public"
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
        <div className="eyebrow">Mundial 2026</div>
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
          Pronostica el marcador exacto de la Selección Colombia. Tienen posibilidades de ganar quienes acierten el resultado.
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

                {/* Apuesta especial: finalistas */}
                <FinalistPicker participant={participant} onNeedName={handleNeedName} />
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
                      participantName={participant?.fullName ?? ""}
                      participantSede={participant?.sede ?? ""}
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
        Polla Tricolor 
      </footer>
    </div>
  )
}

/* ── WinnerCard ──────────────────────────────────────────── */

const SEDE_STYLE: Partial<Record<Sede, { bg: string; text: string; label: string }>> = {
  FORZOSA:    { bg: "#00205B", text: "#FFCD00", label: "Alojamiento Forzosa" },
  BRISAS:     { bg: "#0a3aa8", text: "#ffffff", label: "Alojamiento Brisas" },
  GUADUALITO: { bg: "#CE1126", text: "#ffffff", label: "Alojamiento Guadualito" },
  GENERAL:    { bg: "#374151", text: "#ffffff", label: "Sin alojamiento" },
}

function SedeRoulette({
  candidates,
  winners,
  textColor,
}: {
  candidates: WinnerEntry[]
  winners: WinnerEntry[]
  textColor: string
}) {
  const [phase, setPhase]           = useState<"idle" | "spinning" | "done">("idle")
  const [displayName, setDisplayName] = useState("")
  const [flash, setFlash]           = useState(false)
  const [confirmed, setConfirmed]   = useState<WinnerEntry[]>([])
  const abortRef                    = useRef(false)

  async function run() {
    abortRef.current = false
    setPhase("spinning")
    setConfirmed([])
    setDisplayName("")

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    const stages = [
      { ms: 48,  reps: 20 },
      { ms: 100, reps: 12 },
      { ms: 190, reps: 7  },
      { ms: 340, reps: 4  },
      { ms: 520, reps: 2  },
    ]

    for (let wi = 0; wi < winners.length; wi++) {
      for (const { ms, reps } of stages) {
        for (let r = 0; r < reps; r++) {
          if (abortRef.current) return
          setDisplayName(candidates[Math.floor(Math.random() * candidates.length)].name)
          await sleep(ms)
        }
      }
      if (abortRef.current) return
      setDisplayName(winners[wi].name)
      setFlash(true)
      await sleep(950)
      if (abortRef.current) return
      setFlash(false)
      setConfirmed((prev) => [...prev, winners[wi]])
      setDisplayName("")
      if (wi < winners.length - 1) await sleep(600)
    }
    if (!abortRef.current) setPhase("done")
  }

  function reset() {
    abortRef.current = true
    setPhase("idle")
    setDisplayName("")
    setFlash(false)
    setConfirmed([])
  }

  if (candidates.length <= winners.length) return null

  const dark   = "rgba(0,0,0,0.22)"
  const medium = "rgba(0,0,0,0.15)"
  const rimW   = "rgba(255,255,255,0.3)"

  return (
    <div style={{ marginTop: 10 }}>
      {phase === "idle" && (
        <button
          onClick={run}
          style={{
            width: "100%", background: medium,
            border: `1px solid ${rimW}`,
            borderRadius: 20, padding: "8px 16px",
            color: textColor, fontSize: 11, fontWeight: 800,
            cursor: "pointer", letterSpacing: ".4px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>🎰</span> Ver sorteo
        </button>
      )}

      {phase === "spinning" && (
        <div>
          <p style={{
            fontSize: 10, color: textColor, opacity: .8, marginBottom: 6,
            textAlign: "center", fontWeight: 700, letterSpacing: ".3px",
          }}>
            {flash
              ? `✓ ¡Ganador ${confirmed.length + 1} de ${winners.length} elegido!`
              : `Eligiendo ganador ${confirmed.length + 1} de ${winners.length}…`}
          </p>
          <div style={{
            background: flash ? "rgba(255,255,255,0.22)" : dark,
            border: `2px solid ${flash ? "rgba(255,255,255,0.85)" : rimW}`,
            borderRadius: 10, padding: "12px 14px",
            fontSize: 13, fontWeight: 900, color: textColor,
            minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center",
            transform: flash ? "scale(1.03)" : "scale(1)",
            transition: "all 0.08s ease", letterSpacing: ".3px", textAlign: "center",
            textShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}>
            {displayName || "…"}
          </div>
          {confirmed.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
              {confirmed.map((w, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 6, padding: "5px 10px",
                  fontSize: 12, fontWeight: 800, color: textColor,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ opacity: .7 }}>✓</span> {w.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "done" && (
        <button
          onClick={reset}
          style={{
            background: medium, border: `1px solid ${rimW}`,
            borderRadius: 20, padding: "5px 14px",
            color: textColor, fontSize: 10, fontWeight: 700,
            cursor: "pointer", letterSpacing: ".3px", opacity: .85,
          }}
        >
          ↺ Ver de nuevo
        </button>
      )}
    </div>
  )
}

function WinnerCard({
  winner,
  participantName,
  participantSede,
}: {
  winner: Winner
  participantName: string
  participantSede: Sede | ""
}) {
  const resStr    = `${winner.scoreCol} : ${winner.scoreOpp}`
  const showAll   = !participantSede

  // Filtrar entradas visibles según la sede del participante
  const visibleCorrect = showAll
    ? winner.allCorrect
    : winner.allCorrect.filter((e) => e.sede === participantSede)
  const visibleWinners = showAll
    ? winner.sedeWinners
    : winner.sedeWinners.filter((e) => e.sede === participantSede)

  const winnerSet  = new Set(visibleWinners.map((e) => e.name))
  const iAmWinner  = !!participantName && winnerSet.has(participantName)

  return (
    <div className="polla-card">
      {/* Cabecera del partido */}
      <div className="polla-mhead">
        <span className="polla-fase">{winner.phase}</span>
        <span className="polla-badge b-final">Final {resStr}</span>
      </div>
      <div className="polla-vs">
        COLOMBIA <span style={{ color: "var(--gris)" }}>vs</span> {winner.rival.toUpperCase()}
      </div>

      {/* Todos los que acertaron (filtrados por sede) */}
      <div style={{ marginTop: 12 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.6px", color: "var(--gris)", marginBottom: 4,
        }}>
          {visibleCorrect.length === 0
            ? "Nadie acertó"
            : `Acertaron el marcador (${visibleCorrect.length})`}
        </p>

        {visibleCorrect.length === 0 ? (
          <div className="polla-empty" style={{ padding: "10px 0" }}>
            Nadie acertó el marcador exacto.
          </div>
        ) : (
          visibleCorrect.map((e, i) => {
            const isMe      = !!participantName && e.name === participantName
            const isWinner  = winnerSet.has(e.name)
            const eSede     = showAll ? SEDE_STYLE[e.sede as Sede] : undefined
            return (
              <div key={i} className="polla-winner-row" style={isMe ? {
                background: "rgba(255,205,0,0.12)",
                border: "1.5px solid rgba(255,205,0,0.45)",
                borderRadius: 8, padding: "6px 10px", marginBottom: 3,
              } : {}}>
                <span className="polla-winner-name">
                  {isMe ? "⭐ " : ""}{e.name}
                  {eSede && (
                    <span style={{
                      marginLeft: 6, fontSize: 9, fontWeight: 700,
                      padding: "1px 5px", borderRadius: 4,
                      background: eSede.bg, color: eSede.text,
                      verticalAlign: "middle",
                    }}>
                      {eSede.label.replace("Alojamiento ", "")}
                    </span>
                  )}
                </span>
                {isWinner && (
                  isMe
                    ? <span style={{ fontSize: 11, fontWeight: 800, color: "var(--amarillo)" }}>¡Eres tú!</span>
                    : <span className="polla-crown">Ganó</span>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Ganadores por alojamiento (filtrados por sede) */}
      {visibleWinners.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.6px", color: "var(--gris)", marginBottom: 6,
          }}>
            Ganadores
          </p>
          {(Object.entries(SEDE_STYLE) as [Sede, NonNullable<typeof SEDE_STYLE[Sede]>][])
            .filter(([, s]) => !!s)
            .filter(([sede]) => showAll || sede === participantSede)
            .map(([sede, style]) => {
              const sedeWinners    = visibleWinners.filter((e) => e.sede === sede)
              const sedeCandidates = winner.allCorrect.filter((e) => e.sede === sede)
              const sedeTotal      = winner.sedeTotals[sede] ?? 0
              if (sedeWinners.length === 0) return null
              return (
                <div key={sede} style={{
                  background: style.bg, borderRadius: 10,
                  overflow: "hidden", marginBottom: 8,
                }}>
                  {/* Header sede */}
                  <div style={{
                    padding: "9px 12px 7px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderBottom: "1px solid rgba(255,255,255,0.12)",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                      letterSpacing: "0.9px", color: style.text,
                    }}>
                      {style.label}
                    </span>
                    {sedeTotal > sedeWinners.length && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        background: "rgba(0,0,0,0.25)", color: style.text,
                        padding: "2px 8px", borderRadius: 20, letterSpacing: ".3px",
                      }}>
                        Sorteo entre {sedeTotal}
                      </span>
                    )}
                  </div>
                  {/* Filas de ganadores */}
                  <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {sedeWinners.map((e, i) => {
                    const isMe = !!participantName && e.name === participantName
                    return (
                      <div key={i} style={{
                        background: isMe ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
                        border: isMe ? "1.5px solid rgba(255,255,255,0.6)" : "1.5px solid rgba(255,255,255,0.08)",
                        borderRadius: 7, padding: "8px 12px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span style={{
                          color: style.text, fontWeight: 800, fontSize: 13,
                          letterSpacing: ".2px", textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                        }}>
                          {isMe ? "⭐ " : "🏅 "}{e.name}
                        </span>
                        {isMe && (
                          <span style={{
                            fontSize: 10, fontWeight: 900,
                            background: "rgba(255,255,255,0.92)",
                            color: style.bg,
                            padding: "3px 10px", borderRadius: 20,
                            letterSpacing: ".3px", whiteSpace: "nowrap",
                          }}>¡Eres tú!</span>
                        )}
                      </div>
                    )
                  })}
                  </div>
                  <div style={{ padding: "0 10px 10px" }}>
                    <SedeRoulette
                      candidates={sedeCandidates}
                      winners={sedeWinners}
                      textColor={style.text}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Mensaje personal al ganador */}
      {iAmWinner && (
        <p style={{ fontSize: 11, color: "var(--amarillo)", fontWeight: 700, marginTop: 6 }}>
          {participantSede === "GENERAL"
            ? "🎉 ¡Ganaste! Acércate a Gestion Humana para reclamar tu premio a partir del 1 de Julio."
            : "🎉 ¡Ganaste! El equipo de Bienestar Social se acercará al alojamiento para entregarte tu premio."}
        </p>
      )}
    </div>
  )
}
