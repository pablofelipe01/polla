"use client"

import { useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useFeedback } from "@/app/_components/Feedback"

export type ActionState = { error?: string; success?: boolean }

export const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--linea)",
  borderRadius: 16,
  padding: "18px 18px 16px",
  boxShadow: "var(--sh-sm)",
}

export const input: React.CSSProperties = {
  width: "100%",
  fontSize: 14,
  padding: "10px 12px",
  border: "1.5px solid var(--linea)",
  borderRadius: 10,
  background: "rgba(255,255,255,.05)",
  color: "var(--tinta)",
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
}

export const label: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".4px",
  textTransform: "uppercase",
  color: "var(--gris)",
  marginBottom: 6,
}

export const btnPrimary: React.CSSProperties = {
  background: "var(--verde)",
  color: "#020D18",
  border: 0,
  borderRadius: 11,
  padding: "11px 22px",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: ".3px",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  boxShadow: "0 6px 18px -6px rgba(0,220,130,.5)",
}

/** Refresca los datos del servidor cuando una acción retorna success. */
export function useRefreshOnSuccess(state: ActionState) {
  const router = useRouter()
  const done = useRef(false)
  useEffect(() => {
    if (state?.success && !done.current) {
      done.current = true
      router.refresh()
    }
  }, [state?.success, router])
}

/** Botón de borrado: confirma con diálogo, ejecuta la acción, notifica y refresca. */
export function DeleteButton({
  onDelete,
  confirmMsg,
  okMsg = "Eliminado correctamente",
}: {
  onDelete: () => Promise<ActionState>
  confirmMsg: string
  okMsg?: string
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const { confirm, toast } = useFeedback()

  const onClick = async () => {
    const ok = await confirm({ mensaje: confirmMsg, confirmar: "Eliminar", peligro: true })
    if (!ok) return
    start(async () => {
      const res = await onDelete()
      if (res?.error) toast(res.error, "error")
      else {
        toast(okMsg, "success")
        router.refresh()
      }
    })
  }

  return (
    <button
      disabled={pending}
      onClick={onClick}
      style={{ background: "rgba(255,71,87,.12)", color: "var(--rojo)", border: "1px solid rgba(255,71,87,.25)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.5 : 1 }}
    >
      {pending ? "…" : "✕"}
    </button>
  )
}

export function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--rojo)", background: "rgba(255,71,87,.1)", border: "1px solid rgba(255,71,87,.2)", borderRadius: 8, padding: "9px 12px", margin: "8px 0 0" }}>
      {msg}
    </p>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="sec-title" style={{ fontSize: 18 }}>{children}</h2>
}
