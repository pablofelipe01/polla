"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import {
  crearEncuentroAction,
  registrarResultadoAction,
  eliminarEncuentroAction,
  sincronizarPartidosAction,
} from "@/lib/actions/admin"
import type { EncuentroConEstado } from "@/lib/services/encuentros"
import { card, input, label, btnPrimary, SectionTitle, DeleteButton } from "./ui"
import { useActionFeedback, useFeedback } from "@/app/_components/Feedback"

const FASES = ["Fase de grupos", "32avos de final", "Octavos de final", "Cuartos de final", "Semifinal", "Tercer puesto", "Final"]

const ESTADO_STYLE: Record<string, React.CSSProperties> = {
  ABIERTO:    { background: "rgba(0,220,130,.12)", border: "1px solid rgba(0,220,130,.25)", color: "var(--verde)" },
  CERRADO:    { background: "rgba(255,71,87,.12)",  border: "1px solid rgba(255,71,87,.25)",  color: "var(--rojo)" },
  FINALIZADO: { background: "rgba(255,214,0,.1)",   border: "1px solid rgba(255,214,0,.2)",   color: "var(--oro)" },
}

export default function EncuentrosTab({ encuentros }: { encuentros: EncuentroConEstado[] }) {
  const [state, action, pending] = useActionState(crearEncuentroAction, {})
  useActionFeedback(state, "Encuentro creado")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SincronizarCard />
      <div style={card}>
        <SectionTitle>Nuevo encuentro</SectionTitle>
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="en-local">Local</label>
              <input id="en-local" name="Local" required placeholder="Ej: Brasil" style={input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label} htmlFor="en-visit">Visitante</label>
              <input id="en-visit" name="Visitante" required placeholder="Ej: Argentina" style={input} />
            </div>
          </div>
          <div>
            <label style={label} htmlFor="en-fase">Fase</label>
            <select id="en-fase" name="Fase" style={input} defaultValue={FASES[0]}>
              {FASES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={label} htmlFor="en-fecha">Inicio (hora Colombia)</label>
              <input id="en-fecha" name="FechaHoraUtc" type="datetime-local" required style={input} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={label} htmlFor="en-cierre">Cierre pronósticos (opcional)</label>
              <input id="en-cierre" name="CierreUtc" type="datetime-local" style={input} />
            </div>
          </div>
          <button type="submit" disabled={pending} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: pending ? 0.6 : 1 }}>
            {pending ? "Guardando…" : "Crear encuentro"}
          </button>
        </form>
      </div>

      <div style={card}>
        <SectionTitle>Encuentros ({encuentros.length})</SectionTitle>
        {encuentros.length === 0 ? (
          <p style={{ color: "var(--gris)", fontSize: 13 }}>Aún no hay encuentros.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {encuentros.map((e) => (
              <FilaEncuentro key={e.id} e={e} estadoStyle={ESTADO_STYLE[e.status]} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilaEncuentro({ e, estadoStyle }: { e: EncuentroConEstado; estadoStyle: React.CSSProperties }) {
  const [abrirResultado, setAbrirResultado] = useState(false)
  const final = e.GolesLocal !== null && e.GolesVisitante !== null

  return (
    <div style={{ border: "1px solid var(--linea)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--gris-2)", letterSpacing: ".4px" }}>
            {e.Fase} · {e.inicioBogota}
          </div>
          <div style={{ fontWeight: 700, color: "var(--azul)", fontSize: 14 }}>
            {e.Local} <span style={{ color: "var(--gris-2)" }}>vs</span> {e.Visitante}
            {final && <span style={{ marginLeft: 8, fontFamily: "var(--font-display)" }}>{e.GolesLocal} – {e.GolesVisitante}</span>}
          </div>
        </div>
        <span style={{ ...estadoStyle, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", padding: "3px 8px", borderRadius: 99 }}>
          {e.status}
        </span>
        <button
          onClick={() => setAbrirResultado((v) => !v)}
          title="Registrar resultado manualmente (el cron lo hace automáticamente)"
          style={{ background: "rgba(0,220,130,.12)", color: "var(--verde)", border: "1px solid rgba(0,220,130,.25)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
        >
          ✎ Resultado
        </button>
        <DeleteButton confirmMsg="¿Eliminar este encuentro y sus pronósticos?" onDelete={() => eliminarEncuentroAction(e.id)} />
      </div>
      {abrirResultado && <ResultadoForm e={e} />}
    </div>
  )
}

function SincronizarCard() {
  const [state, action, pending] = useActionState(sincronizarPartidosAction, {})
  const { toast } = useFeedback()
  const last = useRef(state)
  useEffect(() => {
    if (state === last.current) return
    last.current = state
    if (state?.resultado) {
      const r = state.resultado
      toast(`Sincronización: ${r.creados} creados · ${r.actualizados} actualizados`, "success")
    } else if (state?.error) {
      toast(state.error, "error")
    }
  }, [state, toast])

  return (
    <div style={{ ...card, borderLeft: "4px solid var(--ok)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--azul)", fontSize: 14 }}>Sincronizar con football-data.org</div>
          <div style={{ fontSize: 12, color: "var(--gris)", marginTop: 2 }}>
            Se ejecuta automáticamente cada 15 min. Los resultados finales se registran solos
            cuando el partido termina en <code>football-data.org</code>.
            Usa este botón para forzar una sincronización inmediata.
          </div>
        </div>
        <form action={action}>
          <button type="submit" disabled={pending} style={{ background: "var(--ok)", color: "#fff", border: 0, borderRadius: 9, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {pending ? "Sincronizando…" : "⟳ Sincronizar partidos"}
          </button>
        </form>
      </div>
      {state?.error && <p style={{ fontSize: 12, color: "var(--rojo)", marginTop: 8, fontWeight: 600 }}>{state.error}</p>}
      {state?.resultado && (
        <p style={{ fontSize: 12, color: "var(--ok)", marginTop: 8, fontWeight: 600 }}>
          ✓ {state.resultado.totalPartidos} partidos procesados · {state.resultado.creados} creados · {state.resultado.actualizados} actualizados
          {state.resultado.errores > 0 && ` · ${state.resultado.errores} errores`}
        </p>
      )}
    </div>
  )
}

function ResultadoForm({ e }: { e: EncuentroConEstado }) {
  const boundAction = registrarResultadoAction.bind(null, e.id)
  const [state, action, pending] = useActionState(boundAction, {})
  useActionFeedback(state, `Resultado registrado: ${e.Local} vs ${e.Visitante}`)

  return (
    <form action={action} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
      <input name="golesLocal" type="number" min={0} max={50} defaultValue={e.GolesLocal ?? 0} required style={{ ...input, width: 64, textAlign: "center" }} />
      <span style={{ fontWeight: 800, color: "var(--gris-2)" }}>–</span>
      <input name="golesVisitante" type="number" min={0} max={50} defaultValue={e.GolesVisitante ?? 0} required style={{ ...input, width: 64, textAlign: "center" }} />
      <label style={{ fontSize: 11, color: "var(--gris)", display: "flex", alignItems: "center", gap: 4 }}>
        <input type="checkbox" name="forzar" value="true" /> forzar
      </label>
      <button type="submit" disabled={pending} style={{ background: "var(--ok)", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
        {pending ? "…" : "Registrar"}
      </button>
    </form>
  )
}
