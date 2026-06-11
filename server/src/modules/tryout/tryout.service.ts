import { TryoutRepository, PlainTryout, TryoutListParams, TryoutListResult } from './tryout.repository';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import logger from '../../shared/utils/logger';

export class TryoutService {
  constructor(private readonly repo: TryoutRepository) {}

  /**
   * Lists tryouts for the authenticated user's club with pagination, filters, and sort.
   */
  async listByClub(clubId: string, params: TryoutListParams = {}): Promise<TryoutListResult> {
    return this.repo.findByClub(clubId, params);
  }

  /**
   * Returns a single tryout by ID.
   */
  async getById(id: string, clubId: string): Promise<PlainTryout> {
    const tryout = await this.repo.findById(id);
    if (!tryout) throw new NotFoundError('Tryout not found');
    // if (tryout.clubId !== clubId) throw new ForbiddenError('Access denied');
    return tryout;
  }

  /**
   * Creates a new tryout.
   */
  async create(data: Omit<PlainTryout, '_id' | 'createdAt' | 'updatedAt'>): Promise<PlainTryout> {
    const created = await this.repo.create(data);
    logger.info({ tryoutId: created._id, clubId: data.clubId }, 'tryout.created');
    return created;
  }

  /**
   * Updates an existing tryout.
   */
  async update(
    id: string,
    clubId: string,
    data: Partial<Omit<PlainTryout, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PlainTryout> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Tryout not found');
    // if (existing.clubId !== clubId) throw new ForbiddenError('Access denied');

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Tryout not found');

    logger.info({ tryoutId: id, clubId }, 'tryout.updated');
    return updated;
  }

  /**
   * Deletes a tryout.
   */
  async delete(id: string, clubId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Tryout not found');

    await this.repo.delete(id);
    logger.info({ tryoutId: id, clubId }, 'tryout.deleted');
  }
}
