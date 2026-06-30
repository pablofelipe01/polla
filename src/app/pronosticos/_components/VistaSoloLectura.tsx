import type { VistaPronosticos } from "@/lib/actions/pronosticos"
import { MatchBand, TeamHalf, type BandTone } from "@/app/_components/MatchCardParts"

/** Oculta partidos de fase de grupos ya finalizados; mantiene fase eliminatoria y partidos aún abiertos/cerrados. */
function esFaseGrupos(fase: string): boolean {
  return fase.toLowerCase().includes("grupo")
}

/**
 * Vista de solo lectura de partidos y marcadores. Muestra:
 * - Todos los partidos de fase eliminatoria (32avos en adelante).
 * - Partidos de fase de grupos aún no finalizados.
 * Para todos los roles excepto los 2 pronosticadores habilitados.
 */
export default function VistaSoloLectura({ datos }: { datos: VistaPronosticos }) {
  const encuentros = datos.encuentros.filter(
    (e) => !(esFaseGrupos(e.Fase) && e.status === "FINALIZADO")
  )

  if (encuentros.length === 0) {
    return <p style={{ color: "var(--gris)", fontSize: 14 }}>No hay encuentros pendientes.</p>
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {encuentros.map((e) => {
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
                    <>
                      <span className="fmc-num">{e.GolesLocal}</span>
                      <span className="fmc-colon">:</span>
                      <span className="fmc-num">{e.GolesVisitante}</span>
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
              <TeamHalf nombre={e.Visitante} tenue={cerrado && !final} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
