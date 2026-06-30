import { auth, isAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDatosAdmin } from "@/lib/actions/admin"
import AppNav from "@/components/AppNav"
import AdminDashboard from "./AdminDashboard"

export const dynamic = "force-dynamic"

/**
 * Módulo 1 · Panel de Admin. Exclusivo del Administrador.
 * Asignación de DT/Cuerpo Técnico a continentes, integración API y reportes.
 */
export default async function AdminPage() {
  const session = await auth()
  if (!isAdmin(session)) redirect("/login")

  const data = await getDatosAdmin()

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav session={session} activo="/admin" />
      <main className="adm-scope" style={{ maxWidth: 900, margin: "0 auto", padding: "26px 16px 44px" }}>
        <div className="page-head u-fade-up" style={{ marginBottom: 22 }}>
          <span className="bar" />
          <h1 className="hero-title" style={{ fontSize: 30, color: "var(--tinta)" }}>
            Panel de administración
          </h1>
        </div>
        <AdminDashboard data={data} />
      </main>
    </div>
  )
}
