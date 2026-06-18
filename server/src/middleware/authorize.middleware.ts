import { Request, Response, NextFunction } from "express";
import { UserRole } from "../shared/constants/roles";
import { HTTP_STATUS } from "../shared/constants/httpStatus";
import { MESSAGES } from "../shared/constants/messages";
import { sendError } from "../shared/utils/response";

/**
 * RBAC middleware factory.
 * Returns a middleware that allows only the specified roles to proceed.
 * Must be used after the `authenticate` middleware.
 *
 * @param roles - One or more roles that are permitted
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, "MISSING_TOKEN");
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      sendError(res, MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, "INSUFFICIENT_ROLE");
      return;
    }

    next();
  };
}
