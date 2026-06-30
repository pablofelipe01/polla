"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { crearEquipoAction, eliminarEquipoAction } from "@/lib/actions/admin"
import type { ActionState } from "@/lib/actions/admin"
import type { Continente, Equipo } from "@/lib/clients/airtable"
import { card, input, SectionTitle, DeleteButton } from "./ui"
import { useFeedback } from "@/app/_components/Feedback"
import GlobeSelector, { CONFEDERACIONES } from "./GlobeSelector"
import { filtrarPorConfederacion } from "@/lib/data/confederaciones"


export default function EquiposTab({
  equipos,
  continentes,
  paises,
}: {
  equipos: Equipo[]
  continentes: Continente[]
  paises: string[]
}) {
  const [confSeleccionada, setConfSeleccionada] = useState<string | null>(null)

  // Continent seleccionado como objeto Continente (undefined si no hay selección)
  const continenteObj = confSeleccionada
    ? continentes.find((c) => c.Nombre === confSeleccionada)
    : undefined

  const asignados = new Set(equipos.map((e) => e.Nombre))
  const disponibles = paises.filter((p) => !asignados.has(p))
  // Solo los países que pertenecen a la confederación seleccionada
  const disponiblesConf = confSeleccionada
    ? filtrarPorConfederacion(disponibles, confSeleccionada)
    : []

  const porContinente = new Map<string, Equipo[]>()
  for (const e of equipos) {
    const cid = e.ContinenteId ?? "__sin__"
    if (!porContinente.has(cid)) porContinente.set(cid, [])
    porContinente.get(cid)!.push(e)
  }

  const confColor = CONFEDERACIONES.find((c) => c.id === confSeleccionada)?.color ?? "var(--azul)"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Globo de fondo + leyenda ─────────────────────────────────── */}
      <div style={{
        ...card,
        position: "relative",
        overflow: "hidden",
        border: "none",
        minHeight: 260,
      }}>
        {/* Globo 3D — fondo decorativo, transparente, sin interacción */}
        <div style={{
          position: "absolute",
          top: "50%",
          right: 24,
          transform: "translateY(-50%)",
          width: 230,
          height: 230,
          opacity: 0.6,
          pointerEvents: "none",
        }}>
          <GlobeSelector selected={confSeleccionada} />
        </div>

        {/* Contenido — flota sobre el globo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <SectionTitle>Confederaciones</SectionTitle>
          <p style={{ fontSize: 12, color: "var(--gris)", margin: "0 0 14px" }}>
            Selecciona una confederación para ver y asignar sus países.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {CONFEDERACIONES.map((conf) => {
              const cont = continentes.find((c) => c.Nombre === conf.id)
              const eqCount = cont ? (porContinente.get(cont.id) ?? []).length : 0
              const activo = confSeleccionada === conf.id
              return (
                <button
                  key={conf.id}
                  onClick={() => setConfSeleccionada(activo ? null : conf.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: activo ? conf.color + "22" : "rgba(255,255,255,.03)",
                    border: `1.5px solid ${activo ? conf.color : "var(--linea)"}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                    cursor: "pointer",
                    transition: "all .15s",
                    textAlign: "left",
                    fontFamily: "var(--font-body)",
                    maxWidth: 480,
                  }}
                >
                  <span style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: conf.color,
                    flexShrink: 0,
                    boxShadow: activo ? `0 0 8px ${conf.color}` : "none",
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: activo ? conf.color : "var(--tinta)" }}>
                      {conf.id}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--gris)" }}>
                      {eqCount} {eqCount === 1 ? "país" : "países"} asignados
                      {cont?.DT ? ` · DT: ${cont.DT}` : ""}
                    </div>
                  </div>
                  {activo && (
                    <span style={{ fontSize: 10, background: conf.color, color: "#fff", borderRadius: 99, padding: "2px 7px", fontWeight: 800 }}>
                      Activo
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Panel de asignación ──────────────────────────────────────── */}
      {confSeleccionada && (
        <AsignarPais
          continenteObj={continenteObj}
          confNombre={confSeleccionada}
          confColor={confColor}
          disponibles={disponiblesConf}
          equiposDelContinente={continenteObj ? (porContinente.get(continenteObj.id) ?? []) : []}
        />
      )}

      {!confSeleccionada && (
        <div style={{ ...card, textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
          <p style={{ fontSize: 14, color: "var(--gris)", margin: 0 }}>
            Selecciona una confederación para ver y asignar sus países.
          </p>
        </div>
      )}

      {/* ── Resumen global ───────────────────────────────────────────── */}
      <div style={card}>
        <SectionTitle>Países asignados ({equipos.length})</SectionTitle>
        {equipos.length === 0 ? (
          <p style={{ color: "var(--gris)", fontSize: 13 }}>Aún no hay países asignados.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {continentes.map((c) => {
              const eq = porContinente.get(c.id) ?? []
              if (eq.length === 0) return null
              const confColor2 = CONFEDERACIONES.find((cf) => cf.id === c.Nombre)?.color ?? "var(--azul)"
              return (
                <div key={c.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: confColor2, display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px" }}>
                      {c.Nombre}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {eq.map((e) => (
                      <PaisBadge key={e.id} equipo={e} color={confColor2} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AsignarPais({
  continenteObj,
  confNombre,
  confColor,
  disponibles,
  equiposDelContinente,
}: {
  continenteObj: Continente | undefined
  confNombre: string
  confColor: string
  disponibles: string[]
  equiposDelContinente: Equipo[]
}) {
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()
  const router = useRouter()
  const { toast } = useFeedback()

  const filtrados = disponibles.filter((p) =>
    p.toLowerCase().includes(query.toLowerCase())
  )

  const asignar = (pais: string) => {
    if (!continenteObj) {
      const m = "Continente no encontrado en Airtable. Ejecuta el seed primero."
      setError(m); toast(m, "error"); return
    }
    setError(undefined)
    start(async () => {
      const fd = new FormData()
      fd.set("Nombre", pais)
      fd.set("ContinenteId", continenteObj.id)
      fd.set("Paises", pais)
      const res = await crearEquipoAction({}, fd)
      if (res.error) { setError(res.error); toast(res.error, "error") }
      else { toast(`${pais} asignado a ${confNombre}`, "success"); router.refresh() }
    })
  }

  return (
    <div
      style={{
        ...card,
        borderColor: confColor,
        borderWidth: 2,
        borderStyle: "solid",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: confColor, display: "inline-block", boxShadow: `0 0 8px ${confColor}` }} />
        <SectionTitle>{confNombre}</SectionTitle>
      </div>

      {/* Países ya asignados a este continente */}
      {equiposDelContinente.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", marginBottom: 6 }}>
            Asignados ({equiposDelContinente.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {equiposDelContinente.map((e) => (
              <PaisBadge key={e.id} equipo={e} color={confColor} onDelete={() => eliminarEquipoAction(e.id)} />
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--linea)", paddingTop: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--gris)", letterSpacing: ".5px", marginBottom: 8 }}>
          Disponibles ({disponibles.length})
        </p>

        {!continenteObj && (
          <p style={{ fontSize: 12, color: "var(--rojo)", fontWeight: 600, marginBottom: 8 }}>
            Este continente aún no existe en Airtable. Ejecuta <code>npm run seed:continentes</code>.
          </p>
        )}

        {disponibles.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>✓ Todos los países ya están asignados.</p>
        ) : (
          <>
            <input
              style={{ ...input, marginBottom: 10 }}
              placeholder={`Buscar entre ${disponibles.length} países disponibles…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {error && <p style={{ fontSize: 12, color: "var(--rojo)", fontWeight: 600, marginBottom: 8 }}>{error}</p>}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {filtrados.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--gris)" }}>Sin resultados para “{query}”.</p>
              ) : (
                filtrados.map((pais) => (
                  <button
                    key={pais}
                    disabled={pending || !continenteObj}
                    onClick={() => asignar(pais)}
                    style={{
                      background: "rgba(255,255,255,.05)",
                      border: `1.5px solid ${confColor}`,
                      color: "var(--tinta)",
                      borderRadius: 99,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: pending || !continenteObj ? "not-allowed" : "pointer",
                      opacity: pending ? 0.5 : 1,
                      fontFamily: "var(--font-body)",
                      transition: "background .1s",
                    }}
                  >
                    + {pais}
                  </button>
                ))
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--gris)", marginTop: 8 }}>
              Haz clic en un país para asignarlo a {confNombre}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function PaisBadge({
  equipo,
  color,
  onDelete,
}: {
  equipo: Equipo
  color: string
  onDelete?: () => Promise<ActionState>
}) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: color + "18",
        border: `1px solid ${color}`,
        borderRadius: 99,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--tinta)",
      }}
    >
      {equipo.Nombre}
      {onDelete && (
        <DeleteButton
          confirmMsg={`¿Quitar ${equipo.Nombre} del torneo?`}
          onDelete={onDelete}
        />
      )}
    </span>
  )
}
