"use client"

import { useState, useActionState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { DateTime } from "luxon"
import type { AdminMatch } from "@/app/actions/admin"
import type { PredictionRecord } from "@/lib/airtable"
import {
  createMatchAction,
  updateMatchAction,
  deleteMatchAction,
  setResultAction,
  getMatchPredictions,
  exportPredictionsCsv,
} from "@/app/actions/admin"
import QRGenerator from "@/components/QRGenerator"

const PHASES = [
  "Fase de grupos",
  "Octavos de final",
  "Cuartos de final",
  "Semifinal",
  "Final",
]

const STATUS_LABELS: Record<string, string> = {
  PROXIMO:    "Próximo",
  ABIERTO:    "Abierto",
  CERRADO:    "Cerrado",
  FINALIZADO: "Final",
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PROXIMO:    { background: "#eef0f5",       color: "#5a6275" },
  ABIERTO:    { background: "#e6f6ec",       color: "var(--ok)" },
  CERRADO:    { background: "#fdeaec",       color: "var(--rojo)" },
  FINALIZADO: { background: "var(--tinta)",  color: "var(--amarillo)" },
}

// Colombia text badge (flag emoji breaks on Windows)
function ColBadge() {
  return (
    <span style={{
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      fontSize: 11,
      background: "var(--amarillo)",
      color: "var(--azul)",
      borderRadius: 4,
      padding: "1px 5px",
      letterSpacing: ".4px",
      verticalAlign: "middle",
      marginRight: 4,
    }}>COL</span>
  )
}

interface Props {
  matches: AdminMatch[]
}

export default function AdminDashboard({ matches: initialMatches }: Props) {
  const [activeTab,         setActiveTab]         = useState<"partidos" | "qr">("partidos")
  const [showCreateForm,    setShowCreateForm]    = useState(false)
  const [editingId,         setEditingId]         = useState<string | null>(null)
  const [resultMatchId,     setResultMatchId]     = useState<string | null>(null)
  const [predictionsMatchId, setPredictionsMatchId] = useState<string | null>(null)
  const [predictions,       setPredictions]       = useState<PredictionRecord[]>([])
  const [loadingPreds,      setLoadingPreds]      = useState(false)
  const [csvPending, startCsvTransition]          = useTransition()
  const router = useRouter()

  async function viewPredictions(matchId: string) {
    setPredictionsMatchId(matchId)
    setLoadingPreds(true)
    try {
      setPredictions(await getMatchPredictions(matchId))
    } finally {
      setLoadingPreds(false)
    }
  }

  async function handleExportCsv() {
    startCsvTransition(async () => {
      const csv = await exportPredictionsCsv()
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "pronosticos-polla-tricolor.csv"
      a.click()
      URL.revokeObjectURL(a.href)
    })
  }

  const currentMatch = initialMatches.find((m) => m.id === (editingId ?? resultMatchId))
  const predMatch    = initialMatches.find((m) => m.id === predictionsMatchId)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Barra de navegación ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          background: "var(--tinta-2)",
          padding: 5,
          borderRadius: 12,
        }}>
          {(["partidos", "qr"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 0,
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-body)",
                letterSpacing: ".2px",
                transition: ".15s",
                background: activeTab === tab ? "var(--amarillo)" : "transparent",
                color:      activeTab === tab ? "var(--tinta)"    : "var(--gris-2)",
              }}
            >
              {tab === "partidos" ? "Partidos" : "Código QR"}
            </button>
          ))}
        </div>

        {/* CSV */}
        <button
          onClick={handleExportCsv}
          disabled={csvPending}
          style={{
            marginLeft: "auto",
            background: "var(--ok)",
            color: "#fff",
            border: 0,
            borderRadius: 10,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            opacity: csvPending ? .55 : 1,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
            letterSpacing: ".2px",
          }}
        >
          {csvPending ? "Generando…" : "⬇ Exportar CSV"}
        </button>
      </div>

      {/* ── Tab: Partidos ── */}
      {activeTab === "partidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Botón nuevo partido */}
          {!showCreateForm && !editingId && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                alignSelf: "flex-start",
                background: "var(--amarillo)",
                color: "var(--tinta)",
                border: 0,
                borderRadius: 10,
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: ".3px",
                fontFamily: "var(--font-body)",
              }}
            >
              + Nuevo partido
            </button>
          )}

          {showCreateForm && (
            <MatchForm
              title="Nuevo partido"
              onCancel={() => setShowCreateForm(false)}
              action={createMatchAction}
              onSuccess={() => { setShowCreateForm(false); router.refresh() }}
            />
          )}

          {editingId && currentMatch && (
            <MatchForm
              title={`Editar: ${currentMatch.Rival}`}
              initial={currentMatch}
              onCancel={() => setEditingId(null)}
              action={(prev, fd) => updateMatchAction(editingId, prev, fd)}
              onSuccess={() => { setEditingId(null); router.refresh() }}
            />
          )}

          {resultMatchId && currentMatch && (
            <ResultForm
              match={currentMatch}
              onCancel={() => setResultMatchId(null)}
              onSuccess={() => { setResultMatchId(null); router.refresh() }}
            />
          )}

          {/* Tabla */}
          {initialMatches.length === 0 ? (
            <div style={{
              background: "#fff",
              border: "1px solid var(--linea)",
              borderRadius: 14,
              padding: "48px 0",
              textAlign: "center",
              color: "var(--gris)",
              fontSize: 14,
            }}>
              No hay partidos. Crea el primero.
            </div>
          ) : (
            <div className="admin-table-wrap" style={{ background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--azul)" }}>
                    {["Partido", "Fase", "Fecha (Bogotá)", "Estado", "Resultado", "Acciones"].map((h, i) => (
                      <th key={h} style={{
                        padding: "11px 14px",
                        textAlign: i >= 3 ? "center" : "left",
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: ".8px",
                        textTransform: "uppercase",
                        color: "var(--amarillo)",
                        whiteSpace: "nowrap",
                        ...(i === 1 || i === 2 ? { display: "none" } : {}),
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialMatches.map((m, idx) => (
                    <tr key={m.id} style={{
                      borderBottom: "1px solid var(--linea)",
                      background: idx % 2 === 1 ? "#faf9f6" : "#fff",
                    }}>

                      {/* Partido */}
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--azul)", fontSize: 13 }}>
                          <ColBadge />
                          vs {m.Rival.toUpperCase()}
                          {!m.EsLocal && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--gris-2)",
                              background: "#eef0f5",
                              borderRadius: 4,
                              padding: "1px 5px",
                            }}>
                              visitante
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Fase (oculta en móvil) */}
                      <td style={{ padding: "12px 14px", color: "var(--gris)", fontSize: 12, verticalAlign: "middle", display: "none" }}>
                        {m.Fase}
                      </td>

                      {/* Fecha (oculta en móvil) */}
                      <td style={{ padding: "12px 14px", color: "var(--gris-2)", fontSize: 11, verticalAlign: "middle", display: "none" }}>
                        {m.kickoffBogota}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        <span style={{
                          ...STATUS_STYLE[m.status],
                          display: "inline-block",
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: ".5px",
                          textTransform: "uppercase",
                          padding: "4px 9px",
                          borderRadius: 99,
                          whiteSpace: "nowrap",
                        }}>
                          {STATUS_LABELS[m.status]}
                        </span>
                      </td>

                      {/* Resultado */}
                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        {m.GolesCol !== null && m.GolesRival !== null ? (
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 16,
                            letterSpacing: "1px",
                            color: "var(--azul)",
                          }}>
                            {m.GolesCol} – {m.GolesRival}
                          </span>
                        ) : (
                          <span style={{ color: "var(--gris-2)", fontSize: 16 }}>—</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>
                          <Btn onClick={() => viewPredictions(m.id)} bg="#eef0f5" fg="var(--gris)">
                            👁 Ver
                          </Btn>
                          <Btn
                            onClick={() => { setResultMatchId(m.id); setEditingId(null); setShowCreateForm(false) }}
                            bg="#e6f6ec" fg="var(--ok)"
                          >
                            ✓ Resultado
                          </Btn>
                          <Btn
                            onClick={() => { setEditingId(m.id); setResultMatchId(null); setShowCreateForm(false) }}
                            bg="#e8edf7" fg="var(--azul)"
                          >
                            ✏ Editar
                          </Btn>
                          <DelBtn matchId={m.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: QR ── */}
      {activeTab === "qr" && <QRGenerator />}

      {/* ── Modal pronósticos ── */}
      {predictionsMatchId && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(10,14,26,.75)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            width: "100%", maxWidth: 520, maxHeight: "82vh",
            display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: "0 32px 64px rgba(0,0,0,.45)",
          }}>
            <div style={{
              background: "var(--azul)",
              padding: "15px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,205,0,.7)", marginBottom: 2 }}>
                  Pronósticos
                </div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 400, fontSize: 20,
                  color: "var(--amarillo)",
                  textTransform: "uppercase", letterSpacing: ".5px", margin: 0,
                }}>
                  COL vs {predMatch?.Rival?.toUpperCase() ?? ""}
                </h3>
              </div>
              <button
                onClick={() => setPredictionsMatchId(null)}
                aria-label="Cerrar"
                style={{
                  background: "rgba(255,255,255,.1)", border: 0,
                  color: "#fff", fontSize: 20, width: 32, height: 32,
                  borderRadius: 8, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >×</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: 16 }}>
              {loadingPreds ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gris)", fontSize: 14 }}>
                  Cargando pronósticos…
                </div>
              ) : predictions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gris)", fontSize: 14 }}>
                  Aún no hay pronósticos para este partido.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--linea)" }}>
                      {["Nombre", "Cédula", "COL", "RIV"].map((h, i) => (
                        <th key={h} style={{
                          padding: "6px 10px 10px",
                          textAlign: i < 2 ? "left" : "center",
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: ".8px", textTransform: "uppercase",
                          color: "var(--gris)",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => {
                      const win = predMatch != null &&
                        predMatch.GolesCol  !== null && predMatch.GolesRival !== null &&
                        p.GolesCol === predMatch.GolesCol && p.GolesRival === predMatch.GolesRival
                      return (
                        <tr key={p.id} style={{
                          borderBottom: "1px solid var(--linea)",
                          background: win ? "#e6f6ec" : "transparent",
                        }}>
                          <td style={{ padding: "10px 10px", fontWeight: 600, color: "var(--tinta)" }}>
                            {win && <span style={{ marginRight: 4 }}>🏆</span>}
                            {p.NombreCompleto}
                          </td>
                          <td style={{ padding: "10px 10px", color: "var(--gris)", fontFamily: "monospace", fontSize: 11 }}>
                            {p.Cedula}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 800, color: "var(--azul)", fontFamily: "var(--font-display)", fontSize: 16 }}>
                            {p.GolesCol}
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 800, color: "var(--rojo)", fontFamily: "var(--font-display)", fontSize: 16 }}>
                            {p.GolesRival}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Botón de tabla ───────────────────────────────────────────────────────────

function Btn({ onClick, bg, fg, children }: { onClick: () => void; bg: string; fg: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: bg, color: fg,
      border: 0, borderRadius: 7,
      padding: "5px 10px", fontSize: 11, fontWeight: 700,
      cursor: "pointer", whiteSpace: "nowrap",
      fontFamily: "var(--font-body)", letterSpacing: ".1px",
    }}>
      {children}
    </button>
  )
}

function DelBtn({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar este partido y todos sus pronósticos?")) return
        start(async () => { await deleteMatchAction(matchId); router.refresh() })
      }}
      style={{
        background: "#fdeaec", color: "var(--rojo)",
        border: 0, borderRadius: 7,
        padding: "5px 10px", fontSize: 11, fontWeight: 700,
        cursor: "pointer", opacity: pending ? .5 : 1,
        fontFamily: "var(--font-body)",
      }}
    >
      {pending ? "…" : "✕ Eliminar"}
    </button>
  )
}

// ─── MatchForm ────────────────────────────────────────────────────────────────

interface MatchFormProps {
  title: string
  initial?: AdminMatch
  onCancel: () => void
  action: (prev: { error?: string; success?: boolean }, fd: FormData) => Promise<{ error?: string; success?: boolean }>
  onSuccess: () => void
}

function MatchForm({ title, initial, onCancel, action, onSuccess }: MatchFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  useEffect(() => { if (state?.success) onSuccessRef.current() }, [state?.success])
  if (state?.success) return null

  // Mostrar en hora Colombia para que el admin ingrese en hora local
  const defaultKickoff = initial?.FechaHoraUtc
    ? DateTime.fromISO(initial.FechaHoraUtc, { zone: "utc" })
        .setZone("America/Bogota")
        .toFormat("yyyy-MM-dd'T'HH:mm")
    : ""

  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--linea)",
      borderLeft: "4px solid var(--azul)",
      borderRadius: 14,
      padding: "20px 20px 16px",
      boxShadow: "0 2px 8px rgba(10,14,26,.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--amarillo)", flexShrink: 0,
        }} />
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400, fontSize: 17,
          color: "var(--azul)",
          textTransform: "uppercase", letterSpacing: ".5px", margin: 0,
        }}>
          {title}
        </h3>
      </div>

      <form action={formAction} className="admin-form-grid">
        <div>
          <label className="polla-label" htmlFor="f-rival">Rival</label>
          <input id="f-rival" name="Rival" defaultValue={initial?.Rival}
            required placeholder="Ej: Brasil" className="polla-input" style={{ fontSize: 14, padding: "10px 12px" }} />
        </div>

        <div>
          <label className="polla-label" htmlFor="f-fase">Fase</label>
          <select id="f-fase" name="Fase" defaultValue={initial?.Fase ?? PHASES[0]}
            className="polla-input" style={{ fontSize: 14, padding: "10px 12px" }}>
            {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="polla-label" htmlFor="f-fecha">Fecha y hora (hora Colombia)</label>
          <input id="f-fecha" name="FechaHoraUtc" type="datetime-local"
            defaultValue={defaultKickoff} required
            className="polla-input" style={{ fontSize: 14, padding: "10px 12px" }} />
          <p style={{ fontSize: 11, color: "var(--gris)", marginTop: 5 }}>
            Ingresa la hora local de Colombia (UTC−5)
          </p>
        </div>

        <input type="hidden" name="EsLocal" value="true" />

{state?.error && (
          <p style={{
            gridColumn: "1 / -1",
            fontSize: 12, fontWeight: 600, color: "var(--rojo)",
            background: "#fdeaec", borderRadius: 8, padding: "9px 12px", margin: 0,
          }}>
            {state.error}
          </p>
        )}

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button type="submit" disabled={pending} style={{
            background: "var(--azul)", color: "#fff",
            border: 0, borderRadius: 10, padding: "11px 24px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            opacity: pending ? .6 : 1, fontFamily: "var(--font-body)",
          }}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onCancel} style={{
            background: "transparent", color: "var(--gris)",
            border: "1.5px solid var(--linea)", borderRadius: 10,
            padding: "11px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── ResultForm ───────────────────────────────────────────────────────────────

function ResultForm({ match, onCancel, onSuccess }: { match: AdminMatch; onCancel: () => void; onSuccess: () => void }) {
  const boundAction = setResultAction.bind(null, match.id)
  const [state, formAction, pending] = useActionState(boundAction, {})
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess
  useEffect(() => { if (state?.success) onSuccessRef.current() }, [state?.success])
  if (state?.success) return null

  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--linea)",
      borderLeft: "4px solid var(--ok)",
      borderRadius: 14,
      padding: "20px 20px 16px",
      boxShadow: "0 2px 8px rgba(10,14,26,.07)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", flexShrink: 0 }} />
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontWeight: 400, fontSize: 17,
          color: "var(--ok)",
          textTransform: "uppercase", letterSpacing: ".5px", margin: 0,
        }}>
          Registrar resultado · COL vs {match.Rival.toUpperCase()}
        </h3>
      </div>

      <form action={formAction} style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>

        <div style={{ textAlign: "center" }}>
          <label className="polla-label" style={{ textAlign: "center", display: "block" }}>Colombia</label>
          <input name="resultCol" type="number" min={0} max={20}
            defaultValue={match.GolesCol ?? 0} required
            style={{
              width: 80, height: 72, textAlign: "center",
              fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400,
              border: "2px solid var(--azul)", borderRadius: 12,
              color: "var(--azul)", outline: "none", background: "#f0f4ff",
            }} />
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gris-2)", paddingBottom: 6 }}>—</div>

        <div style={{ textAlign: "center" }}>
          <label className="polla-label" style={{ textAlign: "center", display: "block" }}>{match.Rival}</label>
          <input name="resultOpp" type="number" min={0} max={20}
            defaultValue={match.GolesRival ?? 0} required
            style={{
              width: 80, height: 72, textAlign: "center",
              fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 400,
              border: "2px solid var(--rojo)", borderRadius: 12,
              color: "var(--rojo)", outline: "none", background: "#fff5f6",
            }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 2 }}>
          <button type="submit" disabled={pending} style={{
            background: "var(--ok)", color: "#fff",
            border: 0, borderRadius: 10, padding: "12px 22px",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            opacity: pending ? .6 : 1, fontFamily: "var(--font-body)", whiteSpace: "nowrap",
          }}>
            {pending ? "Guardando…" : "✓ Registrar resultado"}
          </button>
          <button type="button" onClick={onCancel} style={{
            background: "transparent", color: "var(--gris)",
            border: "1.5px solid var(--linea)", borderRadius: 10,
            padding: "9px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}>
            Cancelar
          </button>
        </div>

        {state?.error && (
          <p style={{ width: "100%", fontSize: 12, fontWeight: 600, color: "var(--rojo)", margin: 0 }}>
            {state.error}
          </p>
        )}
      </form>
    </div>
  )
}
