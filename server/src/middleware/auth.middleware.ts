import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { HTTP_STATUS } from '../shared/constants/httpStatus';
import { MESSAGES } from '../shared/constants/messages';
import { sendError } from '../shared/utils/response';
import { AuthRepository } from '../modules/auth/auth.repository';

// Lowercase prefix used for case-insensitive comparison
const BEARER_PREFIX = 'bearer ';
const AUTH_HEADER = 'authorization';

/**
 * Extracts the raw JWT string from the Authorization header.
 * Comparison is case-insensitive; the token is sliced from the original header
 * to preserve the exact value that was sent.
 * Returns null if the header is absent or malformed.
 */
function extractToken(req: Request): string | null {
  const header = req.headers[AUTH_HEADER];
  if (typeof header !== 'string' || !header.toLowerCase().startsWith(BEARER_PREFIX)) {
    return null;
  }
  // Slice from the original (un-lowercased) header to preserve token casing
  return header.slice(BEARER_PREFIX.length).trim() || null;
}

/**
 * Express middleware that enforces JWT authentication on a route.
 * On success, attaches the decoded AuthUser payload to `req.user`.
 * Fetches fresh user data from database to get current clubId.
 * Returns a 401 error envelope when the token is missing or invalid.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    sendError(
      res,
      MESSAGES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      'MISSING_TOKEN',
    );
    return;
  }

  try {
    const raw: unknown = jwt.verify(token, config.JWT_SECRET);

    if (typeof raw !== 'object' || raw === null) {
      sendError(res, MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
      return;
    }

    const payload = raw as Record<string, unknown>;
    const { id, email, role, clubId } = payload;

    if (
      typeof id !== 'string' || !id ||
      typeof email !== 'string' || !email ||
      typeof role !== 'string' || !role
    ) {
      sendError(res, MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
      return;
    }

    // Fetch fresh user data from database to get current clubId
    const authRepo = new AuthRepository();
    const freshUser = await authRepo.findUserById(id);

    const finalClubId = freshUser?.clubId ?? (typeof clubId === 'string' ? clubId : null);
    console.log('[auth.middleware] JWT clubId:', clubId, 'DB clubId:', freshUser?.clubId, 'Final clubId:', finalClubId);

    req.user = {
      id,
      email,
      role,
      clubId: finalClubId?.toString() ?? null,
    };
    next();
  } catch {
    sendError(
      res,
      MESSAGES.UNAUTHORIZED,
      HTTP_STATUS.UNAUTHORIZED,
      'INVALID_TOKEN',
    );
  }
}
