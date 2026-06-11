import { UserRepository, PlainUser } from './user.repository';
import { NotFoundError, ForbiddenError } from '../../shared/errors/domain.errors';
import { UserRole } from '../../shared/constants/roles';
import logger from '../../shared/utils/logger';
import { InvitationRepository, PlainInvitation } from '../invitation/invitation.repository';

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
  async listAll(
    filters: { role?: UserRole; clubId?: string; search?: string } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 },
  ): Promise<{ users: PlainUser[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.repo.findAll(filters, pagination);
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
   * Changes the role of a club member (admin only).
   */
  async changeRole(userId: string, role: UserRole): Promise<PlainUser> {
    const updated = await this.repo.changeRole(userId, role);
    if (!updated) throw new NotFoundError('User not found');
    logger.info({ userId, role }, 'user.role.changed');
    return updated;
  }

  /**
   * Removes a user from the club (soft delete: clears clubId, suspends account).
   */
  async removeFromClub(userId: string): Promise<void> {
    const updated = await this.repo.removeFromClub(userId);
    if (!updated) throw new NotFoundError('User not found');
    logger.info({ userId }, 'user.removed_from_club');
  }

  /**
   * Returns all users belonging to a given club, plus pending invitations.
   * Returns a single combined array with status text.
   */
  async getByClub(clubId: string): Promise<
    Array<{ type: 'user'; data: PlainUser } | { type: 'invitation'; data: PlainInvitation }>
  > {
    const users = await this.repo.findByClub(clubId);
    const invitationRepo = new InvitationRepository();
    const pendingInvitations = await invitationRepo.findByClub(clubId).then((invites) =>
      invites.filter((inv) => inv.status === 'pending'),
    );

    const userItems = users.map((u) => ({ type: 'user' as const, data: u }));
    const invitationItems = pendingInvitations.map((inv) => ({ type: 'invitation' as const, data: inv }));

    return [...invitationItems, ...userItems];
  }
}
