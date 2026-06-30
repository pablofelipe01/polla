"use client"

import dynamic from "next/dynamic"
import { CONFEDERACIONES, type ConfederacionGeo } from "./globeData"

// Re-export para consumidores (EquiposTab usa CONFEDERACIONES e id/nombre/color)
export { CONFEDERACIONES }
export type { ConfederacionGeo }

// La escena WebGL solo se monta en el navegador (Three.js necesita el DOM/canvas)
const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%" }} />,
})

/**
 * Globo terráqueo neón decorativo (React Three Fiber).
 * Gira automáticamente y resalta el continente activo. Sin interacción de usuario.
 *
 * @param selected - Id de confederación activa (resalta su continente)
 */
export default function GlobeSelector({ selected }: { selected: string | null }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GlobeScene selected={selected} />
    </div>
  )
}
