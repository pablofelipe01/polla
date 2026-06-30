"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import {
  asignarUsuarioEquipoAction,
  quitarUsuarioEquipoAction,
  buscarUsuariosAction,
  listarMiembrosEquipoAction,
} from "@/lib/actions/admin"
import type { Equipo, Usuario } from "@/lib/clients/airtable"
import { card, input, label, ErrorMsg, SectionTitle } from "./ui"
import { useFeedback } from "@/app/_components/Feedback"
import Avatar from "@/app/_components/Avatar"

const MIN = 20
const MAX = 30

const listaStyle: React.CSSProperties = {
  listStyle: "none", margin: "8px 0 0", padding: 0,
  border: "1px solid var(--linea)", borderRadius: 10, overflow: "hidden",
  maxHeight: 360, overflowY: "auto",
}
const filaInfo: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "var(--gris)" }

/**
 * Asignación de integrantes por equipo usando los usuarios reales de la BD.
 * No descarga la tabla completa: los miembros del equipo y la búsqueda se
 * resuelven en el servidor con filterByFormula (acciones de admin).
 */
export default function IntegrantesTab({ equipos }: { equipos: Equipo[] }) {
  const [equipoSel, setEquipoSel] = useState(equipos[0]?.id ?? "")
  const [miembros, setMiembros] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const { toast } = useFeedback()

  const equipoNombre = useMemo(
    () => new Map(equipos.map((e) => [e.id, e.Nombre])),
    [equipos]
  )
  const nombreSel = equipoNombre.get(equipoSel) ?? ""

  const cargarMiembros = useCallback(async (nombre: string) => {
    if (!nombre) { setMiembros([]); return }
    setCargando(true)
    const res = await listarMiembrosEquipoAction(nombre)
    setCargando(false)
    if (res.error) setError(res.error)
    else setMiembros(res.miembros ?? [])
  }, [])

  useEffect(() => {
    const id = setTimeout(() => { setError(undefined); void cargarMiembros(nombreSel) }, 0)
    return () => clearTimeout(id)
  }, [nombreSel, cargarMiembros])

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

  const miembroIds = useMemo(() => new Set(miembros.map((m) => m.id)), [miembros])

  const toggle = (u: Usuario, asignar: boolean) => {
    setError(undefined)
    start(async () => {
      const res = asignar
        ? await asignarUsuarioEquipoAction(u.id, equipoSel)
        : await quitarUsuarioEquipoAction(u.id)
      if (res.error) { setError(res.error); toast(res.error, "error"); return }
      toast(
        asignar ? `${u.Nombre} agregado a ${nombreSel}` : `${u.Nombre} retirado de ${nombreSel}`,
        "success"
      )
      await cargarMiembros(nombreSel)
      const q = query.trim()
      if (q.length >= 2) {
        const r = await buscarUsuariosAction(q)
        if (!r.error) setResultados(r.usuarios ?? [])
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SeccionBuscar
        equipos={equipos}
        equipoSel={equipoSel}
        onEquipoChange={(id) => { setEquipoSel(id); setQuery("") }}
        query={query}
        onQueryChange={setQuery}
        buscando={buscando}
        nuevos={resultados.filter((u) => !miembroIds.has(u.id))}
        pending={pending}
        equipoNombre={equipoNombre}
        toggle={toggle}
        error={error}
      />
      {equipoSel && (
        <SeccionMiembros
          nombreSel={nombreSel}
          miembros={miembros}
          cargando={cargando}
          pending={pending}
          toggle={toggle}
        />
      )}
    </div>
  )
}

function SeccionBuscar({
  equipos, equipoSel, onEquipoChange,
  query, onQueryChange,
  buscando, nuevos, pending, equipoNombre, toggle, error,
}: {
  equipos: Equipo[]
  equipoSel: string
  onEquipoChange: (id: string) => void
  query: string
  onQueryChange: (q: string) => void
  buscando: boolean
  nuevos: Usuario[]
  pending: boolean
  equipoNombre: Map<string, string>
  toggle: (u: Usuario, asignar: boolean) => void
  error?: string
}) {
  return (
    <div style={card}>
      <SectionTitle>Asignar integrantes</SectionTitle>
      {equipos.length === 0 ? (
        <p style={{ color: "var(--rojo)", fontSize: 13 }}>Primero crea al menos un equipo.</p>
      ) : (
        <>
          <div>
            <label style={label} htmlFor="i-equipo">Equipo</label>
            <select id="i-equipo" style={input} value={equipoSel} onChange={(e) => onEquipoChange(e.target.value)}>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.Nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={label} htmlFor="i-buscar">Agregar usuarios de la base de datos</label>
            <input
              id="i-buscar" style={input}
              placeholder="Buscar por nombre o cédula (mín. 2 caracteres)…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>
          <ErrorMsg msg={error} />
          {query.trim().length >= 2 && (
            <ul style={listaStyle}>
              {buscando ? (
                <li style={filaInfo}>Buscando…</li>
              ) : nuevos.length === 0 ? (
                <li style={filaInfo}>Sin resultados nuevos para "{query.trim()}".</li>
              ) : (
                nuevos.map((u) => (
                  <FilaUsuario
                    key={u.id} usuario={u} checked={false} disabled={pending}
                    otroEquipo={u.EquipoId ? equipoNombre.get(u.EquipoId) : undefined}
                    onToggle={() => toggle(u, true)}
                  />
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function SeccionMiembros({
  nombreSel, miembros, cargando, pending, toggle,
}: {
  nombreSel: string
  miembros: Usuario[]
  cargando: boolean
  pending: boolean
  toggle: (u: Usuario, asignar: boolean) => void
}) {
  const fuera = miembros.length < MIN || miembros.length > MAX
  return (
    <div style={card}>
      <SectionTitle>Integrantes · {nombreSel} ({miembros.length})</SectionTitle>
      <p style={{ fontSize: 12, color: fuera ? "var(--rojo)" : "var(--ok)", margin: "0 0 10px", fontWeight: 600 }}>
        Requerido: entre {MIN} y {MAX} integrantes.
      </p>
      {cargando ? (
        <p style={{ color: "var(--gris)", fontSize: 13 }}>Cargando integrantes…</p>
      ) : miembros.length === 0 ? (
        <p style={{ color: "var(--gris)", fontSize: 13 }}>
          Sin integrantes. Búscalos arriba y márcalos para agregarlos.
        </p>
      ) : (
        <ul style={{ ...listaStyle, marginTop: 0 }}>
          {miembros.map((u) => (
            <FilaUsuario key={u.id} usuario={u} checked disabled={pending} onToggle={() => toggle(u, false)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function FilaUsuario({
  usuario: u, checked, disabled, otroEquipo, onToggle,
}: {
  usuario: Usuario
  checked: boolean
  disabled: boolean
  otroEquipo?: string
  onToggle: () => void
}) {
  return (
    <li style={{ borderBottom: "1px solid var(--linea)" }}>
      <button
        type="button" disabled={disabled} onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, background: checked ? "rgba(0,220,130,.1)" : "none", border: 0, padding: "9px 14px", cursor: disabled ? "wait" : "pointer", textAlign: "left", fontFamily: "var(--font-body)", opacity: disabled ? 0.6 : 1 }}
      >
        <span aria-hidden style={{ width: 20, height: 20, borderRadius: 5, border: "2px solid", borderColor: checked ? "var(--ok)" : "var(--linea)", background: checked ? "var(--verde)" : "transparent", color: "#020D18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
          {checked ? "✓" : ""}
        </span>
        <Avatar nombre={u.Nombre} size={30} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, color: "var(--tinta)", fontSize: 13 }}>{u.Nombre}</span>
          <span style={{ display: "block", fontSize: 11, color: "var(--gris)" }}>
            <span style={{ fontFamily: "monospace" }}>{u.Cedula || u.Email}</span>
            {otroEquipo && (
              <span style={{ color: "var(--rojo)", marginLeft: 8, fontWeight: 600 }}>· ya en {otroEquipo}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
