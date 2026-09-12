export type ErrorCode =
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "INFRA_UNAVAILABLE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "IP_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNPROCESSABLE";

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string, statusCode: number) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function errorBody(code: string, message: string, requestId: string) {
  return { error: { code, message, request_id: requestId } };
}
export const unauthorized = (msg = "Authentication required.") => new ApiError("UNAUTHORIZED", msg, 401);
export const forbidden = (msg = "Forbidden.") => new ApiError("FORBIDDEN", msg, 403);
export const notFound = (msg = "Resource not found.") => new ApiError("NOT_FOUND", msg, 404);
export const validation = (msg = "Validation failed.") => new ApiError("VALIDATION_ERROR", msg, 422);
export const conflict = (msg = "Conflict.") => new ApiError("CONFLICT", msg, 409);
export const ipNotAllowed = () => new ApiError("IP_NOT_ALLOWED", "Request source is not allowed for this API key.", 403);
export const rateLimited = () => new ApiError("RATE_LIMITED", "Rate limit exceeded.", 429);
