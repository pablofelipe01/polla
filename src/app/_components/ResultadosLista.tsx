import type { EncuentroConEstado } from "@/lib/services/encuentros"
import { normalizarFase } from "./MatchCardParts"

const ESTADO: Record<string, { acento: string; badge: React.CSSProperties; label: string; live?: boolean }> = {
  ABIERTO:    { acento: "is-open",  badge: { background: "rgba(0,220,130,.12)",  border: "1px solid rgba(0,220,130,.25)",  color: "var(--verde)" },  label: "Abierto", live: true },
  CERRADO:    { acento: "is-close", badge: { background: "rgba(255,71,87,.12)",  border: "1px solid rgba(255,71,87,.25)",  color: "var(--rojo)" },   label: "Cerrado" },
  FINALIZADO: { acento: "is-final", badge: { background: "rgba(255,214,0,.1)",   border: "1px solid rgba(255,214,0,.2)",   color: "var(--oro)" },    label: "Final" },
}

/** Lista de encuentros con marcador y estado. Componente de presentación. */
export default function ResultadosLista({ encuentros }: { encuentros: EncuentroConEstado[] }) {
  if (encuentros.length === 0) {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--linea)", borderRadius: 16, padding: "44px 0", textAlign: "center", color: "var(--gris)", fontSize: 14, boxShadow: "var(--sh-sm)" }}>
        Aún no hay encuentros cargados.
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {encuentros.map((e, i) => {
        const final = e.GolesLocal !== null && e.GolesVisitante !== null
        const cfg = ESTADO[e.status] ?? ESTADO.CERRADO
        return (
          <div key={e.id} className={`res-row ${cfg.acento}`} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="res-fase">{normalizarFase(e.Fase)} · {e.inicioBogota}</div>
              <div className="res-teams">
                {e.Local} <span style={{ color: "var(--gris-2)", fontWeight: 600 }}>vs</span> {e.Visitante}
              </div>
            </div>
            <div className="res-score">{final ? `${e.GolesLocal} – ${e.GolesVisitante}` : "—"}</div>
            <span className="res-badge" style={cfg.badge}>
              {cfg.live && <span className="live-dot" />}
              {cfg.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
