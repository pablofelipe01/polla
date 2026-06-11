const paises = [
  { nombre: "Argentina", bandera: "🇦🇷" },
  { nombre: "Brasil", bandera: "🇧🇷" },
  { nombre: "Colombia", bandera: "🇨🇴" },
  { nombre: "España", bandera: "🇪🇸" },
  { nombre: "Francia", bandera: "🇫🇷" },
  { nombre: "Alemania", bandera: "🇩🇪" },
  { nombre: "Inglaterra", bandera: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { nombre: "Italia", bandera: "🇮🇹" },
  { nombre: "Portugal", bandera: "🇵🇹" },
  { nombre: "Países Bajos", bandera: "🇳🇱" },
  { nombre: "Uruguay", bandera: "🇺🇾" },
  { nombre: "México", bandera: "🇲🇽" },
  { nombre: "Estados Unidos", bandera: "🇺🇸" },
  { nombre: "Croacia", bandera: "🇭🇷" },
  { nombre: "Bélgica", bandera: "🇧🇪" },
  { nombre: "Japón", bandera: "🇯🇵" },
  { nombre: "Corea del Sur", bandera: "🇰🇷" },
  { nombre: "Marruecos", bandera: "🇲🇦" },
  { nombre: "Senegal", bandera: "🇸🇳" },
  { nombre: "Canadá", bandera: "🇨🇦" },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-fuchsia-600 via-orange-500 to-yellow-400 px-6 py-16">
      {/* Burbujas decorativas */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-pink-400/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-400/40 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-40 w-40 rounded-full bg-lime-300/40 blur-2xl" />

      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 rounded-3xl bg-white/20 p-8 text-center shadow-2xl ring-1 ring-white/40 backdrop-blur-md sm:p-12">
        <span className="animate-bounce text-6xl drop-shadow-lg sm:text-7xl">⚽️🏆</span>

        <h1 className="bg-gradient-to-r from-yellow-200 via-white to-cyan-100 bg-clip-text text-4xl font-black uppercase leading-tight tracking-tight text-transparent drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:text-6xl">
          ¡Bienvenidos a la Polla Mundialista de Guaicaramo!
        </h1>

        <p className="max-w-xl text-lg font-medium text-white/95 drop-shadow sm:text-xl">
          Pronostica, compite y vive la pasión del mundial con tu equipo. ¡Que
          gane el mejor! 🎉
        </p>

        {/* Banderas */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {paises.map((pais) => (
            <div
              key={pais.nombre}
              title={pais.nombre}
              className="flex flex-col items-center gap-1 rounded-2xl bg-white/30 px-3 py-2 text-center shadow-md ring-1 ring-white/40 transition-transform duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-white/50"
            >
              <span className="text-4xl sm:text-5xl">{pais.bandera}</span>
              <span className="text-xs font-semibold text-white drop-shadow sm:text-sm">
                {pais.nombre}
              </span>
            </div>
          ))}
        </div>

        <button className="mt-2 rounded-full bg-white px-8 py-3 text-lg font-bold text-fuchsia-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-yellow-200 hover:text-fuchsia-700 active:scale-95">
          ¡Quiero participar! 🚀
        </button>
      </section>

      <footer className="relative z-10 mt-10 text-sm font-medium text-white/90 drop-shadow">
        Polla Mundialista de Guaicaramo · Hecha con ❤️
      </footer>
    </main>
  );
}
