import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RULE_STATES = ['NY', 'MI', 'FL', 'NJ'] as const;
export type RuleState = (typeof RULE_STATES)[number];

const VALIDATION_SEVERITIES = ['error', 'warning'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IDeadlines {
  nf2FilingDays: number;
  billingSubmissionDays: number;
  appealDays: number;
  paymentDays: number;
  statuteOfLimitationsYears: number;
}

export interface IValidationRule {
  ruleId: string;
  description: string;
  field?: string;
  severity: ValidationSeverity;
  isActive: boolean;
}

// ─── StateRule document interface ─────────────────────────────────────────────

export interface IStateRule extends Document {
  state: RuleState;
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
}

// ─── Model interface ──────────────────────────────────────────────────────────

export type IStateRuleModel = Model<IStateRule>;

// ─── Sub-document schemas ─────────────────────────────────────────────────────

const deadlinesSchema = new Schema<IDeadlines>(
  {
    nf2FilingDays: { type: Number, required: true },
    billingSubmissionDays: { type: Number, required: true },
    appealDays: { type: Number, required: true },
    paymentDays: { type: Number, required: true },
    statuteOfLimitationsYears: { type: Number, required: true },
  },
  { _id: false },
);

const validationRuleSchema = new Schema<IValidationRule>(
  {
    ruleId: { type: String, required: true },
    description: { type: String, required: true },
    field: { type: String },
    severity: { type: String, enum: VALIDATION_SEVERITIES, required: true, default: 'error' },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

// ─── StateRule schema ─────────────────────────────────────────────────────────

const stateRuleSchema = new Schema<IStateRule>(
  {
    state: { type: String, enum: RULE_STATES, required: true, unique: true },
    stateName: { type: String, required: true },
    deadlines: { type: deadlinesSchema, required: true },
    requiredForms: { type: [String], required: true },
    billingForms: { type: [String], required: true },
    arbitrationProvider: { type: String, required: true },
    feeScheduleVersion: { type: String },
    validationRules: { type: [validationRuleSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  {
    collection: 'state_rules',
    timestamps: true,
  },
);

// ─── Model export ─────────────────────────────────────────────────────────────

export const StateRuleModel: IStateRuleModel = mongoose.model<IStateRule, IStateRuleModel>(
  'StateRule',
  stateRuleSchema,
);
