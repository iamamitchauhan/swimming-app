import { ClubRepository, PlainClub } from './club.repository';
import {
  BadRequestError,
  NotFoundError,
} from '../../shared/errors/domain.errors';
import { UserModel } from '../../models/user.model';
import { sendClubApproved, sendClubRejected } from '../../shared/utils/mailer';
import logger from '../../shared/utils/logger';

export class ClubService {
  constructor(private readonly repo: ClubRepository) {}

  /**
   * Returns all clubs with pending_review status.
   */
  async getPendingClubs(): Promise<PlainClub[]> {
    return this.repo.findPending();
  }

  /**
   * Returns all clubs (super_admin overview).
   */
  async getAllClubs(): Promise<PlainClub[]> {
    return this.repo.findAll();
  }

  /**
   * Returns a single club by ID.
   */
  async getClubById(id: string): Promise<PlainClub> {
    const club = await this.repo.findById(id);
    if (!club) throw new NotFoundError('Club not found');
    return club;
  }

  /**
   * Returns the club owned by a given user (for admin dashboard).
   */
  async getMyClub(ownerId: string): Promise<PlainClub> {
    const club = await this.repo.findByOwner(ownerId);
    if (!club) throw new NotFoundError('You do not have a club yet');
    return club;
  }

  /**
   * Approves a pending club and notifies the owner.
   */
  async approveClub(clubId: string): Promise<PlainClub> {
    const club = await this.repo.findById(clubId);
    if (!club) throw new NotFoundError('Club not found');

    if (club.status !== 'pending_review') {
      throw new BadRequestError(
        `Club is not pending review (current status: ${club.status}).`,
        'CLUB_STATUS_INVALID',
      );
    }

    const approved = await this.repo.approve(clubId);
    if (!approved) throw new NotFoundError('Club not found');

    const owner = await UserModel.findById(club.ownerId).lean().exec() as {
      email: string;
    } | null;

    if (owner?.email) {
      await sendClubApproved({ to: owner.email, clubName: club.name });
    }

    logger.info({ clubId, ownerId: club.ownerId }, 'club.approved');
    return approved;
  }

  /**
   * Rejects a pending club with a reason and notifies the owner.
   */
  async rejectClub(clubId: string, reason: string): Promise<PlainClub> {
    const club = await this.repo.findById(clubId);
    if (!club) throw new NotFoundError('Club not found');

    if (club.status !== 'pending_review') {
      throw new BadRequestError(
        `Club is not pending review (current status: ${club.status}).`,
        'CLUB_STATUS_INVALID',
      );
    }

    const rejected = await this.repo.reject(clubId, reason);
    if (!rejected) throw new NotFoundError('Club not found');

    const owner = await UserModel.findById(club.ownerId).lean().exec() as {
      email: string;
    } | null;

    if (owner?.email) {
      await sendClubRejected({ to: owner.email, clubName: club.name, reason });
    }

    logger.info({ clubId, ownerId: club.ownerId, reason }, 'club.rejected');
    return rejected;
  }
}
