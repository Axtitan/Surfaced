import "server-only";

export type ErrorCode =
  | "bad_request" | "invalid_input" | "unauthenticated" | "forbidden" | "not_found" | "conflict"
  | "payload_too_large" | "rate_limited" | "unavailable" | "internal";

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400, invalid_input: 400, unauthenticated: 401, forbidden: 403, not_found: 404, conflict: 409,
  payload_too_large: 413, rate_limited: 429, unavailable: 503, internal: 500,
};

/** An error whose message is safe to show the user. Anything else becomes a generic 500. */
export class AppError extends Error {
  readonly status: number;
  constructor(public readonly code: ErrorCode, public readonly safeMessage: string, public readonly details?: Record<string, unknown>, status?: number) {
    super(safeMessage);
    this.status = status ?? STATUS[code];
  }
}

export function errorResponse(e: AppError, requestId: string, headers: Record<string, string> = {}) {
  return Response.json(
    { error: { code: e.code, message: e.safeMessage, requestId, ...(e.details ? { details: e.details } : {}) } },
    { status: e.status, headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId, ...headers } },
  );
}
