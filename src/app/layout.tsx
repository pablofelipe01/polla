import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Bebas_Neue } from "next/font/google"
import "./globals.css"
import { FeedbackProvider } from "./_components/Feedback"

const barlowCondensed = Barlow_Condensed({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pronósticos Guaicaramo · Mundial 2026",
  description:
    "Competencia de pronósticos mundialistas por continentes y equipos. Ranking, resultados y registro de pronósticos.",
}

/** Garantiza que móviles iOS/Android rendericen al ancho real del dispositivo. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${barlowCondensed.variable} ${bebasNeue.variable}`}>
      <body className="antialiased">
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  )
}
