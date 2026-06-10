import { RulesRepository, StateRule, UpsertStateRuleData } from './rules.repository';
import { IDeadlines } from './rules.schema';
import { NotFoundError } from '../../shared/errors/domain.errors';
import logger from '../../shared/utils/logger';

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Business logic for the rules module.
 * Delegates all DB access to RulesRepository; never imports the ORM directly.
 */
export class RulesService {
  constructor(private readonly repository: RulesRepository) {}

  /**
   * Returns all state rules.
   *
   * @returns Array of all state rule objects
   */
  async getAllRules(): Promise<StateRule[]> {
    return this.repository.findAll();
  }

  /**
   * Returns the state rule for a given state code.
   *
   * @param state - Two-letter state code (e.g. 'NY')
   * @returns The state rule object
   * @throws {NotFoundError} When no rule exists for the given state
   */
  async getRuleByState(state: string): Promise<StateRule> {
    const rule = await this.repository.findByState(state);
    if (!rule) throw new NotFoundError(`No rule found for state: ${state}`);
    return rule;
  }

  /**
   * Creates or updates a state rule and logs the change.
   *
   * @param state - Two-letter state code to upsert
   * @param data - Rule fields to apply
   * @param performedBy - Id of the user performing the update
   * @returns The created or updated state rule
   */
  async updateRule(
    state: string,
    data: UpsertStateRuleData,
    performedBy: string,
  ): Promise<StateRule> {
    const rule = await this.repository.upsertByState(state, data);
    logger.info({ state, performedBy }, 'state.rule.updated');
    return rule;
  }

  /**
   * Returns the deadlines sub-document for a given state.
   *
   * @param state - Two-letter state code (e.g. 'NY')
   * @returns Deadlines object for the state
   * @throws {NotFoundError} When no rule exists for the given state
   */
  async getDeadlinesForState(state: string): Promise<IDeadlines> {
    const rule = await this.getRuleByState(state);
    return rule.deadlines;
  }

  /**
   * Returns the list of required forms for a given state.
   *
   * @param state - Two-letter state code (e.g. 'NY')
   * @returns Array of required form identifiers
   * @throws {NotFoundError} When no rule exists for the given state
   */
  async getRequiredFormsForState(state: string): Promise<string[]> {
    const rule = await this.getRuleByState(state);
    return rule.requiredForms;
  }
}
