import { ClubRepository, PlainClub } from "./club.repository";
import { BadRequestError, NotFoundError } from "../../shared/errors/domain.errors";
import { UserModel } from "../../models/user.model";
import { ClubModel } from "../../models/club.model";
import { TryoutModel } from "../../models/tryout.model";
import { RegistrationModel } from "../../models/registration.model";
import { USER_ROLES } from "../../shared/constants/roles";
import { sendClubApproved, sendClubRejected } from "../../shared/utils/mailer";
import logger from "../../shared/utils/logger";

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
    if (!club) throw new NotFoundError("Club not found");
    return club;
  }

  /**
   * Returns the club owned by a given user (for admin dashboard).
   */
  async getMyClub(ownerId: string): Promise<PlainClub> {
    const club = await this.repo.findByOwner(ownerId);
    if (!club) throw new NotFoundError("You do not have a club yet");
    return club;
  }

  /**
   * Approves a pending club and notifies the owner.
   */
  async approveClub(clubId: string): Promise<PlainClub> {
    const club = await this.repo.findById(clubId);
    if (!club) throw new NotFoundError("Club not found");

    if (club.status !== "pending_review") {
      throw new BadRequestError(`Club is not pending review (current status: ${club.status}).`, "CLUB_STATUS_INVALID");
    }

    const approved = await this.repo.approve(clubId);
    if (!approved) throw new NotFoundError("Club not found");

    const owner = (await UserModel.findById(club.ownerId).lean().exec()) as {
      email: string;
    } | null;

    if (owner?.email) {
      await sendClubApproved({ to: owner.email, clubName: club.name });
    }

    logger.info({ clubId, ownerId: club.ownerId }, "club.approved");
    return approved;
  }

  /**
   * Rejects a pending club with a reason and notifies the owner.
   */
  async rejectClub(clubId: string, reason: string): Promise<PlainClub> {
    const club = await this.repo.findById(clubId);
    if (!club) throw new NotFoundError("Club not found");

    if (club.status !== "pending_review") {
      throw new BadRequestError(`Club is not pending review (current status: ${club.status}).`, "CLUB_STATUS_INVALID");
    }

    const rejected = await this.repo.reject(clubId, reason);
    if (!rejected) throw new NotFoundError("Club not found");

    const owner = (await UserModel.findById(club.ownerId).lean().exec()) as {
      email: string;
    } | null;

    if (owner?.email) {
      await sendClubRejected({ to: owner.email, clubName: club.name, reason });
    }

    logger.info({ clubId, ownerId: club.ownerId, reason }, "club.rejected");
    return rejected;
  }

  /**
   * Returns all coaches belonging to a given club.
   */
  async getCoaches(clubId: string): Promise<any[]> {
    return UserModel.find({
      clubId,
      role: { $in: [USER_ROLES.ADMIN, USER_ROLES.COACH] },
      status: { $ne: "suspended" },
    })
      .select("_id email firstName lastName status createdAt")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Returns super-admin dashboard overview stats.
   */
  async getSuperAdminState(): Promise<{
    totalUsers: number;
    totalClubs: number;
    activeTryouts: number;
    pendingApprovals: number;
  }> {
    const [totalUsers, totalClubs, activeTryouts, pendingApprovals] = await Promise.all([
      UserModel.countDocuments({}).exec(),
      ClubModel.countDocuments({}).exec(),
      TryoutModel.countDocuments({
        status: "open",
        startAt: { $gt: new Date() },
      }).exec(),
      ClubModel.countDocuments({ status: "pending_review" }).exec(),
    ]);

    return { totalUsers, totalClubs, activeTryouts, pendingApprovals };
  }

  /**
   * Returns club overview stats: info, member count, coach count, tryout count.
   */
  async getClubState(clubId: string): Promise<{
    club: PlainClub;
    memberCount: number;
    coachCount: number;
    tryoutCount: number;
    registeredSwimmerCount: number;
    pendingRegistrationCount: number;
    activeTryoutCount: number;
  }> {
    const club = await this.repo.findById(clubId);
    if (!club) throw new NotFoundError("Club not found");

    const tryoutIds = await TryoutModel.find({ clubId }).distinct("_id");

    const [memberCount, coachCount, tryoutCount, activeTryoutCount, pendingRegistrationCount, registeredSwimmerCount] = await Promise.all([
      UserModel.countDocuments({
        clubId: clubId,
        status: { $ne: "suspended" },
      }).exec(),
      UserModel.countDocuments({
        clubId: clubId,
        role: USER_ROLES.COACH,
        status: { $ne: "suspended" },
      }).exec(),
      TryoutModel.countDocuments({ clubId: clubId }).exec(),
      TryoutModel.countDocuments({
        clubId: clubId,
        status: "open",
        startAt: { $gt: new Date() },
      }).exec(),
      RegistrationModel.countDocuments({
        tryoutId: { $in: tryoutIds },
        status: "registered",
      }).exec(),
      RegistrationModel.distinct("swimmerId", {
        tryoutId: { $in: tryoutIds },
      }).then((ids) => ids.length),
    ]);

    return { club, memberCount, coachCount, tryoutCount, registeredSwimmerCount, pendingRegistrationCount, activeTryoutCount };
  }
}
