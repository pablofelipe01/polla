'use client'

import { useState, useRef } from 'react'
import type { WinnerEntry } from '@/app/actions/public'

interface Props {
  candidates: WinnerEntry[]
  winnerCount: number
  label: string
  /** Clave única en localStorage para que la animación solo se vea una vez por dispositivo */
  storageKey: string
}

type View = 'hidden' | 'list' | 'animate'
type AnimPhase = 'spinning' | 'done'

function sleep(ms: number) {
  return new Promise<void>(res => setTimeout(res, ms))
}

function wasAlreadySeen(key: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key) === '1'
}

/**
 * Transparencia del sorteo: lista estática (posición de cada acierto) y
 * ruleta animada con efecto de redoble de tambor. La animación solo puede
 * ejecutarse una vez por dispositivo (persiste en localStorage).
 */
export function LotteryTransparency({ candidates, winnerCount, label, storageKey }: Props) {
  const [view, setView] = useState<View>('hidden')
  const [animPhase, setAnimPhase] = useState<AnimPhase | null>(null)
  const [drumName, setDrumName] = useState('')
  const [flash, setFlash] = useState(false)
  const [currentWinnerIdx, setCurrentWinnerIdx] = useState(0)
  const [confirmedWinners, setConfirmedWinners] = useState<WinnerEntry[]>([])
  const [alreadySeen, setAlreadySeen] = useState(() => wasAlreadySeen(storageKey))
  const abortRef = useRef(false)

  async function runAnimation() {
    if (alreadySeen) return
    abortRef.current = false
    setView('animate')
    setAnimPhase('spinning')
    setConfirmedWinners([])
    setDrumName('')
    setCurrentWinnerIdx(0)

    const winners = candidates.slice(0, winnerCount)

    for (let wi = 0; wi < winners.length; wi++) {
      if (abortRef.current) return
      setCurrentWinnerIdx(wi)

      const stages = [
        { ms: 55,  reps: 20 },
        { ms: 100, reps: 12 },
        { ms: 190, reps: 7  },
        { ms: 340, reps: 4  },
        { ms: 550, reps: 2  },
      ]

      for (const { ms, reps } of stages) {
        for (let r = 0; r < reps; r++) {
          if (abortRef.current) return
          const pick = candidates[Math.floor(Math.random() * candidates.length)]
          setDrumName(pick.name)
          await sleep(ms)
        }
      }

      if (abortRef.current) return

      setDrumName(winners[wi].name)
      setFlash(true)
      await sleep(1000)
      setFlash(false)
      setConfirmedWinners(prev => [...prev, winners[wi]])
      setDrumName('')

      if (wi < winners.length - 1) await sleep(700)
    }

    if (!abortRef.current) {
      setAnimPhase('done')
      // Marcar como visto para que no pueda repetirse
      localStorage.setItem(storageKey, '1')
      setAlreadySeen(true)
    }
  }

  function close() {
    abortRef.current = true
    setView('hidden')
    setAnimPhase(null)
    setDrumName('')
    setFlash(false)
    setConfirmedWinners([])
    setCurrentWinnerIdx(0)
  }

  function openList() {
    abortRef.current = true
    setAnimPhase(null)
    setDrumName('')
    setFlash(false)
    setConfirmedWinners([])
    setCurrentWinnerIdx(0)
    setView('list')
  }

  if (candidates.length === 0 || winnerCount === 0) return null

  return (
    <div className="mt-3 space-y-2">

      {/* ── Explicación + botones ── */}
      {view === 'hidden' && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 space-y-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold">{candidates.length} personas</span> acertaron el marcador exacto.
            Como hay más aciertos que premios disponibles, se realizó un sorteo automático.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            El resultado es fijo e inamovible — puede verificarse en cualquier momento.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={openList}
              className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white transition-colors"
            >
              📋 Ver lista completa
            </button>
            {alreadySeen ? (
              <div className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-slate-100 text-slate-300 text-center cursor-default select-none bg-white">
                🎰 Sorteo ya visto
              </div>
            ) : (
              <button
                onClick={runAnimation}
                className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-amber-200 text-amber-600 hover:border-amber-400 hover:bg-amber-50 bg-white transition-colors"
              >
                🎰 Ver sorteo animado
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Opción A: lista estática ── */}
      {view === 'list' && (
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Orden del sorteo — {label}
            </p>
            <div className="flex items-center gap-3">
              {!alreadySeen && (
                <button
                  onClick={runAnimation}
                  className="text-xs text-amber-500 hover:text-amber-700 font-medium transition-colors"
                >
                  🎰 Ver animado
                </button>
              )}
              <button onClick={close} className="text-xs text-slate-400 hover:text-slate-600 underline">
                Cerrar
              </button>
            </div>
          </div>
          <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {candidates.map((entry, idx) => {
              const isWinner = idx < winnerCount
              return (
                <li
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-2 text-sm ${isWinner ? 'bg-emerald-50' : 'bg-white'}`}
                >
                  <span className={`text-xs font-bold w-6 text-right shrink-0 ${isWinner ? 'text-emerald-500' : 'text-slate-300'}`}>
                    #{idx + 1}
                  </span>
                  <span className={`flex-1 font-medium truncate ${isWinner ? 'text-emerald-800' : 'text-slate-400'}`}>
                    {entry.name}
                  </span>
                  {isWinner
                    ? <span className="text-xs font-bold text-emerald-600 shrink-0">✓</span>
                    : <span className="text-xs text-slate-300 shrink-0">—</span>
                  }
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Opción B: ruleta animada ── */}
      {view === 'animate' && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 border-b border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              🎰 Sorteo — {label}
            </p>
            <div className="flex items-center gap-3">
              {animPhase === 'done' && (
                <button onClick={openList} className="text-xs text-slate-400 hover:text-slate-600 underline">
                  Ver lista
                </button>
              )}
              <button onClick={close} className="text-xs text-slate-400 hover:text-slate-600 underline">
                Cerrar
              </button>
            </div>
          </div>

          <div className="px-4 py-4 space-y-3">
            {/* Tambor */}
            {animPhase === 'spinning' && (
              <div>
                <p className="text-xs text-center text-slate-400 mb-2">
                  {flash
                    ? `¡Ganador ${currentWinnerIdx + 1} de ${winnerCount}!`
                    : `Eligiendo ganador ${currentWinnerIdx + 1} de ${winnerCount}…`
                  }
                </p>
                <div
                  className="rounded-xl px-4 py-4 text-center font-bold text-sm leading-snug"
                  style={{
                    minHeight: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: flash ? 'background 0.08s ease, box-shadow 0.08s ease' : 'background 0.25s ease, box-shadow 0.25s ease',
                    background: flash ? '#10b981' : '#f1f5f9',
                    color: flash ? '#ffffff' : '#475569',
                    boxShadow: flash ? '0 0 0 3px #6ee7b7' : 'none',
                    transform: flash ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  {drumName || '—'}
                </div>
              </div>
            )}

            {/* Ganadores confirmados */}
            {confirmedWinners.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  {animPhase === 'done' ? 'Ganadores del sorteo' : 'Confirmados'}
                </p>
                <ul className="space-y-1">
                  {confirmedWinners.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-xs font-bold text-emerald-500 w-5 text-right shrink-0">
                        #{i + 1}
                      </span>
                      <span className="flex-1 font-medium text-emerald-800 truncate">{w.name}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5 shrink-0">
                        ✓ Ganador
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {animPhase === 'done' && candidates.length > winnerCount && (
              <button
                onClick={openList}
                className="w-full text-xs text-slate-400 hover:text-slate-600 underline pt-1"
              >
                Ver los {candidates.length - winnerCount} participantes que no ganaron →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
