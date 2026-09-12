import { ResponseCode, RESPONSE_MESSAGES } from "./response-code.enum.js";

export interface ApiResponse<T = unknown> {
  rc: number;
  status: "success" | "failed";
  message: string;
  data: T | null;
  errors: unknown | null;
  correlationId: string;
  timestamp: string;
  meta?: Record<string, unknown> | null;
}

export function success<T>(data: T, correlationId: string, code = ResponseCode.OK, message?: string, meta?: Record<string, unknown> | null): ApiResponse<T> {
  return {
    rc: code,
    status: "success",
    message: message ?? RESPONSE_MESSAGES[code],
    data,
    errors: null,
    correlationId,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };
}

export function failure(code: ResponseCode, err: unknown, correlationId: string, message?: string): ApiResponse<null> {
  const msg = message ?? RESPONSE_MESSAGES[code] ?? "Error";
  const errors = err && typeof err === "object" ? err : { message: String(err ?? msg) };
  return {
    rc: code,
    status: "failed",
    message: msg,
    data: null,
    errors,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}
