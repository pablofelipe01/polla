"use server"

import { signIn, signOut, auth } from "@/lib/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { findUsuarioByCedula } from "@/lib/clients/airtable"

export interface LoginState {
  error?: string
}

/** Devuelve true para roles que requieren PIN al ingresar. */
function requierePin(rol: string): boolean {
  return rol === "Admin" || rol === "DT" || rol === "CuerpoTecnico"
}

/**
 * Inicia sesión con cédula.
 * Usuarios regulares: solo cédula.
 * Admin, DT y Cuerpo Técnico: cédula + PIN (últimos 4 dígitos).
 * El PIN se deriva automáticamente de la cédula — no requiere configuración manual.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const cedula = (formData.get("cedula") as string)?.trim()
  const pin    = (formData.get("pin") as string)?.trim() ?? ""

  if (!cedula) return { error: "Ingresa tu número de cédula" }

  const usuario = await findUsuarioByCedula(cedula)
  if (!usuario || !usuario.Activo) {
    return { error: "Tu registro no aparece en el sistema, comunícate con Gestión Humana" }
  }

  if (requierePin(usuario.Rol)) {
    if (!pin) {
      return { error: "Este acceso requiere PIN — ingresa los últimos 4 dígitos de tu cédula" }
    }
    if (pin !== cedula.slice(-4)) {
      return { error: "PIN incorrecto. Son los últimos 4 dígitos de tu cédula" }
    }
  }

  try {
    await signIn("credentials", { cedula, pin, redirect: false })
  } catch (err) {
    if (err instanceof AuthError) return { error: "Error al iniciar sesión. Intenta de nuevo." }
    throw err
  }

  const session = await auth()
  const rol = session?.user?.role
  // Cada rol aterriza en su módulo principal.
  const destino = rol === "Admin" ? "/admin" : (rol === "DT" || rol === "CuerpoTecnico") ? "/equipos" : "/pronosticos"
  redirect(destino)
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}
