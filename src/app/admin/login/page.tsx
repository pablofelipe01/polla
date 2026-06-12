"use client"

import { useActionState } from "react"
import { loginAction } from "@/app/actions/admin"
import Link from "next/link"

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, {})

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--tinta)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      backgroundImage: `
        radial-gradient(120% 80% at 100% 0%, rgba(206,17,38,.28), transparent 55%),
        radial-gradient(120% 80% at 0%   0%, rgba(0,72,168,.38), transparent 55%)
      `,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,.55)",
      }}>

        {/* ── Hero ── */}
        <div style={{
          background: "var(--tinta-2)",
          padding: "28px 28px 24px",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}>
          {/* scan lines */}
          <div style={{
            position: "absolute", inset: 0,
            background: "repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 3px)",
            pointerEvents: "none",
          }} />

          {/* brandbar tricolor */}
          <div style={{
            height: 5, width: 56, borderRadius: 99,
            display: "flex", overflow: "hidden", marginBottom: 18,
          }}>
            <span style={{ flex: 1, background: "var(--amarillo)" }} />
            <span style={{ flex: 1, background: "var(--azul-2)" }} />
            <span style={{ flex: 1, background: "var(--rojo)" }} />
          </div>

          <div style={{
            fontSize: 10, letterSpacing: "2.5px",
            textTransform: "uppercase", color: "var(--amarillo)",
            fontWeight: 700, marginBottom: 6, position: "relative",
          }}>
            Polla Tricolor · Guaicaramo
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 36,
            lineHeight: .92,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: ".5px",
            color: "#fff",
            position: "relative",
          }}>
            Panel de<br />
            <span style={{ color: "var(--amarillo)" }}>Admin</span>
          </h1>
        </div>

        {/* ── Formulario ── */}
        <div style={{
          background: "#fff",
          padding: "28px 28px 24px",
        }}>
          <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div>
              <label style={{
                display: "block",
                fontSize: 11, fontWeight: 700,
                letterSpacing: ".5px", textTransform: "uppercase",
                color: "var(--gris)", marginBottom: 7,
              }}>
                Email
              </label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@guaicaramo.com"
                style={{
                  width: "100%",
                  fontSize: 15,
                  padding: "12px 14px",
                  border: "1.5px solid var(--linea)",
                  borderRadius: 11,
                  background: "#f8f9fb",
                  color: "var(--tinta)",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  boxSizing: "border-box",
                  transition: "border-color .15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--azul-2)"; e.target.style.background = "#fff" }}
                onBlur={(e)  => { e.target.style.borderColor = "var(--linea)";  e.target.style.background = "#f8f9fb" }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 11, fontWeight: 700,
                letterSpacing: ".5px", textTransform: "uppercase",
                color: "var(--gris)", marginBottom: 7,
              }}>
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  fontSize: 15,
                  padding: "12px 14px",
                  border: "1.5px solid var(--linea)",
                  borderRadius: 11,
                  background: "#f8f9fb",
                  color: "var(--tinta)",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  boxSizing: "border-box",
                  transition: "border-color .15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--azul-2)"; e.target.style.background = "#fff" }}
                onBlur={(e)  => { e.target.style.borderColor = "var(--linea)";  e.target.style.background = "#f8f9fb" }}
              />
            </div>

            {state?.error && (
              <div style={{
                fontSize: 12, fontWeight: 600, color: "var(--rojo)",
                background: "#fdeaec",
                borderRadius: 9, padding: "10px 14px",
                borderLeft: "3px solid var(--rojo)",
              }}>
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: "100%",
                background: pending ? "var(--gris-2)" : "var(--azul)",
                color: "#fff",
                border: 0,
                borderRadius: 12,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                cursor: pending ? "not-allowed" : "pointer",
                fontFamily: "var(--font-body)",
                letterSpacing: ".3px",
                marginTop: 2,
                transition: "background .15s",
              }}
            >
              {pending ? "Verificando…" : "Iniciar sesión"}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link
              href="/"
              style={{
                fontSize: 13, fontWeight: 600,
                color: "var(--azul-2)",
                textDecoration: "none",
              }}
            >
              ← Volver a los partidos
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
