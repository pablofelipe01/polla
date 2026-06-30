"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import {
  crearUsuarioAction,
  eliminarUsuarioAction,
  buscarUsuariosAction,
  listarUsuariosPaginaAction,
} from "@/lib/actions/admin"
import type { Continente, Equipo, Usuario, Rol } from "@/lib/clients/airtable"
import { card, input, label, btnPrimary, ErrorMsg, SectionTitle } from "./ui"
import { useFeedback } from "@/app/_components/Feedback"
import Avatar from "@/app/_components/Avatar"

/**
 * Gestión de usuarios. No descarga la tabla completa (~2.179): navega por
 * páginas y busca en el servidor (filterByFormula) bajo demanda.
 */
export default function UsuariosTab({
  equipos,
  continentes,
}: {
  equipos: Equipo[]
  continentes: Continente[]
}) {
  const equipoNombre = new Map(equipos.map((e) => [e.id, e.Nombre]))
  const contNombre = new Map(continentes.map((c) => [c.id, c.Nombre]))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <NuevoUsuario continentes={continentes} />
      <ListaUsuarios equipoNombre={equipoNombre} contNombre={contNombre} />
    </div>
  )
}

function NuevoUsuario({ continentes }: { continentes: Continente[] }) {
  const [rol, setRol] = useState<Rol>("Usuario")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const { toast } = useFeedback()

  const onSubmit = (fd: FormData) => {
    setError(undefined)
    start(async () => {
      const res = await crearUsuarioAction({}, fd)
      if (res.error) { setError(res.error); toast(res.error, "error") }
      else {
        toast(`Usuario “${fd.get("Nombre")}” creado`, "success")
        // notifica a la lista que recargue su primera página
        window.dispatchEvent(new Event("usuarios:changed"))
      }
    })
  }

  return (
    <div style={card}>
      <SectionTitle>Nuevo usuario</SectionTitle>
      <form
        action={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label} htmlFor="u-cedula">Cédula</label>
            <input id="u-cedula" name="Cedula" type="text" inputMode="numeric" required placeholder="Ej: 1118197502" style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label} htmlFor="u-nombre">Nombre completo</label>
            <input id="u-nombre" name="Nombre" required placeholder="Nombre" style={input} />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label style={label} htmlFor="u-rol">Rol</label>
          <select id="u-rol" name="Rol" style={input} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            <option value="Usuario">Usuario</option>
            <option value="DT">Director Técnico</option>
            <option value="CuerpoTecnico">Cuerpo Técnico</option>
            <option value="Admin">Administrador</option>
          </select>
        </div>

        {(rol === "DT" || rol === "CuerpoTecnico") && (
          <div>
            <label style={label} htmlFor="u-cont">Continente asignado</label>
            <select id="u-cont" name="ContinenteId" style={input} defaultValue="">
              <option value="" disabled>Selecciona…</option>
              {continentes.map((c) => (
                <option key={c.id} value={c.id}>{c.Nombre}</option>
              ))}
            </select>
          </div>
        )}

        <p style={{ fontSize: 11, color: "var(--gris)", margin: 0 }}>
          El usuario ingresará con su cédula. Admin, DT y Cuerpo Técnico usarán su cédula + PIN (últimos 4 dígitos).
        </p>

        <ErrorMsg msg={error} />
        <button type="submit" disabled={pending} style={{ ...btnPrimary, alignSelf: "flex-start", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Guardando…" : "Crear usuario"}
        </button>
      </form>
    </div>
  )
}

function ListaUsuarios({
  equipoNombre,
  contNombre,
}: {
  equipoNombre: Map<string, string>
  contNombre: Map<string, string>
}) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [offset, setOffset] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const { confirm, toast } = useFeedback()

  // Primera página + recarga cuando se crea un usuario
  const cargarPrimera = useCallback(async () => {
    setCargando(true)
    const res = await listarUsuariosPaginaAction()
    setCargando(false)
    if (res.error) { setError(res.error); return }
    setUsuarios(res.usuarios ?? [])
    setOffset(res.offset)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => { void cargarPrimera() }, 0)
    const onChange = () => { void cargarPrimera() }
    window.addEventListener("usuarios:changed", onChange)
    return () => { clearTimeout(id); window.removeEventListener("usuarios:changed", onChange) }
  }, [cargarPrimera])

  // Búsqueda con debounce
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

  const cargarMas = () => {
    if (!offset) return
    start(async () => {
      const res = await listarUsuariosPaginaAction(offset)
      if (res.error) { setError(res.error); return }
      setUsuarios((prev) => [...prev, ...(res.usuarios ?? [])])
      setOffset(res.offset)
    })
  }

  const eliminar = async (u: Usuario) => {
    const ok = await confirm({
      titulo: "Eliminar usuario",
      mensaje: `¿Eliminar al usuario ${u.Nombre}? Esta acción no se puede deshacer.`,
      confirmar: "Eliminar",
      peligro: true,
    })
    if (!ok) return
    setError(undefined)
    start(async () => {
      const res = await eliminarUsuarioAction(u.id)
      if (res.error) { setError(res.error); toast(res.error, "error"); return }
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id))
      setResultados((prev) => prev.filter((x) => x.id !== u.id))
      toast(`Usuario ${u.Nombre} eliminado`, "success")
    })
  }

  const buscando2 = query.trim().length >= 2
  const lista = buscando2 ? resultados : usuarios

  return (
    <div style={card}>
      <SectionTitle>Usuarios</SectionTitle>
      <input
        style={{ ...input, marginBottom: 12 }}
        placeholder="Buscar por nombre o cédula (mín. 2 caracteres)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ErrorMsg msg={error} />

      {cargando ? (
        <p style={{ color: "var(--gris)", fontSize: 13 }}>Cargando usuarios…</p>
      ) : buscando ? (
        <p style={{ color: "var(--gris)", fontSize: 13 }}>Buscando…</p>
      ) : lista.length === 0 ? (
        <p style={{ color: "var(--gris)", fontSize: 13 }}>
          {buscando2 ? `Sin resultados para “${query.trim()}”.` : "Aún no hay usuarios."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map((u) => (
            <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--linea)" }}>
              <Avatar nombre={u.Nombre} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--tinta)" }}>
                  {u.Nombre}{" "}
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: "rgba(255,214,0,.12)", border: "1px solid rgba(255,214,0,.25)", color: "var(--oro)", borderRadius: 4, padding: "1px 6px", letterSpacing: ".4px" }}>
                    {u.Rol}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--gris)" }}>
                  {u.Cedula || u.Email}
                  {u.EquipoId ? ` · ${equipoNombre.get(u.EquipoId) ?? ""}` : ""}
                  {u.ContinenteId ? ` · ${contNombre.get(u.ContinenteId) ?? ""}` : ""}
                </div>
              </div>
              <button
                disabled={pending}
                onClick={() => eliminar(u)}
                style={{ background: "rgba(255,71,87,.12)", color: "var(--rojo)", border: "1px solid rgba(255,71,87,.25)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.5 : 1 }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {!buscando2 && offset && !cargando && (
        <button
          onClick={cargarMas}
          disabled={pending}
          style={{ marginTop: 12, background: "rgba(255,255,255,.08)", color: "var(--tinta-2)", border: "1px solid var(--linea)", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Cargando…" : "Cargar más"}
        </button>
      )}
    </div>
  )
}
