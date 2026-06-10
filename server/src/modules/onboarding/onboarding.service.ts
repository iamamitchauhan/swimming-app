import { OnboardingRepository, PlainClub } from './onboarding.repository';
import { InvitationRepository } from '../invitation/invitation.repository';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/domain.errors';
import { USER_ROLES } from '../../shared/constants/roles';
import { config } from '../../config/env';
import { generateSecureToken, hashToken } from '../../shared/utils/token';
import { sendClubSubmittedNotification, sendInvitation } from '../../shared/utils/mailer';
import { UserModel } from '../../models/user.model';
import logger from '../../shared/utils/logger';

export type OnboardingStatus = {
  step: number;
  club: PlainClub | null;
};

export class OnboardingService {
  constructor(
    private readonly repo: OnboardingRepository,
    private readonly invitationRepo: InvitationRepository,
  ) {}

  /**
   * Returns the current onboarding step and saved club data for a user.
   */
  async getStatus(userId: string): Promise<OnboardingStatus> {
    const step = await this.repo.getUserOnboardingStep(userId);
    const club = await this.repo.findClubByOwner(userId);
    return { step, club };
  }

  /**
   * Step 1: Save club name, address, phone, optional logo URL.
   */
  async saveStep1(
    userId: string,
    data: { name: string; address: string; phone: string; logoUrl?: string },
  ): Promise<PlainClub> {
    const existingClub = await this.repo.findClubByOwner(userId);

    if (existingClub && existingClub.status !== 'draft') {
      throw new BadRequestError(
        'Club has already been submitted and cannot be edited.',
        'CLUB_ALREADY_SUBMITTED',
      );
    }

    const club = await this.repo.upsertClubDraft(userId, {
      name: data.name,
      address: data.address,
      phone: data.phone,
      ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
    });

    await this.repo.setUserClub(userId, club._id.toString());
    await this.repo.setUserOnboardingStep(userId, 1);

    logger.info({ userId, clubId: club._id }, 'onboarding.step1.saved');
    return club;
  }

  /**
   * Step 2: Optionally invite coaches (can be skipped).
   * Sends invitation emails for each provided coach email.
   */
  async saveStep2(
    userId: string,
    coachEmails: string[],
  ): Promise<{ invited: string[]; skipped: string[] }> {
    const step = await this.repo.getUserOnboardingStep(userId);
    if (step < 1) {
      throw new BadRequestError('Please complete step 1 first.', 'STEP_ORDER_INVALID');
    }

    const club = await this.repo.findClubByOwner(userId);
    if (!club) throw new NotFoundError('Club not found. Please complete step 1 first.');
    if (club.status !== 'draft') {
      throw new BadRequestError('Club has already been submitted.', 'CLUB_ALREADY_SUBMITTED');
    }

    const inviter = await UserModel.findById(userId).lean().exec() as {
      firstName?: string;
      lastName?: string;
      email?: string;
    } | null;
    const inviterName = inviter
      ? `${inviter.firstName ?? ''} ${inviter.lastName ?? ''}`.trim() || inviter.email!
      : 'A club admin';

    const invited: string[] = [];
    const skipped: string[] = [];

    for (const email of coachEmails) {
      const existing = await UserModel.findOne({ email }).lean().exec();
      if (existing) {
        skipped.push(email);
        continue;
      }

      const plainToken = generateSecureToken();
      const tokenHash = hashToken(plainToken);
      const expiresAt = new Date(
        Date.now() + config.INVITATION_EXPIRES_HOURS * 60 * 60 * 1000,
      );

      await this.invitationRepo.create({
        email,
        role: USER_ROLES.COACH,
        clubId: club._id.toString(),
        invitedBy: userId,
        tokenHash,
        expiresAt,
      });

      const acceptUrl = `${config.APP_BASE_URL}/invitation/accept?token=${plainToken}`;
      await sendInvitation({
        to: email,
        inviterName,
        clubName: club.name,
        role: 'coach',
        acceptUrl,
      });

      invited.push(email);
    }

    await this.repo.setUserOnboardingStep(userId, 2);
    logger.info({ userId, invited: invited.length, skipped: skipped.length }, 'onboarding.step2.saved');

    return { invited, skipped };
  }

  /**
   * Step 3: Submit the club for super-admin review.
   * Validates that step 1 data is complete.
   */
  async submitClub(userId: string): Promise<PlainClub> {
    const step = await this.repo.getUserOnboardingStep(userId);
    if (step < 1) {
      throw new BadRequestError('Please complete step 1 first.', 'STEP_ORDER_INVALID');
    }

    const club = await this.repo.findClubByOwner(userId);
    if (!club) throw new NotFoundError('Club not found. Please complete step 1 first.');

    if (club.status !== 'draft') {
      throw new BadRequestError(
        'Club has already been submitted.',
        'CLUB_ALREADY_SUBMITTED',
      );
    }

    if (!club.name || !club.address || !club.phone) {
      throw new BadRequestError(
        'Club name, address and phone are required before submitting.',
        'CLUB_INCOMPLETE',
      );
    }

    const submitted = await this.repo.submitClub(club._id.toString());
    if (!submitted) throw new NotFoundError('Club not found');

    await this.repo.setUserOnboardingStep(userId, 3);

    const superAdmins = await UserModel.find({ role: USER_ROLES.SUPER_ADMIN })
      .select('email')
      .lean()
      .exec() as Array<{ email: string }>;

    for (const admin of superAdmins) {
      await sendClubSubmittedNotification({ to: admin.email, clubName: club.name });
    }

    logger.info({ userId, clubId: club._id }, 'onboarding.club.submitted');
    return submitted;
  }
}
