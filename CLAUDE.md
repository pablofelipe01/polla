@AGENTS.md
# CLAUDE.md

## Descripción del proyecto
Aplicación Next.js 16 con React 19, TypeScript 5 y TailwindCSS v4.

---

## Stack tecnológico
- **Framework**: Next.js 16.2.4 (App Router)
- **UI**: React 19 con Server Components por defecto
- **Lenguaje**: TypeScript 5 — modo estricto activado
- **Estilos**: TailwindCSS v4 (CSS-first, sin tailwind.config.js)
- **Gestor de paquetes**: pnpm

---

## A) Arquitectura de capas

El código sigue un flujo unidireccional estricto. Cada capa solo habla con la inmediatamente inferior — nunca salta capas.

```
UI (componentes)
    ↓
Server Actions / Route Handlers   ← único punto de entrada al servidor
    ↓
Servicios (lógica de negocio)     ← orquesta, valida, transforma
    ↓
Repositorios / Clientes externos  ← DB, APIs externas, filesystem
```

### Reglas de capas

**UI → nunca llama directo a servicios ni repositorios**
Los componentes solo llaman Server Actions o leen props/contexto.

**Server Actions → nunca contienen lógica de negocio**
Solo validan input (Zod), verifican sesión, llaman al servicio correspondiente y revalidan caché.

**Servicios → nunca saben de HTTP ni de Next.js**
No importan `next/cache`, no conocen `FormData`, no saben si vienen de un formulario o un cron. Son funciones puras de negocio.

**Repositorios/Clientes → nunca contienen lógica de negocio**
Solo hablan con la fuente de datos (DB, API externa) y devuelven tipos del dominio.

```typescript
// lib/services/pedidos.ts — SERVICIO (lógica de negocio, agnóstico al origen)
export async function procesarPedido(datos: DatosPedido): Promise<Pedido> {
  const total = calcularTotal(datos.items)
  if (total > LIMITE_PEDIDO) throw new LimiteSuperadoError(total)
  return await repositorioPedidos.crear({ ...datos, total })
}

// lib/actions/pedidos.ts — SERVER ACTION (entrada, sin lógica de negocio)
'use server'
export async function crearPedidoAction(formData: FormData) {
  const sesion = await obtenerSesion()
  if (!sesion) throw new UnauthorizedError()
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }
  return await procesarPedido(parsed.data)  // delega al servicio
}

// lib/clients/api-externa.ts — CLIENTE (sin lógica de negocio)
export async function fetchPedidosExternos(userId: string): Promise<Pedido[]> {
  const res = await fetch(`${API_URL}/pedidos?userId=${userId}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}
```

### Sin DB propia
Si el proyecto no tiene DB, la capa de repositorio se reemplaza por clientes de API externa.
La arquitectura de capas es idéntica — solo cambia el origen de los datos.

```
Servicio → Cliente API externa (lib/clients/)
```

---

## B) Manejo de errores estandarizado

### Tipos de error del dominio

Todos los errores del sistema heredan de una clase base. Nunca se lanzan strings ni `Error` genéricos.

```typescript
// types/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusHttp: number = 500
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class UnauthorizedError extends AppError {
  constructor() { super('No autorizado', 'UNAUTHORIZED', 401) }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) { super(`${recurso} no encontrado`, 'NOT_FOUND', 404) }
}

export class ValidationError extends AppError {
  constructor(public readonly campos: Record<string, string[]>) {
    super('Error de validación', 'VALIDATION_ERROR', 400)
  }
}

export class ApiError extends AppError {
  constructor(status: number, detalle: string) {
    super(`Error de API externa: ${detalle}`, 'API_ERROR', status)
  }
}

export class LimiteSuperadoError extends AppError {
  constructor(valor: number) {
    super(`Límite superado: ${valor}`, 'LIMIT_EXCEEDED', 422)
  }
}
```

### Resultado tipado — sin excepciones para flujos esperados

Para errores esperados (validación, not found) usa el patrón `Result` en lugar de `throw`.
Reserva `throw` para errores inesperados (fallo de red, bug interno).

```typescript
// types/result.ts
export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = <E extends AppError>(error: E): Result<never, E> => ({ ok: false, error })
```

```typescript
// Uso en servicio
export async function obtenerUsuario(id: string): Promise<Result<Usuario>> {
  const usuario = await clienteApi.get(`/usuarios/${id}`)
  if (!usuario) return err(new NotFoundError('Usuario'))
  return ok(usuario)
}

// Uso en Server Action
const resultado = await obtenerUsuario(id)
if (!resultado.ok) return { error: resultado.error.message }
return { data: resultado.data }
```

### Propagación de errores

```
Capa de cliente/repo  →  lanza AppError tipado
Capa de servicio      →  captura, enriquece si necesario, relanza o devuelve Result
Server Action         →  captura todo, nunca deja escapar errores al cliente sin sanitizar
UI                    →  consume Result o captura con error.tsx / ErrorBoundary
```

### Logging

```typescript
// lib/logger.ts — único punto de logging
export const logger = {
  error: (error: unknown, contexto?: Record<string, unknown>) => {
    // En producción: enviar a servicio de logging (Sentry, Axiom, etc.)
    // En desarrollo: console.error con contexto
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR]', error, contexto)
    }
    // TODO: integrar servicio de logging en producción
  },
  warn: (mensaje: string, contexto?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WARN]', mensaje, contexto)
    }
  },
}
```

- Nunca uses `console.log/error` directo — siempre `logger.*`
- Loguea en el Server Action o en el límite más externo, no en cada capa
- No loguees datos sensibles (tokens, contraseñas, datos personales)

---

## C) Convenciones de estado

### Dónde vive cada tipo de estado

| Tipo de estado | Dónde | Ejemplo |
|---|---|---|
| Estado del servidor | Server Components + caché de Next.js | Lista de productos, perfil de usuario |
| Estado de URL | `useSearchParams` / `useRouter` | Filtros, paginación, tabs activos |
| Estado local de UI | `useState` | Modal abierto, input controlado |
| Estado global de UI | Zustand (si se necesita) | Tema, preferencias, carrito temporal |
| Estado de formulario | React 19 form actions + `useActionState` | Envío de formularios |
| Estado de servidor en cliente | `use()` + Suspense | Datos async en Client Components |

### Reglas de estado

**Servidor primero** — si un dato viene del servidor y no cambia por interacción del usuario, vive en un Server Component. No lo copies a `useState`.

**URL para estado compartible** — si el usuario puede compartir la URL y espera ver el mismo resultado, el estado va en la URL (`?pagina=2&filtro=activo`), no en `useState`.

**`useState` solo para UI efímera** — estado que no importa si se pierde al recargar: tooltip abierto, tab seleccionado, valor de input antes de enviar.

**Zustand solo si el estado cruza múltiples rutas** — no uses estado global para algo que vive en una sola página. Si el estado es local, `useState`. Si viaja entre rutas sin URL, Zustand.

**Sin prop drilling más de 2 niveles** — si pasas una prop más de 2 componentes hacia abajo, usa Context o mueve el estado al servidor.

```typescript
// Estado de formulario con React 19
'use client'
import { useActionState } from 'react'
import { crearPedidoAction } from '@/lib/actions/pedidos'

export function FormularioPedido() {
  const [estado, accion, pendiente] = useActionState(crearPedidoAction, null)

  return (
    <form action={accion}>
      {estado?.error && <p role="alert">{estado.error}</p>}
      <input name="producto" required />
      <button disabled={pendiente}>
        {pendiente ? 'Enviando...' : 'Crear pedido'}
      </button>
    </form>
  )
}
```

```typescript
// Estado de URL para filtros
'use client'
import { useSearchParams, useRouter } from 'next/navigation'

export function FiltroEstado() {
  const params = useSearchParams()
  const router = useRouter()

  const cambiarFiltro = (valor: string) => {
    const nuevosParams = new URLSearchParams(params)
    nuevosParams.set('estado', valor)
    router.push(`?${nuevosParams}`)  // sharable, navegable con back/forward
  }

  return <select onChange={e => cambiarFiltro(e.target.value)} />
}
```

---

## Principios de calidad — NO negociables

### Seguridad
- Valida SIEMPRE los datos externos con Zod antes de usarlos
- Verifica sesión y permisos al inicio de cada Server Action
- Nunca expongas al cliente: tokens, claves API, datos de otros usuarios
- Usa `HttpOnly` + `Secure` + `SameSite=Lax` en cookies de sesión
- Secretos en variables de entorno sin prefijo `NEXT_PUBLIC_`

### Código limpio
- Una función = una responsabilidad
- Nombres que expresan intención: `calcularTotalConImpuestos()` no `calc()`
- Componentes de máximo 150 líneas — si supera, descompón
- Extrae lógica duplicada en cuanto aparece por segunda vez
- Comenta el *por qué*, nunca el *qué*

### Sin código basura
- Sin `console.log` — usa `logger.*`
- Sin imports ni variables sin usar
- Sin `any` sin justificación
- Sin lógica comentada — para eso existe git
- Sin `TODO` sin issue asociado

### Eficiencia
- Fetches independientes siempre con `Promise.all()`
- `React.memo` / `useMemo` / `useCallback` solo con problema medido
- Cachea con `revalidateTag` / `unstable_cache`

### Documentación
- JSDoc en todas las funciones exportadas
- Tipos complejos con comentario de por qué existen
- Server Actions documentan: qué valida, qué muta, qué revalida

---

## Auto-corrección obligatoria

El agente ejecuta esto antes de entregar cualquier código:

| Verificación | Acción |
|---|---|
| Imports / variables sin usar | Eliminar |
| `any` sin justificación | Reemplazar con tipo correcto |
| `console.*` de depuración | Reemplazar con `logger.*` |
| Lógica duplicada (≥2 veces) | Extraer a función |
| Componente > 150 líneas | Descomponer |
| Función exportada sin JSDoc | Añadir JSDoc |
| Fetches en cascada sin dependencia | Convertir a `Promise.all` |
| Input externo sin Zod | Añadir schema |
| Server Action sin verificación de sesión | Añadir guard |
| Error lanzado como string o `Error` genérico | Reemplazar con `AppError` tipado |
| Estado en `useState` que debería estar en URL | Mover a `useSearchParams` |
| Capa que salta otra capa | Refactorizar respetando el flujo |

---

## Eficiencia de contexto (tokens)

- Si un patrón ya fue mostrado, referencia dónde existe — no lo repitas completo
- Para cambios pequeños, muestra solo el diff, no el archivo completo
- Agrupa cambios relacionados en un bloque cohesivo
- Usa `// mismo patrón que lib/actions/usuarios.ts` en lugar de copiar código idéntico

---

## Convenciones de código

### TypeScript
- `type` sobre `interface` salvo declaration merging
- `unknown` + type guards en lugar de `any`
- Tipos de retorno explícitos en funciones exportadas
- `satisfies` para literales con tipado seguro

### React & Next.js
- Server Components por defecto — `'use client'` solo cuando sea necesario
- `async/await` en Server Components — sin `useEffect` para fetching
- `<Image>`, `<Link>`, `<Script>` de Next.js — nunca los HTML puros
- `generateMetadata()` para metadata — sin `<Head>`

### TailwindCSS v4
- Config en `app/globals.css` con `@theme {}` — sin `tailwind.config.js`
- Clases utilitarias directas — sin `@apply` salvo resets base
- Mobile-first: `sm:`, `md:`, `lg:`

### Nombres de archivos
- Componentes: `PascalCase.tsx`
- Hooks/utilidades: `camelCase.ts`
- Rutas: `kebab-case/`
- Tests: `*.test.ts` junto al archivo fuente

---

## Estructura del proyecto
```
app/
  (auth)/
  (dashboard)/
  _components/
  globals.css
  layout.tsx
  page.tsx
components/
lib/
  actions/        # Server Actions — entrada al servidor
  services/       # Lógica de negocio
  clients/        # Clientes de APIs externas
  db/             # Repositorios (si hay DB)
  utils/          # Funciones utilitarias puras
  logger.ts       # Único punto de logging
types/
  errors.ts       # AppError y subclases
  result.ts       # Tipo Result<T>
public/
```

---

## Variables de entorno
- Servidor: sin prefijo `NEXT_PUBLIC_`
- Cliente: prefijo `NEXT_PUBLIC_` obligatorio
- Nunca commit de `.env.local`

---

## Comandos
```bash
pnpm dev          # Desarrollo (Turbopack)
pnpm build        # Producción
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit
pnpm test         # Vitest
pnpm test:e2e     # Playwright
```

---

## Testing
- Unitarios/integración: Vitest + React Testing Library
- E2E: Playwright
- Testea servicios y utils directamente — sin mockear lo que no es externo
- Cada Server Action: test de caso feliz, error de validación y no autorizado
