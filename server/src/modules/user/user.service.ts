import { UserRepository, PlainUser } from './user.repository';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import { UserRole } from '../../shared/constants/roles';
import logger from '../../shared/utils/logger';

export class UserService {
  constructor(private readonly repo: UserRepository) {}

  /**
   * Returns the public profile of the authenticated user.
   */
  async getMe(userId: string): Promise<PlainUser> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.status === 'suspended') throw new ForbiddenError('Account suspended');
    return user;
  }

  /**
   * Updates first/last name for the authenticated user.
   */
  async updateMe(
    userId: string,
    data: Partial<{ firstName: string; lastName: string }>,
  ): Promise<PlainUser> {
    const updated = await this.repo.update(userId, data);
    if (!updated) throw new NotFoundError('User not found');
    logger.info({ userId }, 'user.profile.updated');
    return updated;
  }

  /**
   * Returns all users. Optionally filtered by role.
   * Super admin only.
   */
  async listAll(filters: { role?: UserRole; clubId?: string } = {}): Promise<PlainUser[]> {
    return this.repo.findAll(filters);
  }

  /**
   * Returns a single user by ID.
   * Super admin only.
   */
  async getById(id: string): Promise<PlainUser> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Returns all users belonging to a given club.
   */
  async getByClub(clubId: string): Promise<PlainUser[]> {
    return this.repo.findByClub(clubId);
  }
}
