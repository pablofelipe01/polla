import type { Metadata } from "next"
import { Inter, Anton } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
})

const anton = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pronosico Mundialista 2026 · Guaicaramo",
  description:
    "Pronostica el marcador exacto de los partidos de Colombia en el Mundial 2026 junto a Guaicaramo.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${anton.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
