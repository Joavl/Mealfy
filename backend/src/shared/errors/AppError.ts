/**
 * Erro de domínio com status HTTP. Use para respostas controladas (4xx).
 * Erros não-AppError viram 500 no errorHandler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
