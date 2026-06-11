import { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../shared/constants/roles';
import { HTTP_STATUS } from '../shared/constants/httpStatus';
import { MESSAGES } from '../shared/constants/messages';
import { sendError } from '../shared/utils/response';

/**
 * Club isolation middleware.
 * Ensures that admin/coach users can only access resources that belong to their own club.
 * Reads the target clubId from `req.params.clubId`.
 * Super admins bypass this check entirely.
 *
 * Must be used after `authenticate`.
 */
export function clubIsolation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    sendError(res, MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, 'MISSING_TOKEN');
    return;
  }

  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    next();
    return;
  }

  const targetClubId = req.params['clubId'];

  console.log('[clubIsolation] user.clubId:', req.user.clubId, 'targetClubId:', targetClubId, 'user.role:', req.user.role);

  if (!targetClubId) {
    next();
    return;
  }

  if (!req.user.clubId || req.user.clubId !== targetClubId) {
    sendError(res, MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, 'CLUB_ACCESS_DENIED');
    return;
  }

  next();
}
