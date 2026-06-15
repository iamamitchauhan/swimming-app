import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
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
import { InvitationModel } from '../../models/invitation.model';
import logger from '../../shared/utils/logger';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function signToken(payload: {
  id: string;
  email: string;
  role: string;
  clubId: string | null;
}): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

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
   * Creates the user account, links them to the club, marks the invitation used,
   * and returns a JWT token for auto-login.
   */
  async acceptInvitation(
    token: string,
    firstName: string,
    lastName: string,
  ): Promise<{ token: string; user: { id: string; email: string; role: string; clubId: string; firstName: string; lastName: string; emailVerified: boolean; status: string; onboardingStep: number } }> {
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
      onboardingStep: 3,
    }).save();

    await this.repo.markAccepted(invitation._id.toString());

    const authToken = signToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      clubId: invitation.clubId.toString(),
    });

    const userData = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      clubId: invitation.clubId.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      status: user.status,
      onboardingStep: user.onboardingStep,
    };

    logger.info(
      { userId: user._id, email: invitation.email, role: invitation.role },
      'invitation.accepted',
    );

    return { token: authToken, user: userData };
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

  /**
   * Resends an invitation with a new token and extended expiry.
   */
  async resendInvitation(invitationId: string): Promise<PlainInvitation> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    const plainToken = generateSecureToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(
      Date.now() + config.INVITATION_EXPIRES_HOURS * 60 * 60 * 1000,
    );

    const updated = await this.repo.resend(invitationId, expiresAt);
    if (!updated) throw new NotFoundError('Failed to resend invitation');

    const club = await ClubModel.findById(invitation.clubId).lean().exec();
    const inviter = await UserModel.findById(invitation.invitedBy).lean().exec() as {
      firstName?: string;
      lastName?: string;
      email?: string;
    } | null;
    const inviterName = inviter
      ? `${inviter.firstName ?? ''} ${inviter.lastName ?? ''}`.trim() || inviter.email!
      : 'A club admin';

    const acceptUrl = `${config.APP_BASE_URL}/invitation/accept?token=${plainToken}`;

    await sendInvitationEmail({
      to: invitation.email,
      inviterName,
      clubName: (club as { name: string })?.name ?? 'Swimming Club',
      role: invitation.role as UserRole,
      acceptUrl,
    });

    logger.info({ invitationId, email: invitation.email }, 'invitation.resent');

    return updated;
  }

  /**
   * Cancels (deletes) an invitation.
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    const invitation = await this.repo.findById(invitationId);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    const deleted = await this.repo.delete(invitationId);
    if (!deleted) throw new NotFoundError('Failed to cancel invitation');

    logger.info({ invitationId, email: invitation.email }, 'invitation.cancelled');
  }
}
