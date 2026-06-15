import { Queue } from 'bullmq';
import { AgentsRepository } from './agents.repository';
import { IAgentConfig, IAgentActivity, IAgentConfigSettings } from './agents.schema';
import { NotFoundError } from '../../shared/errors/domain.errors';
import { bullmqConnectionOptions } from '../../config/redis';

// ─── Queue names ──────────────────────────────────────────────────────────────

const QUEUE_NAMES = {
  DEADLINE_ALERT: 'deadline-alert',
  CLAIM_ROUTING: 'claim-routing',
  DOCUMENT_VALIDATION: 'document-validation',
  STATUS_NOTIFICATION: 'status-notification',
} as const;

// ─── Job data types ───────────────────────────────────────────────────────────

export interface DeadlineAlertJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  deadlines: Array<{ type: string; dueDate: string; daysUntilDue: number }>;
}

export interface ClaimRoutingJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  firmId: string;
}

export interface DocumentValidationJobData {
  claimId: string;
  claimNumber: string;
  state: string;
  documents: Array<{ name: string; type: string }>;
}

export interface StatusNotificationJobData {
  claimId: string;
  claimNumber: string;
  newStatus: string;
  assignedTo?: string;
  firmId: string;
}

// ─── Update type ──────────────────────────────────────────────────────────────

export interface UpdateAgentConfigData {
  isEnabled?: boolean;
  config?: IAgentConfigSettings;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Business logic layer for agent configuration management and job enqueueing.
 * Coordinates between the repository (data access) and BullMQ queues.
 */
export class AgentsService {
  private readonly deadlineAlertQueue: Queue<DeadlineAlertJobData>;
  private readonly claimRoutingQueue: Queue<ClaimRoutingJobData>;
  private readonly documentValidationQueue: Queue<DocumentValidationJobData>;
  private readonly statusNotificationQueue: Queue<StatusNotificationJobData>;

  constructor(private readonly repository: AgentsRepository) {
    const connection = bullmqConnectionOptions;

    this.deadlineAlertQueue = new Queue<DeadlineAlertJobData>(
      QUEUE_NAMES.DEADLINE_ALERT,
      { connection },
    );
    this.claimRoutingQueue = new Queue<ClaimRoutingJobData>(
      QUEUE_NAMES.CLAIM_ROUTING,
      { connection },
    );
    this.documentValidationQueue = new Queue<DocumentValidationJobData>(
      QUEUE_NAMES.DOCUMENT_VALIDATION,
      { connection },
    );
    this.statusNotificationQueue = new Queue<StatusNotificationJobData>(
      QUEUE_NAMES.STATUS_NOTIFICATION,
      { connection },
    );
  }

  /**
   * Returns all agent configuration documents.
   *
   * @returns Array of all agent configs
   */
  async getAllAgentConfigs(): Promise<IAgentConfig[]> {
    return this.repository.findAllConfigs();
  }

  /**
   * Returns a single agent config by its agentId.
   *
   * @param agentId - The unique agent identifier
   * @returns The matching agent config
   * @throws {NotFoundError} When no config exists for the given agentId
   */
  async getAgentConfig(agentId: string): Promise<IAgentConfig> {
    const config = await this.repository.findConfigById(agentId);
    if (!config) {
      throw new NotFoundError(`Agent config not found for agentId: ${agentId}`);
    }
    return config;
  }

  /**
   * Partially updates an agent config. Only super_admin / firm_admin may call this.
   *
   * @param agentId - The unique agent identifier
   * @param data - Fields to update (isEnabled, config)
   * @param performedBy - ID of the user performing the update (for audit)
   * @returns The updated agent config
   * @throws {NotFoundError} When no config exists for the given agentId
   */
  async updateAgentConfig(
    agentId: string,
    data: UpdateAgentConfigData,
    performedBy: string,
  ): Promise<IAgentConfig> {
    const existing = await this.repository.findConfigById(agentId);
    if (!existing) {
      throw new NotFoundError(`Agent config not found for agentId: ${agentId}`);
    }

    const updated = await this.repository.updateConfig(agentId, {
      ...data,
      updatedAt: new Date(),
    } as Partial<IAgentConfig>);

    if (!updated) {
      throw new NotFoundError(`Agent config not found for agentId: ${agentId}`);
    }

    // performedBy is captured here for future audit trail integration
    void performedBy;

    return updated;
  }

  /**
   * Returns recent agent activity records, optionally filtered by agentId.
   *
   * @param agentId - Optional agent ID to filter by
   * @param limit - Maximum number of records to return (default 20)
   * @returns Array of activity documents sorted newest first
   */
  async getAgentActivity(agentId?: string, limit = 20): Promise<IAgentActivity[]> {
    return this.repository.getActivity({ agentId }, limit);
  }

  /**
   * Adds a deadline-alert job to the BullMQ queue.
   *
   * @param data - Job payload containing claim and deadline information
   */
  async queueDeadlineAlert(data: DeadlineAlertJobData): Promise<void> {
    await this.deadlineAlertQueue.add(QUEUE_NAMES.DEADLINE_ALERT, data);
  }

  /**
   * Adds a claim-routing job to the BullMQ queue.
   *
   * @param data - Job payload containing claim and routing information
   */
  async queueClaimRouting(data: ClaimRoutingJobData): Promise<void> {
    await this.claimRoutingQueue.add(QUEUE_NAMES.CLAIM_ROUTING, data);
  }

  /**
   * Adds a document-validation job to the BullMQ queue.
   *
   * @param data - Job payload containing claim and document information
   */
  async queueDocumentValidation(data: DocumentValidationJobData): Promise<void> {
    await this.documentValidationQueue.add(QUEUE_NAMES.DOCUMENT_VALIDATION, data);
  }

  /**
   * Adds a status-notification job to the BullMQ queue.
   *
   * @param data - Job payload containing claim status update information
   */
  async queueStatusNotification(data: StatusNotificationJobData): Promise<void> {
    await this.statusNotificationQueue.add(QUEUE_NAMES.STATUS_NOTIFICATION, data);
  }
}
