import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { sincronizarPartidos } from "@/lib/services/sincronizacion"
import { CACHE_TAGS } from "@/lib/clients/airtable"
import { logger } from "@/lib/logger"

/**
 * GET /api/cron/sincronizar
 *
 * Sincroniza resultados y estado de partidos desde football-data.org.
 * Protegido con CRON_SECRET para que solo Vercel Cron (o llamadas autorizadas)
 * puedan invocarlo. Vercel inyecta el header `authorization: Bearer <CRON_SECRET>`
 * automáticamente cuando lo configuras en vercel.json.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const resultado = await sincronizarPartidos()

    revalidateTag(CACHE_TAGS.encuentros, "max")
    revalidateTag(CACHE_TAGS.pronosticos, "max")

    logger.warn("Cron sincronizarPartidos completado", { resultado })
    return NextResponse.json({ ok: true, resultado })
  } catch (e) {
    logger.error(e, { cron: "sincronizar" })
    const msg = e instanceof Error ? e.message : "Error desconocido"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
