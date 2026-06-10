import { StateRuleModel } from './rules.schema';
import { IDeadlines, IValidationRule } from './rules.schema';

// ─── Domain types ─────────────────────────────────────────────────────────────

export type StateRule = {
  _id: string;
  state: string;
  stateName: string;
  deadlines: IDeadlines;
  requiredForms: string[];
  billingForms: string[];
  arbitrationProvider: string;
  feeScheduleVersion?: string;
  validationRules: IValidationRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertStateRuleData = {
  stateName?: string;
  deadlines?: Partial<IDeadlines>;
  requiredForms?: string[];
  billingForms?: string[];
  arbitrationProvider?: string;
  feeScheduleVersion?: string;
  validationRules?: IValidationRule[];
  isActive?: boolean;
};

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for state rules.
 * All queries return plain objects via .lean().
 * Rules are global (not tenant-scoped).
 */
export class RulesRepository {
  /**
   * Returns all state rules as plain objects.
   *
   * @returns Array of all state rule plain objects
   */
  async findAll(): Promise<StateRule[]> {
    return StateRuleModel.find().lean<StateRule[]>().exec();
  }

  /**
   * Finds a single state rule by its two-letter state code.
   *
   * @param state - Two-letter state code (e.g. 'NY')
   * @returns Plain state rule object or null if not found
   */
  async findByState(state: string): Promise<StateRule | null> {
    const doc = await StateRuleModel.findOne({ state })
      .lean<StateRule>()
      .exec();

    return doc ?? null;
  }

  /**
   * Creates or updates a state rule by state code.
   * Uses upsert semantics — safe to call if the rule does not yet exist.
   * Flattens the deadlines sub-document into dot-notation so a partial update
   * only sets the provided deadline fields instead of replacing the entire object.
   *
   * @param state - Two-letter state code used as the upsert key
   * @param data - Fields to set on the document (deadlines may be partial)
   * @returns The created or updated state rule as a plain object
   * @throws {Error} When the document cannot be found after upsert (should not occur)
   */
  async upsertByState(state: string, data: UpsertStateRuleData): Promise<StateRule> {
    // Flatten deadlines into dot-notation to avoid wiping unset fields
    const flatData: Record<string, unknown> = { state };
    const { deadlines, ...rest } = data;

    if (deadlines) {
      for (const [key, val] of Object.entries(deadlines)) {
        if (val !== undefined) {
          flatData[`deadlines.${key}`] = val;
        }
      }
    }

    // Add remaining top-level fields (excluding undefined values)
    for (const [key, val] of Object.entries(rest)) {
      if (val !== undefined) flatData[key] = val;
    }

    const result = await StateRuleModel.findOneAndUpdate(
      { state },
      { $set: flatData },
      { upsert: true, new: true, runValidators: true },
    )
      .lean<StateRule>()
      .exec();

    if (!result) throw new Error(`Failed to upsert state rule for state: ${state}`);
    return result;
  }

  /**
   * Returns the list of active state codes.
   *
   * @returns Array of two-letter state code strings for all active rules
   */
  async findActiveStates(): Promise<string[]> {
    const docs = await StateRuleModel.find({ isActive: true }, { state: 1 })
      .lean<{ state: string }[]>()
      .exec();

    return docs.map((d) => d.state);
  }
}
