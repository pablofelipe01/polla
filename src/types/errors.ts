// Jerarquía de errores del dominio. Nunca se lanzan strings ni `new Error()` genéricos.

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
  constructor() {
    super("No autorizado", "UNAUTHORIZED", 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(mensaje = "No tienes permiso para esta acción") {
    super(mensaje, "FORBIDDEN", 403)
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, "NOT_FOUND", 404)
  }
}

export class ValidationError extends AppError {
  constructor(
    mensaje: string,
    public readonly campos?: Record<string, string[]>
  ) {
    super(mensaje, "VALIDATION_ERROR", 400)
  }
}

export class ApiError extends AppError {
  constructor(status: number, detalle: string) {
    super(`Error de API externa: ${detalle}`, "API_ERROR", status)
  }
}
