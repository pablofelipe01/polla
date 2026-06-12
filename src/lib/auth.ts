import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { findAdminByEmail } from "./airtable"

// Augmentar tipos de next-auth para incluir el rol
declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      role?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    role?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Administrador",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const admin = await findAdminByEmail(credentials.email as string)
          if (!admin) return null
          const valid = await bcrypt.compare(
            credentials.password as string,
            admin.HashContrasena
          )
          if (!valid) return null
          return { id: admin.id, email: admin.Email, name: admin.Nombre, role: "admin" }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.role) token.role = user.role
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role
      return session
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  trustHost: true,
})

export function isAdmin(
  session: { user?: { role?: string } | null } | null
): boolean {
  return session?.user?.role === "admin"
}
