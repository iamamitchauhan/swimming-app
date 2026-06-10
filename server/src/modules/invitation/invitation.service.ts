import mongoose from 'mongoose';
import { InvitationRepository, PlainInvitation } from './invitation.repository';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors/domain.errors';
import { USER_ROLES, UserRole } from '../../shared/constants/roles';
import { config } from '../../config/env';
import { generateSecureToken, hashToken, verifyToken } from '../../shared/utils/token';
import { sendInvitation as sendInvitationEmail } from '../../shared/utils/mailer';
import { UserModel } from '../../models/user.model';
import { ClubModel } from '../../models/club.model';
import logger from '../../shared/utils/logger';

// ─── Role permission matrix ───────────────────────────────────────────────────

const INVITE_PERMISSIONS: Record<string, UserRole[]> = {
  [USER_ROLES.ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.COACH],
  [USER_ROLES.COACH]: [USER_ROLES.COACH],
};

export class InvitationService {
  constructor(private readonly repo: InvitationRepository) {}

  /**
   * Sends an invitation email to the given address with the given role.
   * Enforces role-based invite permissions and club isolation.
   */
  async sendInvitation(
    inviterId: string,
    inviterRole: string,
    inviterClubId: string,
    targetEmail: string,
    targetRole: UserRole,
  ): Promise<PlainInvitation> {
    const allowed = INVITE_PERMISSIONS[inviterRole] ?? [];
    if (!allowed.includes(targetRole)) {
      throw new ForbiddenError(
        `A ${inviterRole} cannot invite someone with the role ${targetRole}.`,
      );
    }

    const club = await ClubModel.findById(inviterClubId).lean().exec();
    if (!club) throw new NotFoundError('Club not found');
    if ((club as { status: string }).status !== 'approved') {
      throw new BadRequestError(
        'Invitations can only be sent from approved clubs.',
        'CLUB_NOT_APPROVED',
      );
    }

    const existingUser = await UserModel.findOne({ email: targetEmail }).lean().exec();
    if (existingUser) {
      throw new ConflictError('A user with this email already exists.');
    }

    const existingPending = await this.repo.findPendingByEmailAndClub(
      targetEmail,
      inviterClubId,
    );
    if (existingPending) {
      throw new ConflictError('A pending invitation already exists for this email.');
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(
      Date.now() + config.INVITATION_EXPIRES_HOURS * 60 * 60 * 1000,
    );

    const invitation = await this.repo.create({
      email: targetEmail,
      role: targetRole,
      clubId: inviterClubId,
      invitedBy: inviterId,
      tokenHash,
      expiresAt,
    });

    const inviter = await UserModel.findById(inviterId).lean().exec() as {
      firstName?: string;
      lastName?: string;
      email?: string;
    } | null;
    const inviterName = inviter
      ? `${inviter.firstName ?? ''} ${inviter.lastName ?? ''}`.trim() || inviter.email!
      : 'A club admin';

    const acceptUrl = `${config.APP_BASE_URL}/invitation/accept?token=${plainToken}`;

    await sendInvitationEmail({
      to: targetEmail,
      inviterName,
      clubName: (club as { name: string }).name,
      role: targetRole,
      acceptUrl,
    });

    logger.info(
      { inviterId, targetEmail, role: targetRole, clubId: inviterClubId },
      'invitation.sent',
    );

    return invitation;
  }

  /**
   * Accepts an invitation by token.
   * Creates the user account, links them to the club, and marks the invitation used.
   */
  async acceptInvitation(
    token: string,
    firstName: string,
    lastName: string,
  ): Promise<{ userId: string; email: string; role: string; clubId: string }> {
    const tokenHash = hashToken(token);
    const invitation = await this.repo.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new BadRequestError(
        'Invalid or expired invitation link.',
        'INVITATION_INVALID',
      );
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestError(
        'This invitation has expired.',
        'INVITATION_EXPIRED',
      );
    }

    const existingUser = await UserModel.findOne({ email: invitation.email }).lean().exec();
    if (existingUser) {
      throw new ConflictError('An account with this email already exists.');
    }

    const user = await new UserModel({
      email: invitation.email,
      role: invitation.role,
      status: 'active',
      emailVerified: true,
      clubId: new mongoose.Types.ObjectId(invitation.clubId),
      firstName,
      lastName,
    }).save();

    await this.repo.markAccepted(invitation._id.toString());

    logger.info(
      { userId: user._id, email: invitation.email, role: invitation.role },
      'invitation.accepted',
    );

    return {
      userId: user._id.toString(),
      email: invitation.email,
      role: invitation.role,
      clubId: invitation.clubId.toString(),
    };
  }

  /**
   * Lists invitations sent by a specific user.
   */
  async listMySentInvitations(userId: string): Promise<PlainInvitation[]> {
    return this.repo.findBySender(userId);
  }

  /**
   * Lists all invitations for a specific club (admin/super_admin use).
   */
  async listClubInvitations(clubId: string): Promise<PlainInvitation[]> {
    return this.repo.findByClub(clubId);
  }
}
