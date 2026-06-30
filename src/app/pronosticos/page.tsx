import { auth, canAccessPronosticos, canPredict } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDatosPanel, getVistaPronosticos } from "@/lib/actions/pronosticos"
import AppNav from "@/components/AppNav"
import PanelClient from "../panel/PanelClient"
import VistaSoloLectura from "./_components/VistaSoloLectura"

export const dynamic = "force-dynamic"

/**
 * Módulo 3 · Pronósticos. Acceso a todos los roles autenticados.
 * El DT y el Cuerpo Técnico registran el pronóstico oficial de cada equipo de su
 * continente (eligen el equipo en un selector); el resto (Admin, consulta) solo visualiza.
 */
export default async function PronosticosPage({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!canAccessPronosticos(session)) redirect("/estadisticas")

  const puedeEditar = canPredict(session)
  const { equipo } = await searchParams
  const [datosEdit, datosVista] = await Promise.all([
    puedeEditar ? getDatosPanel(equipo) : Promise.resolve(null),
    puedeEditar ? Promise.resolve(null) : getVistaPronosticos(),
  ])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav session={session} activo="/pronosticos" />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "26px 16px 44px", display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 className="hero-title u-fade-up" style={{ fontSize: 32, color: "var(--tinta)" }}>
          Pronósticos
        </h1>
        {puedeEditar && datosEdit ? (
          <PanelClient datos={datosEdit} />
        ) : (
          datosVista && <VistaSoloLectura datos={datosVista} />
        )}
      </main>
    </div>
  )
}
