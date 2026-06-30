import type { VistaPronosticos } from "@/lib/actions/pronosticos"
import { MatchBand, TeamHalf, type BandTone } from "@/app/_components/MatchCardParts"

/**
 * Vista de solo lectura de los pronósticos oficiales del equipo.
 * Para roles de consulta (Admin, DT y usuarios no habilitados): visualizan
 * sin capacidad de edición.
 *
 * Partidos finalizados: marcador oficial en el centro + pronóstico del equipo en el footer.
 * Partidos cerrados/abiertos: pronóstico del equipo en el centro.
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
        const abierto = e.status === "ABIERTO"

        const tone: BandTone = final ? "final" : cerrado ? "close" : "open"
        const cardCls = final ? "is-final" : cerrado ? "is-close" : "is-open"
        const label = final ? "Finalizado" : cerrado ? "Cerrado" : "Abierto"

        return (
          <article key={e.id} className={`fmc ${cardCls}`}>
            <MatchBand fase={e.Fase} tone={tone} label={label} dot={abierto} />

            <div className="fmc-body">
              <TeamHalf nombre={e.Local} tenue={cerrado && !final} />
              <div className="fmc-center">
                <div className="fmc-score-row">
                  {final ? (
                    // Resultado oficial — marcador prominente
                    <>
                      <span className="fmc-num">{e.GolesLocal}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num">{e.GolesVisitante}</span>
                    </>
                  ) : p ? (
                    // Pronóstico del equipo
                    <>
                      <span className="fmc-num">{p.GolesLocal}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num">{p.GolesVisitante}</span>
                    </>
                  ) : (
                    // Sin pronóstico
                    <>
                      <span className="fmc-num dash">{cerrado ? "?" : "–"}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num dash">{cerrado ? "?" : "–"}</span>
                    </>
                  )}
                </div>
                <span className="fmc-when">{e.inicioBogota}</span>
              </div>
              <TeamHalf nombre={e.Visitante} tenue={cerrado && !final} />
            </div>

            <div className={`fmc-foot ${final ? "gold" : p ? "info" : "muted"}`}>
              {final
                ? p
                  ? `Pronóstico del equipo: ${p.GolesLocal} – ${p.GolesVisitante}`
                  : "Sin pronóstico registrado"
                : p
                ? "Pronóstico del equipo · " + (cerrado ? "cerrado" : "abierto")
                : cerrado
                ? "Sin pronóstico · cerrado"
                : "Pendiente de pronóstico"}
            </div>
          </article>
        )
      })}
    </div>
  )
}
