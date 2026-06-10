import { ClaimsRepository, ClaimFilters, CreateClaimData, UpdateClaimData, Claim } from './claims.repository';
import { ClaimStatus, CLAIM_STATUSES } from './claims.schema';
import { NotFoundError } from '../../shared/errors/domain.errors';
import { PaginatedResponse, PaginationQuery } from '../../shared/types/index';
import logger from '../../shared/utils/logger';

// ─── Public shape ─────────────────────────────────────────────────────────────

export type PublicClaim = {
  id: string;
  claimNumber: string;
  state: string;
  firmId: string;
  assignedTo: string | null;
  status: ClaimStatus;
  claimant: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  dateOfAccident: Date;
  insurer: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  documents: Array<{ name: string; url: string; type: string; uploadedAt: Date }>;
  deadlines: Array<{
    type: string;
    dueDate: Date;
    isCompleted: boolean;
    completedAt?: Date;
  }>;
  validationResult: {
    isValid: boolean;
    checkedAt: Date;
    issues: Array<{ ruleId: string; message: string; severity: string }>;
  } | null;
  arbitration: {
    provider: string;
    filingDate?: Date;
    caseNumber?: string;
    status?: string;
    hearingDate?: Date;
  } | null;
  timeline: Array<{
    event: string;
    description: string;
    performedBy: string;
    performedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Input types ──────────────────────────────────────────────────────────────

export type CreateClaimInput = {
  state: string;
  claimant: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  dateOfAccident: Date;
  insurer: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  assignedTo?: string;
};

export type UpdateClaimInput = {
  claimant?: {
    name: string;
    dateOfBirth?: Date;
    phone?: string;
    email?: string;
  };
  insurer?: {
    name: string;
    policyNumber?: string;
    claimNumber?: string;
  };
  assignedTo?: string | null;
  dateOfAccident?: Date;
};

// ─── Timeline event name constants ────────────────────────────────────────────

const TIMELINE_EVENTS = {
  CLAIM_CREATED: 'CLAIM_CREATED',
  CLAIM_UPDATED: 'CLAIM_UPDATED',
  CLAIM_DELETED: 'CLAIM_DELETED',
  STATUS_CHANGED: 'STATUS_CHANGED',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a raw Claim repository object to the public API shape.
 * Excludes isDeleted and __v; converts ObjectIds to strings.
 *
 * @param claim - Raw claim from the repository
 * @returns Public representation of the claim
 */
function toPublicClaim(claim: Claim): PublicClaim {
  return {
    id: claim._id.toString(),
    claimNumber: claim.claimNumber,
    state: claim.state,
    firmId: claim.firmId.toString(),
    assignedTo: claim.assignedTo ? claim.assignedTo.toString() : null,
    status: claim.status,
    claimant: claim.claimant,
    dateOfAccident: claim.dateOfAccident,
    insurer: claim.insurer,
    documents: claim.documents,
    deadlines: claim.deadlines,
    validationResult: claim.validationResult,
    arbitration: claim.arbitration,
    timeline: claim.timeline.map((entry) => ({
      event: entry.event,
      description: entry.description,
      performedBy: entry.performedBy.toString(),
      performedAt: entry.performedAt,
    })),
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
  };
}

/**
 * Returns true when the requested status transition is considered "forward"
 * in the standard claims lifecycle order.
 *
 * @param from - Current status
 * @param to - Desired next status
 * @returns Whether the transition is forward
 */
function isForwardTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  const fromIndex = CLAIM_STATUSES.indexOf(from);
  const toIndex = CLAIM_STATUSES.indexOf(to);
  return toIndex > fromIndex;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Business logic for the claims module.
 * Delegates all DB access to ClaimsRepository; never imports the ORM directly.
 */
export class ClaimsService {
  constructor(private readonly repository: ClaimsRepository) {}

  /**
   * Returns a paginated list of non-deleted claims for a firm.
   *
   * @param firmId - Owning firm id (tenant isolation)
   * @param filters - Optional field filters and search term
   * @param pagination - Cursor and limit for paging
   * @returns Paginated public claims
   */
  async listClaims(
    firmId: string,
    filters: ClaimFilters,
    pagination: PaginationQuery,
  ): Promise<PaginatedResponse<PublicClaim>> {
    const result = await this.repository.findAll(firmId, filters, pagination);
    return {
      items: result.items.map(toPublicClaim),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  /**
   * Retrieves a single claim by id, scoped to the owning firm.
   *
   * @param id - The claim's id
   * @param firmId - Owning firm id (tenant isolation)
   * @returns Public claim
   * @throws {NotFoundError} When claim does not exist or does not belong to the firm
   */
  async getClaim(id: string, firmId: string): Promise<PublicClaim> {
    const claim = await this.repository.findById(id, firmId);
    if (!claim) throw new NotFoundError('Claim not found');
    return toPublicClaim(claim);
  }

  /**
   * Creates a new claim, auto-generates the claim number, and records the initial timeline event.
   *
   * @param data - Claim creation payload
   * @param performedBy - Id of the user performing the action
   * @returns The newly created public claim
   */
  async createClaim(data: CreateClaimInput & { firmId: string }, performedBy: string): Promise<PublicClaim> {
    const claimNumber = await this.repository.generateClaimNumber(data.state);

    const createData: CreateClaimData = {
      claimNumber,
      state: data.state,
      firmId: data.firmId,
      claimant: data.claimant,
      dateOfAccident: data.dateOfAccident,
      insurer: data.insurer,
      ...(data.assignedTo && { assignedTo: data.assignedTo }),
    };

    const claim = await this.repository.create(createData);

    await this.repository.addTimelineEvent(claim._id.toString(), data.firmId, {
      event: TIMELINE_EVENTS.CLAIM_CREATED,
      description: 'Claim created',
      performedBy,
    });

    logger.info({ claimId: claim._id.toString(), claimNumber, firmId: data.firmId }, 'claim.created');

    // Reload with the timeline entry included
    const updated = await this.repository.findById(claim._id.toString(), data.firmId);
    if (!updated) throw new NotFoundError('Claim not found after creation');
    return toPublicClaim(updated);
  }

  /**
   * Partially updates an existing claim and records an update timeline event.
   *
   * @param id - The claim's id
   * @param firmId - Owning firm id (tenant isolation)
   * @param data - Fields to update
   * @param performedBy - Id of the user performing the action
   * @returns Updated public claim
   * @throws {NotFoundError} When claim does not exist or does not belong to the firm
   */
  async updateClaim(
    id: string,
    firmId: string,
    data: UpdateClaimInput,
    performedBy: string,
  ): Promise<PublicClaim> {
    const updateData: UpdateClaimData = {};

    if (data.claimant !== undefined) updateData.claimant = data.claimant;
    if (data.insurer !== undefined) updateData.insurer = data.insurer;
    if (data.dateOfAccident !== undefined) updateData.dateOfAccident = data.dateOfAccident;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

    const claim = await this.repository.update(id, firmId, updateData);
    if (!claim) throw new NotFoundError('Claim not found');

    await this.repository.addTimelineEvent(id, firmId, {
      event: TIMELINE_EVENTS.CLAIM_UPDATED,
      description: 'Claim updated',
      performedBy,
    });

    logger.info({ claimId: id, firmId }, 'claim.updated');

    const updated = await this.repository.findById(id, firmId);
    if (!updated) throw new NotFoundError('Claim not found after update');
    return toPublicClaim(updated);
  }

  /**
   * Soft-deletes a claim and records a deletion timeline event.
   *
   * @param id - The claim's id
   * @param firmId - Owning firm id (tenant isolation)
   * @param performedBy - Id of the user performing the action
   * @throws {NotFoundError} When claim does not exist or does not belong to the firm
   */
  async deleteClaim(id: string, firmId: string, performedBy: string): Promise<void> {
    const deleted = await this.repository.softDelete(id, firmId);
    if (!deleted) throw new NotFoundError('Claim not found');

    await this.repository.addTimelineEvent(id, firmId, {
      event: TIMELINE_EVENTS.CLAIM_DELETED,
      description: 'Claim deleted',
      performedBy,
    });

    logger.info({ claimId: id, firmId }, 'claim.deleted');
  }

  /**
   * Updates the status of a claim and records a status-change timeline event.
   * Logs a warning for unexpected backward transitions but still allows them.
   *
   * @param id - The claim's id
   * @param firmId - Owning firm id (tenant isolation)
   * @param status - The desired new status
   * @param performedBy - Id of the user performing the action
   * @returns Updated public claim
   * @throws {NotFoundError} When claim does not exist or does not belong to the firm
   */
  async updateClaimStatus(
    id: string,
    firmId: string,
    status: ClaimStatus,
    performedBy: string,
  ): Promise<PublicClaim> {
    const existing = await this.repository.findById(id, firmId);
    if (!existing) throw new NotFoundError('Claim not found');

    if (!isForwardTransition(existing.status, status)) {
      logger.warn(
        { claimId: id, from: existing.status, to: status },
        'claim.status.backward_transition',
      );
    }

    const claim = await this.repository.updateStatus(id, firmId, status);
    if (!claim) throw new NotFoundError('Claim not found');

    await this.repository.addTimelineEvent(id, firmId, {
      event: TIMELINE_EVENTS.STATUS_CHANGED,
      description: `Status changed from ${existing.status} to ${status}`,
      performedBy,
    });

    logger.info({ claimId: id, firmId, from: existing.status, to: status }, 'claim.status.updated');

    const updated = await this.repository.findById(id, firmId);
    if (!updated) throw new NotFoundError('Claim not found after status update');
    return toPublicClaim(updated);
  }
}
