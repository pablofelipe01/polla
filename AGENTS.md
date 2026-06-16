# AGENTS.md

## Resumen del proyecto
Aplicación web con Next.js 16 (App Router), React 19, TypeScript 5 y TailwindCSS v4.
Este documento define convenciones, arquitectura y reglas de comportamiento para agentes de IA.

---

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js | 16.2.4 |
| UI | React | 19 |
| Lenguaje | TypeScript | 5 (strict) |
| Estilos | TailwindCSS | v4 |
| Paquetes | pnpm | latest |
| Runtime | Node.js | 22+ |

---

## A) Arquitectura de capas

Flujo unidireccional estricto. Cada capa habla solo con la inmediatamente inferior. Nunca se saltan capas.

```
UI (componentes React)
        ↓
Server Actions / Route Handlers   ← único punto de entrada al servidor
        ↓
Servicios (lib/services/)         ← lógica de negocio, agnóstica al origen
        ↓
Clientes / Repositorios           ← APIs externas (lib/clients/) o DB (lib/db/)
```

### Responsabilidades por capa

**UI** — renderiza, captura eventos, consume Server Actions. Sin lógica de negocio.

**Server Actions** — validan input con Zod, verifican sesión, delegan al servicio, revalidan caché. Sin lógica de negocio.

**Servicios** — orquestan lógica de negocio. No importan nada de Next.js (`next/cache`, `FormData`, headers). Son funciones puras testeables.

**Clientes/Repositorios** — hablan con la fuente de datos. Sin lógica de negocio. Lanzan `AppError` tipados si falla la comunicación.

### Sin DB propia
Si el proyecto no tiene base de datos, la capa de repositorio no existe. Los servicios hablan con `lib/clients/` (APIs externas). La arquitectura es idéntica.

```typescript
// CON DB:    Servicio → lib/db/repositorio.ts → Prisma/ORM
// SIN DB:    Servicio → lib/clients/api-externa.ts → fetch
```

### Ejemplo de flujo completo

```typescript
// lib/clients/productos.ts — CLIENTE (sin lógica de negocio)
export async function fetchProductos(filtro: string): Promise<Producto[]> {
  const res = await fetch(`${API_URL}/productos?q=${filtro}`)
  if (!res.ok) throw new ApiError(res.status, await res.text())
  return res.json()
}

// lib/services/productos.ts — SERVICIO (lógica de negocio)
export async function buscarProductosDisponibles(
  filtro: string
): Promise<Result<Producto[]>> {
  const productos = await fetchProductos(filtro)
  const disponibles = productos.filter(p => p.stock > 0)
  if (disponibles.length === 0) return err(new NotFoundError('Productos'))
  return ok(disponibles)
}

// lib/actions/productos.ts — SERVER ACTION (entrada)
'use server'
export async function buscarAction(formData: FormData) {
  const sesion = await obtenerSesion()
  if (!sesion) throw new UnauthorizedError()
  const filtro = formData.get('q')?.toString() ?? ''
  return await buscarProductosDisponibles(filtro)
}
```

---

## B) Manejo de errores estandarizado

### Jerarquía de errores

Todos los errores heredan de `AppError`. Nunca se lanzan strings ni `new Error()` genéricos.

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

// Subclases estándar del proyecto
export class UnauthorizedError extends AppError {
  constructor() { super('No autorizado', 'UNAUTHORIZED', 401) }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(public readonly campos: Record<string, string[]>) {
    super('Error de validación', 'VALIDATION_ERROR', 400)
  }
}

export class ApiError extends AppError {
  constructor(status: number, detalle: string) {
    super(`Error de API: ${detalle}`, 'API_ERROR', status)
  }
}
```

### Patrón Result — errores esperados sin excepciones

`throw` se reserva para errores inesperados (bug, fallo de red no recuperable).
Para errores del flujo normal (not found, validación), usa `Result<T>`.

```typescript
// types/result.ts
export type Result<T, E extends AppError = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = <E extends AppError>(error: E): Result<never, E> => ({ ok: false, error })
```

### Propagación por capas

```
Cliente/Repo   →  lanza AppError tipado si falla la comunicación
Servicio       →  captura, enriquece si necesario, devuelve Result<T>
Server Action  →  captura todo, serializa para el cliente, nunca expone stack traces
UI             →  consume Result o captura con error.tsx / ErrorBoundary
```

### Logging centralizado

```typescript
// lib/logger.ts — único punto de logging en todo el proyecto
export const logger = {
  error: (error: unknown, contexto?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR]', error, contexto)
    }
    // Producción: enviar a Sentry, Axiom, Logtail, etc.
  },
  warn: (mensaje: string, contexto?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WARN]', mensaje, contexto)
    }
  },
}
```

**Reglas de logging:**
- Nunca uses `console.*` directo — siempre `logger.*`
- Loguea en el límite más externo (Server Action), no en cada capa intermedia
- Nunca loguees datos sensibles: tokens, contraseñas, datos personales

---

## C) Convenciones de estado

### Mapa de estado

| Tipo | Dónde | Cuándo usarlo |
|------|-------|---------------|
| Datos del servidor | Server Components + caché Next.js | Datos que vienen de API/DB y no cambian por interacción |
| Estado de URL | `useSearchParams` / `useRouter` | Filtros, paginación, tabs — estado compartible por URL |
| Estado local UI | `useState` | Modal abierto, valor de input antes de enviar |
| Estado global UI | Zustand | Estado que cruza múltiples rutas sin pasar por URL |
| Estado de formulario | `useActionState` + form actions | Envío de formularios, errores de validación |
| Datos async en cliente | `use()` + Suspense | Promesas en Client Components |

### Reglas de estado — en orden de preferencia

**1. Servidor primero** — si el dato viene del servidor y no cambia por interacción del usuario, vive en un Server Component. No lo copies a `useState`.

**2. URL para estado compartible** — si el usuario puede compartir la URL y espera ver el mismo resultado, el estado va en la URL. No en `useState`.

**3. `useState` para UI efímera** — estado que no importa si se pierde al recargar: dropdown abierto, tab activo local, valor de campo antes de enviar.

**4. Zustand solo si cruza rutas** — si el estado necesita persistir mientras el usuario navega entre rutas y no puede ir en la URL, Zustand. No lo uses para estado local de una sola página.

**5. Sin prop drilling > 2 niveles** — si una prop pasa por más de 2 componentes, mueve el estado al servidor o usa Context / Zustand.

### Ejemplos

```typescript
// Estado de formulario — React 19 useActionState
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
// Estado de URL para filtros compartibles
'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function FiltroEstado() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const cambiarFiltro = (valor: string) => {
    const nuevos = new URLSearchParams(params)
    nuevos.set('estado', valor)
    router.push(`${pathname}?${nuevos}`)
  }

  return (
    <select
      value={params.get('estado') ?? 'todos'}
      onChange={e => cambiarFiltro(e.target.value)}
    >
      <option value="todos">Todos</option>
      <option value="activo">Activo</option>
    </select>
  )
}
```

---

## Mandatos de calidad de código

Obligatorios. El agente los aplica sin que el usuario los pida.

### Seguridad
- Zod en toda entrada externa (formularios, params, env vars, respuestas de APIs)
- Verificación de sesión al inicio de cada Server Action antes de cualquier operación
- Nunca exponer al cliente: tokens, claves API, datos de otros usuarios, IDs internos
- Secretos en variables de entorno sin prefijo `NEXT_PUBLIC_`
- `HttpOnly` + `Secure` + `SameSite=Lax` en cookies de sesión

### Calidad
- Una función = una responsabilidad. Si hace dos cosas, divídela
- Nombres con intención: `calcularTotalConImpuestos()` no `calc()`
- Componentes ≤ 150 líneas — si supera, descompón antes de entregar
- Extrae lógica duplicada en cuanto aparece por segunda vez
- Comenta el *por qué*, nunca el *qué*

### Sin basura
- Sin `console.*` — usa `logger.*`
- Sin imports ni variables sin usar
- Sin `any` sin justificación documentada
- Sin lógica comentada — para eso existe git
- Sin `TODO` sin issue asociado

### Eficiencia
- Fetches independientes siempre con `Promise.all()`
- `React.memo` / `useMemo` / `useCallback` solo con problema medido
- `revalidateTag` / `unstable_cache` para evitar refetches innecesarios

### Documentación
```typescript
/**
 * Busca productos disponibles aplicando el filtro recibido.
 * Funciona con o sin DB — consume lib/clients/productos.ts.
 *
 * @param filtro - Texto de búsqueda (puede ser vacío para traer todos)
 * @returns Result con lista filtrada o NotFoundError si no hay resultados
 */
export async function buscarProductosDisponibles(
  filtro: string
): Promise<Result<Producto[]>> { ... }
```

---

## Auto-corrección obligatoria

El agente ejecuta esta lista antes de entregar cualquier código. Si algún punto falla, lo corrige sin avisar:

| Verificación | Acción |
|---|---|
| Imports / variables sin usar | Eliminar |
| `any` sin justificación | Reemplazar con tipo correcto |
| `console.*` de depuración | Reemplazar con `logger.*` |
| Lógica duplicada (≥ 2 apariciones) | Extraer a función |
| Componente > 150 líneas | Descomponer |
| Función exportada sin JSDoc | Añadir JSDoc |
| Fetches en cascada sin dependencia | Convertir a `Promise.all` |
| Input externo sin Zod | Añadir schema de validación |
| Server Action sin verificación de sesión | Añadir guard al inicio |
| `new Error()` genérico | Reemplazar con `AppError` tipado |
| Estado en `useState` que debería estar en URL | Mover a `useSearchParams` |
| Capa que salta otra capa | Refactorizar respetando el flujo |
| `console.log` en lugar de `logger.*` | Reemplazar |

---

## Eficiencia de contexto (tokens)

- Si un patrón fue mostrado antes en la conversación, referencia dónde existe — no lo repitas
- Para cambios pequeños, muestra solo el diff, no el archivo completo
- Agrupa cambios relacionados en un bloque cohesivo
- Usa `// mismo patrón que lib/actions/usuarios.ts` en lugar de copiar código idéntico
- No incluyas imports obvios en ejemplos si no aportan información nueva

---

## Convenciones de código

### TypeScript
- `type` sobre `interface` salvo declaration merging
- `unknown` + type guards en lugar de `any`
- Tipos de retorno explícitos en funciones exportadas
- `satisfies` para literales con tipado seguro

### React 19
- `use()` para desenvolver promesas en Client Components
- Form actions + `useActionState` para formularios
- Sin `forwardRef` (ref es prop directa), sin `React.FC`

### Next.js 16
- `next/image`, `next/link`, `next/font` siempre
- `generateMetadata()` para metadata
- `revalidatePath()` / `revalidateTag()` sobre recargas completas

### TailwindCSS v4
- Config en `app/globals.css` con `@theme {}` — sin `tailwind.config.js`
- Clases utilitarias directas — sin `@apply` salvo resets base
- Mobile-first: `sm:`, `md:`, `lg:`

---

## Convenciones de nombres

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Componente | PascalCase | `TarjetaProducto.tsx` |
| Hook | camelCase + `use` | `useAuth.ts` |
| Server Action | camelCase + `Action` | `crearPedidoAction.ts` |
| Servicio | camelCase | `procesarPedido.ts` |
| Cliente externo | camelCase | `clienteProductos.ts` |
| Utilidad | camelCase | `formatearFecha.ts` |
| Ruta | kebab-case | `perfil-usuario/` |
| Tipos | camelCase | `pedido.types.ts` |
| Test | mismo nombre + `.test` | `TarjetaProducto.test.tsx` |

---

## Estructura del proyecto
```
app/
  (grupo)/
    page.tsx
    layout.tsx
    loading.tsx
    error.tsx
    _components/
  globals.css
  layout.tsx
components/
lib/
  actions/          # Server Actions (entrada al servidor)
  services/         # Lógica de negocio
  clients/          # APIs externas
  db/               # Repositorios (solo si hay DB)
  utils/            # Funciones puras
  logger.ts         # Logging centralizado
types/
  errors.ts         # AppError y subclases
  result.ts         # Result<T>
public/
```

---

## Variables de entorno
```bash
# Solo servidor
DATABASE_URL=
AUTH_SECRET=
API_EXTERNA_URL=
API_EXTERNA_KEY=

# Cliente
NEXT_PUBLIC_APP_URL=
```

---

## Comandos
```bash
pnpm dev           # Desarrollo (Turbopack)
pnpm build         # Producción
pnpm lint          # ESLint
pnpm type-check    # tsc --noEmit
pnpm test          # Vitest
pnpm test:e2e      # Playwright
```

---

## Guía de comportamiento del agente

1. **Revisa la lista de auto-corrección** antes de entregar — corrígela sin avisar
2. **Identifica la capa correcta** — ¿UI, Action, Servicio o Cliente?
3. **Usa `Result<T>`** para errores esperados, `throw AppError` para inesperados
4. **Elige el lugar correcto para el estado** según el mapa de estado de la sección C
5. **No repitas contexto** — referencia, no copies
6. **Señala trade-offs** brevemente si una decisión afecta rendimiento o seguridad
7. **Sin DB no cambia nada** — `lib/clients/` reemplaza a `lib/db/`, el resto es idéntico
