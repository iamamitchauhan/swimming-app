import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const CLAIM_STATES = ['NY', 'MI', 'FL', 'NJ'] as const;
export type ClaimState = (typeof CLAIM_STATES)[number];

export const CLAIM_STATUSES = [
  'INTAKE',
  'PENDING_VALIDATION',
  'VALIDATED',
  'FILED',
  'PENDING_ARBITRATION',
  'ARBITRATED',
  'SETTLED',
  'DENIED',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

const ISSUE_SEVERITIES = ['error', 'warning'] as const;

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IClaimant {
  name: string;
  dateOfBirth?: Date;
  phone?: string;
  email?: string;
}

export interface IInsurer {
  name: string;
  policyNumber?: string;
  claimNumber?: string;
}

export interface IDocument {
  name: string;
  url: string;
  type: string;
  uploadedAt: Date;
}

export interface IDeadline {
  type: string;
  dueDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IValidationIssue {
  ruleId: string;
  message: string;
  severity: (typeof ISSUE_SEVERITIES)[number];
}

export interface IValidationResult {
  isValid: boolean;
  checkedAt: Date;
  issues: IValidationIssue[];
}

export interface IArbitration {
  provider: string;
  filingDate?: Date;
  caseNumber?: string;
  status?: string;
  hearingDate?: Date;
}

export interface ITimelineEntry {
  event: string;
  description: string;
  performedBy: mongoose.Types.ObjectId;
  performedAt: Date;
}

// ─── Claim document interface ─────────────────────────────────────────────────

export interface IClaim extends Document {
  claimNumber: string;
  state: ClaimState;
  firmId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId | null;
  status: ClaimStatus;
  claimant: IClaimant;
  dateOfAccident: Date;
  insurer: IInsurer;
  documents: IDocument[];
  deadlines: IDeadline[];
  validationResult: IValidationResult | null;
  arbitration: IArbitration | null;
  timeline: ITimelineEntry[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Model interface ──────────────────────────────────────────────────────────

export type IClaimModel = Model<IClaim>;

// ─── Sub-document schemas ─────────────────────────────────────────────────────

const claimantSchema = new Schema<IClaimant>(
  {
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

const insurerSchema = new Schema<IInsurer>(
  {
    name: { type: String, required: true, trim: true },
    policyNumber: { type: String, trim: true },
    claimNumber: { type: String, trim: true },
  },
  { _id: false },
);

const documentSchema = new Schema<IDocument>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const deadlineSchema = new Schema<IDeadline>(
  {
    type: { type: String, required: true },
    dueDate: { type: Date, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false },
);

const validationIssueSchema = new Schema<IValidationIssue>(
  {
    ruleId: { type: String, required: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ISSUE_SEVERITIES, required: true },
  },
  { _id: false },
);

const validationResultSchema = new Schema<IValidationResult>(
  {
    isValid: { type: Boolean, required: true },
    checkedAt: { type: Date, required: true },
    issues: { type: [validationIssueSchema], default: [] },
  },
  { _id: false },
);

const arbitrationSchema = new Schema<IArbitration>(
  {
    provider: { type: String, required: true },
    filingDate: { type: Date },
    caseNumber: { type: String, trim: true },
    status: { type: String },
    hearingDate: { type: Date },
  },
  { _id: false },
);

const timelineEntrySchema = new Schema<ITimelineEntry>(
  {
    event: { type: String, required: true },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

// ─── Claim schema ─────────────────────────────────────────────────────────────

const claimSchema = new Schema<IClaim>(
  {
    claimNumber: { type: String, required: true, unique: true },
    state: { type: String, enum: CLAIM_STATES, required: true },
    firmId: { type: Schema.Types.ObjectId, ref: 'Firm', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: CLAIM_STATUSES, required: true, default: 'INTAKE' },
    claimant: { type: claimantSchema, required: true },
    dateOfAccident: { type: Date, required: true },
    insurer: { type: insurerSchema, required: true },
    documents: { type: [documentSchema], default: [] },
    deadlines: { type: [deadlineSchema], default: [] },
    validationResult: { type: validationResultSchema, default: null },
    arbitration: { type: arbitrationSchema, default: null },
    timeline: { type: [timelineEntrySchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    collection: 'claims',
    timestamps: true,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// claimNumber has unique: true in the field definition above — no separate index needed.
claimSchema.index({ firmId: 1 });
claimSchema.index({ state: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ assignedTo: 1 });
claimSchema.index({ firmId: 1, status: 1 });

// ─── Model export ─────────────────────────────────────────────────────────────

export const ClaimModel: IClaimModel = mongoose.model<IClaim, IClaimModel>('Claim', claimSchema);
