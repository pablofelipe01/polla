import type { CSSProperties } from "react"

type ShutterTextProps = {
  /** Texto a animar. Se reparte en palabras (no se parten al hacer wrap) y caracteres. */
  text: string
  /** Etiqueta semántica del contenedor. Usa "h1" para títulos principales. */
  as?: "h1" | "h2" | "div"
  /** Tamaño de fuente (acepta clamp / cualquier valor CSS). */
  fontSize?: CSSProperties["fontSize"]
  /** Color del texto base. */
  color?: string
  /** Color de las franjas superior/inferior (acento de marca). */
  accent?: string
  /** Color de la franja central. */
  accentMid?: string
  /** Retraso base antes de iniciar la animación (segundos). */
  delay?: number
  /** Oculta el bloque a lectores de pantalla (úsalo si un ancestro ya expone el texto). */
  ariaHidden?: boolean
  className?: string
  style?: CSSProperties
}

// Permite props CSS personalizadas (--i, --st-base) en el objeto style tipado.
type CSSVars = CSSProperties & Record<`--${string}`, string | number>

/**
 * Título con animación de entrada tipo "shutter": cada carácter aparece con un
 * desenfoque que se aclara mientras tres franjas de color barren horizontalmente.
 *
 * Implementado en **CSS puro** (clases `st-*` y keyframes en globals.css). No usa
 * JavaScript ni framer-motion: la animación corre en el compositor del navegador,
 * por lo que funciona en iOS aunque la hidratación tarde o falle, y termina
 * siempre visible (`animation-fill-mode: both`). Con `prefers-reduced-motion`,
 * el reset global de globals.css acelera las animaciones y el texto queda visible
 * al instante. Las franjas son decorativas; el contenedor expone el texto vía
 * `aria-label` (salvo que `ariaHidden` lo delegue a un ancestro).
 *
 * @param text - Texto a renderizar y animar
 * @returns Encabezado/contenedor animado con el estilo de marca (Bebas Neue por defecto)
 */
export default function ShutterText({
  text,
  as: Tag = "div",
  fontSize = "clamp(26px, 7vw, 36px)",
  color = "#F0F4FF",
  accent = "#00DC82",
  accentMid = "#B8C0D4",
  delay = 0,
  ariaHidden = false,
  className,
  style,
}: ShutterTextProps) {
  const words = text.split(" ")

  const rootStyle: CSSVars = {
    display: "block",
    textAlign: "center",
    margin: 0,
    fontFamily: "var(--font-display)",
    fontWeight: 400,
    fontSize,
    lineHeight: 1.06,
    letterSpacing: "-.01em",
    color,
    "--st-base": `${delay}s`,
    ...style,
  }

  // Índice global de carácter (para escalonar el delay a lo largo de todo el texto).
  let charIndex = -1

  return (
    <Tag
      className={className}
      style={rootStyle}
      aria-label={ariaHidden ? undefined : text}
      aria-hidden={ariaHidden || undefined}
    >
      {words.map((word, w) => (
        // Espacio real entre palabras → punto de corte para el wrap.
        <span key={w}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap", verticalAlign: "top" }} aria-hidden>
            {word.split("").map((char, c) => {
              charIndex += 1
              return (
                <span key={c} className="st-char" style={{ ["--i" as string]: charIndex } as CSSVars}>
                  <span className="st-main">{char}</span>
                  <span className="st-slice st-slice-1" aria-hidden style={{ color: accent }}>{char}</span>
                  <span className="st-slice st-slice-2" aria-hidden style={{ color: accentMid }}>{char}</span>
                  <span className="st-slice st-slice-3" aria-hidden style={{ color: accent }}>{char}</span>
                </span>
              )
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  )
}
