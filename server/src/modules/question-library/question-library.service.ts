import {
  QuestionLibraryRepository,
  PlainQuestionCategory,
  CreateCategoryData,
  UpdateCategoryData,
  PlainQuestion,
} from './question-library.repository';
import { NotFoundError, ConflictError, BadRequestError } from '../../shared/errors/domain.errors';
import logger from '../../shared/utils/logger';

export class QuestionLibraryService {
  constructor(private readonly repo: QuestionLibraryRepository) {}

  async listAll(): Promise<PlainQuestionCategory[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<PlainQuestionCategory> {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundError('Question category not found');
    return category;
  }

  async create(data: CreateCategoryData): Promise<PlainQuestionCategory> {
    const existing = await this.repo.findByCategory(data.category);
    if (existing) throw new ConflictError(`Category "${data.category}" already exists`);

    const created = await this.repo.create(data);
    logger.info({ categoryId: created._id, category: created.category }, 'question-library.created');
    return created;
  }

  async update(id: string, data: UpdateCategoryData): Promise<PlainQuestionCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Question category not found');

    if (data.category && data.category !== existing.category) {
      const conflict = await this.repo.findByCategory(data.category);
      if (conflict) throw new ConflictError(`Category "${data.category}" already exists`);
    }

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Question category not found');

    logger.info({ categoryId: id }, 'question-library.updated');
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Question category not found');

    await this.repo.delete(id);
    logger.info({ categoryId: id, category: existing.category }, 'question-library.deleted');
  }

  async addQuestion(id: string, question: PlainQuestion): Promise<PlainQuestionCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Question category not found');

    const updated = await this.repo.addQuestion(id, question);
    if (!updated) throw new NotFoundError('Question category not found');

    logger.info({ categoryId: id, questionLabel: question.label }, 'question-library.question.added');
    return updated;
  }

  async updateQuestion(
    id: string,
    questionIndex: number,
    question: Partial<PlainQuestion>,
  ): Promise<PlainQuestionCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Question category not found');
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new BadRequestError(`Question index ${questionIndex} is out of range`);
    }

    const updated = await this.repo.updateQuestion(id, questionIndex, question);
    if (!updated) throw new NotFoundError('Question category not found');

    logger.info({ categoryId: id, questionIndex }, 'question-library.question.updated');
    return updated;
  }

  async removeQuestion(id: string, questionIndex: number): Promise<PlainQuestionCategory> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Question category not found');
    if (questionIndex < 0 || questionIndex >= existing.questions.length) {
      throw new BadRequestError(`Question index ${questionIndex} is out of range`);
    }

    const updated = await this.repo.removeQuestion(id, questionIndex);
    if (!updated) throw new NotFoundError('Question category not found');

    logger.info({ categoryId: id, questionIndex }, 'question-library.question.removed');
    return updated;
  }
}
