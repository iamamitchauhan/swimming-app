import { RegistrationRepository, PlainRegistration, RegistrationListParams, RegistrationListResult } from './registration.repository';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../shared/errors/domain.errors';
import { TryoutRepository } from '../tryout/tryout.repository';
import { TryoutSessionRepository } from '../tryout/tryout-session.repository';
import { TryoutSlotRepository } from '../tryout/tryout-slot.repository';
import { SwimmerRepository } from '../swimmer/swimmer.repository';
import { CreateRegistrationInput } from './registration.validation';
import logger from '../../shared/utils/logger';

export class RegistrationService {
  constructor(
    private readonly repo: RegistrationRepository,
    private readonly tryoutRepo: TryoutRepository,
    private readonly sessionRepo: TryoutSessionRepository,
    private readonly slotRepo: TryoutSlotRepository,
    private readonly swimmerRepo: SwimmerRepository
  ) {}

  /**
   * Lists registrations for the authenticated parent's swimmers
   */
  async listByParent(parentId: string, params: RegistrationListParams = {}): Promise<RegistrationListResult> {
    return this.repo.findByParent(parentId, params);
  }

  /**
   * Returns all tryouts where the parent registered their children,
   * grouped by tryout with each child's status and scores.
   */
  async listParentTryouts(parentId: string): Promise<Array<{
    tryout: {
      _id: string;
      name: string;
      status: string;
      location: string;
      description: string;
      theme: string;
      bannerUrl: string;
      createdAt: Date;
    };
    children: Array<{
      registrationId: string;
      swimmerId: string;
      firstName: string;
      lastName: string;
      ageOnTryoutDay: number;
      status: string;
      scores: PlainRegistration['scores'];
      registeredAt: Date;
    }>;
  }>> {
    const registrations = await this.repo.findAllByParent(parentId);

    const tryoutMap = new Map<string, {
      tryout: any;
      children: any[];
    }>();

    for (const reg of registrations) {
      const tryout = reg.tryoutId as any;
      const tryoutId = tryout._id?.toString?.() ?? tryout.toString?.() ?? tryout;

      if (!tryoutMap.has(tryoutId)) {
        tryoutMap.set(tryoutId, {
          tryout: {
            _id: tryoutId,
            name: tryout.name ?? '',
            status: tryout.status ?? '',
            location: tryout.location ?? '',
            description: tryout.description ?? '',
            theme: tryout.theme ?? '',
            bannerUrl: tryout.bannerUrl ?? '',
            createdAt: tryout.createdAt,
          },
          children: [],
        });
      }

      const swimmer = reg.swimmerId as any;
      const entry = tryoutMap.get(tryoutId)!;
      entry.children.push({
        registrationId: reg._id,
        swimmerId: swimmer._id?.toString?.() ?? swimmer.toString?.() ?? swimmer,
        firstName: reg.swimmerDetails.firstName,
        lastName: reg.swimmerDetails.lastName,
        ageOnTryoutDay: reg.swimmerDetails.ageOnTryoutDay,
        status: reg.status,
        scores: reg.scores,
        registeredAt: reg.registeredAt,
      });
    }

    return Array.from(tryoutMap.values());
  }

  /**
   * Returns a single registration by ID with ownership validation
   */
  async getById(id: string, parentId: string): Promise<PlainRegistration> {
    const registration = await this.repo.findById(id);
    if (!registration) throw new NotFoundError('Registration not found');
    
    // Ownership validation
    if (registration.parentId !== parentId) {
      throw new ForbiddenError('Access denied');
    }
    
    return registration;
  }

  /**
   * Creates a new registration with comprehensive validation
   */
  async create(input: CreateRegistrationInput, parentId: string): Promise<PlainRegistration> {
    const {
      tryoutId, sessionId, slotId, segmentId,
      swimmerFirstName, swimmerLastName, swimmerDob, ageOnTryoutDay,
      hasUsaMembership, usaMembershipId, clubName,
      swimTime50Free, swimTime100Free, strokes, starts, turns,
      guardianName, guardianEmail,
    } = input;

    // 1. Validate tryout exists and is open
    const tryout = await this.tryoutRepo.findById(tryoutId);
    if (!tryout) throw new NotFoundError('Tryout not found');
    if (tryout.status !== 'open') throw new BadRequestError('Tryout is not open for registration');

    // 2. Validate session belongs to this tryout
    const session = await this.sessionRepo.findById(sessionId);
    if (!session || session.tryoutId.toString() !== tryoutId) throw new NotFoundError('Session not found');

    // 3. Validate slot belongs to this session and has capacity
    const slot = await this.slotRepo.findById(slotId);
    if (!slot || slot.sessionId.toString() !== sessionId) throw new NotFoundError('Slot not found');
    if (slot.registeredCount >= slot.capacity) {
      throw new BadRequestError('This slot is full. Please choose another slot.');
    }

    // 4. Create or find swimmer record
    const birthDate = new Date(swimmerDob);
    let swimmer = await this.swimmerRepo.findByParentAndName(
      parentId, swimmerFirstName, swimmerLastName
    );
    if (!swimmer) {
      swimmer = await this.swimmerRepo.create({
        parentId,
        firstName: swimmerFirstName,
        lastName: swimmerLastName,
        birthDate,
        usaMembershipId: hasUsaMembership ? usaMembershipId : undefined,
        clubName: clubName || undefined,
        isActive: true,
      });
    }

    // 5. Check for duplicate registration
    const existing = await this.repo.findByTryoutAndSwimmer(tryoutId, swimmer._id);
    if (existing && existing.status !== 'cancelled') {
      throw new ConflictError('This swimmer is already registered for this tryout.');
    }

    // 6. Calculate waitlist position if needed
    const capacityInfo = await this.calculateSessionCapacity(tryoutId, sessionId, session);
    const status = capacityInfo.hasCapacity ? 'registered' : 'waitlisted';
    const waitlistPosition = status === 'waitlisted' ? capacityInfo.nextWaitlistPosition : undefined;

    // 7. Create registration with all form data embedded
    const created = await this.repo.create({
      tryoutId,
      swimmerId: swimmer._id,
      parentId,
      sessionId,
      slotId,
      segmentId,
      emailSent: false,
      swimmerDetails: {
        firstName: swimmerFirstName,
        lastName: swimmerLastName,
        dob: swimmerDob,
        ageOnTryoutDay,
        hasUsaMembership,
        usaMembershipId: hasUsaMembership ? usaMembershipId : '',
        clubName: clubName || '',
        swimTime50Free: swimTime50Free || '',
        swimTime100Free: swimTime100Free || '',
        strokes,
        starts,
        turns,
        guardianName,
        guardianEmail,
      },
      status: status as PlainRegistration['status'],
      waitlistPosition,
      registeredAt: new Date(),
    });

    // 8. Increment slot registered count
    await this.slotRepo.incrementRegisteredCount(slotId);

    // 9. Update tryout registration counts
    await this.tryoutRepo.updateRegistrationCounts(tryoutId);

    logger.info({
      registrationId: created._id,
      tryoutId,
      slotId,
      swimmerId: swimmer._id,
      parentId,
      status,
    }, 'registration.created');

    return created;
  }

  /**
   * Updates registration status (for cancellations, etc.)
   */
  async updateStatus(
    id: string,
    parentId: string,
    status: PlainRegistration['status']
  ): Promise<PlainRegistration> {
    // Validate ownership
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Registration not found');
    if (existing.parentId !== parentId) throw new ForbiddenError('Access denied');

    // Update registration
    const updated = await this.repo.update(id, { status });
    if (!updated) throw new NotFoundError('Registration not found');

    // Update tryout counts
    await this.tryoutRepo.updateRegistrationCounts(existing.tryoutId);

    logger.info({ registrationId: id, status }, 'registration.status.updated');

    return updated;
  }

  /**
   * Calculates session capacity and waitlist position
   */
  private async calculateSessionCapacity(
    tryoutId: string,
    sessionId: string,
    session: { totalSlots: number; swimmersPerSlot: number }
  ): Promise<{ hasCapacity: boolean; nextWaitlistPosition: number }> {
    const registeredCount = await this.repo.countBySessionAndStatus(tryoutId, sessionId, 'registered');

    const sessionCapacity = session.totalSlots * session.swimmersPerSlot;
    const hasCapacity = registeredCount < sessionCapacity;

    // Calculate next waitlist position if needed
    let nextWaitlistPosition = 1;
    if (!hasCapacity) {
      const maxWaitlistPosition = await this.repo.getMaxWaitlistPosition(tryoutId);
      nextWaitlistPosition = maxWaitlistPosition + 1;
    }

    return { hasCapacity, nextWaitlistPosition };
  }

  /**
   * Calculates age from birth date
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
