import type { AppError } from "./errors"

// Resultado tipado para flujos esperados (validación, not found) sin usar excepciones.
export type Result<T, E extends AppError = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })
export const err = <E extends AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
})
