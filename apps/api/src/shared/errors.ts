export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR",
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, "VALIDATION_ERROR", details);
export const unauthorized = (message = "Authentication is required") =>
  new AppError(401, message, "UNAUTHENTICATED");
export const forbidden = (message = "You do not have permission for this action") =>
  new AppError(403, message, "FORBIDDEN");
export const notFound = (message = "The requested record was not found") =>
  new AppError(404, message, "NOT_FOUND");
export const conflict = (message: string) => new AppError(409, message, "CONFLICT");
