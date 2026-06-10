import { AgentConfigModel, AgentActivityModel, IAgentConfig, IAgentActivity } from './agents.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateActivityData {
  agentId: string;
  claimId?: string;
  action: string;
  result: 'success' | 'skipped' | 'failed';
  details: Record<string, unknown>;
}

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for agent configs and activity records.
 * Services never import Mongoose models directly — they go through this repository.
 */
export class AgentsRepository {
  /**
   * Returns all agent configuration documents.
   *
   * @returns Array of all agent config documents
   */
  async findAllConfigs(): Promise<IAgentConfig[]> {
    return AgentConfigModel.find().lean<IAgentConfig[]>().exec();
  }

  /**
   * Finds a single agent config by its agentId field.
   *
   * @param agentId - The unique agent identifier string
   * @returns The matching config or null if not found
   */
  async findConfigById(agentId: string): Promise<IAgentConfig | null> {
    return AgentConfigModel.findOne({ agentId }).lean<IAgentConfig>().exec();
  }

  /**
   * Partially updates an agent config document by agentId.
   *
   * @param agentId - The unique agent identifier string
   * @param data - Partial fields to update
   * @returns The updated document or null if not found
   */
  async updateConfig(
    agentId: string,
    data: Partial<IAgentConfig>,
  ): Promise<IAgentConfig | null> {
    return AgentConfigModel.findOneAndUpdate(
      { agentId },
      { $set: data },
      { new: true },
    )
      .lean<IAgentConfig>()
      .exec();
  }

  /**
   * Inserts a new agent activity record.
   *
   * @param data - Activity fields to persist
   */
  async recordActivity(data: CreateActivityData): Promise<void> {
    await AgentActivityModel.create(data);
  }

  /**
   * Returns recent agent activity records, optionally filtered by agentId.
   *
   * @param filter - Optional filter object containing agentId
   * @param limit - Maximum number of records to return
   * @returns Array of activity documents sorted by runAt descending
   */
  async getActivity(
    filter: { agentId?: string },
    limit: number,
  ): Promise<IAgentActivity[]> {
    const query = filter.agentId ? { agentId: filter.agentId } : {};
    return AgentActivityModel.find(query)
      .sort({ runAt: -1 })
      .limit(limit)
      .lean<IAgentActivity[]>()
      .exec();
  }
}
