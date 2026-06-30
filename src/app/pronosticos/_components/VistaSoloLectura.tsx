import type { VistaPronosticos } from "@/lib/actions/pronosticos"
import { MatchBand, TeamHalf, type BandTone } from "@/app/_components/MatchCardParts"
import Avatar from "@/app/_components/Avatar"
import { card, SectionTitle } from "@/app/admin/_components/ui"

/** Oculta partidos de fase de grupos ya finalizados; mantiene fase eliminatoria y partidos aún abiertos/cerrados. */
function esFaseGrupos(fase: string): boolean {
  return fase.toLowerCase().includes("grupo")
}

/**
 * Vista de solo lectura para el usuario vinculado a un equipo. Muestra a qué
 * equipo pertenece, sus integrantes y el pronóstico oficial registrado por su
 * DT/ayudante en cada partido (sin poder editarlo).
 */
export default function VistaSoloLectura({ datos }: { datos: VistaPronosticos }) {
  if (!datos.equipoId) {
    return (
      <p style={{ color: "var(--gris)", fontSize: 14 }}>
        Aún no perteneces a ningún equipo. Cuando un DT te asigne a uno, verás aquí tu equipo y sus pronósticos.
      </p>
    )
  }

  const encuentros = datos.encuentros.filter(
    (e) => !(esFaseGrupos(e.Fase) && e.status === "FINALIZADO")
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <CabeceraEquipo nombre={datos.equipoNombre} miembros={datos.miembros} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SectionTitle>Pronósticos de {datos.equipoNombre}</SectionTitle>
        {encuentros.length === 0 ? (
          <p style={{ color: "var(--gris)", fontSize: 14 }}>No hay encuentros pendientes.</p>
        ) : (
          encuentros.map((e) => (
            <TarjetaPartido key={e.id} encuentro={e} pronostico={datos.pronosticosEquipo[e.id]} />
          ))
        )}
      </div>
    </div>
  )
}

/** Tarjeta con el equipo del usuario y la lista de integrantes (plantilla). */
function CabeceraEquipo({
  nombre,
  miembros,
}: {
  nombre: string
  miembros: VistaPronosticos["miembros"]
}) {
  return (
    <div style={card}>
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", margin: "0 0 4px" }}>
        Tu equipo
      </p>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--tinta)", lineHeight: 1, marginBottom: 14 }}>
        {nombre}
      </div>

      <SectionTitle>Integrantes ({miembros.length})</SectionTitle>
      {miembros.length === 0 ? (
        <p style={{ color: "var(--gris)", fontSize: 13, margin: "8px 0 0" }}>
          Tu equipo aún no tiene integrantes registrados.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {miembros.map((u) => (
            <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--linea)" }}>
              <Avatar nombre={u.Nombre} size={30} />
              <span style={{ fontWeight: 600, color: "var(--tinta)", fontSize: 13 }}>{u.Nombre}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Tarjeta de un partido mostrando el pronóstico oficial del equipo y, si aplica, el resultado real. */
function TarjetaPartido({
  encuentro: e,
  pronostico,
}: {
  encuentro: VistaPronosticos["encuentros"][number]
  pronostico?: VistaPronosticos["pronosticosEquipo"][string]
}) {
  const final = e.GolesLocal !== null && e.GolesVisitante !== null
  const cerrado = e.status === "CERRADO"
  const abierto = e.status === "ABIERTO"

  const tone: BandTone = final ? "final" : cerrado ? "close" : "open"
  const cardCls = final ? "is-final" : cerrado ? "is-close" : "is-open"
  const label = final ? "Finalizado" : cerrado ? "Cerrado" : "Abierto"

  return (
    <article className={`fmc ${cardCls}`}>
      <MatchBand fase={e.Fase} tone={tone} label={label} dot={abierto} />

      <div className="fmc-body">
        <TeamHalf nombre={e.Local} tenue={cerrado && !final} />
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
                <span className="fmc-num dash">–</span>
                <span className="fmc-colon">:</span>
                <span className="fmc-num dash">–</span>
              </>
            )}
          </div>
          <span className="fmc-when">{e.inicioBogota}</span>
        </div>
        <TeamHalf nombre={e.Visitante} tenue={cerrado && !final} />
      </div>

      <div className={`fmc-foot ${final ? "gold" : pronostico ? "info" : "muted"}`}>
        {final
          ? `Resultado oficial: ${e.GolesLocal} – ${e.GolesVisitante}${e.PenalesLocal !== null && e.PenalesVisitante !== null ? ` (Pen. ${e.PenalesLocal} – ${e.PenalesVisitante})` : ""}`
          : pronostico
          ? "Pronóstico del equipo"
          : "Tu equipo aún no tiene pronóstico para este partido"}
      </div>
    </article>
  )
}
