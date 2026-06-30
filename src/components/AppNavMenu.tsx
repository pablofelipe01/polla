"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { logoutAction } from "@/lib/actions/auth"

export type Modulo = { href: string; label: string }

/**
 * Parte interactiva de la barra de navegación.
 *
 * En escritorio muestra los módulos en línea. En pantallas pequeñas
 * (≤768px) los oculta y muestra un botón hamburguesa que despliega un menú.
 * El estado de apertura es UI efímera local (`useState`); se cierra al navegar.
 *
 * @param mods     - Módulos visibles según el rol (ya filtrados en el servidor)
 * @param activo   - href del módulo activo para resaltarlo
 * @param userName - Nombre/identificador del usuario (null si no hay sesión)
 * @param isAuthed - Si hay sesión activa (muestra "Salir" en vez de "Ingresar")
 */
export default function AppNavMenu({
  mods,
  activo,
  userName,
  isAuthed,
}: {
  mods: Modulo[]
  activo: string
  userName: string | null
  isAuthed: boolean
}) {
  const [open, setOpen] = useState(false)

  // Cierra el menú con la tecla Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <nav className="app-nav">
      <span className="app-nav-brand">Mundial 2026</span>

      {/* Módulos en línea — solo escritorio */}
      <div className="app-nav-links">
        {mods.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`app-nav-link${activo === m.href ? " on" : ""}`}
          >
            {m.label}
          </Link>
        ))}
      </div>

      {/* Acciones en línea — solo escritorio */}
      <div className="app-nav-end">
        {isAuthed ? (
          <>
            <span className="app-nav-user">{userName}</span>
            <form action={logoutAction}>
              <button type="submit" className="app-nav-btn">Salir</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="app-nav-cta">Ingresar</Link>
        )}
      </div>

      {/* Botón hamburguesa — solo móvil/pantallas pequeñas */}
      <button
        type="button"
        className={`app-nav-burger${open ? " open" : ""}`}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Menú desplegable — solo móvil */}
      {open && (
        <>
          <div className="app-nav-overlay" onClick={() => setOpen(false)} />
          <div className="app-nav-drawer" role="menu">
            {mods.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                role="menuitem"
                className={`app-nav-drawer-link${activo === m.href ? " on" : ""}`}
                onClick={() => setOpen(false)}
              >
                {m.label}
              </Link>
            ))}
            <div className="app-nav-drawer-foot">
              {isAuthed ? (
                <>
                  {userName && <span className="app-nav-drawer-user">{userName}</span>}
                  <form action={logoutAction}>
                    <button type="submit" className="app-nav-btn app-nav-drawer-btn">Salir</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="app-nav-cta app-nav-drawer-btn">Ingresar</Link>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
