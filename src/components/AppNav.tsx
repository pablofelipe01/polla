import {
  canAccessAdmin,
  canAccessEquipos,
  canAccessPronosticos,
} from "@/lib/auth"
import type { Session } from "next-auth"
import AppNavMenu, { type Modulo } from "./AppNavMenu"

/**
 * Construye la lista de módulos visibles para la sesión según su rol.
 * Estadísticas es universal; el resto se filtra por capacidad.
 */
function modulosVisibles(session: Session | null): Modulo[] {
  const mods: Modulo[] = []
  if (canAccessAdmin(session)) mods.push({ href: "/admin", label: "Panel Admin" })
  if (canAccessEquipos(session)) mods.push({ href: "/equipos", label: "Equipos" })
  if (canAccessPronosticos(session)) mods.push({ href: "/pronosticos", label: "Pronósticos" })
  mods.push({ href: "/estadisticas", label: "Estadísticas" })
  return mods
}

/**
 * Barra de navegación por roles. Calcula los módulos accesibles en el servidor
 * y delega el render interactivo (menú hamburguesa en móvil) a {@link AppNavMenu}.
 * Server Component.
 *
 * @param session - Sesión actual (null = público, solo verá Estadísticas)
 * @param activo  - href del módulo activo para resaltarlo
 */
export default function AppNav({
  session,
  activo,
}: {
  session: Session | null
  activo: string
}) {
  const usuario = session?.user
  return (
    <AppNavMenu
      mods={modulosVisibles(session)}
      activo={activo}
      userName={usuario ? (usuario.name ?? usuario.email ?? null) : null}
      isAuthed={!!usuario}
    />
  )
}
