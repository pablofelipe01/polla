import { auth } from "@/lib/auth"
import { calcularEstadisticas } from "@/lib/services/reportes"
import { calcularRanking } from "@/lib/services/ranking"
import AppNav from "@/components/AppNav"
import RankingTabla from "../_components/RankingTabla"
import AutoRefresh from "../_components/AutoRefresh"

export const dynamic = "force-dynamic"

function StatCard({ valor, etiqueta, i }: { valor: string | number; etiqueta: string; i: number }) {
  return (
    <div className="stat-card u-fade-up u-delay" style={{ "--i": i } as React.CSSProperties}>
      <div className="stat-num">{valor}</div>
      <div className="stat-lbl">{etiqueta}</div>
    </div>
  )
}

/**
 * Módulo 4 · Estadísticas. Acceso universal (público y todos los roles).
 * Tabla de posiciones, puntos acumulados, efectividad y estadísticas generales.
 */
export default async function EstadisticasPage() {
  const [session, s, ranking] = await Promise.all([
    auth(),
    calcularEstadisticas(),
    calcularRanking(),
  ])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AutoRefresh seconds={30} />
      <AppNav session={session} activo="/estadisticas" />
      <div className="polla-wrap">
        <main style={{ padding: "24px 16px 44px", display: "flex", flexDirection: "column", gap: 26 }}>
          <h1 className="hero-title u-fade-up" style={{ fontSize: 30, color: "var(--tinta)" }}>
            Estadísticas
          </h1>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <StatCard valor={s.totalEquipos} etiqueta="Equipos" i={0} />
            <StatCard valor={s.totalIntegrantes} etiqueta="Integrantes" i={1} />
            <StatCard valor={`${s.encuentrosFinalizados}/${s.totalEncuentros}`} etiqueta="Encuentros jugados" i={2} />
            <StatCard valor={s.totalPronosticos} etiqueta="Pronósticos" i={3} />
            <StatCard valor={s.promedioPuntos} etiqueta="Promedio de puntos" i={4} />
            <StatCard valor={s.aciertosExactos} etiqueta="Marcadores exactos" i={5} />
          </section>

          {s.lider && (
            <section className="leader-card u-pop">
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--amarillo)" }}>
                <span style={{ fontSize: 14 }}>👑</span> Líder actual
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, marginTop: 6, letterSpacing: ".5px" }}>{s.lider.equipo}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.78)", fontWeight: 600 }}>{s.lider.continente} · {s.lider.puntos} pts</div>
            </section>
          )}

          <section className="u-fade-up">
            <h2 className="sec-title" style={{ fontSize: 19 }}>
              Puntos por continente
            </h2>
            {s.porContinente.length === 0 ? (
              <p style={{ color: "var(--gris)", fontSize: 13 }}>Sin datos todavía.</p>
            ) : (
              <div className="admin-table-wrap" style={{ background: "var(--bg-card)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--linea)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-deep)" }}>
                      {["Continente", "Equipos", "Puntos"].map((h, i) => (
                        <th key={h} style={{ padding: "11px 12px", textAlign: i === 0 ? "left" : "center", fontSize: 10.5, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", color: "var(--verde)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.porContinente.map((c, i) => (
                      <tr key={c.continente} style={{ borderBottom: "1px solid var(--linea)", background: i % 2 ? "rgba(255,255,255,.02)" : "transparent" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--tinta)" }}>{c.continente}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--gris)" }}>{c.equipos}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: "var(--verde)", fontFamily: "var(--font-display)", fontSize: 16 }}>{c.puntos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="u-fade-up">
            <h2 className="sec-title" style={{ fontSize: 19 }}>
              Tabla de posiciones
            </h2>
            <RankingTabla filas={ranking} />
          </section>
        </main>
      </div>
    </div>
  )
}
