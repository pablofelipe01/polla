"use client"

import { useActionState } from "react"
import { registrarPronosticoAction, type DatosPanel } from "@/lib/actions/pronosticos"
import type { EncuentroConEstado } from "@/lib/services/encuentros"
import type { Pronostico } from "@/lib/clients/airtable"
import { useActionFeedback } from "@/app/_components/Feedback"
import { MatchBand, TeamHalf, type BandTone } from "@/app/_components/MatchCardParts"

export default function PanelClient({ datos }: { datos: DatosPanel }) {
  if (datos.encuentros.length === 0) {
    return (
      <p style={{ color: "var(--gris)", fontSize: 14 }}>
        No hay partidos abiertos para pronosticar en este momento. Los pronósticos se habilitan 48 horas antes de cada partido y cierran al inicio.
      </p>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: "var(--gris)", fontSize: 13, margin: 0 }}>
        Registra el pronóstico oficial de tu equipo. Solo puedes editarlo mientras el encuentro está
        <strong style={{ color: "var(--verde)" }}> abierto</strong>.
      </p>
      {datos.encuentros.map((e) => (
        <FilaPronostico key={e.id} encuentro={e} pronostico={datos.misPronosticos[e.id]} />
      ))}
    </div>
  )
}

function FilaPronostico({
  encuentro: e,
  pronostico,
}: {
  encuentro: EncuentroConEstado
  pronostico?: Pronostico
}) {
  const [state, action, pending] = useActionState(registrarPronosticoAction, {})
  useActionFeedback(state, `Pronóstico guardado: ${e.Local} vs ${e.Visitante}`)

  const abierto = e.status === "ABIERTO"
  const final = e.GolesLocal !== null && e.GolesVisitante !== null
  const tone: BandTone = abierto ? "open" : final ? "final" : "close"
  const cardCls = abierto ? "is-open" : final ? "is-final" : "is-close"
  const label = abierto ? "Abierto" : final ? "Finalizado" : "Cerrado"

  return (
    <article className={`fmc ${cardCls}`}>
      <MatchBand fase={e.Fase} tone={tone} label={label} dot={abierto} />

      {abierto ? (
        <form action={action}>
          <input type="hidden" name="encuentroId" value={e.id} />
          <div className="fmc-body">
            <TeamHalf nombre={e.Local} />
            <div className="fmc-center">
              <div className="fmc-score-row">
                <ScoreInput name="golesLocal" def={pronostico?.GolesLocal ?? 0} aria={`Goles ${e.Local}`} />
                <span className="fmc-colon">:</span>
                <ScoreInput name="golesVisitante" def={pronostico?.GolesVisitante ?? 0} aria={`Goles ${e.Visitante}`} />
              </div>
              <span className="fmc-when">{e.inicioBogota}</span>
            </div>
            <TeamHalf nombre={e.Visitante} />
          </div>
          <button type="submit" disabled={pending} className="fmc-foot cta">
            {pending ? "Guardando…" : pronostico ? "Actualizar pronóstico →" : "Guardar pronóstico →"}
          </button>
        </form>
      ) : (
        <>
          <div className="fmc-body">
            <TeamHalf nombre={e.Local} tenue={!final} />
            <div className="fmc-center">
              <div className="fmc-score-row">
                {pronostico ? (
                  <>
                    <span className="fmc-num">{pronostico.GolesLocal}</span>
                    <span className="fmc-colon">:</span>
                    <span className="fmc-num">{pronostico.GolesVisitante}</span>
                  </>
                ) : (
                  <>
                    <span className="fmc-num dash">?</span>
                    <span className="fmc-colon">:</span>
                    <span className="fmc-num dash">?</span>
                  </>
                )}
              </div>
              {final && e.PenalesLocal !== null && e.PenalesVisitante !== null && (
                <span style={{ fontSize: 11, color: "var(--gris)", letterSpacing: "0.03em", marginTop: 2 }}>
                  Pen. {e.PenalesLocal} – {e.PenalesVisitante}
                </span>
              )}
              <span className="fmc-when">{e.inicioBogota}</span>
            </div>
            <TeamHalf nombre={e.Visitante} tenue={!final} />
          </div>
          <div className={`fmc-foot ${final ? "gold" : pronostico ? "info" : "muted"}`}>
            {final
              ? `Resultado oficial: ${e.GolesLocal} – ${e.GolesVisitante}${e.PenalesLocal !== null && e.PenalesVisitante !== null ? ` (Pen. ${e.PenalesLocal} – ${e.PenalesVisitante})` : ""}`
              : pronostico
              ? "Tu pronóstico · cerrado"
              : "Sin pronóstico · cerrado"}
          </div>
        </>
      )}
    </article>
  )
}

function ScoreInput({ name, def, aria }: { name: string; def: number; aria: string }) {
  return (
    <input
      className="fmc-score"
      name={name}
      type="number"
      min={0}
      max={50}
      defaultValue={def}
      required
      aria-label={aria}
    />
  )
}
