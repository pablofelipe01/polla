"use client"

import { useActionState, useState } from "react"
import { crearEquipoDTAction } from "@/lib/actions/dt"
import type { DatosDT } from "@/lib/services/dt"
import { card, label, input, btnPrimary, SectionTitle } from "@/app/admin/_components/ui"
import { useActionFeedback } from "@/app/_components/Feedback"
import { ListaMiembros, BuscadorMiembros, SeccionAyudante } from "./EquipoDT"
import GlobeSelector, { CONFEDERACIONES } from "@/app/admin/_components/GlobeSelector"

export default function DTPanel({
  datos,
  puedeAsignarAyudante = false,
}: {
  datos: DatosDT
  /** Solo el DT principal (o Admin) puede asignar el ayudante; el ayudante no. */
  puedeAsignarAyudante?: boolean
}) {
  const [equipoSelIdx, setEquipoSelIdx] = useState(0)

  if (datos.equipos.length === 0) {
    return <ElegirPais datos={datos} />
  }

  const sel = datos.equipos[Math.min(equipoSelIdx, datos.equipos.length - 1)]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {datos.equipos.length > 1 && (
        <div style={card}>
          <label style={label}>Equipo</label>
          <select
            style={input}
            value={equipoSelIdx}
            onChange={(e) => setEquipoSelIdx(Number(e.target.value))}
          >
            {datos.equipos.map((de, i) => (
              <option key={de.equipo.id} value={i}>
                {de.equipo.Nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={card}>
        <SectionTitle>Integrantes · {sel.equipo.Nombre}</SectionTitle>
        <p style={{ fontSize: 12, color: "var(--gris)", margin: "0 0 12px" }}>
          Agrega tu plantilla (mínimo 20, máximo 30). Los pronósticos oficiales del equipo
          los registran el DT y el Cuerpo Técnico desde el módulo Pronósticos.
        </p>
        <ListaMiembros miembros={sel.miembros} />
        <BuscadorMiembros equipoId={sel.equipo.id} />
      </div>

      {puedeAsignarAyudante && (
        <div style={card}>
          <SectionTitle>Ayudante · {sel.equipo.Nombre}</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--gris)", margin: "0 0 12px" }}>
            Asigna un ayudante encargado de este equipo. Podrá agregar integrantes y editar
            los pronósticos únicamente de <strong>{sel.equipo.Nombre}</strong>.
          </p>
          <SeccionAyudante equipoId={sel.equipo.id} ayudante={sel.ayudante} />
        </div>
      )}

      {datos.paisesDisponibles.length > 0 && <ElegirPais datos={datos} compacto />}
    </div>
  )
}

/**
 * Selector de país con globo 3D para el DT. El continente ya está fijo por el
 * rol del DT; el globo lo muestra resaltado. Los países disponibles se presentan
 * como chips seleccionables — al confirmar se crea el equipo.
 */
function ElegirPais({ datos, compacto }: { datos: DatosDT; compacto?: boolean }) {
  const [paisSel, setPaisSel] = useState<string>("")
  const [state, action, pending] = useActionState(crearEquipoDTAction, {})
  useActionFeedback(state, "Equipo creado. Ahora arma tu plantilla de integrantes.")

  const conf = CONFEDERACIONES.find((c) => c.id === datos.continenteNombre)
  const confColor = conf?.color ?? "var(--azul)"

  if (datos.paisesDisponibles.length === 0 && !compacto) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
        <p style={{ fontSize: 14, color: "var(--gris)", margin: 0 }}>
          No hay países disponibles en tu continente ({datos.continenteNombre || "sin asignar"}).
          Contacta al administrador.
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...card, position: "relative", overflow: "hidden", border: "none" }}>

      {/* Globo 3D — fondo decorativo, transparente, sin interacción */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 24,
          transform: "translateY(-50%)",
          width: 230,
          height: 230,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      >
        <GlobeSelector selected={datos.continenteNombre} />
      </div>

      {/* Contenido principal — flota sobre el globo */}
      <div style={{ position: "relative", zIndex: 1 }}>

        <SectionTitle>{compacto ? "Tomar otro país" : "Elige el país de tu equipo"}</SectionTitle>

        <p style={{ fontSize: 12, color: "var(--gris)", margin: "0 0 16px" }}>
          Tu confederación es{" "}
          <strong style={{ color: confColor }}>{datos.continenteNombre}</strong>.
          Selecciona el país que representarás en la lista de abajo.
        </p>

        {/* Badge de confederación */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", margin: "0 0 6px" }}>
            Tu confederación
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: confColor + "22",
              border: `1.5px solid ${confColor}`,
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: confColor,
                flexShrink: 0,
                boxShadow: `0 0 8px ${confColor}`,
              }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: confColor }}>{datos.continenteNombre}</div>
              <div style={{ fontSize: 11, color: "var(--gris)" }}>
                {datos.paisesDisponibles.length}{" "}
                {datos.paisesDisponibles.length === 1 ? "país disponible" : "países disponibles"}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--gris)", margin: "8px 0 0" }}>
            Haz clic en un país para seleccionarlo y luego confirma.
          </p>
        </div>

        {/* Chips de países disponibles */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", margin: "0 0 8px" }}>
            Países disponibles
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {datos.paisesDisponibles.map((p) => {
              const activo = paisSel === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaisSel(activo ? "" : p)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 99,
                    border: `1.5px solid ${activo ? confColor : "var(--linea)"}`,
                    background: activo ? confColor + "22" : "transparent",
                    color: activo ? confColor : "var(--tinta)",
                    fontSize: 13,
                    fontWeight: activo ? 700 : 500,
                    cursor: "pointer",
                    transition: "all .15s",
                    boxShadow: activo ? `0 0 8px ${confColor}44` : "none",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {p}
                </button>
              )
            })}
          </div>

          <form action={action}>
            <input type="hidden" name="pais" value={paisSel} />
            {state.error && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "0 0 8px" }}>{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending || !paisSel}
              style={{
                ...btnPrimary,
                opacity: pending || !paisSel ? 0.5 : 1,
                fontSize: 13,
                cursor: pending || !paisSel ? "not-allowed" : "pointer",
              }}
            >
              {pending ? "Creando…" : paisSel ? `Tomar ${paisSel}` : "Selecciona un país"}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
