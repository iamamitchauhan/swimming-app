/**
 * Clubs hooks
 *
 * useAllClubs()      → GET /clubs              (super_admin)
 * usePendingClubs()  → GET /clubs/pending      (super_admin)
 * useMyClub()        → GET /clubs/my           (admin)
 * useClub(id)        → GET /clubs/:id          (super_admin)
 * useApproveClub()   → PUT /clubs/:id/approve  (super_admin)
 * useRejectClub()    → PUT /clubs/:id/reject   (super_admin)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clubsApi, type Club } from "../lib/api/clubs.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const clubKeys = {
  all: ["clubs"] as const,
  pending: ["clubs", "pending"] as const,
  my: ["clubs", "my"] as const,
  detail: (id: string) => ["clubs", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useAllClubs() {
  return useQuery<Club[]>({
    queryKey: clubKeys.all,
    queryFn: async () => {
      const data = await clubsApi.listAll();
      return data.clubs;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function usePendingClubs() {
  return useQuery<Club[]>({
    queryKey: clubKeys.pending,
    queryFn: async () => {
      const data = await clubsApi.listPending();
      return data.clubs;
    },
    staleTime: 60_000,
  });
}

export function useMyClub() {
  return useQuery<Club>({
    queryKey: clubKeys.my,
    queryFn: async () => {
      const data = await clubsApi.getMy();
      return data.club;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useClub(id: string) {
  return useQuery<Club>({
    queryKey: clubKeys.detail(id),
    queryFn: async () => {
      const data = await clubsApi.getById(id);
      return data.club;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useApproveClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clubsApi.approve(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: clubKeys.pending });
      qc.invalidateQueries({ queryKey: clubKeys.all });
      qc.setQueryData(clubKeys.detail(data.club._id), data.club);
    },
  });
}

export function useRejectClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      clubsApi.reject(id, { reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: clubKeys.pending });
      qc.invalidateQueries({ queryKey: clubKeys.all });
      qc.setQueryData(clubKeys.detail(data.club._id), data.club);
    },
  });
}
