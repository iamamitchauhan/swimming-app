/**
 * Tryouts hooks
 *
 * useTryouts(params)   → GET  /tryouts  (paginated)
 * useTryout(id)        → GET  /tryouts/:id
 * useCreateTryout()    → POST /tryouts
 * useUpdateTryout()    → PUT  /tryouts/:id
 * useDeleteTryout()    → DELETE /tryouts/:id
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  tryoutsApi,
  type Tryout,
  type CreateTryoutInput,
  type TryoutListParams,
  type TryoutListResult,
} from "../lib/api/tryouts.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const tryoutKeys = {
  all: ["tryouts"] as const,
  list: (params?: TryoutListParams) => [...tryoutKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...tryoutKeys.all, "detail", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTryouts(params: TryoutListParams = {}) {
  return useQuery<TryoutListResult>({
    queryKey: tryoutKeys.list(params),
    queryFn: () => tryoutsApi.list(params),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useTryout(id: string) {
  return useQuery<Tryout>({
    queryKey: tryoutKeys.detail(id),
    queryFn: () => tryoutsApi.getById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTryout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTryoutInput) => tryoutsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tryoutKeys.list() });
    },
  });
}

export function useUpdateTryout(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateTryoutInput>) => tryoutsApi.update(id, input),
    onSuccess: (updated) => {
      qc.setQueryData(tryoutKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: tryoutKeys.list() });
    },
  });
}

export function useDeleteTryout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tryoutsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tryoutKeys.list() });
    },
  });
}

export function usePublishTryout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tryoutsApi.publish(id),
    onSuccess: (updated) => {
      qc.setQueryData(tryoutKeys.detail(updated._id), updated);
      qc.invalidateQueries({ queryKey: tryoutKeys.list() });
    },
  });
}
