import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────

export type EmailAuditAction = "offered" | "rejected";
export type EmailAuditMode = "single" | "bulk";
export type EmailAuditTemplateType = "custom" | "default";
export type EmailAuditStatus = "sent" | "failed";

export interface IEmailAuditLog extends Document {
  clubId: Types.ObjectId;
  tryoutId: Types.ObjectId;
  registrationId?: Types.ObjectId;
  recipientEmail: string;
  swimmerName?: string;
  parentName?: string;
  action: EmailAuditAction;
  mode: EmailAuditMode;
  templateType: EmailAuditTemplateType;
  subject: string;
  body: string;
  html: string;
  status: EmailAuditStatus;
  errorMessage?: string;
  messageId?: string;
  senderId?: Types.ObjectId;
  senderName?: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────────

const emailAuditLogSchema = new Schema<IEmailAuditLog>(
  {
    clubId: {
      type: Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    tryoutId: {
      type: Schema.Types.ObjectId,
      ref: "Tryout",
      required: true,
      index: true,
    },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: "Registration",
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    swimmerName: {
      type: String,
      trim: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      enum: ["offered", "rejected"],
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["single", "bulk"],
      required: true,
    },
    templateType: {
      type: String,
      enum: ["custom", "default"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    html: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    messageId: {
      type: String,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    senderName: {
      type: String,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "email_audit_logs",
    timestamps: true,
  },
);

// ─── Indexes ────────────────────────────────────────────────────────────────────

emailAuditLogSchema.index({ clubId: 1, sentAt: -1 });
emailAuditLogSchema.index({ tryoutId: 1, sentAt: -1 });
emailAuditLogSchema.index({ action: 1, status: 1 });

// ─── Export ─────────────────────────────────────────────────────────────────────

export const EmailAuditLogModel: Model<IEmailAuditLog> = mongoose.model<IEmailAuditLog>(
  "EmailAuditLog",
  emailAuditLogSchema,
);
