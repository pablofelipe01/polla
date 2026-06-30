import { auth, isAdmin } from "@/lib/auth"
import { obtenerRespaldo } from "@/lib/services/reportes"

export const dynamic = "force-dynamic"

/** Descarga un respaldo JSON con todas las tablas (usuarios sin hash). Solo Admin. */
export async function GET() {
  const session = await auth()
  if (!isAdmin(session)) return new Response("No autorizado", { status: 401 })

  const data = await obtenerRespaldo()
  const fecha = data.generadoEn.slice(0, 10)
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="respaldo-mundialista-${fecha}.json"`,
    },
  })
}
