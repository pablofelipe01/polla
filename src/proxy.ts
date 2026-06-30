// En Next.js 16, middleware.ts fue renombrado a proxy.ts y la función a `proxy`.
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { Rol } from "@/lib/clients/airtable"

// Capacidades por módulo (espejo de los helpers de auth.ts, sin sesión completa).
const puedeAdmin = (r?: Rol) => r === "Admin"
const puedeEquipos = (r?: Rol) => r === "Admin" || r === "DT" || r === "CuerpoTecnico"
const puedePronosticos = (r?: Rol) => r === "Admin" || r === "DT" || r === "CuerpoTecnico" || r === "Usuario"

export const proxy = auth(function (req) {
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role as Rol | undefined
  const sesion = !!req.auth
  const aLogin = () => {
    const url = new URL("/login", req.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  // /login → si ya está autenticado, redirigir a su módulo
  if (pathname === "/login") {
    if (!sesion) return NextResponse.next()
    // Rol desconocido/vacío: mostrar login para que el usuario vuelva a autenticarse
    if (!role) return NextResponse.next()
    const destino = role === "Admin" ? "/admin" : (role === "DT" || role === "CuerpoTecnico") ? "/equipos" : "/pronosticos"
    return NextResponse.redirect(new URL(destino, req.url))
  }

  // Página de bienvenida (animación de entrada) → pública, sin sesión requerida
  if (pathname === "/bienvenida") return NextResponse.next()

  // Raíz → siempre pasa por bienvenida; si ya hay sesión salta directo al módulo
  if (pathname === "/") {
    if (!sesion) return NextResponse.redirect(new URL("/bienvenida", req.url))
    const destino = role === "Admin" ? "/admin" : (role === "DT" || role === "CuerpoTecnico") ? "/equipos" : "/pronosticos"
    return NextResponse.redirect(new URL(destino, req.url))
  }

  // Sin sesión → todo va al login
  if (!sesion) return aLogin()

  // Módulo 1 · Panel de Admin → solo Admin
  if (pathname.startsWith("/admin")) {
    return puedeAdmin(role) ? NextResponse.next() : aLogin()
  }

  // Módulo 2 · Equipos → Admin y DT/Cuerpo Técnico
  if (pathname.startsWith("/equipos")) {
    return puedeEquipos(role) ? NextResponse.next() : aLogin()
  }

  // Módulo 3 · Pronósticos → cualquier usuario autenticado (sesión verificada arriba)
  // No se comprueba el rol aquí; la página maneja canAccessPronosticos y redirige si hace falta
  if (pathname.startsWith("/pronosticos") || pathname.startsWith("/panel")) {
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  // Aplica a todas las rutas excepto assets estáticos de Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img/).*)"],
}
