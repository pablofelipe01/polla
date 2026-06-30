import type { VistaPronosticos } from "@/lib/actions/pronosticos"
import { MatchBand, TeamHalf, type BandTone } from "@/app/_components/MatchCardParts"

/** Mapea el estado del encuentro a la clase de tarjeta y el tono de la banda. */
function estadoVista(
  status: string,
  tienePronostico: boolean
): { card: string; tone: BandTone; txt: string; dot: boolean } {
  if (status === "FINALIZADO") return { card: "is-final", tone: "final", txt: "Finalizado", dot: false }
  if (status === "CERRADO") return { card: "is-close", tone: "close", txt: "Cerrado", dot: false }
  return tienePronostico
    ? { card: "is-open", tone: "open", txt: "Guardado", dot: false }
    : { card: "is-pending", tone: "pending", txt: "Pendiente", dot: true }
}

/**
 * Vista de solo lectura de los pronósticos oficiales del equipo.
 * Para roles de consulta (Admin, DT y usuarios no habilitados): visualizan
 * sin capacidad de edición. Server Component.
 */
export default function VistaSoloLectura({ datos }: { datos: VistaPronosticos }) {
  if (datos.encuentros.length === 0) {
    return <p style={{ color: "var(--gris)", fontSize: 14 }}>Aún no hay encuentros cargados.</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ color: "var(--gris)", fontSize: 13, margin: 0 }}>
        Pronósticos oficiales de <strong style={{ color: "var(--verde)" }}>{datos.equipoNombre}</strong>.
        Solo los 2 integrantes habilitados pueden editarlos.
      </p>
      {datos.encuentros.map((e) => {
        const p = datos.pronosticosEquipo[e.id]
        const final = e.GolesLocal !== null && e.GolesVisitante !== null
        const cerrado = e.status === "CERRADO"
        const est = estadoVista(e.status, !!p)
        return (
          <article key={e.id} className={`fmc ${est.card}`}>
            <MatchBand fase={e.Fase} tone={est.tone} label={est.txt} dot={est.dot} />

            <div className="fmc-body">
              <TeamHalf nombre={e.Local} tenue={cerrado} />
              <div className="fmc-center">
                <div className="fmc-score-row">
                  {p ? (
                    <>
                      <span className="fmc-num">{p.GolesLocal}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num">{p.GolesVisitante}</span>
                    </>
                  ) : (
                    <>
                      <span className="fmc-num dash">{cerrado ? "?" : "–"}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num dash">{cerrado ? "?" : "–"}</span>
                    </>
                  )}
                </div>
                <span className="fmc-when">{e.inicioBogota}</span>
              </div>
              <TeamHalf nombre={e.Visitante} tenue={cerrado} />
            </div>

            <div className={`fmc-foot ${final ? "gold" : p ? "info" : "muted"}`}>
              {final
                ? `Resultado oficial: ${e.GolesLocal} – ${e.GolesVisitante}`
                : p
                ? "Pronóstico del equipo"
                : "Sin pronóstico registrado"}
            </div>
          </article>
        )
      })}
    </div>
  )
}
