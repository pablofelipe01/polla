"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"

/* ── Types ──────────────────────────────────────────────── */

type Team = {
  name: string
  flagCode?: string
}

type Prediction = {
  golesLocal: number
  golesVisitante: number
}

export type MatchCardProps = {
  matchDate: string
  phase: string
  status: "OPEN" | "CLOSED"
  homeTeam: Team
  awayTeam: Team
  userPrediction?: Prediction
  onSave?: (prediction: Prediction) => void | Promise<void>
}

/* ── Helpers ─────────────────────────────────────────────── */

function FlagEmoji({ code }: { code?: string }) {
  if (!code) return null
  const flag = code
    .toUpperCase()
    .replace(/./g, (c) =>
      String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
    )
  return <span className="text-2xl leading-none">{flag}</span>
}

/* ── Main Component ──────────────────────────────────────── */

/**
 * Tarjeta de partido mundialista con soporte para pronóstico editable (OPEN)
 * y lectura (CLOSED). Usa Bebas Neue para impacto y Montserrat para datos.
 */
export default function MatchCard({
  matchDate,
  phase,
  status,
  homeTeam,
  awayTeam,
  userPrediction,
  onSave,
}: MatchCardProps) {
  const isOpen = status === "OPEN"

  const [golesLocal, setGolesLocal] = useState<string>(
    userPrediction?.golesLocal?.toString() ?? ""
  )
  const [golesVisitante, setGolesVisitante] = useState<string>(
    userPrediction?.golesVisitante?.toString() ?? ""
  )
  const [saving, setSaving] = useState(false)

  const hasPrediction =
    userPrediction !== undefined &&
    userPrediction.golesLocal !== undefined &&
    userPrediction.golesVisitante !== undefined

  const canSubmit =
    isOpen && golesLocal !== "" && golesVisitante !== ""

  async function handleSave() {
    if (!canSubmit || !onSave) return
    setSaving(true)
    try {
      await onSave({
        golesLocal: parseInt(golesLocal, 10),
        golesVisitante: parseInt(golesVisitante, 10),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="
        bg-white rounded-xl shadow-md
        border border-gray-100 border-t-4 border-t-rojo
        p-5 w-full max-w-2xl mx-auto
      "
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <p
            className="text-sm font-bold text-azul uppercase tracking-wide"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {phase}
          </p>
          <p
            className="flex items-center gap-1 mt-1 text-xs text-gray-500"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            <Calendar size={12} strokeWidth={2} />
            {matchDate}
          </p>
        </div>

        <StatusBadge status={status} />
      </div>

      {/* ── Teams + Score ── */}
      <div className="flex items-center justify-center gap-4 my-8 flex-wrap">
        {/* Home */}
        <TeamBlock team={homeTeam} align="right" />

        {/* Home score */}
        {isOpen ? (
          <ScoreInput
            value={golesLocal}
            onChange={setGolesLocal}
            label={homeTeam.name}
          />
        ) : (
          <ScoreDisplay value={hasPrediction ? userPrediction!.golesLocal : undefined} />
        )}

        {/* VS separator */}
        <div
          className="
            w-8 h-8 flex-shrink-0 flex items-center justify-center
            rounded-full border border-gray-200
            text-gray-400 text-xs font-bold
          "
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          VS
        </div>

        {/* Away score */}
        {isOpen ? (
          <ScoreInput
            value={golesVisitante}
            onChange={setGolesVisitante}
            label={awayTeam.name}
          />
        ) : (
          <ScoreDisplay value={hasPrediction ? userPrediction!.golesVisitante : undefined} />
        )}

        {/* Away */}
        <TeamBlock team={awayTeam} align="left" />
      </div>

      {/* ── Footer ── */}
      <div
        className="border-t border-gray-100 pt-4 mt-2 text-center"
        style={{ fontFamily: "var(--font-montserrat)" }}
      >
        <p className={`text-sm ${hasPrediction ? "text-ok font-semibold" : "text-gray-400"}`}>
          {hasPrediction ? "✓ Pronóstico guardado" : "Sin pronóstico registrado"}
        </p>

        {isOpen && (
          <button
            onClick={handleSave}
            disabled={!canSubmit || saving}
            className="
              w-full mt-4 py-3 rounded-lg
              bg-rojo hover:bg-red-700 disabled:opacity-50
              text-white text-xl tracking-wide
              transition-colors duration-150
              cursor-pointer disabled:cursor-not-allowed
            "
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            {saving ? "Guardando…" : hasPrediction ? "Actualizar pronóstico" : "Guardar pronóstico"}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function StatusBadge({ status }: { status: "OPEN" | "CLOSED" }) {
  const isOpen = status === "OPEN"
  return (
    <span
      className={`
        px-3 py-1 rounded-full text-xs font-bold tracking-wide flex-shrink-0
        ${isOpen
          ? "bg-green-50 text-ok"
          : "bg-red-50 text-rojo"
        }
      `}
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      {isOpen ? "Abierto" : "Cerrado"}
    </span>
  )
}

function TeamBlock({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 w-24 sm:w-32 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <FlagEmoji code={team.flagCode} />
      <span
        className="text-3xl sm:text-4xl text-slate-800 tracking-wide leading-none text-center w-full truncate"
        style={{ fontFamily: "var(--font-bebas)" }}
        title={team.name}
      >
        {team.name}
      </span>
    </div>
  )
}

function ScoreInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <input
      type="number"
      min={0}
      max={50}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className="
        w-16 h-20 flex-shrink-0
        bg-slate-50 border-2 border-slate-200 rounded-lg
        text-center text-4xl text-slate-800
        focus:border-rojo focus:outline-none focus:ring-0
        transition-colors duration-150
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
      "
      style={{ fontFamily: "var(--font-bebas)" }}
    />
  )
}

function ScoreDisplay({ value }: { value?: number }) {
  return (
    <div
      className="
        w-16 h-20 flex-shrink-0
        bg-slate-50 border-2 border-slate-200 rounded-lg
        flex items-center justify-center
        text-4xl text-slate-800
      "
      style={{ fontFamily: "var(--font-bebas)" }}
    >
      {value !== undefined ? value : <span className="text-slate-300">–</span>}
    </div>
  )
}
