import { Request, Response, NextFunction } from 'express';
import { SwimmerService } from './swimmer.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import {
  createSwimmerSchema,
  updateSwimmerSchema,
  swimmerListParamsSchema,
} from './swimmer.validation';

export class SwimmerController {
  constructor(private readonly service: SwimmerService) {}

  /**
   * POST /swimmers
   * Creates a new swimmer for the authenticated parent
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError('User not authenticated'));

      const validatedData = createSwimmerSchema.parse(req.body);
      const swimmerData = { 
        ...validatedData, 
        parentId, 
        isActive: true,
        birthDate: new Date(validatedData.birthDate)
      };
      // Create swimmer with parent context
      const swimmer = await this.service.create(swimmerData);
      
      sendSuccess(res, { swimmer }, MESSAGES.CREATED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /swimmers
   * Lists swimmers for the authenticated parent with pagination and filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError('User not authenticated'));

      const params = swimmerListParamsSchema.parse(req.query);
      const result = await this.service.listByParent(parentId, params);
      
      sendSuccess(res, result, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /swimmers/:id
   * Returns a single swimmer by ID with ownership validation
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError('User not authenticated'));

      const { id } = req.params;
      const swimmer = await this.service.getById(id, parentId);
      
      sendSuccess(res, { swimmer }, MESSAGES.RETRIEVED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /swimmers/:id
   * Updates an existing swimmer with ownership validation
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError('User not authenticated'));

      const { id } = req.params;
      const validatedData = updateSwimmerSchema.parse(req.body);
      // Convert birthDate string to Date if present
      const updateData = {
        ...validatedData,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : undefined,
      };
      const swimmer = await this.service.update(id, parentId, updateData);
      
      sendSuccess(res, { swimmer }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /swimmers/:id
   * Deactivates a swimmer (soft delete) with ownership validation
   */
  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parentId = req.user?.id;
      if (!parentId) return next(new ForbiddenError('User not authenticated'));

      const { id } = req.params;
      await this.service.deactivate(id, parentId);
      
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
