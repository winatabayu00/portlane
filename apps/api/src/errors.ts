export type ErrorCode =
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "INFRA_UNAVAILABLE"
  | "NOT_FOUND";

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
