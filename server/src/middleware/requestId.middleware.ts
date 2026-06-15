import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generates a UUID v4 request identifier, attaches it to `req.requestId`,
 * and echoes it back in the `X-Request-ID` response header.
 * This enables end-to-end request tracing across logs and clients.
 */
export function requestId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = uuidv4();
  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
