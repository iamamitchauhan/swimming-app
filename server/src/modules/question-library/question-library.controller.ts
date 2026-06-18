import { Request, Response, NextFunction } from 'express';
import { QuestionLibraryService } from './question-library.service';
import { HTTP_STATUS } from '../../shared/constants/httpStatus';
import { MESSAGES } from '../../shared/constants/messages';
import { sendSuccess } from '../../shared/utils/response';
import { BadRequestError } from '../../shared/errors/domain.errors';
import { QUESTION_TYPES } from '../../models/question-library.model';

export class QuestionLibraryController {
  constructor(private readonly service: QuestionLibraryService) {}

  /**
   * GET /api/v1/question-library
   * Returns all categories sorted by sortOrder.
   */
  listAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.listAll();
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/question-library/:id
   * Returns a single category by ID.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getById(req.params['id']!);
      sendSuccess(res, data, MESSAGES.SUCCESS, HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/question-library
   * Creates a new question category.
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, questions, sortOrder } = req.body as {
        category?: string;
        questions?: unknown[];
        sortOrder?: number;
      };

      if (!category?.trim()) throw new BadRequestError('category is required');
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new BadRequestError('questions must be a non-empty array');
      }

      this.validateQuestions(questions);

      const data = await this.service.create({
        category: category.trim(),
        questions: questions as any,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
      });

      sendSuccess(res, data, 'Question category created', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PUT /api/v1/question-library/:id
   * Replaces category name, questions array, or sortOrder.
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { category, questions, sortOrder } = req.body as {
        category?: string;
        questions?: unknown[];
        sortOrder?: number;
      };

      if (questions !== undefined) {
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new BadRequestError('questions must be a non-empty array');
        }
        this.validateQuestions(questions);
      }

      const data = await this.service.update(req.params['id']!, {
        ...(category !== undefined && { category: category.trim() }),
        ...(questions !== undefined && { questions: questions as any }),
        ...(sortOrder !== undefined && { sortOrder }),
      });

      sendSuccess(res, data, 'Question category updated', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/question-library/:id
   * Deletes a question category.
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.delete(req.params['id']!);
      sendSuccess(res, null, 'Question category deleted', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/question-library/:id/questions
   * Appends a single question to an existing category.
   */
  addQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const question = req.body;
      this.validateQuestions([question]);

      const data = await this.service.addQuestion(req.params['id']!, question);
      sendSuccess(res, data, 'Question added', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/question-library/:id/questions/:index
   * Partially updates a single question at the given 0-based index.
   */
  updateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const index = parseInt(req.params['index']!, 10);
      if (isNaN(index) || index < 0) throw new BadRequestError('index must be a non-negative integer');

      const data = await this.service.updateQuestion(req.params['id']!, index, req.body);
      sendSuccess(res, data, 'Question updated', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/question-library/:id/questions/:index
   * Removes the question at the given 0-based index.
   */
  removeQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const index = parseInt(req.params['index']!, 10);
      if (isNaN(index) || index < 0) throw new BadRequestError('index must be a non-negative integer');

      const data = await this.service.removeQuestion(req.params['id']!, index);
      sendSuccess(res, data, 'Question removed', HTTP_STATUS.OK);
    } catch (err) {
      next(err);
    }
  };

  // ─── Private helpers ────────────────────────────────────────────────────────

  private validateQuestions(questions: unknown[]): void {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i] as Record<string, unknown>;
      if (!q || typeof q !== 'object') {
        throw new BadRequestError(`questions[${i}] must be an object`);
      }
      if (!QUESTION_TYPES.includes(q['type'] as any)) {
        throw new BadRequestError(
          `questions[${i}].type must be one of: ${QUESTION_TYPES.join(', ')}`,
        );
      }
      if (!q['label'] || typeof q['label'] !== 'string' || !(q['label'] as string).trim()) {
        throw new BadRequestError(`questions[${i}].label is required`);
      }
      if ((q['type'] === 'radio' || q['type'] === 'checkbox') && !Array.isArray(q['options'])) {
        throw new BadRequestError(`questions[${i}].options is required for type "${q['type']}"`);
      }
    }
  }
}
