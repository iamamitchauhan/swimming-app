/**
 * Base application error that carries an HTTP status code and a machine-readable
 * error code alongside the human-readable message.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a resource already exists (HTTP 409).
 *
 * @param message - Human-readable description of the conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Thrown when authentication is missing or invalid (HTTP 401).
 *
 * @param message - Human-readable description (defaults to 'Unauthorized')
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Thrown when the caller is authenticated but lacks permission (HTTP 403).
 *
 * @param message - Human-readable description (defaults to 'Forbidden')
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Thrown when a requested resource does not exist (HTTP 404).
 *
 * @param message - Human-readable description (defaults to 'Not found')
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Thrown when a request is semantically invalid (HTTP 400).
 *
 * @param message - Human-readable description
 * @param errorCode - Optional machine-readable code (defaults to 'BAD_REQUEST')
 */
export class BadRequestError extends AppError {
  constructor(message: string, errorCode: string = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

/**
 * Thrown when the caller has exceeded a rate limit or attempt threshold (HTTP 429).
 *
 * @param message - Human-readable description
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Thrown when the request is well-formed but cannot be processed due to business rule violation (HTTP 422).
 *
 * @param message - Human-readable description
 * @param errorCode - Optional machine-readable code
 */
export class UnprocessableError extends AppError {
  constructor(message: string, errorCode: string = 'UNPROCESSABLE') {
    super(message, 422, errorCode);
  }
}
