import { SwimmerRepository, PlainSwimmer, SwimmerListParams, SwimmerListResult } from './swimmer.repository';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import logger from '../../shared/utils/logger';

export class SwimmerService {
  constructor(private readonly repo: SwimmerRepository) {}

  /**
   * Lists swimmers for the authenticated parent
   */
  async listByParent(parentId: string, params: SwimmerListParams = {}): Promise<SwimmerListResult> {
    return this.repo.findByParent(parentId, params);
  }

  /**
   * Returns a single swimmer by ID with ownership validation
   */
  async getById(id: string, parentId: string): Promise<PlainSwimmer> {
    const swimmer = await this.repo.findById(id);
    if (!swimmer) throw new NotFoundError('Swimmer not found');
    
    // Ownership validation
    if (swimmer.parentId !== parentId) {
      throw new ForbiddenError('Access denied');
    }
    
    return swimmer;
  }

  /**
   * Creates a new swimmer for the authenticated parent
   */
  async create(data: Omit<PlainSwimmer, '_id' | 'createdAt' | 'updatedAt'>): Promise<PlainSwimmer> {
    // Create the swimmer with the provided data (should include parentId)
    const created = await this.repo.create(data);
    logger.info({ swimmerId: created._id, parentId: data.parentId }, 'swimmer.created');
    return created;
  }

  /**
   * Updates an existing swimmer with ownership validation
   */
  async update(
    id: string,
    parentId: string,
    data: Partial<Omit<PlainSwimmer, '_id' | 'parentId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PlainSwimmer> {
    // Validate ownership before update
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Swimmer not found');
    
    if (existing.parentId !== parentId) {
      throw new ForbiddenError('Access denied');
    }

    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundError('Swimmer not found');

    logger.info({ swimmerId: id, parentId }, 'swimmer.updated');
    return updated;
  }

  /**
   * Deactivates a swimmer (soft delete) with ownership validation
   */
  async deactivate(id: string, parentId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Swimmer not found');
    
    if (existing.parentId !== parentId) {
      throw new ForbiddenError('Access denied');
    }

    await this.repo.deactivate(id);
    logger.info({ swimmerId: id, parentId }, 'swimmer.deactivated');
  }

  /**
   * Calculates swimmer age from birth date
   */
  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
