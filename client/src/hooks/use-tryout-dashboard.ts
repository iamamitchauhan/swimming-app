/**
 * Tryout dashboard hooks
 *
 * useTryoutRegistration(id, params)  → GET /tryouts/:id/registrations (paginated)
 * useTryoutSlots(id)                 → GET /tryouts/:id/slots
 * useTryoutLeaderboard(id, enabled)  → GET /tryouts/:id/leaderboard
 * useSendDecision()                  → PUT .../decision  + cache invalidation
 * usePromoteWaitlist()               → PUT .../promote   + cache invalidation
 * useSaveScore()                     → PUT .../score     + cache invalidation
 * useResetScore()                    → DELETE .../score  + cache invalidation
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, api } from "../lib/api/client";
import {
  tryoutsApi,
  type RegistrationListParams,
  type RegistrationListResult,
  type TryoutSlot,
  type LeaderboardEntry,
  type Registration,
  type WaitlistListParams,
  type WaitlistListResult,
} from "../lib/api/tryouts.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const tryoutDashboardKeys = {
  roster: (id: string, params: RegistrationListParams) =>
    ["tryouts", id, "roster", params] as const,
  allRegistrations: (id: string) => ["tryouts", id, "all-registrations"] as const,
  slots: (id: string) => ["tryouts", id, "slots"] as const,
  leaderboard: (id: string) => ["tryouts", id, "leaderboard"] as const,
  waitlist: (id: string, params: WaitlistListParams) =>
    ["tryouts", id, "waitlist", params] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTryoutRegistration(
  id: string,
  params: RegistrationListParams = {},
  enabled = true,
) {
  return useQuery<RegistrationListResult>({
    queryKey: tryoutDashboardKeys.roster(id, params),
    queryFn: () => tryoutsApi.getRegistrations(id, params),
    enabled: !!id && enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useTryoutSlots(id: string) {
  return useQuery<TryoutSlot[]>({
    queryKey: tryoutDashboardKeys.slots(id),
    queryFn: () => tryoutsApi.getSlots(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useTryoutLeaderboard(id: string, enabled: boolean) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: tryoutDashboardKeys.leaderboard(id),
    queryFn: () => api<LeaderboardEntry[]>(apiClient.get(`/tryouts/${id}/leaderboard`)),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useWaitlistByTryout(id: string, params: WaitlistListParams = {}) {
  return useQuery<WaitlistListResult>({
    queryKey: tryoutDashboardKeys.waitlist(id, params),
    queryFn: () => tryoutsApi.getWaitlist(id, params),
    enabled: !!id,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSendDecision(tryoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ regId, status }: { regId: string; status: "offered" | "rejected" }) =>
      api(apiClient.put(`/tryouts/${tryoutId}/registrations/${regId}/decision`, { status })),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["tryouts", tryoutId, "roster"] });
      qc.invalidateQueries({ queryKey: tryoutDashboardKeys.allRegistrations(tryoutId) });
      qc.invalidateQueries({ queryKey: tryoutDashboardKeys.leaderboard(tryoutId) });
      toast.success(status === "offered" ? "Offer sent!" : "Rejected.");
    },
    onError: () => toast.error("Failed to update status."),
  });
}

export function usePromoteWaitlist(tryoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (regId: string) =>
      api(apiClient.put(`/tryouts/${tryoutId}/registrations/${regId}/promote`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tryouts", tryoutId, "roster"] });
      qc.invalidateQueries({ queryKey: tryoutDashboardKeys.allRegistrations(tryoutId) });
      qc.invalidateQueries({ queryKey: tryoutDashboardKeys.slots(tryoutId) });
      toast.success("Promoted from waitlist!");
    },
    onError: () => toast.error("Failed to promote."),
  });
}

export function useSaveScore(tryoutId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ regId, edits }: { regId: string; edits: Partial<Registration> }) =>
      api(apiClient.put(`/tryouts/${tryoutId}/registrations/${regId}/score`, edits)),

    // Optimistically update all cached roster queries before the API call
    onMutate: async ({ regId, edits }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["tryouts", tryoutId, "roster"] });

      // Snapshot for rollback
      const queries = qc.getQueriesData<RegistrationListResult>({
        queryKey: ["tryouts", tryoutId, "roster"],
      });

      // Patch every matching roster query (merge detailed_scores, don't replace)
      qc.getQueriesData<RegistrationListResult>({
        queryKey: ["tryouts", tryoutId, "roster"],
      }).forEach(([key, data]) => {
        if (data?.registrations) {
          qc.setQueryData<RegistrationListResult>(key, {
            ...data,
            registrations: data.registrations.map((r) => {
              if (r.id !== regId) return r;
              const next = { ...r, ...edits } as Registration;
              if (edits.detailed_scores) {
                next.detailed_scores = { ...r.detailed_scores, ...edits.detailed_scores };
              }
              return next;
            }),
          });
        }
      });

      return { queries };
    },

    // If the mutation fails, roll back to the snapshot
    onError: (_err, _vars, ctx) => {
      if (ctx?.queries) {
        ctx.queries.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
      toast.error("Failed to save score.");
    },

    // On success, silently invalidate in background (no loading flicker)
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tryouts", tryoutId, "leaderboard"] });
      toast.success("Saved.", { id: "score-toast-success" });
    },
  });
}

export function useResetScore(tryoutId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (regId: string) =>
      api(apiClient.delete(`/tryouts/${tryoutId}/registrations/${regId}/score`)),

    onMutate: async (regId) => {
      await qc.cancelQueries({ queryKey: ["tryouts", tryoutId, "roster"] });

      const queries = qc.getQueriesData<RegistrationListResult>({
        queryKey: ["tryouts", tryoutId, "roster"],
      });

      qc.getQueriesData<RegistrationListResult>({
        queryKey: ["tryouts", tryoutId, "roster"],
      }).forEach(([key, data]) => {
        if (data?.registrations) {
          qc.setQueryData<RegistrationListResult>(key, {
            ...data,
            registrations: data.registrations.map((r) =>
              r.id === regId
                ? {
                    ...r,
                    detailed_scores: {},
                    total_score: undefined,
                    freestyle: undefined,
                    backstroke: undefined,
                    breaststroke: undefined,
                    butterfly: undefined,
                    safety_entry_exit: undefined,
                    safety_float: undefined,
                  }
                : r,
            ),
          });
        }
      });

      return { queries };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.queries) {
        ctx.queries.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
      toast.error("Failed to reset score.");
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tryouts", tryoutId, "roster"] });
      qc.invalidateQueries({ queryKey: ["tryouts", tryoutId, "leaderboard"] });
      toast.success("Score reset.");
    },
  });
}
