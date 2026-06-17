import { getWinners } from "@/app/actions/public"
import type { WinnerEntry } from "@/app/actions/public"
import Link from "next/link"
import type { Sede } from "@/lib/airtable"

const SEDE_CONFIG = [
  { sede: "FORZOSA"    as Sede, label: "Alojamiento Forzosa",    color: "#00205B", text: "#FFCD00" },
  { sede: "BRISAS"     as Sede, label: "Alojamiento Brisas",     color: "#0a3aa8", text: "#ffffff" },
  { sede: "GUADUALITO" as Sede, label: "Alojamiento Guadualito", color: "#CE1126", text: "#ffffff" },
  { sede: "GENERAL"    as Sede, label: "Sin alojamiento",        color: "#374151", text: "#ffffff" },
] as const

export const dynamic = "force-dynamic"

export default async function GanadoresPage() {
  const winners = await getWinners()

  return (
    <div className="min-h-screen bg-gradient-to-b from-col-blue to-col-blue-light">
      <header className="px-4 pt-8 pb-6 text-center">
        <Link
          href="/"
          className="text-white/50 hover:text-white text-xs font-medium uppercase tracking-wide inline-block mb-4 transition"
        >
          ← Volver a los partidos
        </Link>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-col-yellow uppercase leading-none">
          Ganadores
        </h1>
        <p className="text-white/60 text-sm mt-2">
          ¿Estás en la lista? Acércate a Bienestar Social para reclamar tu premio.
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-12">
        {winners.length === 0 ? (
          <div className="text-center text-white/50 py-16">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-display font-bold text-xl text-white/70 uppercase">
              Aún no hay resultados
            </p>
            <p className="text-sm mt-1">
              Los ganadores aparecerán aquí cuando se registren los resultados
            </p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {winners.map((w) => (
              <article
                key={w.matchId}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Header del partido */}
                <div className="bg-col-blue px-4 py-3">
                  <p className="text-white/50 text-xs uppercase tracking-wide font-medium">
                    {w.phase}
                  </p>
                  <h2 className="font-display font-bold text-white text-lg leading-tight">
                    🇨🇴 Colombia vs {w.rival}
                  </h2>
                  <p className="text-white/50 text-xs mt-0.5">{w.kickoffBogota}</p>
                </div>

                {/* Resultado */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-center gap-5">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">Colombia</p>
                    <p className="tablero-digit text-col-blue">{w.scoreCol}</p>
                  </div>
                  <span className="text-slate-200 font-display text-2xl font-bold">–</span>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">{w.rival}</p>
                    <p className="tablero-digit text-col-blue">{w.scoreOpp}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-4">
                  {w.allCorrect.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 bg-slate-50 rounded-xl py-3">
                      Nadie acertó el marcador exacto en este partido
                    </p>
                  ) : (
                    <>
                      {/* Todos los que acertaron */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                          Acertaron el marcador ({w.allCorrect.length})
                        </p>
                        <ul className="space-y-1">
                          {w.allCorrect.map((entry: WinnerEntry, idx: number) => {
                            const sedeConf = SEDE_CONFIG.find((s) => s.sede === entry.sede)
                            return (
                              <li key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                                <span className="flex-1 font-medium text-slate-700">{entry.name}</span>
                                {sedeConf && (
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded"
                                    style={{ background: sedeConf.color, color: sedeConf.text }}
                                  >
                                    {sedeConf.label.replace("Alojamiento ", "")}
                                  </span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      {/* Ganadores por alojamiento */}
                      {w.sedeWinners.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                            Ganadores
                          </p>
                          <div className="space-y-2">
                            {SEDE_CONFIG.map(({ sede, label, color, text }) => {
                              const sedeEntries = w.sedeWinners.filter((e) => e.sede === sede)
                              if (sedeEntries.length === 0) return null
                              const total = w.sedeTotals[sede] ?? sedeEntries.length
                              return (
                                <div key={sede} className="rounded-xl overflow-hidden">
                                  <div
                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center justify-between"
                                    style={{ background: color, color: text }}
                                  >
                                    <span>{label}</span>
                                    {total > sedeEntries.length && (
                                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                                        Sorteo entre {total}
                                      </span>
                                    )}
                                  </div>
                                  <ul className="divide-y divide-slate-50">
                                    {sedeEntries.map((entry, idx) => (
                                      <li key={idx} className="flex items-center gap-2 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                                        <span className="text-emerald-500">✓</span>
                                        {entry.name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-6 bg-col-yellow/10 border border-col-yellow/30 rounded-2xl px-4 py-4 text-center">
          <p className="text-col-yellow font-semibold text-sm">
            🏅 Si apareces en la lista, preséntate con tu cédula en Bienestar Social para reclamar tu premio.
          </p>
        </div>
      </main>
    </div>
  )
}
