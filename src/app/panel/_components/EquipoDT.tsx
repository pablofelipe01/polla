"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Usuario } from "@/lib/clients/airtable"
import {
  asignarMiembroAction,
  retirarMiembroAction,
  buscarMiembrosDisponiblesAction,
  asignarAyudanteAction,
  quitarAyudanteAction,
} from "@/lib/actions/dt"
import { label, input, ErrorMsg, DeleteButton } from "@/app/admin/_components/ui"
import { useFeedback } from "@/app/_components/Feedback"
import Avatar from "@/app/_components/Avatar"

/** Lista de miembros del equipo con botón de retirar. */
export function ListaMiembros({ miembros }: { miembros: Usuario[] }) {
  if (miembros.length === 0) {
    return <p style={{ color: "var(--gris)", fontSize: 13 }}>Sin miembros asignados aún.</p>
  }

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      {miembros.map((u) => (
        <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--linea)" }}>
          <Avatar nombre={u.Nombre} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: "var(--tinta)", fontSize: 13 }}>{u.Nombre}</span>
            <div style={{ fontSize: 11, color: "var(--gris)" }}>{u.Cedula || u.Email}</div>
          </div>
          <DeleteButton confirmMsg={`¿Retirar a ${u.Nombre} del equipo?`} onDelete={() => retirarMiembroAction(u.id)} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Buscador para agregar usuarios al equipo. Busca en el servidor con debounce
 * (mín. 2 caracteres) en lugar de descargar el pool completo de usuarios.
 */
export function BuscadorMiembros({ equipoId }: { equipoId: string }) {
  const { query, setQuery, resultados, setResultados, buscando, error, setError } = useBusquedaUsuarios()
  const [pending, start] = useTransition()
  const router = useRouter()
  const { toast } = useFeedback()

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
      <BuscadorUsuario
        placeholder="Buscar por nombre o cédula (mín. 2 letras)…"
        query={query}
        setQuery={setQuery}
        buscando={buscando}
        resultados={resultados}
        pending={pending}
        error={error}
        onPick={agregar}
      />
    </div>
  )
}

/**
 * Hook con la búsqueda de usuarios con debounce (300ms, mín. 2 caracteres).
 * Comparte la lógica entre el buscador de plantilla y el de ayudante.
 */
function useBusquedaUsuarios() {
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string>()

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

  return { query, setQuery, resultados, setResultados, buscando, error, setError }
}

/** Input + lista de resultados de búsqueda de usuarios (presentacional). */
function BuscadorUsuario({
  placeholder,
  query,
  setQuery,
  buscando,
  resultados,
  pending,
  error,
  onPick,
}: {
  placeholder: string
  query: string
  setQuery: (v: string) => void
  buscando: boolean
  resultados: Usuario[]
  pending: boolean
  error?: string
  onPick: (u: Usuario) => void
}) {
  return (
    <>
      <input
        style={input}
        placeholder={placeholder}
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
                  onClick={() => onPick(u)}
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
    </>
  )
}

/**
 * Sección para que el DT asigne (o retire) al ayudante encargado del equipo.
 * Un solo ayudante por equipo: si ya hay uno, se muestra con opción de retirarlo;
 * si no, se ofrece el buscador para asignarlo.
 */
export function SeccionAyudante({ equipoId, ayudante }: { equipoId: string; ayudante: Usuario | null }) {
  const { query, setQuery, resultados, setResultados, buscando, error, setError } = useBusquedaUsuarios()
  const [pending, start] = useTransition()
  const router = useRouter()
  const { toast } = useFeedback()

  const asignar = (u: Usuario) => {
    setError(undefined)
    start(async () => {
      const res = await asignarAyudanteAction(u.id, equipoId)
      if (res.error) { setError(res.error); toast(res.error, "error") }
      else {
        setQuery(""); setResultados([])
        toast(`${u.Nombre} asignado como ayudante`, "success")
        router.refresh()
      }
    })
  }

  if (ayudante) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
        <Avatar nombre={ayudante.Nombre} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: "var(--tinta)", fontSize: 13 }}>{ayudante.Nombre}</span>
          <div style={{ fontSize: 11, color: "var(--gris)" }}>{ayudante.Cedula || ayudante.Email}</div>
        </div>
        <DeleteButton
          confirmMsg={`¿Retirar a ${ayudante.Nombre} como ayudante?`}
          okMsg="Ayudante retirado"
          onDelete={() => quitarAyudanteAction(ayudante.id)}
        />
      </div>
    )
  }

  return (
    <BuscadorUsuario
      placeholder="Buscar al ayudante por nombre o cédula…"
      query={query}
      setQuery={setQuery}
      buscando={buscando}
      resultados={resultados}
      pending={pending}
      error={error}
      onPick={asignar}
    />
  )
}
