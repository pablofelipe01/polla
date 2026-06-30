import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Ruta legada. El panel se dividió en módulos por rol; redirigimos al principal
 * de cada rol. Los componentes PanelClient y DTPanel siguen viviendo aquí y son
 * consumidos por /pronosticos y /equipos respectivamente.
 */
export default async function PanelPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const rol = session.user.role
  redirect(rol === "Admin" ? "/admin" : (rol === "DT" || rol === "CuerpoTecnico") ? "/equipos" : "/pronosticos")
}
