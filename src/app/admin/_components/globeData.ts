import { Vector3, Color } from "three"

/**
 * Confederación dibujada como croquis de continente sobre el globo 3D.
 * `polygon`  — contorno principal del continente (vértices [lat, lon]).
 * `extra`    — polígonos adicionales: islas y subcontinentes destacados.
 * `color`    — identidad neón usada en la UI 2D (no en el gradiente del globo).
 */
export interface ConfederacionGeo {
  id: string
  nombre: string
  color: string
  labelLat: number
  labelLon: number
  polygon: [number, number][]
  extra?: [number, number][][]
}

const WC = {
  magenta: "#FF2EC4",
  verde:   "#39FF8B",
  cian:    "#22D3FF",
  naranja: "#FFB23E",
  morado:  "#B45BFF",
  teal:    "#2BFFE0",
}

export const CONFEDERACIONES: ConfederacionGeo[] = [

  // ── CONCACAF — América del Norte y Central ────────────────────────────────
  {
    id: "CONCACAF — América del Norte y Centro",
    nombre: "CONCACAF",
    color: WC.magenta,
    labelLat: 42, labelLon: -100,
    polygon: [
      // Alaska (punta oeste → costa sur)
      [64,-168],[67,-163],[70,-157],[71,-152],[70,-147],[67,-144],
      [61,-148],[59,-151],[57,-153],[57,-136],[55,-131],
      // Costa Pacífica (BC → California)
      [51,-128],[49,-124],[47,-124],[44,-124],[40,-124],
      [37,-122],[35,-121],[34,-120],[33,-118],[32,-117],
      // Baja California
      [31,-116],[28,-114],[26,-111],[24,-110],[23,-110],
      // Costa Pacífica de México
      [21,-106],[20,-105],[18,-103],[17,-101],[16,-96],
      // Centroamérica (Pacífico)
      [15,-92],[14,-90],[13,-88],[12,-87],[11,-86],[10,-84],[9,-83],
      // Panamá → lado Caribe
      [8,-77],[9,-77],
      // Centroamérica (Caribe)
      [10,-83],[12,-84],[14,-83],[15,-84],[16,-88],
      // Yucatán / Belice
      [18,-88],[20,-87],[21,-87],[22,-89],
      // Golfo de México
      [23,-89],[24,-97],[26,-97],[27,-97],
      // Texas / Luisiana
      [28,-96],[29,-94],[30,-89],[29,-88],
      // Alabama / Florida panhandle
      [30,-85],[30,-82],
      // Florida
      [25,-80],[24,-81],[25,-81],[29,-81],
      // Costa este EE.UU.
      [31,-81],[33,-78],[35,-76],[37,-76],
      [38,-75],[40,-74],[41,-73],[42,-71],
      // Nueva Inglaterra / Canadá Marítimo
      [43,-70],[44,-68],[45,-64],[47,-61],[48,-54],
      // Terranova / Labrador
      [52,-56],[55,-59],[58,-62],[60,-65],
      // Quebec norte / Hudson
      [62,-77],[60,-78],[55,-80],[55,-85],
      [56,-96],[60,-96],
      // Nunavut / Ártico
      [62,-92],[65,-87],[68,-88],[70,-96],
      [73,-100],[74,-110],[72,-128],[70,-137],[70,-141],
      // Costa norte de Alaska
      [70,-150],[70,-157],[67,-163],
    ],
    extra: [
      // Groenlandia (simplificada)
      [[60,-44],[62,-42],[65,-40],[68,-25],[70,-23],[74,-20],
       [76,-18],[83,-30],[82,-42],[78,-68],[74,-73],[68,-54],[62,-47]],
      // Cuba (simplificada)
      [[23,-84],[22,-80],[20,-75],[19,-77],[20,-82],[22,-84]],
    ],
  },

  // ── CONMEBOL — Sudamérica ─────────────────────────────────────────────────
  {
    id: "CONMEBOL — Sudamérica",
    nombre: "CONMEBOL",
    color: WC.verde,
    labelLat: -15, labelLon: -58,
    polygon: [
      // Costa norte (Venezuela / Colombia)
      [12,-72],[11,-70],[10,-63],[10,-61],[8,-60],
      // Guyana / Surinam / Guayana Francesa
      [6,-58],[5,-53],[4,-52],[2,-50],[1,-49],
      // Brasil NE (punta más oriental ~35°W)
      [0,-49],[-2,-46],[-3,-39],[-5,-35],[-8,-34],
      // Brasil SE
      [-10,-37],[-13,-39],[-15,-39],[-18,-39],
      [-20,-40],[-23,-43],[-26,-48],[-29,-49],
      // Uruguay / Río Grande do Sul
      [-32,-52],[-33,-53],[-34,-54],[-35,-56],
      // Argentina (Buenos Aires → Patagonia)
      [-38,-57],[-40,-62],[-42,-63],[-45,-66],
      [-48,-65],[-50,-68],[-52,-69],
      // Estrecho de Magallanes / Tierra del Fuego
      [-54,-69],[-55,-67],[-56,-68],[-55,-70],
      // Chile (costa Pacífica subiendo al norte)
      [-53,-72],[-50,-75],[-46,-75],[-42,-73],
      [-38,-74],[-33,-71],[-30,-71],[-27,-71],
      [-24,-70],[-20,-70],[-18,-70],
      // Perú
      [-15,-75],[-10,-77],[-8,-78],[-5,-81],
      // Ecuador
      [-2,-80],[0,-80],
      // Colombia Pacífico → Venezuela
      [2,-78],[4,-77],[7,-77],[8,-77],[10,-74],[11,-73],[12,-72],
    ],
  },

  // ── UEFA — Europa ─────────────────────────────────────────────────────────
  {
    id: "UEFA — Europa",
    nombre: "UEFA",
    color: WC.cian,
    labelLat: 52, labelLon: 15,
    polygon: [
      // Portugal (sur → norte)
      [37,-9],[38,-9],[40,-8],[42,-9],
      // Costa norte de España → Pirineos
      [43,-9],[43,-8],[43,-5],[43,-2],
      // Francia (Golfo de Vizcaya / Bretaña)
      [47,-2],[48,-4],[48,-5],[47,-4],[46,-2],[45,-1],[43,-2],
      // España Mediterránea → Riviera francesa
      [43,-3],[41,2],[41,3],[43,3],[43,5],[43,7],
      // Liguria / Italia NW
      [44,8],[44,9],[44,12],[44,13],
      // Italia (Tirreno → punta de la bota)
      [43,12],[41,14],[40,15],[39,16],[38,16],[38,15],[37,16],
      // Calabria → costa Jónica norte
      [38,16],[39,17],[40,18],[41,18],
      // Italia Adriático (subiendo)
      [43,14],[44,13],[45,14],
      // Eslovenia → Balcanes (costa dálmata)
      [46,14],[45,18],[44,15],[43,17],[42,18],[41,20],
      // Albania / Grecia
      [40,20],[39,20],[38,21],[37,22],[37,23],
      [36,23],[37,25],[38,26],[38,27],
      // Turquía europea
      [40,28],[41,29],
      // Mar Negro (Bulgaria / Rumanía / Ucrania)
      [43,28],[44,29],[45,30],[46,31],[46,34],
      [46,32],[47,30],[48,32],
      // Ucrania / Moldova / Polonia
      [47,28],[48,24],[50,24],[50,30],
      // Estados bálticos
      [54,22],[55,21],[54,19],[55,18],[56,21],
      [57,24],[58,22],[59,24],[59,28],
      // Finlandia
      [60,25],[60,22],[61,22],[64,24],[66,26],[68,28],[70,28],
      // Noruega (Barents → Atlántico)
      [71,25],[71,20],[71,15],[70,12],[70,5],
      [69,18],[68,15],[65,14],[63,8],[62,5],
      // Noruega SO → Dinamarca
      [58,6],[58,8],[57,10],[55,10],[55,12],[55,10],
      // Alemania / Países Bajos / Bélgica (Mar del Norte)
      [54,8],[55,8],[52,5],[51,4],[51,3],
      // Francia (Canal → Bretaña)
      [50,2],[49,0],[48,-2],
      // Vuelta: Golfo de Vizcaya → España → Portugal sur
      [47,-2],[46,-2],[45,-1],[43,-2],[43,-9],[42,-9],[37,-9],
    ],
    extra: [
      // Islas Británicas (simplificadas)
      [[50,-5],[51,-4],[51,0],[52,2],[53,0],[54,-3],
       [55,-5],[57,-6],[58,-5],[58,-3],[57,-2],[55,-1],
       [54,0],[53,-3],[52,-4],[51,-5],[50,-5]],
    ],
  },

  // ── CAF — África ──────────────────────────────────────────────────────────
  {
    id: "CAF — África",
    nombre: "CAF",
    color: WC.naranja,
    labelLat: 2, labelLon: 20,
    polygon: [
      // Marruecos (Mediterráneo → Atlántico)
      [36,-6],[35,-6],[34,-8],
      // Mauritania / Senegal / Guinea-Bissau (costa atlántica sur)
      [30,-10],[26,-15],[21,-17],[18,-17],[15,-17],
      [12,-16],[10,-15],[9,-14],[8,-13],
      // Guinea / Sierra Leona / Liberia
      [7,-14],[6,-11],[5,-9],[5,-8],
      // Costa de Marfil / Ghana / Togo
      [4,-8],[4,-4],[4,0],[4,2],
      // Golfo de Benín (Nigeria / Camerún)
      [4,3],[4,7],[4,9],[4,10],
      // Camerún / Gabón / Congo (costa)
      [3,10],[2,10],[0,9],[-1,9],
      // Angola
      [-5,12],[-10,14],[-15,12],
      // Namibia
      [-18,12],[-22,14],[-28,16],
      // Sudáfrica (Cabo de Buena Esperanza)
      [-34,18],[-34,22],[-32,28],
      // Costa este de Sudáfrica / Mozambique
      [-28,32],[-26,33],[-24,35],[-20,35],
      [-16,37],[-12,40],[-11,40],
      // Tanzania / Kenya
      [-10,39],[-8,39],[-6,40],[-4,40],[-1,41],[0,42],[2,41],
      // Somalia (Cuerno de África)
      [4,41],[7,49],[11,51],[12,51],
      // Golfo de Adén / Yibuti
      [11,43],[12,43],[15,42],
      // Eritrea / Mar Rojo
      [16,39],[18,38],[20,37],[22,37],
      // Egipto / Sinaí / Mediterráneo
      [24,36],[27,34],[31,32],[30,29],[31,25],
      [31,24],[30,25],[31,31],
      // Libia / Túnez (Mediterráneo)
      [33,12],[37,10],
      // Argelia / Marruecos (Mediterráneo)
      [37,3],[36,0],[36,-2],[36,-5],[36,-6],
    ],
  },

  // ── AFC — Asia ────────────────────────────────────────────────────────────
  {
    id: "AFC — Asia",
    nombre: "AFC",
    color: WC.morado,
    labelLat: 35, labelLon: 90,
    polygon: [
      // Turquía / Cáucaso → Caspio
      [42,42],[42,48],[38,50],[36,50],
      // Oriente Medio / Golfo Pérsico
      [32,48],[30,49],[28,50],[24,57],[22,60],
      // Omán / Yemen (costa sur)
      [20,58],[16,53],[14,50],[12,45],[12,44],
      // Vuelta por el Golfo: Pakistán / costa india O
      [22,60],[24,62],[22,63],[23,68],[22,70],
      [18,73],[16,74],[14,74],[11,77],[8,77],
      // Punta sur de India (Cabo Comorín)
      [8,78],[8,80],[10,80],[13,80],
      // India SE / Golfo de Bengala
      [14,80],[16,80],[18,84],[20,87],[22,89],
      // Bangladesh / Myanmar
      [22,92],[20,93],[18,94],[16,96],
      // Indochina (Tailandia / Vietnam)
      [14,100],[12,101],[10,104],[6,102],[2,104],
      // Malasia / Singapur
      [2,104],[4,103],[5,100],[6,100],
      // Mar del Sur de China
      [10,105],[14,108],[16,108],[18,106],
      [20,110],[22,114],[24,117],[26,120],[28,122],
      // Costa china / Corea
      [30,122],[32,122],[34,122],[36,122],[37,123],
      [38,122],[40,122],[40,124],[42,130],[44,131],
      // Extremo Oriente ruso
      [48,135],[50,140],[52,142],[56,162],
      [60,162],[62,175],[64,176],
      // Costa norte de Asia (Siberia simplificada)
      [65,168],[72,170],[72,142],[70,132],[68,130],
      [72,118],[73,100],[72,75],
      // Asia Central / Kazajistán
      [70,60],[68,60],[65,60],[60,60],[56,60],[54,62],
      [52,60],[50,58],[46,50],[44,48],
      // Cáucaso → vuelta al inicio
      [42,50],[42,46],[41,44],[42,42],
    ],
    extra: [
      // Japón — Honshū (simplificado)
      [[31,130],[33,131],[34,132],[35,135],[36,136],[37,137],
       [38,140],[40,141],[42,142],[44,143],[43,141],[40,140],
       [37,138],[35,136],[33,131],[31,130]],
      // Filipinas (muy simplificado)
      [[18,122],[16,120],[12,124],[8,126],[10,124],[14,122],[18,122]],
    ],
  },

  // ── OFC — Oceanía ─────────────────────────────────────────────────────────
  {
    id: "OFC — Oceanía",
    nombre: "OFC",
    color: WC.teal,
    labelLat: -25, labelLon: 134,
    polygon: [
      // Australia — comenzando en Cabo York (NE), bajando por la costa este
      [-11,131],[-11,142],[-12,142],[-14,143],
      // Queensland
      [-18,146],[-22,150],[-24,152],[-28,153],
      // NSW
      [-32,152],[-34,151],[-35,150],
      // Victoria / Estrecho de Bass
      [-38,147],[-38,145],[-39,146],[-38,143],
      // NSW Sur → Australia del Sur
      [-37,140],[-38,140],[-35,137],[-34,135],
      [-32,134],[-33,132],[-32,130],
      // Gran Bahía Australiana
      [-33,128],[-34,122],
      // Australia Occidental
      [-34,115],[-32,115],[-28,114],[-22,114],
      // Pilbara / Costa Noroeste
      [-20,118],[-18,122],[-16,124],
      // Kimberley / Territorio del Norte
      [-14,128],[-12,130],[-12,132],[-11,136],
      // Top End / Darwin → vuelta a Cabo York
      [-12,136],[-11,136],[-11,131],
    ],
    extra: [
      // Nueva Zelanda — Isla Norte (simplificada)
      [[-34,172],[-36,174],[-37,175],[-38,176],[-39,177],
       [-40,176],[-41,175],[-38,175],[-36,174],[-34,172]],
      // Nueva Zelanda — Isla Sur (simplificada)
      [[-40,172],[-41,173],[-42,172],[-43,171],[-44,170],
       [-45,167],[-46,168],[-44,171],[-42,172],[-40,172]],
    ],
  },
]

/** Convierte lat/lon (grados) a un punto sobre la esfera de radio `r`. */
export function latLonToVec3(lat: number, lon: number, r: number): Vector3 {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return new Vector3(
    r * Math.cos(la) * Math.sin(lo),
    r * Math.sin(la),
    r * Math.cos(la) * Math.cos(lo)
  )
}

/** Convierte un punto de la esfera a lat/lon en grados. */
export function vec3ToLatLon(v: Vector3): { lat: number; lon: number } {
  const n = v.clone().normalize()
  return {
    lat: (Math.asin(n.y) * 180) / Math.PI,
    lon: (Math.atan2(n.x, n.z) * 180) / Math.PI,
  }
}

/**
 * Densifica el contorno de un continente interpolando puntos a lo largo de
 * cada arista para que las líneas sigan la curvatura de la esfera.
 *
 * @returns Lista de Vector3 (bucle cerrado) sobre la esfera de radio `r`.
 */
export function densificarPoligono(
  polygon: [number, number][],
  r: number,
  pasosPorArista = 18
): Vector3[] {
  const pts: Vector3[] = []
  for (let i = 0; i < polygon.length; i++) {
    const [lat1, lon1] = polygon[i]
    const [lat2, lon2] = polygon[(i + 1) % polygon.length]
    for (let s = 0; s < pasosPorArista; s++) {
      const t = s / pasosPorArista
      pts.push(latLonToVec3(lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t, r))
    }
  }
  pts.push(pts[0].clone())
  return pts
}

const C_CIAN    = new Color("#22D3FF")
const C_MAGENTA = new Color("#FF2EC4")
const C_LIMA    = new Color("#9FFF3E")

/**
 * Color de gradiente espacial para un vértice: cian (x<0), magenta (x>0/bajo),
 * verde lima (arriba). Usado en líneas no seleccionadas.
 */
export function colorEspacial(v: Vector3): Color {
  const n = v.clone().normalize()
  const ejeX = (n.x + 1) / 2
  const base  = C_CIAN.clone().lerp(C_MAGENTA, ejeX)
  const arriba = Math.max(0, n.y)
  return base.lerp(C_LIMA, arriba * 0.55)
}
