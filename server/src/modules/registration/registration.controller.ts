import { Request, Response, NextFunction } from "express";
import { RegistrationService } from "./registration.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { NotFoundError, ForbiddenError } from "../../shared/errors/domain.errors";
import { createRegistrationSchema, updateRegistrationStatusSchema, registrationListParamsSchema } from "./registration.validation";

export class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

  /**
   * POST /registrations
   * Creates a new registration for a swimmer
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError("User not authenticated"));

      const validatedData = createRegistrationSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const registration = await this.service.create(validatedData, parentId);

      req.step?.("responding", { status: HTTP_STATUS.CREATED });
      sendSuccess(res, { registration }, MESSAGES.CREATED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /registrations/my-kids
   * Lists registrations for the authenticated parent's swimmers
   */
  listByParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError("User not authenticated"));

      const params = registrationListParamsSchema.parse(req.query);
      req.step?.("validated");
      req.step?.("delegating to service");
      const result = await this.service.listByParent(parentId, params);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, result, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /registrations/my-tryouts
   * Returns all tryouts where the parent registered children,
   * with each child's status and scores.
   */
  listParentTryouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError("User not authenticated"));

      req.step?.("validated");
      req.step?.("delegating to service");
      const result = await this.service.listParentTryouts(parentId);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { tryouts: result }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /registrations/:id
   * Returns a single registration by ID with ownership validation
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError("User not authenticated"));

      const { id } = req.params;
      req.step?.("validated");
      req.step?.("delegating to service");
      const registration = await this.service.getById(id, parentId);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /admin/registrations/parent/:parentId
   * Admin: lists all registrations created by a given parent.
   */
  listByParentAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { parentId } = req.params;
      req.step?.("validated");
      req.step?.("delegating to service");
      const registrations = await this.service.listByParentAdmin(parentId!);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registrations }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /admin/registrations/:id
   * Admin: returns a single registration with all references populated.
   */
  getByIdAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const { id } = req.params;
      req.step?.("validated");
      req.step?.("delegating to service");
      const registration = await this.service.getByIdAdmin(id!);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /registrations/:id
   * Updates registration status (for cancellations, etc.)
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, query: req.query, body: req.body });
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError("User not authenticated"));

      const { id } = req.params;
      const { status } = updateRegistrationStatusSchema.parse(req.body);
      req.step?.("validated");
      req.step?.("delegating to service");
      const registration = await this.service.updateStatus(id, parentId, status);

      req.step?.("responding", { status: HTTP_STATUS.OK });
      sendSuccess(res, { registration }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
