import { Request, Response, NextFunction } from 'express';
import { ClaimsService } from './claims.service';
import {
  createClaimSchema,
  updateClaimSchema,
  listClaimsSchema,
  updateStatusSchema,
  claimParamsSchema,
} from './claims.validation';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { UnauthorizedError } from '../../shared/errors/domain.errors';

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Handles HTTP layer for claims endpoints.
 * Validates input, extracts user context, delegates to ClaimsService, and shapes responses.
 * Contains no business logic.
 */
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  /**
   * Handles GET /claims — returns a paginated list of claims for the authenticated firm.
   *
   * @param req - Express request (query: ListClaimsQuery)
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const query = listClaimsSchema.parse(req.query);
      const { state, status, assignedTo, search, cursor, limit } = query;

      const result = await this.service.listClaims(
        req.user.clubId ?? '',
        { state, status, assignedTo, search },
        { cursor, limit },
      );

      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles GET /claims/:id — returns a single claim scoped to the authenticated firm.
   *
   * @param req - Express request (params: { id: string })
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const { id } = claimParamsSchema.parse(req.params);
      const claim = await this.service.getClaim(id, req.user.clubId ?? '');
      sendSuccess(res, claim, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles POST /claims — creates a new claim for the authenticated firm.
   *
   * @param req - Express request (body: CreateClaimBody)
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const body = createClaimSchema.parse(req.body);

      const claim = await this.service.createClaim(
        {
          state: body.state,
          firmId: req.user.clubId ?? '',
          claimant: {
            name: body.claimant.name,
            dateOfBirth:
              body.claimant.dateOfBirth !== undefined
                ? new Date(body.claimant.dateOfBirth)
                : undefined,
            phone: body.claimant.phone,
            email: body.claimant.email,
          },
          dateOfAccident: new Date(body.dateOfAccident),
          insurer: body.insurer,
          assignedTo: body.assignedTo,
        },
        req.user.id,
      );

      sendSuccess(res, claim, MESSAGES.CREATED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles PATCH /claims/:id — partially updates an existing claim.
   *
   * @param req - Express request (params: { id: string }, body: UpdateClaimBody)
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const { id } = claimParamsSchema.parse(req.params);
      const body = updateClaimSchema.parse(req.body);

      const claim = await this.service.updateClaim(
        id,
        req.user.clubId ?? '',
        {
          claimant:
            body.claimant !== undefined
              ? {
                  name: body.claimant.name,
                  dateOfBirth:
                    body.claimant.dateOfBirth !== undefined
                      ? new Date(body.claimant.dateOfBirth)
                      : undefined,
                  phone: body.claimant.phone,
                  email: body.claimant.email,
                }
              : undefined,
          insurer: body.insurer,
          assignedTo: body.assignedTo,
          dateOfAccident: body.dateOfAccident ? new Date(body.dateOfAccident) : undefined,
        },
        req.user.id,
      );

      sendSuccess(res, claim, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles DELETE /claims/:id — soft-deletes a claim.
   *
   * @param req - Express request (params: { id: string })
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const { id } = claimParamsSchema.parse(req.params);
      await this.service.deleteClaim(id, req.user.clubId ?? '', req.user.id);
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles PATCH /claims/:id/status — transitions a claim to a new status.
   *
   * @param req - Express request (params: { id: string }, body: UpdateStatusBody)
   * @param res - Express response
   * @param next - Express next function for error propagation
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(new UnauthorizedError());

      const { id } = claimParamsSchema.parse(req.params);
      const body = updateStatusSchema.parse(req.body);

      const claim = await this.service.updateClaimStatus(
        id,
        req.user.clubId ?? '',
        body.status,
        req.user.id,
      );

      sendSuccess(res, claim, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
