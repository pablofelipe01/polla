/**
 * Mapa estático país → confederación FIFA.
 *
 * football-data.org no expone la confederación de cada selección, así que se
 * mantiene aquí. Las claves de confederación coinciden con los `id` de
 * `CONFEDERACIONES` en `app/admin/_components/GlobeSelector.tsx`.
 *
 * `PAISES_ES_POR_CONFEDERACION` contiene los nombres canónicos en español
 * que se usan en la UI y se almacenan en Airtable.
 *
 * `PAISES_POR_CONFEDERACION` extiende lo anterior con aliases en inglés
 * (football-data.org) para la detección de confederación desde datos de sync.
 *
 * Fuente: listados oficiales FIFA por confederación (CONCACAF 41, UEFA 55,
 * CAF 54, AFC 47, CONMEBOL 10, OFC 11 miembros plenos).
 */

export const CONF_CONCACAF = "CONCACAF — América del Norte y Centro"
export const CONF_CONMEBOL = "CONMEBOL — Sudamérica"
export const CONF_UEFA    = "UEFA — Europa"
export const CONF_CAF     = "CAF — África"
export const CONF_AFC     = "AFC — Asia"
export const CONF_OFC     = "OFC — Oceanía"

/**
 * Nombres canónicos en español por confederación.
 * Esta es la fuente de verdad para la selección de países en la UI.
 * Incluye todos los miembros FIFA plenos de cada confederación.
 */
const PAISES_ES_POR_CONFEDERACION: Record<string, string[]> = {
  [CONF_CONCACAF]: [
    // América del Norte
    "Canadá", "Estados Unidos", "México",
    // América Central
    "Belice", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panamá",
    // Caribe
    "Anguila", "Antigua y Barbuda", "Aruba", "Bahamas", "Barbados", "Bermudas",
    "Islas Vírgenes Británicas", "Islas Caimán", "Cuba", "Curazao", "Dominica",
    "República Dominicana", "Granada", "Guadalupe", "Guyana", "Haití",
    "Jamaica", "Martinica", "Montserrat", "Puerto Rico",
    "San Cristóbal y Nieves", "Santa Lucía", "San Vicente y las Granadinas",
    "Surinam", "Trinidad y Tobago", "Islas Turcas y Caicos",
    "Islas Vírgenes de los EE.UU.",
  ],
  [CONF_CONMEBOL]: [
    "Argentina", "Bolivia", "Brasil", "Chile", "Colombia",
    "Ecuador", "Paraguay", "Perú", "Uruguay", "Venezuela",
  ],
  [CONF_UEFA]: [
    "Albania", "Andorra", "Armenia", "Austria", "Azerbaiyán",
    "Bielorrusia", "Bélgica", "Bosnia y Herzegovina", "Bulgaria", "Croacia",
    "Chipre", "República Checa", "Dinamarca", "Inglaterra", "Estonia",
    "Islas Feroe", "Finlandia", "Francia", "Georgia", "Alemania",
    "Gibraltar", "Grecia", "Hungría", "Islandia", "Israel",
    "Italia", "Kazajistán", "Kosovo", "Letonia", "Liechtenstein",
    "Lituania", "Luxemburgo", "Malta", "Moldavia", "Mónaco",
    "Montenegro", "Países Bajos", "Macedonia del Norte", "Irlanda del Norte", "Noruega",
    "Polonia", "Portugal", "Irlanda", "Rumanía", "Rusia",
    "San Marino", "Escocia", "Serbia", "Eslovaquia", "Eslovenia",
    "España", "Suecia", "Suiza", "Turquía", "Ucrania", "Gales",
  ],
  [CONF_CAF]: [
    "Argelia", "Angola", "Benín", "Botsuana", "Burkina Faso",
    "Burundi", "Cabo Verde", "Camerún", "República Centroafricana", "Chad",
    "Comoras", "Congo", "Congo RD", "Yibuti", "Egipto",
    "Guinea Ecuatorial", "Eritrea", "Suazilandia", "Etiopía", "Gabón",
    "Gambia", "Ghana", "Guinea", "Guinea-Bisáu", "Costa de Marfil",
    "Kenia", "Lesoto", "Liberia", "Libia", "Madagascar",
    "Malaui", "Malí", "Mauritania", "Mauricio", "Marruecos",
    "Mozambique", "Namibia", "Níger", "Nigeria", "Ruanda",
    "Santo Tomé y Príncipe", "Senegal", "Seychelles", "Sierra Leona", "Somalia",
    "Sudáfrica", "Sudán del Sur", "Sudán", "Tanzania", "Togo",
    "Túnez", "Uganda", "Zambia", "Zimbabue",
  ],
  [CONF_AFC]: [
    // Asia del Sur
    "Afganistán", "Bangladés", "Bután", "India", "Maldivas", "Nepal", "Pakistán", "Sri Lanka",
    // Asia Oriental
    "China", "Taipéi Chino", "Guam", "Hong Kong", "Japón",
    "Corea del Norte", "Islas Marianas del Norte", "Macao", "Mongolia", "Corea del Sur",
    // Asia Suroriental
    "Brunéi", "Camboya", "Timor Oriental", "Indonesia", "Laos",
    "Malasia", "Myanmar", "Filipinas", "Singapur", "Tailandia", "Vietnam",
    // Asia Occidental
    "Baréin", "Irak", "Irán", "Jordania", "Kuwait",
    "Líbano", "Omán", "Palestina", "Catar", "Arabia Saudita",
    "Siria", "Emiratos Árabes Unidos", "Yemen",
    // Asia Central
    "Kazajistán", "Kirguistán", "Tayikistán", "Turkmenistán", "Uzbekistán",
    // Oceanía (Australia migró de OFC a AFC en 2006)
    "Australia",
  ],
  [CONF_OFC]: [
    // 11 miembros plenos FIFA
    "Samoa Americana", "Islas Cook", "Fiyi", "Nueva Caledonia", "Nueva Zelanda",
    "Papúa Nueva Guinea", "Samoa", "Islas Salomón", "Tahití", "Tonga", "Vanuatu",
  ],
}

/**
 * Mapa completo con aliases en inglés (football-data.org) para detección
 * de confederación desde nombres que vienen de la API de sincronización.
 */
const PAISES_POR_CONFEDERACION: Record<string, string[]> = {
  [CONF_CONCACAF]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_CONCACAF],
    // EN aliases
    "USA", "United States", "Mexico", "Canada",
    "Belize", "Panama", "Haiti", "Curaçao", "Curacao",
    "Trinidad and Tobago", "Suriname", "Dominica", "Grenada",
    "Antigua and Barbuda", "Cayman Islands", "Bermuda",
    "Dominican Republic", "St. Kitts and Nevis", "Saint Kitts and Nevis",
    "St. Lucia", "Saint Lucia",
    "St. Vincent and the Grenadines", "Saint Vincent and the Grenadines",
    "Guadeloupe", "Martinique", "Puerto Rico", "Guyana",
    "British Virgin Islands", "US Virgin Islands",
    "Turks and Caicos Islands", "Montserrat", "Anguilla", "Aruba",
    "Bahamas", "Barbados",
  ],
  [CONF_CONMEBOL]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_CONMEBOL],
    // EN aliases
    "Brazil", "Peru",
  ],
  [CONF_UEFA]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_UEFA],
    // EN aliases
    "Albania", "Andorra", "Armenia", "Austria", "Azerbaijan",
    "Belarus", "Belgium", "Bosnia and Herzegovina", "Bosnia-H.", "Bulgaria",
    "Croatia", "Cyprus", "Czechia", "Czech Republic", "Denmark",
    "England", "Estonia", "Faroe Islands", "Finland", "France",
    "Georgia", "Germany", "Gibraltar", "Greece", "Hungary",
    "Iceland", "Israel", "Italy", "Kazakhstan", "Kosovo",
    "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
    "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia",
    "Northern Ireland", "Norway", "Poland", "Portugal",
    "Republic of Ireland", "Ireland", "Romania", "Russia",
    "San Marino", "Scotland", "Serbia", "Slovakia", "Slovenia",
    "Spain", "Sweden", "Switzerland", "Turkey", "Türkiye", "Ukraine", "Wales",
  ],
  [CONF_CAF]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_CAF],
    // EN aliases
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso",
    "Burundi", "Cape Verde", "Cameroon", "Central African Republic", "Chad",
    "Comoros", "Congo", "Congo DR", "DR Congo", "Djibouti", "Egypt",
    "Equatorial Guinea", "Eritrea", "Eswatini", "Swaziland", "Ethiopia",
    "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau",
    "Ivory Coast", "Côte d'Ivoire", "Cote d'Ivoire", "Kenya", "Lesotho",
    "Liberia", "Libya", "Madagascar", "Malawi", "Mali",
    "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia",
    "Niger", "Nigeria", "Rwanda", "Sao Tome and Principe", "Senegal",
    "Seychelles", "Sierra Leone", "Somalia", "South Africa",
    "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia",
    "Uganda", "Zambia", "Zimbabwe",
  ],
  [CONF_AFC]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_AFC],
    // EN aliases
    "Afghanistan", "Bangladesh", "Bhutan", "India", "Maldives", "Nepal", "Pakistan", "Sri Lanka",
    "China PR", "China", "Chinese Taipei", "Guam", "Hong Kong", "Japan",
    "DPR Korea", "North Korea", "Northern Mariana Islands", "Macau", "Mongolia",
    "Korea Republic", "South Korea",
    "Brunei", "Cambodia", "Timor-Leste", "East Timor", "Indonesia", "Laos",
    "Malaysia", "Myanmar", "Philippines", "Singapore", "Thailand", "Vietnam",
    "Bahrain", "Iraq", "Iran", "Jordan", "Kuwait",
    "Lebanon", "Oman", "Palestine", "Qatar", "Saudi Arabia",
    "Syria", "United Arab Emirates", "Yemen",
    "Kyrgyzstan", "Tajikistan", "Turkmenistan", "Uzbekistan",
    "Australia",
  ],
  [CONF_OFC]: [
    ...PAISES_ES_POR_CONFEDERACION[CONF_OFC],
    // EN aliases
    "American Samoa", "Cook Islands", "Fiji", "New Caledonia", "New Zealand",
    "Papua New Guinea", "Samoa", "Solomon Islands", "Tahiti", "Tonga", "Vanuatu",
  ],
}

/** Normaliza un nombre de país para comparación tolerante (sin tildes/símbolos). */
function normalizar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // elimina diacríticos combinantes
    .replace(/[^a-z0-9]/g, "")
}

/** Índice nombre normalizado → confederación. */
const INDICE: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const [conf, paises] of Object.entries(PAISES_POR_CONFEDERACION)) {
    for (const p of paises) m.set(normalizar(p), conf)
  }
  return m
})()

/**
 * Devuelve la confederación de un país, o `undefined` si no está mapeado.
 *
 * @param pais - Nombre de país tal como lo devuelve football-data.org
 */
export function confederacionDe(pais: string): string | undefined {
  return INDICE.get(normalizar(pais))
}

/**
 * Filtra una lista de países dejando solo los de la confederación indicada.
 * Usado por componentes que ya tienen una lista y quieren subconjunto por conf.
 *
 * @param paises - Lista de países disponibles
 * @param confId - Id de confederación (coincide con `CONFEDERACIONES[].id`)
 */
export function filtrarPorConfederacion(paises: string[], confId: string): string[] {
  return paises.filter((p) => confederacionDe(p) === confId)
}

/**
 * Devuelve todos los países de una confederación en español, ordenados
 * alfabéticamente. Fuente estática — incluye todos los miembros FIFA plenos.
 *
 * @param confId - Id de confederación (ej. `CONF_UEFA`)
 */
export function listPaisesDeConfederacion(confId: string): string[] {
  return [...(PAISES_ES_POR_CONFEDERACION[confId] ?? [])].sort((a, b) =>
    a.localeCompare(b, "es")
  )
}

/**
 * Devuelve todos los países de todas las confederaciones en español,
 * ordenados alfabéticamente. Útil para búsquedas globales.
 */
export function listTodosLosPaises(): string[] {
  return Object.values(PAISES_ES_POR_CONFEDERACION)
    .flat()
    .sort((a, b) => a.localeCompare(b, "es"))
}
