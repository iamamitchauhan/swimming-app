import { Request, Response, NextFunction } from 'express';
import { TryoutService } from './tryout.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import multer from 'multer';

// ─── Multer config for banner upload ──────────────────────────────────────────

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export class TryoutController {
  constructor(private readonly service: TryoutService) {}

  /**
   * GET /tryouts
   * Lists tryouts for the authenticated user's club with pagination, filters, and sort.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError('No club associated with user'));

      const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 10));
      const search = (req.query['search'] as string | undefined)?.trim() || undefined;
      const status = (req.query['status'] as string | undefined)?.trim() || undefined;
      const dateFrom = (req.query['dateFrom'] as string | undefined)?.trim() || undefined;
      const dateTo = (req.query['dateTo'] as string | undefined)?.trim() || undefined;
      const sortBy = (['name', 'status', 'createdAt', 'updatedAt'].includes(req.query['sortBy'] as string)
        ? req.query['sortBy']
        : 'createdAt') as 'name' | 'status' | 'createdAt' | 'updatedAt';
      const sortOrder = (req.query['sortOrder'] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

      const result = await this.service.listByClub(clubId, {
        page, limit, search, status, dateFrom, dateTo, sortBy, sortOrder,
      });

      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/:id
   * Returns a single tryout by ID.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError('No club associated with user'));

      const tryout = await this.service.getById(id, clubId);
      sendSuccess(res, { tryout }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /tryouts
   * Creates a new tryout. Supports multipart/form-data for banner upload.
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clubId = req.user?.clubId;
      const userId = req.user?.id;
      if (!clubId || !userId) return next(new ForbiddenError('No club or user associated'));

      // Parse JSON fields from form data
      const sessions = req.body.sessions ? JSON.parse(req.body.sessions) : [];
      const segments = req.body.segments ? JSON.parse(req.body.segments) : [];
      const steps = req.body.steps ? JSON.parse(req.body.steps) : [];
      const faqs = req.body.faqs ? JSON.parse(req.body.faqs) : [];

      // TODO: Upload banner file to S3/cloud storage and get URL
      // For now, we'll just skip file upload and use bannerUrl if provided
      let bannerUrl = req.body.bannerUrl || '';
      // if (req.file) { bannerUrl = await uploadToS3(req.file); }

      const tryout = await this.service.create({
        name: req.body.name,
        location: req.body.location || '',
        description: req.body.description || '',
        theme: req.body.theme || 'ocean',
        bannerUrl,
        slotDuration: parseInt(req.body.slotDuration) || 30,
        swimmersPerSlot: parseInt(req.body.swimmersPerSlot) || 4,
        ctaLabel: req.body.ctaLabel || 'Sign up today',
        highlights: req.body.highlights || '',
        additionalInstructions: req.body.additionalInstructions || '',
        status: req.body.status || 'draft',
        sessions,
        segments,
        steps,
        faqs,
        clubId,
        createdBy: userId,
      });

      sendSuccess(res, { tryout }, MESSAGES.CREATED, HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /tryouts/:id
   * Updates an existing tryout. Supports multipart/form-data for banner upload.
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError('No club associated with user'));

      // Parse JSON fields from form data if present
      const sessions = req.body.sessions ? JSON.parse(req.body.sessions) : undefined;
      const segments = req.body.segments ? JSON.parse(req.body.segments) : undefined;
      const steps = req.body.steps ? JSON.parse(req.body.steps) : undefined;
      const faqs = req.body.faqs ? JSON.parse(req.body.faqs) : undefined;

      // TODO: Upload banner file to S3/cloud storage and get URL
      let bannerUrl = req.body.bannerUrl;
      // if (req.file) { bannerUrl = await uploadToS3(req.file); }

      const tryout = await this.service.update(id, clubId, {
        ...(req.body.name !== undefined && { name: req.body.name }),
        ...(req.body.location !== undefined && { location: req.body.location }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.theme !== undefined && { theme: req.body.theme }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(req.body.slotDuration !== undefined && { slotDuration: parseInt(req.body.slotDuration) }),
        ...(req.body.swimmersPerSlot !== undefined && { swimmersPerSlot: parseInt(req.body.swimmersPerSlot) }),
        ...(req.body.ctaLabel !== undefined && { ctaLabel: req.body.ctaLabel }),
        ...(req.body.highlights !== undefined && { highlights: req.body.highlights }),
        ...(req.body.additionalInstructions !== undefined && { additionalInstructions: req.body.additionalInstructions }),
        ...(req.body.status !== undefined && { status: req.body.status }),
        ...(sessions !== undefined && { sessions }),
        ...(segments !== undefined && { segments }),
        ...(steps !== undefined && { steps }),
        ...(faqs !== undefined && { faqs }),
      });

      sendSuccess(res, { tryout }, MESSAGES.UPDATED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /tryouts/:id
   * Deletes a tryout.
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const clubId = req.user?.clubId;
      if (!clubId) return next(new ForbiddenError('No club associated with user'));

      await this.service.delete(id, clubId);
      sendSuccess(res, null, MESSAGES.DELETED, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /tryouts/public
   * Lists all active tryouts for public landing page (no authentication required).
   */
  listPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 10));
      const search = (req.query['search'] as string | undefined)?.trim() || undefined;
      const sortBy = (['name', 'createdAt', 'updatedAt'].includes(req.query['sortBy'] as string)
        ? req.query['sortBy']
        : 'createdAt') as 'name' | 'createdAt' | 'updatedAt';
      const sortOrder = (req.query['sortOrder'] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

      const result = await this.service.listActive({
        page, limit, search, sortBy, sortOrder,
      });

      sendSuccess(res, result, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}

export { upload };
