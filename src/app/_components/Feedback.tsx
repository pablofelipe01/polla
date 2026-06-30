"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import type { ActionState } from "@/app/admin/_components/ui"

export type ToastType = "success" | "error" | "info"

type Toast = { id: number; msg: string; type: ToastType }

type ConfirmOpts = {
  titulo?: string
  mensaje: string
  confirmar?: string
  cancelar?: string
  peligro?: boolean
}
type ConfirmState = (ConfirmOpts & { resolve: (v: boolean) => void }) | null

type FeedbackCtx = {
  /** Muestra un toast. `error` no se autocierra; el resto sí. */
  toast: (msg: string, type?: ToastType) => void
  /** Abre un diálogo de confirmación con diseño. Resuelve a true/false. */
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}

const Ctx = createContext<FeedbackCtx | null>(null)

/** Acceso a toasts y confirmaciones. Requiere <FeedbackProvider> como ancestro. */
export function useFeedback(): FeedbackCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error("useFeedback debe usarse dentro de <FeedbackProvider>")
  return c
}

/**
 * Notifica el resultado de una Server Action basada en `useActionState`:
 * toast de éxito (+ refresh) o de error, una sola vez por cambio de estado.
 */
export function useActionFeedback(
  state: ActionState,
  okMsg: string,
  opts: { refresh?: boolean } = {}
) {
  const refresh = opts.refresh ?? true
  const { toast } = useFeedback()
  const router = useRouter()
  const last = useRef<ActionState>(state)
  useEffect(() => {
    if (state === last.current) return
    last.current = state
    if (state?.success) {
      toast(okMsg, "success")
      if (refresh) router.refresh()
    } else if (state?.error) {
      toast(state.error, "error")
    }
  }, [state, okMsg, refresh, toast, router])
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [conf, setConf] = useState<ConfirmState>(null)
  const idRef = useRef(0)

  const cerrar = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((msg: string, type: ToastType = "info") => {
    const id = (idRef.current += 1)
    setToasts((t) => [...t, { id, msg, type }])
  }, [])

  const confirm = useCallback(
    (opts: ConfirmOpts) =>
      new Promise<boolean>((resolve) => setConf({ ...opts, resolve })),
    []
  )

  const resolverConfirm = (v: boolean) => {
    conf?.resolve(v)
    setConf(null)
  }

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      <style>{KEYFRAMES}</style>
      {children}
      <div style={viewport} aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={cerrar} />
        ))}
      </div>
      {conf && <ConfirmDialog opts={conf} onResolve={resolverConfirm} />}
    </Ctx.Provider>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────────

const ESTILOS: Record<ToastType, { color: string; bg: string; icon: string }> = {
  success: { color: "var(--verde)",  bg: "rgba(0,220,130,.18)",  icon: "✓" },
  error:   { color: "var(--rojo)",   bg: "rgba(255,71,87,.18)",  icon: "!" },
  info:    { color: "var(--tinta-2)", bg: "rgba(255,255,255,.1)", icon: "i" },
}

function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: (id: number) => void }) {
  const e = ESTILOS[t.type]
  useEffect(() => {
    if (t.type === "error") return // los errores se cierran manualmente
    const id = setTimeout(() => onClose(t.id), 3800)
    return () => clearTimeout(id)
  }, [t.id, t.type, onClose])

  return (
    <div role="status" style={{ ...toastBox, borderLeftColor: e.color }}>
      <span style={{ ...iconCircle, background: e.bg, color: e.color }}>{e.icon}</span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--tinta)", lineHeight: 1.4 }}>
        {t.msg}
      </span>
      <button
        onClick={() => onClose(t.id)}
        aria-label="Cerrar"
        style={{ background: "none", border: 0, color: "var(--gris-2)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Confirmación ─────────────────────────────────────────────────────────────

function ConfirmDialog({
  opts,
  onResolve,
}: {
  opts: ConfirmOpts
  onResolve: (v: boolean) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResolve(false)
      if (e.key === "Enter") onResolve(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onResolve])

  const peligro = opts.peligro ?? false

  return (
    <div style={overlay} onClick={() => onResolve(false)}>
      <div style={dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {opts.titulo && (
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "var(--verde)" }}>
            {opts.titulo}
          </h3>
        )}
        <p style={{ margin: 0, fontSize: 14, color: "var(--tinta)", lineHeight: 1.5 }}>{opts.mensaje}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={() => onResolve(false)} style={btnCancelar}>
            {opts.cancelar ?? "Cancelar"}
          </button>
          <button
            onClick={() => onResolve(true)}
            autoFocus
            style={{ ...btnConfirmar, background: peligro ? "var(--rojo)" : "var(--azul)" }}
          >
            {opts.confirmar ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const viewport: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  maxWidth: "min(360px, calc(100vw - 32px))",
  pointerEvents: "none",
}

const toastBox: React.CSSProperties = {
  pointerEvents: "auto",
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--bg-card)",
  border: "1px solid var(--linea)",
  borderLeft: "4px solid",
  borderRadius: 12,
  padding: "11px 13px",
  boxShadow: "0 10px 30px rgba(0,0,0,.6)",
  animation: "toastIn .26s cubic-bezier(.16,1,.3,1)",
}

const iconCircle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 13,
  flexShrink: 0,
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(10,14,26,.55)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  animation: "overlayIn .18s ease",
}

const dialog: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--linea)",
  borderRadius: 16,
  padding: "22px 22px 18px",
  width: "100%",
  maxWidth: 400,
  boxShadow: "0 24px 60px rgba(10,14,26,.35)",
  animation: "dialogIn .22s cubic-bezier(.16,1,.3,1)",
}

const btnBase: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "10px 18px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
}
const btnCancelar: React.CSSProperties = {
  ...btnBase,
  background: "rgba(255,255,255,.08)",
  border: "1px solid var(--linea)",
  color: "var(--tinta-2)",
}
const btnConfirmar: React.CSSProperties = { ...btnBase, color: "#020D18" }

const KEYFRAMES = `
@keyframes toastIn { from { opacity: 0; transform: translateX(24px) } to { opacity: 1; transform: none } }
@keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes dialogIn { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: none } }
`
