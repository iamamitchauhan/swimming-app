import { Response } from 'express';
import { HTTP_STATUS, HttpStatusCode } from '../constants/httpStatus';
import { MESSAGES } from '../constants/messages';

/**
 * Sends a successful JSON response with a standard envelope.
 *
 * @param res - Express Response object
 * @param data - Payload to include in the `data` field
 * @param message - Human-readable message (defaults to MESSAGES.SUCCESS)
 * @param statusCode - HTTP status code (defaults to HTTP_STATUS.OK)
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = MESSAGES.SUCCESS,
  statusCode: HttpStatusCode = HTTP_STATUS.OK,
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
}

/**
 * Sends an error JSON response with a standard envelope.
 *
 * @param res - Express Response object
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (defaults to HTTP_STATUS.INTERNAL_SERVER_ERROR)
 * @param errorCode - Machine-readable error code string
 * @param details - Optional extra diagnostic details (omitted in production callers)
 */
export function sendError(
  res: Response,
  message: string = MESSAGES.INTERNAL_ERROR,
  statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errorCode: string = 'INTERNAL_ERROR',
  details?: unknown,
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error: {
      code: errorCode,
      ...(details !== undefined && { details }),
    },
  });
}
