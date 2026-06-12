import { auth, isAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAdminMatches, logoutAction } from "@/app/actions/admin"
import AdminDashboard from "./AdminDashboard"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await auth()
  if (!session || !isAdmin(session)) redirect("/admin/login")

  const matches = await getAdminMatches()

  return (
    <div style={{ minHeight: "100vh", background: "var(--hueso)" }}>
      {/* Topbar */}
      <nav style={{
        background: "var(--azul)",
        color: "#fff",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 18,
            textTransform: "uppercase",
            color: "var(--amarillo)",
            letterSpacing: ".5px",
            whiteSpace: "nowrap",
          }}>
            Polla Tricolor
          </span>
          <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12, whiteSpace: "nowrap" }}>· Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span className="admin-nav-name" style={{ color: "rgba(255,255,255,.6)", fontSize: 12 }}>
            {session.user?.name ?? session.user?.email}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.7)",
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 8,
                padding: "6px 12px",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main className="admin-main" style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 className="admin-title" style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 28,
            color: "var(--azul)",
            textTransform: "uppercase",
            lineHeight: 1,
            margin: 0,
          }}>
            Panel de administración
          </h1>
          <p style={{ color: "var(--gris)", fontSize: 13, marginTop: 4 }}>
            {matches.length} partido{matches.length !== 1 ? "s" : ""} en total
          </p>
        </div>

        <AdminDashboard matches={matches} />
      </main>
    </div>
  )
}
