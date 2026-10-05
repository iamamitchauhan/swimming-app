/**
 * Scoring-question hooks
 *
 * useScoringQuestionBankQuery(clubId)   → GET /clubs/:clubId/scoring-questions
 * useSegmentQuestionsQuery(tryoutId)    → GET /tryouts/:id/segment-questions
 * useScoringQuestionPreviewMutation()   → POST .../preview
 * useScoringQuestionImportMutation()    → POST .../import   + invalidate bank
 * useDeleteScoringQuestionMutation()    → DELETE .../:questionId + invalidate bank
 * useDeleteScoringQuestionsMutation()   → DELETE .../bulk + invalidate bank
 * useSaveSegmentQuestionsMutation()     → PUT /tryouts/:id/segment-questions
 * useDownloadScoringQuestionTemplateMutation() → GET .../template
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { scoringQuestionsApi } from "../lib/api/scoring-questions.api";
import {
  tryoutsApi,
  type SaveTryoutSegmentQuestionsInput,
} from "../lib/api/tryouts.api";
import { tryoutKeys } from "./use-tryouts";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const scoringQuestionKeys = {
  bank: (clubId: string) => ["scoring-questions", clubId] as const,
  segmentQuestions: (tryoutId: string) =>
    ["tryouts", tryoutId, "segment-questions"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useScoringQuestionBankQuery(clubId: string | undefined) {
  return useQuery({
    queryKey: scoringQuestionKeys.bank(clubId ?? ""),
    queryFn: () => scoringQuestionsApi.list(clubId as string),
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

export function useSegmentQuestionsQuery(tryoutId: string | undefined) {
  return useQuery({
    queryKey: scoringQuestionKeys.segmentQuestions(tryoutId ?? ""),
    queryFn: () => tryoutsApi.getSegmentQuestions(tryoutId as string),
    enabled: !!tryoutId,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useScoringQuestionPreviewMutation(clubId: string) {
  return useMutation({
    mutationFn: (file: File) => scoringQuestionsApi.preview(clubId, file),
  });
}

export function useScoringQuestionImportMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => scoringQuestionsApi.import(clubId, file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      const skipped =
        result.skipped > 0
          ? ` (${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped)`
          : "";
      toast.success(
        `Imported ${result.created} question${result.created === 1 ? "" : "s"}${skipped}.`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to import questions."),
  });
}

export function useDeleteScoringQuestionMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => scoringQuestionsApi.remove(clubId, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      toast.success("Question removed.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove question."),
  });
}

export function useDeleteScoringQuestionsMutation(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => scoringQuestionsApi.removeMany(clubId, ids),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: scoringQuestionKeys.bank(clubId) });
      toast.success(
        `Removed ${result.deleted} question${result.deleted === 1 ? "" : "s"} from the bank.`,
      );
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove questions."),
  });
}

export function useSaveSegmentQuestionsMutation(tryoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (segments: SaveTryoutSegmentQuestionsInput[]) =>
      tryoutsApi.saveSegmentQuestions(tryoutId, segments),
    onSuccess: (data) => {
      qc.setQueryData(scoringQuestionKeys.segmentQuestions(tryoutId), data);
      qc.invalidateQueries({ queryKey: tryoutKeys.detail(tryoutId) });
      toast.success("Segment questions saved.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to save segment questions."),
  });
}

export function useDownloadScoringQuestionTemplateMutation() {
  return useMutation({
    mutationFn: (clubId: string) => scoringQuestionsApi.template(clubId),
  });
}
