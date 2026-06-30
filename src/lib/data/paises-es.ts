/**
 * Traducciones de nombres de país del inglés (football-data.org) al español.
 *
 * Las claves son los valores exactos que devuelve football-data.org en los
 * campos `name` y `shortName`. Los valores son los nombres en español que se
 * almacenan en Airtable y se muestran en la UI.
 *
 * Incluye aliases frecuentes (variantes de capitalización y abreviación) para
 * tolerar inconsistencias del proveedor externo.
 */

const MAPA_ES: Record<string, string> = {
  // ── CONMEBOL ──────────────────────────────────────────────────────────────
  Argentina: "Argentina",
  Brazil: "Brasil",
  Colombia: "Colombia",
  Ecuador: "Ecuador",
  Paraguay: "Paraguay",
  Uruguay: "Uruguay",
  Peru: "Perú",
  Chile: "Chile",
  Venezuela: "Venezuela",
  Bolivia: "Bolivia",

  // ── CONCACAF ──────────────────────────────────────────────────────────────
  "United States": "Estados Unidos",
  USA: "Estados Unidos",
  Mexico: "México",
  Canada: "Canadá",
  "Costa Rica": "Costa Rica",
  Panama: "Panamá",
  Jamaica: "Jamaica",
  Honduras: "Honduras",
  Haiti: "Haití",
  "Curaçao": "Curazao",
  Curacao: "Curazao",
  "Trinidad and Tobago": "Trinidad y Tobago",
  "El Salvador": "El Salvador",
  Guatemala: "Guatemala",
  Suriname: "Surinam",

  // ── UEFA ──────────────────────────────────────────────────────────────────
  Austria: "Austria",
  Belgium: "Bélgica",
  "Bosnia-H.": "Bosnia y Herzegovina",
  "Bosnia and Herzegovina": "Bosnia y Herzegovina",
  Croatia: "Croacia",
  Czechia: "República Checa",
  "Czech Republic": "República Checa",
  England: "Inglaterra",
  France: "Francia",
  Germany: "Alemania",
  Netherlands: "Países Bajos",
  Norway: "Noruega",
  Portugal: "Portugal",
  Scotland: "Escocia",
  Spain: "España",
  Sweden: "Suecia",
  Switzerland: "Suiza",
  Turkey: "Turquía",
  Türkiye: "Turquía",
  Italy: "Italia",
  Denmark: "Dinamarca",
  Poland: "Polonia",
  Serbia: "Serbia",
  Wales: "Gales",
  Ukraine: "Ucrania",
  Hungary: "Hungría",
  Romania: "Rumanía",
  Greece: "Grecia",
  Slovakia: "Eslovaquia",
  Slovenia: "Eslovenia",
  Albania: "Albania",
  "Republic of Ireland": "Irlanda",
  Ireland: "Irlanda",
  Iceland: "Islandia",
  Finland: "Finlandia",
  Georgia: "Georgia",
  Montenegro: "Montenegro",
  "North Macedonia": "Macedonia del Norte",
  Kosovo: "Kosovo",
  "Northern Ireland": "Irlanda del Norte",

  // ── CAF ───────────────────────────────────────────────────────────────────
  Algeria: "Argelia",
  "Cape Verde": "Cabo Verde",
  "Congo DR": "Congo RD",
  "DR Congo": "Congo RD",
  Egypt: "Egipto",
  Ghana: "Ghana",
  "Ivory Coast": "Costa de Marfil",
  "Côte d'Ivoire": "Costa de Marfil",
  "Cote d'Ivoire": "Costa de Marfil",
  Morocco: "Marruecos",
  Senegal: "Senegal",
  "South Africa": "Sudáfrica",
  Tunisia: "Túnez",
  Nigeria: "Nigeria",
  Cameroon: "Camerún",
  Mali: "Malí",
  "Burkina Faso": "Burkina Faso",
  Angola: "Angola",
  Gabon: "Gabón",
  Zambia: "Zambia",
  Uganda: "Uganda",
  Benin: "Benín",

  // ── AFC ───────────────────────────────────────────────────────────────────
  Australia: "Australia",
  Iran: "Irán",
  Iraq: "Irak",
  Japan: "Japón",
  Jordan: "Jordania",
  "Korea Republic": "Corea del Sur",
  "South Korea": "Corea del Sur",
  Qatar: "Catar",
  "Saudi Arabia": "Arabia Saudita",
  Uzbekistan: "Uzbekistán",
  "United Arab Emirates": "Emiratos Árabes Unidos",
  "China PR": "China",
  China: "China",
  Oman: "Omán",
  Bahrain: "Baréin",

  // ── OFC ───────────────────────────────────────────────────────────────────
  "New Zealand": "Nueva Zelanda",
  "New Caledonia": "Nueva Caledonia",
  Fiji: "Fiyi",
  "Solomon Islands": "Islas Salomón",
}

/**
 * Devuelve el nombre en español del país dado, o el original si no hay
 * traducción disponible.
 *
 * @param nombre - Nombre en inglés tal como lo devuelve football-data.org
 */
export function traducirPais(nombre: string): string {
  return MAPA_ES[nombre] ?? nombre
}

/**
 * Lista de todos los nombres en español para un bloque de confederación.
 * Útil para generar un índice de búsqueda tolerante a variaciones.
 */
export function aliasEspanol(nombreOriginal: string): string | undefined {
  return MAPA_ES[nombreOriginal]
}
