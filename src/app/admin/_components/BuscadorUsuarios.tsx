"use client"

import { useEffect, useState } from "react"
import { buscarUsuariosAction } from "@/lib/actions/admin"
import type { Usuario } from "@/lib/clients/airtable"
import { input } from "./ui"
import Avatar from "@/app/_components/Avatar"

/**
 * Buscador de usuarios de la base de datos (filtra en el servidor con debounce).
 * Al elegir un resultado dispara `onPick`. No descarga la tabla completa.
 *
 * @param onPick   - Callback con el usuario seleccionado
 * @param excluir  - Nombres ya elegidos a ocultar de los resultados
 */
export default function BuscadorUsuarios({
  placeholder = "Buscar por nombre o cédula (mín. 2 caracteres)…",
  excluir,
  onPick,
}: {
  placeholder?: string
  excluir?: Set<string>
  onPick: (u: Usuario) => void
}) {
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
      const res = await buscarUsuariosAction(q)
      setBuscando(false)
      if (res.error) setError(res.error)
      else setResultados(res.usuarios ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const visibles = excluir
    ? resultados.filter((u) => !excluir.has(u.Nombre))
    : resultados

  const elegir = (u: Usuario) => {
    onPick(u)
    setQuery("")
    setResultados([])
  }

  return (
    <div>
      <input
        style={input}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p style={{ fontSize: 12, color: "var(--rojo)", margin: "6px 0 0" }}>{error}</p>}
      {query.trim().length >= 2 && (
        <ul style={lista}>
          {buscando ? (
            <li style={info}>Buscando…</li>
          ) : visibles.length === 0 ? (
            <li style={info}>Sin resultados.</li>
          ) : (
            visibles.map((u) => (
              <li key={u.id} style={{ borderBottom: "1px solid var(--linea)" }}>
                <button
                  type="button"
                  onClick={() => elegir(u)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: 0, padding: "9px 14px", cursor: "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <Avatar nombre={u.Nombre} size={30} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, color: "var(--tinta)", fontSize: 13 }}>{u.Nombre}</span>
                    <span style={{ fontSize: 11, color: "var(--gris)", fontFamily: "monospace" }}>
                      {u.Cedula || u.Email}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

const lista: React.CSSProperties = {
  listStyle: "none",
  margin: "6px 0 0",
  padding: 0,
  border: "1px solid var(--linea)",
  borderRadius: 10,
  overflow: "hidden",
  maxHeight: 240,
  overflowY: "auto",
  background: "var(--bg-card)",
}
const info: React.CSSProperties = { padding: "10px 14px", fontSize: 13, color: "var(--gris)" }
