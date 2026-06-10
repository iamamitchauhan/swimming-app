import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config/env';
import { HTTP_STATUS, HttpStatusCode } from '../shared/constants/httpStatus';
import { MESSAGES } from '../shared/constants/messages';
import { sendError } from '../shared/utils/response';
import logger from '../shared/utils/logger';
import { AppError } from '../shared/errors/domain.errors';

/** Maps known error types to their HTTP status and error code. */
function resolveErrorShape(err: unknown): {
  status: HttpStatusCode;
  message: string;
  code: string;
  details?: unknown;
} {
  if (err instanceof AppError) {
    return {
      status: err.statusCode as HttpStatusCode,
      message: err.message,
      code: err.errorCode,
    };
  }

  // MongoDB duplicate-key error (code 11000)
  if ((err as { code?: number }).code === 11000) {
    return {
      status: HTTP_STATUS.CONFLICT,
      message: MESSAGES.CONFLICT,
      code: 'CONFLICT',
    };
  }

  if (err instanceof ZodError) {
    return {
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: MESSAGES.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR',
      details:
        config.NODE_ENV !== 'production' ? err.flatten() : undefined,
    };
  }

  if (err instanceof TokenExpiredError) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED,
      code: 'TOKEN_EXPIRED',
    };
  }

  if (err instanceof JsonWebTokenError) {
    return {
      status: HTTP_STATUS.UNAUTHORIZED,
      message: MESSAGES.UNAUTHORIZED,
      code: 'INVALID_TOKEN',
    };
  }

  return {
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: MESSAGES.INTERNAL_ERROR,
    code: 'INTERNAL_ERROR',
  };
}

/**
 * Express global error-handling middleware (four-parameter signature).
 * Maps known error types to appropriate HTTP responses, logs the error with
 * the request ID for tracing, and never leaks stack traces in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, message, code, details } = resolveErrorShape(err);

  logger.error(
    {
      err,
      request_id: req.requestId,
      method: req.method,
      url: req.url,
      status,
    },
    'Request error',
  );

  const safeDetails =
    config.NODE_ENV !== 'production' ? details : undefined;

  sendError(res, message, status, code, safeDetails);
}
