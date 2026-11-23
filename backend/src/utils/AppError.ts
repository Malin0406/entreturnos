export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static notFound(resource = 'Recurso') {
    return new AppError(`${resource} não encontrado(a).`, 404);
  }

  static unauthorized(message = 'Não autorizado.') {
    return new AppError(message, 401);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(message, 409, details);
  }
}
