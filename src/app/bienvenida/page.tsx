import ShutterText from "@/components/ShutterText"

/** Segundos antes de pasar automáticamente al login (vía <meta refresh>, sin JS). */
const SEGUNDOS = 5

/**
 * Página de bienvenida: animación de entrada de la app. Reproduce el título
 * "Pronósticos Guaicaramo" con efecto shutter (CSS puro) sobre el balón y avanza
 * al login. Es pública y **no requiere JavaScript**:
 * - La animación es CSS (corre en iOS aunque la hidratación tarde o falle).
 * - El auto-avance usa `<meta http-equiv="refresh">` (React 19 lo eleva al head).
 * - Toda la pantalla es un `<a href="/login">` para entrar al instante al tocar.
 * Totalmente responsive con tamaños fluidos (clamp) y altura `100dvh`.
 */
export default function BienvenidaPage() {
  return (
    <>
      {/* Auto-avance sin depender de JS */}
      <meta httpEquiv="refresh" content={`${SEGUNDOS}; url=/login`} />

      <a
        href="/login"
        aria-label="Entrar a Pronósticos Guaicaramo"
        style={{
          position: "fixed",
          inset: 0,
          minHeight: "100dvh",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(14px, 4vw, 24px)",
          padding: "clamp(20px, 6vw, 40px)",
          textAlign: "center",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        {/* Resplandor verde de fondo */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            width: "min(440px, 120vw)",
            height: "min(440px, 120vw)",
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle, rgba(0,220,130,.16) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Balón */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/IMG_3546.PNG"
          alt=""
          className="bv-ball"
          width={108}
          height={108}
          style={{
            width: "clamp(76px, 22vw, 108px)",
            height: "clamp(76px, 22vw, 108px)",
            objectFit: "contain",
            position: "relative",
            filter: "drop-shadow(0 8px 22px rgba(0,0,0,.6))",
          }}
        />

        {/* Título animado (shutter), en dos líneas para encajar en cualquier móvil */}
        <h1
          aria-label="Pronósticos Guaicaramo"
          style={{ margin: 0, position: "relative", width: "100%", textAlign: "center", overflow: "hidden" }}
        >
          <ShutterText as="div" ariaHidden text="Pronósticos" fontSize="clamp(26px, 8.5vw, 56px)" />
          <ShutterText as="div" ariaHidden text="Guaicaramo" fontSize="clamp(26px, 8.5vw, 56px)" delay={0.42} />
        </h1>

        {/* Subtítulo */}
        <div
          className="bv-rise"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            position: "relative",
            flexWrap: "wrap",
            justifyContent: "center",
            animationDelay: "1.3s",
          }}
        >
          <span style={{ height: 1, width: "clamp(24px, 8vw, 40px)", background: "rgba(0,220,130,.4)" }} />
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: "clamp(10px, 3vw, 12px)",
              color: "#00DC82",
              letterSpacing: ".24em",
              textTransform: "uppercase",
            }}
          >
            Mundial 2026 · FIFA
          </span>
          <span style={{ height: 1, width: "clamp(24px, 8vw, 40px)", background: "rgba(0,220,130,.4)" }} />
        </div>

        {/* Pista de acción */}
        <p
          className="bv-rise"
          style={{
            position: "absolute",
            bottom: "clamp(24px, 7vw, 40px)",
            fontSize: "clamp(10px, 2.8vw, 11px)",
            fontWeight: 600,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.3)",
            margin: 0,
            animationDelay: "2.1s",
          }}
        >
          Toca para entrar
        </p>
      </a>
    </>
  )
}
