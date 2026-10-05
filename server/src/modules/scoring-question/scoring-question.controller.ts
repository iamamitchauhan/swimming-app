import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { ScoringQuestionService } from "./scoring-question.service";
import { HTTP_STATUS } from "../../shared/constants/httpStatus";
import { MESSAGES } from "../../shared/constants/messages";
import { sendSuccess } from "../../shared/utils/response";
import { BadRequestError } from "../../shared/errors/domain.errors";
import { clubIdParamsSchema, questionParamsSchema, bulkDeleteSchema } from "./scoring-question.validation";

// ─── Multer config for sheet upload ───────────────────────────────────────────

const ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const extensionOk = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (ACCEPTED_MIME_TYPES.has(file.mimetype) || extensionOk) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Unsupported file type. Please upload a CSV or Excel file."));
    }
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireFile(req: Request): Express.Multer.File {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    throw new BadRequestError(
      'No file uploaded. Attach a CSV or XLSX file under the "file" field.',
    );
  }
  return file;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class ScoringQuestionController {
  constructor(private readonly service: ScoringQuestionService) {}

  /**
   * GET /api/v1/clubs/:clubId/scoring-questions
   * Lists the club's live scoring-question bank in display order.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.listByClub(clubId);
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/clubs/:clubId/scoring-questions/template
   * Returns the starter CSV sheet.
   */
  downloadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      clubIdParamsSchema.parse(req.params);
      const csv = this.service.getTemplateCSV();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="scoring-questions-template.csv"',
      );
      res.status(HTTP_STATUS.OK).send(csv);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/clubs/:clubId/scoring-questions/preview
   * Dry-run parse of an uploaded sheet (writes nothing).
   */
  preview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.preview(clubId, requireFile(req));
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/clubs/:clubId/scoring-questions/import
   * Append-only import into the club bank.
   */
  import = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const data = await this.service.import(clubId, requireFile(req), req.user?.id);
      sendSuccess(res, data, "Scoring questions imported", HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/clubs/:clubId/scoring-questions/:questionId
   * Soft-deletes a single bank question.
   */
  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params });
      const { clubId, questionId } = questionParamsSchema.parse(req.params);
      await this.service.remove(clubId, questionId, req.user?.id);
      sendSuccess(res, null, "Scoring question removed", HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/clubs/:clubId/scoring-questions/bulk
   * Soft-deletes several bank questions.
   */
  removeMany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.step?.("received", { params: req.params, body: req.body });
      const { clubId } = clubIdParamsSchema.parse(req.params);
      const { ids } = bulkDeleteSchema.parse(req.body);
      const deleted = await this.service.removeMany(clubId, ids, req.user?.id);
      sendSuccess(res, { deleted }, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };
}
