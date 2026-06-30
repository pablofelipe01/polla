"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import type { EquipoOpcion } from "@/lib/actions/pronosticos"

/**
 * Selector de equipo para la vista de solo lectura (usado por el Admin, que no
 * pertenece a ningún equipo). Guarda la selección en la URL (?equipo=...).
 * No se renderiza si hay un solo equipo o ninguno.
 */
export default function SelectorEquipoVista({
  equipos,
  equipoId,
}: {
  equipos: EquipoOpcion[]
  equipoId: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  if (equipos.length <= 1) return null

  const cambiar = (id: string) => {
    const next = new URLSearchParams(params)
    next.set("equipo", id)
    router.push(`${pathname}?${next}`)
  }

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", marginBottom: 6 }}>
        Ver equipo
      </label>
      <select
        value={equipoId ?? ""}
        onChange={(e) => cambiar(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--linea)", background: "var(--bg)", color: "var(--tinta)", fontSize: 14, fontFamily: "var(--font-body)" }}
      >
        {equipos.map((eq) => (
          <option key={eq.id} value={eq.id}>{eq.nombre}</option>
        ))}
      </select>
    </div>
  )
}
