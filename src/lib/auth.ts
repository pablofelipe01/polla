import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { findUsuarioByCedula, type Rol } from "@/lib/clients/airtable"

declare module "next-auth" {
  interface User {
    role?: Rol
    equipoId?: string | null
    continenteId?: string | null
    puedePronosticar?: boolean
  }
  interface Session {
    user: {
      id: string
      role?: Rol
      equipoId?: string | null
      continenteId?: string | null
      puedePronosticar?: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    sub?: string
    role?: Rol
    equipoId?: string | null
    continenteId?: string | null
    puedePronosticar?: boolean
  }
}

function requierePin(rol: string): boolean {
  return rol === "Admin" || rol === "DT" || rol === "CuerpoTecnico"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Usuario",
      credentials: {
        cedula: { label: "Cédula", type: "text" },
        pin:    { label: "PIN",    type: "password" },
      },
      async authorize(credentials) {
        const cedula = (credentials?.cedula as string)?.trim()
        const pin    = (credentials?.pin    as string)?.trim() ?? ""
        if (!cedula) return null
        try {
          const usuario = await findUsuarioByCedula(cedula)
          if (!usuario || !usuario.Activo) return null

          // Verificación de PIN para roles especiales
          if (requierePin(usuario.Rol)) {
            if (pin !== cedula.slice(-4)) return null
          }

          return {
            id: usuario.id,
            email: usuario.Email,
            name: usuario.Nombre,
            role: usuario.Rol,
            equipoId: usuario.EquipoId,
            continenteId: usuario.ContinenteId,
            puedePronosticar: usuario.PuedePronosticar,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role            = user.role
        token.equipoId        = user.equipoId
        token.continenteId    = user.continenteId
        token.puedePronosticar = user.puedePronosticar
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id               = token.sub ?? ""
        session.user.role             = token.role
        session.user.equipoId         = token.equipoId
        session.user.continenteId     = token.continenteId
        session.user.puedePronosticar = token.puedePronosticar
      }
      return session
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
})

type SessionLike = {
  user?: {
    role?: Rol
    equipoId?: string | null
    continenteId?: string | null
    puedePronosticar?: boolean
  } | null
} | null

export const isAdmin = (s: SessionLike): boolean => s?.user?.role === "Admin"

/** DT y Cuerpo Técnico tienen el mismo nivel de acceso al módulo de equipos. */
export const isDT = (s: SessionLike): boolean =>
  s?.user?.role === "DT" || s?.user?.role === "CuerpoTecnico"

/** Solo DT y Cuerpo Técnico registran/editan los pronósticos oficiales de sus equipos. */
export const canPredict = (s: SessionLike): boolean => isDT(s)

// ─── Capacidades por módulo (las "4 capas" del sistema) ──────────────────────────
// Cada módulo declara quién puede entrar. La UI y el proxy consumen estos helpers
// como única fuente de verdad para el control de acceso por rol.

/** Módulo 1 · Panel de Admin: asignación de DT, API y reportes. Solo Admin. */
export const canAccessAdmin = (s: SessionLike): boolean => isAdmin(s)

/** Módulo 2 · Equipos: elegir país y gestionar integrantes. Admin y DT/C.Técnico. */
export const canAccessEquipos = (s: SessionLike): boolean => isAdmin(s) || isDT(s)

/** Módulo 3 · Pronósticos: todos los roles autenticados (edición restringida a habilitados). */
export const canAccessPronosticos = (s: SessionLike): boolean =>
  s?.user?.role === "Admin" || s?.user?.role === "DT" || s?.user?.role === "CuerpoTecnico" || s?.user?.role === "Usuario"

/** Módulo 4 · Estadísticas: acceso universal (incluye público sin sesión). */
export const canAccessEstadisticas = (): boolean => true

/** Acceso a cualquier zona autenticada (al menos un módulo restringido). */
export const hasPanelAccess = (s: SessionLike): boolean => canAccessPronosticos(s)
