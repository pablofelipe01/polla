// En Next.js 16, middleware.ts fue renombrado a proxy.ts
// y la función exportada es `proxy` en lugar de `middleware`.
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export const proxy = auth(function (req) {
  // /admin/login está excluida del matcher — nunca llega aquí.
  // Para el resto de rutas /admin/*, exigir sesión de admin.
  if (!req.auth || req.auth.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }
  return NextResponse.next()
})

export const config = {
  // Aplica a /admin y a cualquier subruta excepto /admin/login
  // (si /admin/login quedara en el matcher, auth() la redirigiría a sí misma → loop)
  matcher: ["/admin", "/admin/((?!login$).+)"],
}
