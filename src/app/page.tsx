import Link from "next/link"
import { auth } from "@/lib/auth"
import { calcularRanking } from "@/lib/services/ranking"
import { obtenerEncuentros } from "@/lib/services/encuentros"
import AppNav from "@/components/AppNav"
import RankingTabla from "./_components/RankingTabla"
import ResultadosLista from "./_components/ResultadosLista"
import AutoRefresh from "./_components/AutoRefresh"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [session, ranking, encuentros] = await Promise.all([
    auth(),
    calcularRanking(),
    obtenerEncuentros(),
  ])
  const recientes = encuentros.slice(0, 12)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AutoRefresh seconds={30} />
      <AppNav session={session} activo="/" />
      <div className="polla-wrap" style={{ minHeight: "100vh" }}>
        {/* Hero */}
        <header className="hero-x" style={{ padding: "34px 20px 30px" }}>
          <div className="brandbar u-fade-up"><span /><span /><span /></div>
          <div className="u-fade-up u-delay" style={{ "--i": 1, fontSize: 10.5, letterSpacing: "2.5px", textTransform: "uppercase", color: "var(--amarillo)", fontWeight: 800, marginBottom: 8 } as React.CSSProperties}>
            Pronóstico Mundialista · Guaicaramo
          </div>
          <h1 className="hero-title u-fade-up u-delay" style={{ "--i": 2, fontSize: 42 } as React.CSSProperties}>
            Tabla de <span style={{ color: "var(--amarillo)", textShadow: "0 0 24px rgba(255,205,0,.4)" }}>posiciones</span>
          </h1>
          <div className="u-fade-up u-delay" style={{ "--i": 3, marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" } as React.CSSProperties}>
            <Link href="/login" className="btn-energy btn-gold" style={{ fontSize: 13.5, padding: "11px 20px" }}>
              Ingresar pronóstico →
            </Link>
            <Link href="/estadisticas" className="btn-energy btn-ghostlight" style={{ fontSize: 13.5, padding: "11px 20px" }}>
              Ver estadísticas
            </Link>
          </div>
        </header>

        <main style={{ padding: "26px 16px 44px", display: "flex", flexDirection: "column", gap: 32 }}>
          <section className="u-fade-up">
            <h2 className="sec-title">Ranking de equipos</h2>
            <RankingTabla filas={ranking} />
          </section>
          <section className="u-fade-up">
            <h2 className="sec-title">Resultados y encuentros</h2>
            <ResultadosLista encuentros={recientes} />
          </section>
        </main>
      </div>
    </div>
  )
}
