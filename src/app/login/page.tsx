"use client"

import { useActionState, useState } from "react"
import { loginAction } from "@/lib/actions/auth"

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 16,
  padding: "14px 16px",
  border: "1.5px solid rgba(255,255,255,.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,.06)",
  color: "rgba(255,255,255,.9)",
  outline: "none",
  fontFamily: "var(--font-body)",
  boxSizing: "border-box",
  letterSpacing: "0.5px",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,.35)",
  marginBottom: 9,
}

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,.25)",
  marginTop: 8,
  marginBottom: 0,
  textAlign: "center",
}

/** Balón oficial del Mundial con rotación 3D continua y rebote suave. */
function SoccerBall({ size = 50 }: { size?: number }) {
  return (
    <>
      <style>{`
        @keyframes ball-spin {
          from { transform: rotateY(0deg) rotateZ(-6deg); }
          to   { transform: rotateY(360deg) rotateZ(-6deg); }
        }
        @keyframes ball-bob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        /* El halo se centra con translate(-50%,-50%); el keyframe lo conserva
           en cada frame para que el pulso NO descuadre el resplandor. */
        @keyframes ball-glow {
          0%, 100% { transform: translate(-50%,-50%) scale(.97); opacity: .85; }
          50%       { transform: translate(-50%,-50%) scale(1.05); opacity: 1; }
        }
        .login-ball-bob  { animation: ball-bob 3s ease-in-out infinite; }
        .login-ball-glow { animation: ball-glow 3s ease-in-out infinite; }
        .login-ball-spin { animation: ball-spin 7s linear infinite; display: block; filter: drop-shadow(0 8px 20px rgba(0,0,0,.6)); }
      `}</style>
      <div className="login-ball-bob">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/IMG_3546.PNG"
          alt="Balón Mundial 2026"
          className="login-ball-spin"
          width={size}
          height={size}
          style={{ objectFit: "contain" }}
        />
      </div>
    </>
  )
}

/** Líneas de cancha SVG + resplandor verde: decoración de fondo del card. */
function DecoracionFondo() {
  return (
    <>
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}
        viewBox="0 0 460 600"
        preserveAspectRatio="none"
        aria-hidden
      >
        <circle cx="230" cy="300" r="90" fill="none" stroke="white" strokeWidth="2" />
        <line x1="0" y1="300" x2="460" y2="300" stroke="white" strokeWidth="1.5" />
        <rect x="10" y="220" width="80" height="160" fill="none" stroke="white" strokeWidth="1.5" />
        <rect x="370" y="220" width="80" height="160" fill="none" stroke="white" strokeWidth="1.5" />
        <circle cx="230" cy="300" r="4" fill="white" />
      </svg>
      <div style={{
        position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
        width: 320, height: 320,
        background: "radial-gradient(circle, rgba(0,220,130,.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </>
  )
}

/** Balón animado + título + subtítulo. */
function LoginHeader() {
  return (
    <>
      <div style={{ position: "relative", marginBottom: 22 }}>
        {/* Anillo de resplandor pulsante detrás del balón. El centrado vive en ball-glow. */}
        <div
          className="login-ball-glow"
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", width: 150, height: 150,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,220,130,.28) 0%, rgba(0,220,130,.12) 45%, transparent 72%)",
            pointerEvents: "none",
          }}
        />
        <SoccerBall size={110} />
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 30, lineHeight: 1.1, color: "#F0F4FF", textAlign: "center", letterSpacing: "-.01em", margin: 0 }}>
        Pronósticos Guaicaramo
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 36 }}>
        <span style={{ height: 1, width: 32, background: "rgba(0,220,130,.4)" }} />
        <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 11, color: "#00DC82", letterSpacing: ".2em", textTransform: "uppercase" }}>
          Mundial 2026 · FIFA
        </span>
        <span style={{ height: 1, width: 32, background: "rgba(0,220,130,.4)" }} />
      </div>
    </>
  )
}

/**
 * Pantalla de inicio de sesión. Login unificado por cédula con PIN opcional
 * (Admin / DT / usuarios habilitados). La lógica de autenticación delega en loginAction.
 */
export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {})
  const [showPin, setShowPin] = useState(false)

  const pinRequerido =
    state?.error?.includes("requiere PIN") ||
    state?.error?.includes("PIN incorrecto")

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#080F1C", borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 80px rgba(0,0,0,.8), 0 0 0 1px rgba(0,220,130,.12)", position: "relative" }}>
        <DecoracionFondo />
        <div style={{ position: "relative", padding: "48px 36px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <LoginHeader />
          <form action={action} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle} htmlFor="cedula">Cédula de ciudadanía</label>
              <input
                id="cedula" name="cedula" type="text" inputMode="numeric"
                autoComplete="username" required placeholder="Ej: 1.018.461.230"
                style={inputStyle}
                onChange={(e) => {
                  if (showPin && !pinRequerido && e.target.value === "") setShowPin(false)
                }}
              />
              <p style={{ ...hintStyle, textAlign: "left" }}>Sin puntos ni espacios</p>
            </div>

            {(showPin || pinRequerido) && (
              <div>
                <label style={labelStyle} htmlFor="pin">PIN de acceso</label>
                <input
                  id="pin" name="pin" type="password" inputMode="numeric"
                  autoComplete="current-password" maxLength={4} placeholder="• • • •"
                  style={{ ...inputStyle, letterSpacing: "0.5em", textAlign: "center", fontSize: 22 }}
                  autoFocus
                />
                <p style={hintStyle}>Por defecto: últimos 4 dígitos de tu cédula</p>
              </div>
            )}

            {!showPin && !pinRequerido && (
              <button type="button" onClick={() => setShowPin(true)}
                style={{ background: "none", border: "none", color: "#00DC82", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center", padding: 0, fontFamily: "var(--font-body)" }}>
                Acceso con PIN — Administradores y Directores Técnicos
              </button>
            )}

            {state?.error && (
              <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: "#FF4757", background: "rgba(255,71,87,.1)", border: "1px solid rgba(255,71,87,.2)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.45 }}>
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending}
              style={{ width: "100%", background: pending ? "rgba(255,255,255,.12)" : "linear-gradient(135deg,#00DC82,#00A866)", color: pending ? "rgba(255,255,255,.5)" : "#020D18", border: 0, borderRadius: 12, padding: 16, fontSize: 15, fontWeight: 500, cursor: pending ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", letterSpacing: ".06em", boxShadow: pending ? "none" : "0 4px 20px rgba(0,220,130,.35)", marginTop: 4 }}>
              {pending ? "Verificando…" : "Ingresar →"}
            </button>
          </form>
          <p style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,.2)", textAlign: "center" }}>
            Pronósticos Guaicaramo · Mundial 2026
          </p>
        </div>
      </div>
    </div>
  )
}
