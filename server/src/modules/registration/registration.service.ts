import { RegistrationRepository, PlainRegistration, RegistrationListParams, RegistrationListResult } from './registration.repository';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../shared/errors/domain.errors';
import { TryoutRepository } from '../tryout/tryout.repository';
import { SwimmerRepository } from '../swimmer/swimmer.repository';
import logger from '../../shared/utils/logger';

export class RegistrationService {
  constructor(
    private readonly repo: RegistrationRepository,
    private readonly tryoutRepo: TryoutRepository,
    private readonly swimmerRepo: SwimmerRepository
  ) {}

  /**
   * Lists registrations for the authenticated parent's swimmers
   */
  async listByParent(parentId: string, params: RegistrationListParams = {}): Promise<RegistrationListResult> {
    return this.repo.findByParent(parentId, params);
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
  async create(
    data: Omit<PlainRegistration, '_id' | 'createdAt' | 'updatedAt' | 'waitlistPosition' | 'registeredAt' | 'status'>,
    parentId: string
  ): Promise<PlainRegistration> {
    const { tryoutId, swimmerId, sessionId, segmentId } = data;

    // 1. Validate tryout exists and is open
    const tryout = await this.tryoutRepo.findById(tryoutId);
    if (!tryout) throw new NotFoundError('Tryout not found');
    if (tryout.status !== 'open') throw new BadRequestError('Tryout is not open for registration');

    // 2. Validate swimmer exists and belongs to parent
    const swimmer = await this.swimmerRepo.findById(swimmerId);
    if (!swimmer) throw new NotFoundError('Swimmer not found');
    if (swimmer.parentId !== parentId) throw new ForbiddenError('Swimmer does not belong to this parent');

    // 3. Validate session and segment exist
    const session = tryout.sessions.find((s: any) => s.id === sessionId);
    if (!session) throw new NotFoundError('Session not found');

    const segment = tryout.segments.find((s: any) => s.id === segmentId);
    if (!segment) throw new NotFoundError('Segment not found');

    // 4. Validate swimmer age fits segment
    const swimmerAge = this.calculateAge(swimmer.birthDate);
    if (swimmerAge < segment.minAge || swimmerAge > segment.maxAge) {
      throw new BadRequestError(`Swimmer age ${swimmerAge} does not fit segment requirements (${segment.minAge}-${segment.maxAge})`);
    }

    // 5. Check for existing registration (application-level validation)
    const existingRegistration = await this.repo.findByTryoutAndSwimmer(tryoutId, swimmerId);
    if (existingRegistration && existingRegistration.status !== 'cancelled') {
      throw new ConflictError('Swimmer is already registered for this tryout');
    }

    // 6. Calculate capacity and determine status
    const capacityInfo = await this.calculateSessionCapacity(tryoutId, sessionId, tryout);
    const status = capacityInfo.hasCapacity ? 'registered' : 'waitlisted';
    const waitlistPosition = status === 'waitlisted' ? capacityInfo.nextWaitlistPosition : undefined;

    // 7. Create registration
    const registrationData = {
      ...data,
      parentId,
      status: status as PlainRegistration['status'],
      waitlistPosition,
      registeredAt: new Date(),
    };

    const created = await this.repo.create(registrationData);

    // 8. Update tryout registration counts
    await this.tryoutRepo.updateRegistrationCounts(tryoutId);

    logger.info({ 
      registrationId: created._id, 
      tryoutId, 
      swimmerId, 
      parentId, 
      status 
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
    tryout: any
  ): Promise<{ hasCapacity: boolean; nextWaitlistPosition: number }> {
    // Count current registered swimmers in this session
    const registeredCount = await this.repo.countBySessionAndStatus(tryoutId, sessionId, 'registered');
    
    // Calculate session capacity
    const session = tryout.sessions.find((s: any) => s.id === sessionId);
    if (!session) throw new NotFoundError('Session not found');

    const [startHour, startMin] = session.startTime.split(':').map(Number);
    const [endHour, endMin] = session.endTime.split(':').map(Number);
    const sessionDurationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    const sessionCapacity = Math.floor(sessionDurationMinutes / tryout.slotDuration) * tryout.swimmersPerSlot;
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
