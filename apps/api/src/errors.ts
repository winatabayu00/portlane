import { ResponseCode } from "./common/response-code.enum.js";

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

function codeToRc(code: string): ResponseCode {
  switch (code) {
    case "VALIDATION_ERROR":
    case "UNPROCESSABLE":
      return ResponseCode.VALIDATION_ERROR;
    case "NOT_FOUND":
      return ResponseCode.NOT_FOUND;
    case "CONFLICT":
      return ResponseCode.CONFLICT;
    case "UNAUTHORIZED":
    case "INVALID_CREDENTIALS":
      return ResponseCode.UNAUTHORIZED;
    case "FORBIDDEN":
    case "IP_NOT_ALLOWED":
      return ResponseCode.FORBIDDEN;
    case "RATE_LIMITED":
      return ResponseCode.RATE_LIMITED;
    case "INFRA_UNAVAILABLE":
      return ResponseCode.SERVICE_UNAVAILABLE;
    case "PROVIDER_ERROR":
      return ResponseCode.EXECUTION_FAILED;
    default:
      return ResponseCode.INTERNAL_ERROR;
  }
}

function codeToStatus(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "UNPROCESSABLE":
      return 422;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "UNAUTHORIZED":
    case "INVALID_CREDENTIALS":
      return 401;
    case "FORBIDDEN":
    case "IP_NOT_ALLOWED":
      return 403;
    case "RATE_LIMITED":
      return 429;
    case "INFRA_UNAVAILABLE":
      return 503;
    case "PROVIDER_ERROR":
      return 502;
    default:
      return 500;
  }
}

export function httpStatusToCode(status: number): ResponseCode {
  switch (status) {
    case 400:
      return ResponseCode.BAD_REQUEST;
    case 401:
      return ResponseCode.UNAUTHORIZED;
    case 403:
      return ResponseCode.FORBIDDEN;
    case 404:
      return ResponseCode.NOT_FOUND;
    case 409:
      return ResponseCode.CONFLICT;
    case 422:
      return ResponseCode.VALIDATION_ERROR;
    case 429:
      return ResponseCode.RATE_LIMITED;
    case 413:
      return ResponseCode.PAYLOAD_TOO_LARGE;
    case 500:
      return ResponseCode.INTERNAL_ERROR;
    case 503:
      return ResponseCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ResponseCode.INTERNAL_ERROR : ResponseCode.BAD_REQUEST;
  }
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly rc: ResponseCode;
  constructor(code: ErrorCode, message: string, statusCode: number, rc?: ResponseCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.rc = rc ?? codeToRc(code);
  }
}

export function errorBody(code: string, message: string, requestId: string) {
  const rc = codeToRc(code);
  const statusCode = codeToStatus(code);
  const ts = new Date().toISOString();
  return {
    rc,
    status: "failed" as const,
    message,
    data: null,
    errors: { code, message, statusCode, request_id: requestId },
    correlationId: requestId,
    timestamp: ts,
  };
}
export const unauthorized = (msg = "Authentication required.") => new ApiError("UNAUTHORIZED", msg, 401);
export const forbidden = (msg = "Forbidden.") => new ApiError("FORBIDDEN", msg, 403);
export const notFound = (msg = "Resource not found.") => new ApiError("NOT_FOUND", msg, 404);
export const validation = (msg = "Validation failed.") => new ApiError("VALIDATION_ERROR", msg, 422);
export const conflict = (msg = "Conflict.") => new ApiError("CONFLICT", msg, 409);
export const ipNotAllowed = () => new ApiError("IP_NOT_ALLOWED", "Request source is not allowed for this API key.", 403);
export const rateLimited = () => new ApiError("RATE_LIMITED", "Rate limit exceeded.", 429);
