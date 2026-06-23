import { WaitlistRepository, PlainWaitlistEntry, WaitlistListParams, WaitlistListResult } from "./waitlist.repository";
import { TryoutRepository } from "../tryout/tryout.repository";
import { JoinWaitlistInput } from "./waitlist.validation";
import { ConflictError, NotFoundError, BadRequestError } from "../../shared/errors/domain.errors";
import { sendWaitlistConfirmationEmail, sendSlotAvailableEmail } from "../../shared/utils/mailer";
import { config } from "../../config/env";
import logger from "../../shared/utils/logger";

export class WaitlistService {
  constructor(
    private readonly repo: WaitlistRepository,
    private readonly tryoutRepo: TryoutRepository,
  ) {}

  /**
   * Adds a parent/swimmer to the waitlist for a given tryout.
   */
  async join(tryoutId: string, input: JoinWaitlistInput, parentId?: string): Promise<PlainWaitlistEntry> {
    const { swimmerFirstName, swimmerLastName, ageOnTryoutDay, segmentId, guardianName, guardianEmail } = input;

    // 1. Verify tryout exists and is open
    const tryout = await this.tryoutRepo.findById(tryoutId);
    if (!tryout) throw new NotFoundError("Tryout not found");
    if (tryout.status !== "open") throw new BadRequestError("Tryout is not open for registration");

    // // 2. Prevent duplicate waitlist entries
    // const existing = await this.repo.findByTryoutAndEmail(tryoutId, guardianEmail);
    // if (existing) throw new ConflictError("This email is already on the waitlist for this tryout.");

    // 2. Auto-assign position
    const maxPosition = await this.repo.getMaxPosition(tryoutId);
    const waitlistPosition = maxPosition + 1;

    // 3. Save entry
    const entry = await this.repo.create({
      tryoutId,
      parentId: parentId ?? undefined,
      swimmerFirstName,
      swimmerLastName,
      ageOnTryoutDay,
      segmentId: segmentId || undefined,
      guardianName,
      guardianEmail,
      waitlistPosition,
      joinedAt: new Date(),
    });

    // 4. Send confirmation email (fire-and-forget)
    sendWaitlistConfirmationEmail({
      to: guardianEmail,
      swimmerName: `${swimmerFirstName} ${swimmerLastName}`.trim(),
      tryoutName: tryout.name ?? "",
    }).catch((err: unknown) => logger.error({ err }, "waitlist.confirmation.email.failed"));

    logger.info({ tryoutId, guardianEmail, waitlistPosition }, "waitlist.joined");

    return entry;
  }

  /**
   * Returns a paginated, searchable, sortable list of waitlist entries for a tryout.
   */
  async listByTryout(tryoutId: string, params: WaitlistListParams): Promise<WaitlistListResult> {
    return this.repo.listByTryout(tryoutId, params);
  }

  /**
   * Returns a single waitlist entry by its ID.
   */
  async getEntry(id: string): Promise<PlainWaitlistEntry> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundError("Waitlist entry not found");
    return entry;
  }

  /**
   * Removes a waitlist entry by ID (called after successful registration).
   */
  async removeEntry(id: string): Promise<void> {
    await this.repo.deleteById(id);
  }

  /**
   * Notifies all waitlisted parents for a tryout that a slot has opened.
   * Called automatically when a registration is cancelled.
   */
  async notifyWaitlistForTryout(tryoutId: string): Promise<void> {
    const entries = await this.repo.findByTryout(tryoutId);
    if (entries.length === 0) return;

    const tryout = await this.tryoutRepo.findById(tryoutId);
    const tryoutName = tryout?.name ?? "";
    const signupLink = `${config.LANDING_BASE_URL}/tryouts/${tryoutId}`;

    console.info("entries => ", entries);

    const notifiedAt = new Date();

    await Promise.allSettled(
      entries.map((entry) =>
        sendSlotAvailableEmail({
          to: entry.guardianEmail,
          swimmerName: `${entry.swimmerFirstName} ${entry.swimmerLastName}`.trim(),
          tryoutName,
          signupLink: `${signupLink}?q=${entry._id}`,
        }).catch((err) => logger.error({ err: err as Error, to: entry.guardianEmail }, "waitlist.slot.available.email.failed")),
      ),
    );

    await this.repo.markAllNotified(tryoutId, notifiedAt);

    logger.info({ tryoutId, count: entries.length }, "waitlist.notified");
  }
}
