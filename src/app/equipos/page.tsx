import { auth, canAccessEquipos, isAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDatosAdmin } from "@/lib/actions/admin"
import { getDatosPanelDT } from "@/lib/actions/dt"
import AppNav from "@/components/AppNav"
import EquiposTab from "../admin/_components/EquiposTab"
import IntegrantesTab from "../admin/_components/IntegrantesTab"
import DTPanel from "../panel/_components/DTPanel"

export const dynamic = "force-dynamic"

/**
 * Módulo 2 · Equipos. Acceso a Admin y DT/Cuerpo Técnico.
 * Admin: asigna países a las confederaciones y gestiona integrantes de cualquier equipo.
 * DT: elige el país de su continente y arma la plantilla (10–30, habilita exactamente 2).
 */
export default async function EquiposPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!canAccessEquipos(session)) redirect("/estadisticas")

  const admin = isAdmin(session)
  const [datosAdmin, datosDT] = await Promise.all([
    admin ? getDatosAdmin() : Promise.resolve(null),
    admin ? Promise.resolve(null) : getDatosPanelDT(),
  ])

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav session={session} activo="/equipos" />
      <main className="adm-scope" style={{ maxWidth: 900, margin: "0 auto", padding: "26px 16px 44px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="page-head u-fade-up">
          <span className="bar" />
          <h1 className="hero-title" style={{ fontSize: 30, color: "var(--tinta)" }}>
            Equipos
          </h1>
        </div>

        {admin && datosAdmin ? (
          <>
            <EquiposTab equipos={datosAdmin.equipos} continentes={datosAdmin.continentes} paises={datosAdmin.paises} />
            <IntegrantesTab equipos={datosAdmin.equipos} />
          </>
        ) : (
          datosDT && <DTPanel datos={datosDT} />
        )}
      </main>
    </div>
  )
}
