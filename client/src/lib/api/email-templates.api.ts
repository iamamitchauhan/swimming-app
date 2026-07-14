import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailTemplateType = "offer" | "rejection";

export interface EmailTemplate {
  _id: string;
  clubId: string;
  groupId: string | null;
  type: EmailTemplateType;
  subject: string;
  body: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  groupId: string | null;
  type: EmailTemplateType;
  subject: string;
  body: string;
}

export interface BulkSaveEmailTemplatesInput {
  templates: EmailTemplateInput[];
}

// ─── API calls ─────────────────────────────────────────────────────────────────

export const emailTemplatesApi = {
  /** GET /email-templates — list templates for the user's club */
  list: () => api<{ templates: EmailTemplate[] }>(apiClient.get("/email-templates")),

  /** POST /email-templates/bulk — bulk upsert templates for the user's club */
  bulkSave: (input: BulkSaveEmailTemplatesInput) =>
    api<{ templates: EmailTemplate[] }>(apiClient.post("/email-templates/bulk", input)),
};
