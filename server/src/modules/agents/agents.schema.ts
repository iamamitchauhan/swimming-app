import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

export const AGENT_IDS = [
  'deadline-alert',
  'claim-routing',
  'document-validation',
  'status-notification',
  'arbitration-tracker',
  'next-step-guide',
  'missing-doc-checker',
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_RUN_STATUSES = ['success', 'failed', 'skipped'] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const AGENT_ACTIVITY_RESULTS = ['success', 'skipped', 'failed'] as const;
export type AgentActivityResult = (typeof AGENT_ACTIVITY_RESULTS)[number];

// ─── AgentConfig interfaces ───────────────────────────────────────────────────

export interface IAgentConfigSettings {
  alertThresholdDays?: number[];
  maxConcurrent?: number;
  notificationChannels?: string[];
  [key: string]: unknown;
}

export interface IAgentConfig extends Document {
  agentId: AgentId;
  name: string;
  isEnabled: boolean;
  schedule?: string;
  config: IAgentConfigSettings;
  lastRunAt?: Date;
  lastRunStatus?: AgentRunStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type IAgentConfigModel = Model<IAgentConfig>;

// ─── AgentActivity interfaces ─────────────────────────────────────────────────

export interface IAgentActivity extends Document {
  agentId: string;
  claimId?: mongoose.Types.ObjectId;
  action: string;
  result: AgentActivityResult;
  details: Record<string, unknown>;
  runAt: Date;
}

export type IAgentActivityModel = Model<IAgentActivity>;

// ─── AgentConfig schema ───────────────────────────────────────────────────────

const agentConfigSchema = new Schema<IAgentConfig>(
  {
    agentId: {
      type: String,
      required: true,
      unique: true,
      enum: AGENT_IDS,
    },
    name: { type: String, required: true, trim: true },
    isEnabled: { type: Boolean, default: true },
    schedule: { type: String },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastRunAt: { type: Date },
    lastRunStatus: {
      type: String,
      enum: AGENT_RUN_STATUSES,
    },
  },
  {
    collection: 'agent_configs',
    timestamps: true,
  },
);

// ─── AgentActivity schema ─────────────────────────────────────────────────────

const agentActivitySchema = new Schema<IAgentActivity>(
  {
    agentId: { type: String, required: true, index: true },
    claimId: { type: Schema.Types.ObjectId, ref: 'Claim', index: true },
    action: { type: String, required: true },
    result: {
      type: String,
      enum: AGENT_ACTIVITY_RESULTS,
      required: true,
    },
    details: { type: Schema.Types.Mixed, default: {} },
    runAt: { type: Date, default: () => new Date(), index: true },
  },
  {
    collection: 'agent_activity',
  },
);

agentActivitySchema.index({ agentId: 1, runAt: -1 });
agentActivitySchema.index({ claimId: 1, runAt: -1 });

// ─── Model exports ────────────────────────────────────────────────────────────

export const AgentConfigModel: IAgentConfigModel = mongoose.model<
  IAgentConfig,
  IAgentConfigModel
>('AgentConfig', agentConfigSchema);

export const AgentActivityModel: IAgentActivityModel = mongoose.model<
  IAgentActivity,
  IAgentActivityModel
>('AgentActivity', agentActivitySchema);
