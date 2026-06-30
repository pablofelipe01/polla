"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Usuario } from "@/lib/clients/airtable"
import {
  asignarMiembroAction,
  retirarMiembroAction,
  habilitarPronosticadorAction,
  deshabilitarPronosticadorAction,
  buscarMiembrosDisponiblesAction,
} from "@/lib/actions/dt"
import { label, input, ErrorMsg, DeleteButton } from "@/app/admin/_components/ui"
import { useFeedback } from "@/app/_components/Feedback"
import Avatar from "@/app/_components/Avatar"

const badge = (text: string, bg: string, color: string): React.CSSProperties => ({
  fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const,
  background: bg, color, borderRadius: 4, padding: "1px 6px", letterSpacing: ".4px",
})

/** Lista de miembros con toggle de pronosticador y botón de retirar. */
export function ListaMiembros({
  miembros,
  habilitados,
  equipoId,
}: {
  miembros: Usuario[]
  habilitados: number
  equipoId: string
}) {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const router = useRouter()
  const { toast } = useFeedback()

  const toggle = (u: Usuario) => {
    if (!u.PuedePronosticar && habilitados >= 2) {
      const m = "Ya hay 2 pronosticadores habilitados. Deshabilita uno primero."
      setError(m); toast(m, "error")
      return
    }
    setError(undefined)
    start(async () => {
      const res = u.PuedePronosticar
        ? await deshabilitarPronosticadorAction(u.id)
        : await habilitarPronosticadorAction(u.id, equipoId)
      if (res.error) { setError(res.error); toast(res.error, "error") }
      else {
        toast(
          u.PuedePronosticar ? `${u.Nombre} ya no es pronosticador` : `${u.Nombre} habilitado como pronosticador`,
          "success"
        )
        router.refresh()
      }
    })
  }

  if (miembros.length === 0) {
    return <p style={{ color: "var(--gris)", fontSize: 13 }}>Sin miembros asignados aún.</p>
  }

  return (
    <>
      <ErrorMsg msg={error} />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {miembros.map((u) => (
          <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--linea)" }}>
            <button
              disabled={pending}
              onClick={() => toggle(u)}
              title={u.PuedePronosticar ? "Deshabilitar pronosticador" : "Habilitar pronosticador"}
              style={{ width: 22, height: 22, borderRadius: 5, border: "2px solid", borderColor: u.PuedePronosticar ? "var(--verde)" : "var(--linea)", background: u.PuedePronosticar ? "var(--verde)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#020D18", flexShrink: 0 }}
            >
              {u.PuedePronosticar ? "✓" : ""}
            </button>
            <Avatar nombre={u.Nombre} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: "var(--tinta)", fontSize: 13 }}>{u.Nombre}</span>
              {u.PuedePronosticar && (
                <span style={{ ...badge("Pronosticador", "rgba(0,220,130,.12)", "var(--verde)"), border: "1px solid rgba(0,220,130,.25)", marginLeft: 6 }}>Pronosticador</span>
              )}
              <div style={{ fontSize: 11, color: "var(--gris)" }}>{u.Cedula || u.Email}</div>
            </div>
            <DeleteButton confirmMsg={`¿Retirar a ${u.Nombre} del equipo?`} onDelete={() => retirarMiembroAction(u.id)} />
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 11, color: "var(--gris-2)", marginTop: 8 }}>
        Pronosticadores habilitados: <strong>{habilitados}/2</strong> · Haz clic en el cuadro para habilitar/deshabilitar.
      </p>
    </>
  )
}

/**
 * Buscador para agregar usuarios al equipo. Busca en el servidor con debounce
 * (mín. 2 caracteres) en lugar de descargar el pool completo de usuarios.
 */
export function BuscadorMiembros({ equipoId }: { equipoId: string }) {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const router = useRouter()
  const { toast } = useFeedback()

  // Debounce: busca en el servidor 300ms después de teclear.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      const id = setTimeout(() => { setResultados([]); setBuscando(false) }, 0)
      return () => clearTimeout(id)
    }
    const t = setTimeout(async () => {
      setBuscando(true)
      const res = await buscarMiembrosDisponiblesAction(q)
      setBuscando(false)
      if (res.error) setError(res.error)
      else { setError(undefined); setResultados(res.usuarios ?? []) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const agregar = (u: Usuario) => {
    setError(undefined)
    start(async () => {
      const res = await asignarMiembroAction(u.id, equipoId)
      if (res.error) { setError(res.error); toast(res.error, "error") }
      else {
        setQuery(""); setResultados([])
        toast(`${u.Nombre} agregado al equipo`, "success")
        router.refresh()
      }
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <label style={label}>Agregar miembro</label>
      <input
        style={input}
        placeholder="Buscar por nombre o cédula (mín. 2 letras)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ErrorMsg msg={error} />
      {query.trim().length >= 2 && (
        <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, border: "1px solid var(--linea)", borderRadius: 10, overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
          {buscando ? (
            <li style={{ padding: "10px 14px", fontSize: 13, color: "var(--gris)" }}>Buscando…</li>
          ) : resultados.length === 0 ? (
            <li style={{ padding: "10px 14px", fontSize: 13, color: "var(--gris)" }}>Sin resultados disponibles.</li>
          ) : (
            resultados.map((u) => (
              <li key={u.id}>
                <button
                  disabled={pending}
                  onClick={() => agregar(u)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: 0, padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--linea)" }}
                >
                  <strong>{u.Nombre}</strong>
                  <span style={{ color: "var(--gris)", marginLeft: 8, fontSize: 11 }}>{u.Cedula || u.Email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
