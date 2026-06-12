"use client"

import { useEffect, useState } from "react"

interface Props {
  closeMs: number
  onClose?: () => void
}

function cuenta(ms: number): string {
  if (ms <= 0) return "0m"
  const d  = Math.floor(ms / 86400000)
  const h  = Math.floor((ms % 86400000) / 3600000)
  const mn = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${mn}m`
  return `${mn}m`
}

export default function Countdown({ closeMs, onClose }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, closeMs - Date.now()))

  useEffect(() => {
    if (remaining <= 0) { onClose?.(); return }
    const timer = setInterval(() => {
      const r = Math.max(0, closeMs - Date.now())
      setRemaining(r)
      if (r === 0) { clearInterval(timer); onClose?.() }
    }, 30000) // actualizar cada 30s (como el HTML)
    return () => clearInterval(timer)
  }, [closeMs, onClose, remaining])

  const isUrgent = remaining < 3600_000

  if (remaining <= 0) {
    return <span className={`polla-countdown urgent`}>Cerrado</span>
  }

  return (
    <span
      className={`polla-countdown${isUrgent ? " urgent" : ""}`}
      aria-live="polite"
    >
      {cuenta(remaining)}
    </span>
  )
}
