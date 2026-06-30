// Único punto de logging del proyecto. No usar console.* directo en otras capas.
// No loguear datos sensibles (tokens, contraseñas, datos personales).

export const logger = {
  error: (error: unknown, contexto?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ERROR]", error, contexto ?? "")
    }
    // TODO(prod): integrar servicio de logging (Sentry/Axiom/Logtail)
  },
  warn: (mensaje: string, contexto?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[WARN]", mensaje, contexto ?? "")
    }
  },
}
