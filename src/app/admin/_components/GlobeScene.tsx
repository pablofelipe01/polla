"use client"

import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import {
  CONFEDERACIONES,
  densificarPoligono,
  colorEspacial,
} from "./globeData"

const R = 1

/**
 * Construye la geometría + material de un polígono de continente.
 * Cuando `confColor` está definido se usa como color sólido (seleccionado);
 * si no, se aplica el gradiente espacial.
 */
function buildLine(
  polygon: [number, number][],
  radio: number,
  confColor: string | null,
  opacity: number
): THREE.Line {
  const pts = densificarPoligono(polygon, radio, 22)
  const positions = new Float32Array(pts.length * 3)
  const colArr    = new Float32Array(pts.length * 3)
  const selColor  = confColor ? new THREE.Color(confColor) : null

  pts.forEach((p, i) => {
    positions[i * 3]     = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    const c = selColor ?? colorEspacial(p)
    colArr[i * 3]     = c.r
    colArr[i * 3 + 1] = c.g
    colArr[i * 3 + 2] = c.b
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geo.setAttribute("color",    new THREE.BufferAttribute(colArr, 3))

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    toneMapped:   false,
    transparent:  true,
    opacity,
  })
  return new THREE.Line(geo, mat)
}

/**
 * Contorno de un continente + islas (polígonos extra).
 * Cuando está seleccionado: color de confederación + halo de glow (segunda línea
 * ligeramente más grande, blending aditivo).
 */
function Continente({
  polygon,
  extra = [],
  selected,
  color,
}: {
  polygon: [number, number][]
  extra?: [number, number][][]
  selected: boolean
  color: string
}) {
  const mainLine = useMemo(
    () => buildLine(polygon, R * 1.005, selected ? color : null, selected ? 1 : 0.75),
    [polygon, selected, color]
  )

  const glowLine = useMemo(() => {
    if (!selected) return null
    const line = buildLine(polygon, R * 1.018, color, 0.28)
    ;(line.material as THREE.LineBasicMaterial).blending = THREE.AdditiveBlending
    ;(line.material as THREE.LineBasicMaterial).depthWrite = false
    return line
  }, [polygon, selected, color])

  const extraLines = useMemo(
    () => extra.map((p) => buildLine(p, R * 1.005, selected ? color : null, selected ? 0.9 : 0.55)),
    [extra, selected, color]
  )

  return (
    <group>
      <primitive object={mainLine} />
      {glowLine && <primitive object={glowLine} />}
      {extraLines.map((l, i) => <primitive key={i} object={l} />)}
    </group>
  )
}

/** Globo: esfera + atmósfera + retícula + continentes. Solo decorativo — sin clics. */
function Globo({ selected }: { selected: string | null }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[R, 72, 72]} />
        <meshPhongMaterial
          color="#080e20"
          emissive="#0a1838"
          transparent
          opacity={0.85}
          shininess={50}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[R * 1.18, 48, 48]} />
        <meshBasicMaterial
          color="#3a7bff"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[R * 1.001, 36, 18]} />
        <meshBasicMaterial color="#1a3560" wireframe transparent opacity={0.10} />
      </mesh>

      {CONFEDERACIONES.map((c) => (
        <Continente
          key={c.id}
          polygon={c.polygon}
          extra={c.extra}
          selected={selected === c.id}
          color={c.color}
        />
      ))}
    </group>
  )
}

/** Wrapper que aplica auto-rotación sin OrbitControls ni interacción. */
function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12
  })
  return <group ref={ref}>{children}</group>
}

/** Escena decorativa del globo terráqueo. Fondo transparente, sin interacción. */
export default function GlobeScene({ selected }: { selected: string | null }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 2.9], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
    >
      {/* Sin <color> — fondo transparente para mezclarse con la página */}
      <ambientLight intensity={1.2} />
      <pointLight position={[5, 5, 5]}   intensity={120} color="#88bbff" />
      <pointLight position={[-5, -3, -4]} intensity={80}  color="#ff4ec4" />
      <pointLight position={[0, 4, 0]}   intensity={50}  color="#39ff8b" />

      <AutoRotate>
        <Globo selected={selected} />
      </AutoRotate>
    </Canvas>
  )
}
