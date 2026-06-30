import type { CSSProperties } from "react"
import type { FilaRanking } from "@/lib/services/ranking"
import Avatar from "./Avatar"

const ORO: readonly [string, string] = ["#FFD600", "#E0B000"]

/** Configuración visual de cada escalón del podio (alto, color del pedestal). */
const PEDESTAL: Record<1 | 2 | 3, { h: number; bg: string; bd: string; num: string; fs: number }> = {
  1: { h: 110, bg: "rgba(255,214,0,.1)",  bd: "rgba(255,214,0,.3)",  num: "rgba(255,214,0,.5)",  fs: 60 },
  2: { h: 78,  bg: "rgba(139,92,246,.12)", bd: "rgba(139,92,246,.2)", num: "rgba(139,92,246,.5)", fs: 46 },
  3: { h: 55,  bg: "rgba(59,130,246,.1)",  bd: "rgba(59,130,246,.2)", num: "rgba(59,130,246,.45)", fs: 34 },
}

/** Corona dorada del primer lugar (SVG, mismo trazo que el diseño). */
function Corona() {
  return (
    <svg viewBox="0 0 32 18" width="30" height="17" style={{ display: "block", margin: "0 auto 4px" }} aria-hidden>
      <path d="M2 16 L6 6 L12 12 L16 2 L20 12 L26 6 L30 16 Z" fill="#FFD600" />
      <rect x="2" y="15" width="28" height="3" rx="1.5" fill="#FFD600" />
    </svg>
  )
}

/** Columna del podio para una posición (1, 2 o 3). */
function PodioCol({ fila, puesto }: { fila: FilaRanking; puesto: 1 | 2 | 3 }) {
  const first = puesto === 1
  const ped = PEDESTAL[puesto]
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        flex: 1,
        maxWidth: 160,
        order: puesto === 2 ? 0 : first ? 1 : 2,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {first && <Corona />}
        <Avatar nombre={fila.equipo} size={first ? 60 : 52} ring={first ? "#FFD600" : undefined} />
        <div style={{ fontSize: first ? 14 : 13, fontWeight: 500, color: "var(--tinta)", marginTop: 8, lineHeight: 1.1 }}>
          {fila.equipo}
        </div>
        <div style={{ fontSize: 11, color: "var(--gris)", marginTop: 3 }}>{fila.continente}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: first ? 28 : 22, color: first ? "var(--oro)" : "var(--gris)", marginTop: 6 }}>
          {fila.puntos} <span style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--gris-2)" }}>pts</span>
        </div>
      </div>
      <div
        style={{
          width: "100%",
          height: ped.h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ped.bg,
          border: `1px solid ${ped.bd}`,
          borderRadius: 10,
          boxShadow: first ? "0 0 30px rgba(255,214,0,.1)" : "none",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: ped.fs, color: ped.num, lineHeight: 1 }}>{puesto}</span>
      </div>
    </div>
  )
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--bg-card)",
  border: "1px solid var(--linea)",
  borderRadius: 12,
  padding: "12px 16px",
}

/**
 * Tabla de posiciones por equipo: podio para el top-3 y filas con avatar para
 * el resto, siguiendo el diseño deportivo. Componente de presentación.
 */
export default function RankingTabla({ filas }: { filas: FilaRanking[] }) {
  if (filas.length === 0) {
    return (
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--linea)", borderRadius: 16, padding: "44px 0", textAlign: "center", color: "var(--gris)", fontSize: 14, boxShadow: "var(--sh-sm)" }}>
        Aún no hay equipos registrados.
      </div>
    )
  }

  const conPodio = filas.length >= 3
  const podio = conPodio ? filas.slice(0, 3) : []
  const lista = conPodio ? filas.slice(3) : filas

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {conPodio && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12 }}>
            {podio.map((f, i) => (
              <PodioCol key={f.equipoId} fila={f} puesto={(i + 1) as 1 | 2 | 3} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((f, idx) => {
          const pos = (conPodio ? 4 : 1) + idx
          const lider = pos === 1
          return (
            <div key={f.equipoId} style={rowStyle}>
              <div style={{ width: 24, flexShrink: 0, textAlign: "center", fontFamily: "var(--font-display)", fontSize: 18, color: "var(--gris-2)" }}>{pos}</div>
              <Avatar nombre={f.equipo} size={38} ring={lider ? "#FFD600" : undefined} gradient={lider ? ORO : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--tinta)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.equipo}</div>
                <div style={{ fontSize: 11, color: "var(--gris)", marginTop: 3 }}>{f.continente}</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 44 }}>
                <div style={{ fontSize: 11, color: "var(--gris)" }}>{f.jugados} PJ</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 52 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--tinta)", lineHeight: 1 }}>{f.puntos}</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".08em", color: "var(--gris-2)", textTransform: "uppercase" }}>Puntos</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
