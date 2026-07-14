import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  emailTemplatesApi,
  type EmailTemplate,
  type BulkSaveEmailTemplatesInput,
} from "../lib/api/email-templates.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const emailTemplateKeys = {
  all: ["email-templates"] as const,
};

// ─── Queries ────────────────────────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: emailTemplateKeys.all,
    queryFn: async () => {
      const data = await emailTemplatesApi.list();
      return data.templates;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useSaveEmailTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkSaveEmailTemplatesInput) => emailTemplatesApi.bulkSave(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: emailTemplateKeys.all });
    },
  });
}
