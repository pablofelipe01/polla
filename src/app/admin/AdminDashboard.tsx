"use client"

import { useState } from "react"
import type { Continente, Equipo } from "@/lib/clients/airtable"
import type { EncuentroConEstado } from "@/lib/services/encuentros"
import ContinentesTab from "./_components/ContinentesTab"
import UsuariosTab from "./_components/UsuariosTab"
import EncuentrosTab from "./_components/EncuentrosTab"
import QRGenerator from "@/components/QRGenerator"

export interface AdminData {
  continentes: Continente[]
  equipos: Equipo[]
  encuentros: EncuentroConEstado[]
  paises: string[]
}

const TABS = [
  ["continentes", "Continentes (DT)"],
  ["usuarios", "Usuarios"],
  ["encuentros", "Partidos / API"],
  ["qr", "Código QR"],
] as const

type TabId = (typeof TABS)[number][0]

export default function AdminDashboard({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<TabId>("continentes")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <a href="/api/admin/export" className="btn-energy" style={{ background: "linear-gradient(120deg, #16a34a, #22c55e)", color: "#fff", padding: "9px 18px", fontSize: 13, textDecoration: "none", boxShadow: "0 6px 18px -8px rgba(22,163,74,.7)" }}>
          📊 Exportar Excel
        </a>
        <a href="/api/admin/backup" className="btn-energy" style={{ background: "rgba(255,255,255,.07)", color: "var(--tinta-2)", border: "1px solid var(--linea)", padding: "9px 18px", fontSize: 13, textDecoration: "none" }}>
          ⬇ Respaldo JSON
        </a>
      </div>

      <div className="adm-tabs">
        {TABS.map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`adm-tab${tab === id ? " on" : ""}`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div key={tab} className="u-fade-up">
        {tab === "continentes" && <ContinentesTab continentes={data.continentes} />}
        {tab === "usuarios" && (
          <UsuariosTab equipos={data.equipos} continentes={data.continentes} />
        )}
        {tab === "encuentros" && <EncuentrosTab encuentros={data.encuentros} />}
        {tab === "qr" && <QRGenerator />}
      </div>
    </div>
  )
}
