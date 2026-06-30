import { redirect } from "next/navigation"

/** Raíz interceptada por el proxy antes de llegar aquí. Fallback de seguridad. */
export default function HomePage() {
  redirect("/bienvenida")
}
