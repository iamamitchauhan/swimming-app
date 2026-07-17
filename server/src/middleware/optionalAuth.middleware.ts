import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { AuthRepository } from "../modules/auth/auth.repository";

const BEARER_PREFIX = "bearer ";
const AUTH_HEADER = "authorization";

function extractToken(req: Request): string | null {
  const header = req.headers[AUTH_HEADER];
  if (typeof header !== "string" || !header.toLowerCase().startsWith(BEARER_PREFIX)) {
    return null;
  }
  return header.slice(BEARER_PREFIX.length).trim() || null;
}

/**
 * Optional authentication middleware.
 * If a valid Bearer token is present, sets req.user with the decoded payload.
 * If no token or invalid token, silently continues without setting req.user.
 * Used on public endpoints to optionally identify the requester (e.g. test users).
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const raw: unknown = jwt.verify(token, config.JWT_SECRET);

    if (typeof raw !== "object" || raw === null) {
      next();
      return;
    }

    const payload = raw as Record<string, unknown>;
    const { id, email, role, clubId } = payload;

    if (typeof id !== "string" || !id || typeof email !== "string" || !email || typeof role !== "string" || !role) {
      next();
      return;
    }

    const authRepo = new AuthRepository();
    const freshUser = await authRepo.findUserById(id);

    const finalClubId = freshUser?.clubId ?? (typeof clubId === "string" ? clubId : null);

    req.user = {
      id,
      email,
      role,
      clubId: finalClubId?.toString() ?? null,
    };

    next();
  } catch {
    next();
  }
}
