/** Paleta de colores de fondo cuando no hay bandera disponible. */
const COLORES_EQUIPO = [
  "#3B82F6", "#00DC82", "#F59E0B", "#FF4757",
  "#8B5CF6", "#06B6D4", "#EC4899", "#10B981",
] as const

const RANGO_DIACRITICOS = /[̀-ͯ]/g
const QUITAR_ACENTOS = (s: string) =>
  s.normalize("NFD").replace(RANGO_DIACRITICOS, "")

/** Hash estable para asignar un color determinista por país. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Color de fondo determinista a partir del nombre del país. */
export function colorEquipo(nombre: string): string {
  return COLORES_EQUIPO[hash(nombre) % COLORES_EQUIPO.length]
}

/** Sigla de 3 letras del país (fallback cuando no hay bandera). */
export function sigla(nombre: string): string {
  const limpio = QUITAR_ACENTOS(nombre).replace(/[^A-Za-z\s]/g, "").trim()
  const primera = limpio.split(/\s+/)[0] ?? nombre
  return primera.slice(0, 3).toUpperCase()
}

/**
 * Mapa de nombre de país en español → código ISO 3166-1 alpha-2.
 * El emoji de bandera se genera a partir del código con indicadores regionales Unicode.
 * Cubre los 48 selecciones del Mundial 2026 + participantes habituales de cada confederación.
 */
const ISO_POR_PAIS: Record<string, string> = {
  // CONMEBOL
  Argentina: "AR", Brasil: "BR", Colombia: "CO", Ecuador: "EC",
  Paraguay: "PY", Uruguay: "UY", Perú: "PE", Chile: "CL",
  Venezuela: "VE", Bolivia: "BO",
  // CONCACAF
  "Estados Unidos": "US", México: "MX", Canadá: "CA",
  "Costa Rica": "CR", Panamá: "PA", Jamaica: "JM",
  Honduras: "HN", Haití: "HT", Curazao: "CW",
  "Trinidad y Tobago": "TT", "El Salvador": "SV",
  Guatemala: "GT", Surinam: "SR",
  // UEFA
  Austria: "AT", Bélgica: "BE", "Bosnia y Herzegovina": "BA",
  Croacia: "HR", "República Checa": "CZ", Inglaterra: "GB-ENG",
  Francia: "FR", Alemania: "DE", "Países Bajos": "NL",
  Noruega: "NO", Portugal: "PT", Escocia: "GB-SCT",
  España: "ES", Suecia: "SE", Suiza: "CH", Turquía: "TR",
  Italia: "IT", Dinamarca: "DK", Polonia: "PL", Serbia: "RS",
  Gales: "GB-WLS", Ucrania: "UA", Hungría: "HU", Rumanía: "RO",
  Grecia: "GR", Eslovaquia: "SK", Eslovenia: "SI", Albania: "AL",
  Irlanda: "IE", Islandia: "IS", Finlandia: "FI", Georgia: "GE",
  Montenegro: "ME", "Macedonia del Norte": "MK", Kosovo: "XK",
  "Irlanda del Norte": "GB-NIR",
  // CAF
  Argelia: "DZ", "Cabo Verde": "CV", "Congo RD": "CD",
  Egipto: "EG", Ghana: "GH", "Costa de Marfil": "CI",
  Marruecos: "MA", Senegal: "SN", Sudáfrica: "ZA",
  Túnez: "TN", Nigeria: "NG", Camerún: "CM", Malí: "ML",
  "Burkina Faso": "BF", Angola: "AO", Gabón: "GA",
  Zambia: "ZM", Uganda: "UG", Benín: "BJ",
  // AFC
  Australia: "AU", Irán: "IR", Irak: "IQ", Japón: "JP",
  Jordania: "JO", "Corea del Sur": "KR", Catar: "QA",
  "Arabia Saudita": "SA", Uzbekistán: "UZ",
  "Emiratos Árabes Unidos": "AE", China: "CN", Omán: "OM",
  Baréin: "BH",
  // OFC
  "Nueva Zelanda": "NZ", "Nueva Caledonia": "NC",
  Fiyi: "FJ", "Islas Salomón": "SB",
}

/**
 * Devuelve la URL de flagcdn.com para el código ISO dado.
 * Los códigos de subdivisión UK se mapean directamente (flagcdn los soporta).
 * Kosovo usa "xk" que flagcdn también soporta.
 */
function flagUrl(iso: string): string {
  return `https://flagcdn.com/w80/${iso.toLowerCase()}.png`
}

/**
 * Devuelve la URL de la bandera de flagcdn.com para un país en español,
 * o `null` si el país no está en el mapa.
 */
export function banderaUrl(nombre: string): string | null {
  const iso = ISO_POR_PAIS[nombre]
  return iso ? flagUrl(iso) : null
}

/**
 * Normaliza el nombre de la fase para mostrar en la UI.
 * Cubre los códigos crudos de football-data.org que pudieran haberse guardado
 * en Airtable antes de que se añadieran al mapa de sincronización.
 */
export function normalizarFase(fase: string): string {
  const mapa: Record<string, string> = {
    LAST_32: "32avos de final",
    LAST_16: "Octavos de final",
    ROUND_OF_16: "Octavos de final",
    GROUP_STAGE: "Fase de grupos",
    QUARTER_FINALS: "Cuartos de final",
    SEMI_FINALS: "Semifinal",
    THIRD_PLACE: "Tercer puesto",
    FINAL: "Final",
  }
  return mapa[fase] ?? fase
}

/** Tono de la banda superior según el estado del encuentro. */
export type BandTone = "open" | "final" | "pending" | "close"

/**
 * Banda superior de una tarjeta de partido: ícono de liga + competición + fase,
 * con la situación del encuentro a la derecha. Componente de presentación puro.
 *
 * @param fase - Fase del torneo (ej. "Cuartos de Final")
 * @param tone - Tono de color de la banda y la píldora de estado
 * @param label - Texto de la situación (ej. "Abierto", "Finalizado")
 * @param dot - Si true, muestra un punto indicador junto al label
 */
export function MatchBand({
  fase,
  tone,
  label,
  dot = false,
}: {
  fase: string
  tone: BandTone
  label: string
  dot?: boolean
}) {
  return (
    <div className="fmc-band">
      <div className="fmc-band-l">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/IMG_3546.PNG" alt="" aria-hidden className="fmc-league-ico" style={{ padding: 2, objectFit: "contain", display: "block" }} />
        <span className="fmc-league">Mundial 2026</span>
        <span className="fmc-round">— {normalizarFase(fase)}</span>
      </div>
      <span className={`fmc-status s-${tone}`}>
        {dot && <span className="dot" />}
        {label}
      </span>
    </div>
  )
}

/**
 * Bloque de equipo de una tarjeta de partido: imagen de bandera del país (o chip
 * con sigla si el país no está mapeado) + nombre debajo. Componente de presentación puro.
 *
 * @param nombre - Nombre del país en español
 * @param tenue - Si true, atenúa el bloque (partido cerrado / sin abrir)
 */
export function TeamHalf({ nombre, tenue = false }: { nombre: string; tenue?: boolean }) {
  const url = banderaUrl(nombre)
  const color = colorEquipo(nombre)
  return (
    <div className="fmc-team" style={{ opacity: tenue ? 0.55 : 1 }}>
      {url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={nombre}
          className="fmc-flag-img"
          width={80}
          height={54}
        />
      ) : (
        <span className="fmc-logo" style={{ background: color }}>
          {sigla(nombre)}
        </span>
      )}
      <span className="fmc-tname">{nombre}</span>
    </div>
  )
}
