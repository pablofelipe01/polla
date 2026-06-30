"use client"

import { useActionState, useState } from "react"
import { editarContinenteAction } from "@/lib/actions/admin"
import type { Continente } from "@/lib/clients/airtable"
import { card, label, btnPrimary } from "./ui"
import { useActionFeedback } from "@/app/_components/Feedback"
import BuscadorUsuarios from "./BuscadorUsuarios"
import Avatar from "@/app/_components/Avatar"
import { CONFEDERACIONES } from "./GlobeSelector"

/** Color de la confederación según el nombre del continente (para la franja superior). */
function colorConfederacion(nombre: string): string {
  const conf = CONFEDERACIONES.find(
    (c) => c.nombre === nombre || c.id === nombre || nombre.includes(c.nombre)
  )
  return conf?.color ?? "#3B82F6"
}

export default function ContinentesTab({ continentes }: { continentes: Continente[] }) {
  if (continentes.length === 0) {
    return (
      <div style={card}>
        <p style={{ color: "var(--gris)", fontSize: 13 }}>Cargando continentes…</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--gris)", margin: 0 }}>
        Los 6 continentes del Mundial ya están creados. Asigna el Director Técnico y el cuerpo técnico de cada uno
        eligiéndolos de la base de datos.
      </p>
      {continentes.map((c) => (
        <ContinenteCard key={c.id} continente={c} />
      ))}
    </div>
  )
}

function parseCuerpo(raw: string): string[] {
  return raw ? raw.split("\n").map((s) => s.trim()).filter(Boolean) : []
}

type Persona = { id: string; nombre: string }

function ContinenteCard({ continente: c }: { continente: Continente }) {
  const [abierto, setAbierto] = useState(false)
  // Guardamos id + nombre: el nombre se muestra en el continente; el id sirve
  // para promover al usuario a Rol=DT con su continente al guardar.
  const [dt, setDt] = useState<Persona>({ id: "", nombre: c.DT })
  const [cuerpo, setCuerpo] = useState<Persona[]>(
    parseCuerpo(c.CuerpoTecnico).map((nombre) => ({ id: "", nombre }))
  )

  const boundAction = editarContinenteAction.bind(null, c.id)
  const [state, action, pending] = useActionState(boundAction, {})
  useActionFeedback(state, `${c.Nombre}: cambios guardados`)

  const quitarCuerpo = (nombre: string) => setCuerpo((prev) => prev.filter((p) => p.nombre !== nombre))

  const color = colorConfederacion(c.Nombre)
  const nCuerpo = parseCuerpo(c.CuerpoTecnico).length

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", borderColor: `${color}40` }}>
      {/* Franja de color de la confederación */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />

      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--tinta)", lineHeight: 1 }}>{c.Nombre}</div>
            {nCuerpo > 0 && (
              <div style={{ fontSize: 11, color: "var(--gris)", marginTop: 4 }}>{nCuerpo} en cuerpo técnico</div>
            )}
          </div>
          {/* Píldora de estado */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
            background: c.DT ? "rgba(0,220,130,.12)" : "rgba(255,71,87,.1)",
            border: `1px solid ${c.DT ? "rgba(0,220,130,.2)" : "rgba(255,71,87,.2)"}`,
            whiteSpace: "nowrap",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.DT ? "var(--verde)" : "var(--rojo)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: c.DT ? "var(--verde)" : "var(--rojo)" }}>
              {c.DT ? "Activo" : "Sin DT"}
            </span>
          </span>
        </div>

        {/* DT asignado o aviso */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 2px" }}>
          {c.DT ? (
            <>
              <Avatar nombre={c.DT} size={36} gradient={[color, `${color}cc`]} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.85)" }}>{c.DT}</div>
                <div style={{ fontSize: 10, color: "var(--gris)", marginTop: 2 }}>DT asignado</div>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--gris-2)" }}>Aún no hay Director Técnico asignado.</div>
          )}
        </div>

        <button
          onClick={() => setAbierto((v) => !v)}
          style={{
            marginTop: 12,
            background: abierto ? "rgba(255,255,255,.08)" : "var(--verde)",
            color: abierto ? "var(--tinta-2)" : "#020D18",
            border: abierto ? "1px solid var(--linea)" : 0,
            borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >
          {abierto ? "Cerrar" : c.DT ? "Editar" : "Asignar DT"}
        </button>

      {abierto && (
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--linea)" }}>
          <input type="hidden" name="Nombre" value={c.Nombre} />
          <input type="hidden" name="DT" value={dt.nombre} />
          <input type="hidden" name="DTUsuarioId" value={dt.id} />
          <input type="hidden" name="CuerpoTecnico" value={cuerpo.map((p) => p.nombre).join("\n")} />
          <input type="hidden" name="CuerpoTecnicoIds" value={cuerpo.map((p) => p.id).join("\n")} />

          {/* Director Técnico — uno solo */}
          <div>
            <label style={label}>Director Técnico</label>
            {dt.nombre ? (
              <Chip texto={dt.nombre} onRemove={() => setDt({ id: "", nombre: "" })} />
            ) : (
              <BuscadorUsuarios
                placeholder="Buscar al DT por nombre o cédula…"
                onPick={(u) => setDt({ id: u.id, nombre: u.Nombre })}
              />
            )}
          </div>

          {/* Cuerpo técnico — varios */}
          <div>
            <label style={label}>Cuerpo técnico ({cuerpo.length})</label>
            {cuerpo.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {cuerpo.map((p) => (
                  <Chip key={p.nombre} texto={p.nombre} onRemove={() => quitarCuerpo(p.nombre)} />
                ))}
              </div>
            )}
            <BuscadorUsuarios
              placeholder="Agregar integrante del cuerpo técnico…"
              excluir={new Set(cuerpo.map((p) => p.nombre))}
              onPick={(u) =>
                setCuerpo((prev) =>
                  prev.some((p) => p.nombre === u.Nombre) ? prev : [...prev, { id: u.id, nombre: u.Nombre }]
                )
              }
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            style={{ ...btnPrimary, alignSelf: "flex-start", fontSize: 13, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}
      </div>
    </div>
  )
}

function Chip({ texto, onRemove }: { texto: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,220,130,.1)", border: "1px solid rgba(0,220,130,.3)", borderRadius: 99, padding: "5px 12px", fontSize: 13, fontWeight: 700, color: "var(--verde)" }}>
      {texto}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${texto}`}
        style={{ background: "none", border: 0, color: "var(--rojo)", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0, fontWeight: 800 }}
      >
        ✕
      </button>
    </span>
  )
}
