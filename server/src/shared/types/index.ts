/** Represents the authenticated user attached to every protected request. */
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  clubId: string | null;
}

/** Cursor-based pagination parameters accepted by list endpoints. */
export interface PaginationQuery {
  cursor?: string;
  limit?: number;
}

/** Standard wrapper returned by all paginated list endpoints. */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Standard JSON envelope for all API responses. */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: {
    code: string;
    details?: unknown;
  } | null;
}

// Augment express-serve-static-core (the canonical source of the Request interface)
// so that middleware-set fields are type-safe throughout the application.
declare module "express-serve-static-core" {
  interface Request {
    user?: import("./index").AuthUser;
    requestId?: string;
    /** Request-scoped child logger pre-bound with request id, method, path, user. */
    log?: import("pino").Logger;
    /** High-resolution timestamp (process.hrtime.bigint) set at request start. */
    startedAt?: bigint;
    /**
     * Logs a narrative beat for the current request at `info` level with
     * `step_ms` = milliseconds since request start. Set by requestLogger middleware.
     */
    step?: (msg: string, data?: Record<string, unknown>) => void;
  }
}
