import type { CSSProperties } from "react"

/** Pares de gradiente para avatares, tomados de la paleta del diseño deportivo. */
const GRADIENTES = [
  ["#00DC82", "#00A866"], // verde
  ["#8B5CF6", "#6D28D9"], // púrpura
  ["#3B82F6", "#1D4ED8"], // azul
  ["#F59E0B", "#D97706"], // ámbar
  ["#FF4757", "#c81e2b"], // rojo
  ["#06B6D4", "#0E7490"], // cian
] as const

/** Deriva las iniciales (máx. 2) de un nombre completo. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Hash estable de un string para elegir un gradiente de forma determinista. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Avatar circular con iniciales sobre un gradiente determinista por nombre.
 * Refleja cómo se presentan los usuarios en el diseño deportivo (DTs, integrantes,
 * ranking). Componente de presentación puro.
 *
 * @param nombre - Nombre completo del que se derivan las iniciales y el color
 * @param size - Diámetro en px (por defecto 38)
 * @param gradient - Sobrescribe el gradiente automático con un par [from, to]
 * @param ring - Color del borde/halo (p. ej. oro para el líder)
 */
export default function Avatar({
  nombre,
  size = 38,
  gradient,
  ring,
}: {
  nombre: string
  size?: number
  gradient?: readonly [string, string]
  ring?: string
}) {
  const [from, to] = gradient ?? GRADIENTES[hash(nombre) % GRADIENTES.length]
  const estilo: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${from}, ${to})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    fontSize: Math.round(size * 0.34),
    color: "#fff",
    letterSpacing: ".02em",
    border: ring ? `2px solid ${ring}` : undefined,
    boxShadow: ring ? `0 0 18px ${ring}66` : undefined,
  }
  return (
    <span style={estilo} aria-hidden>
      {iniciales(nombre)}
    </span>
  )
}
