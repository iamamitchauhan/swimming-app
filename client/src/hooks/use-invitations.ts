/**
 * Invitations hooks
 *
 * useMyInvitations()       → GET  /invitations/my
 * useClubInvitations(id)   → GET  /invitations/club/:clubId
 * useSendInvitation()      → POST /invitations
 * useAcceptInvitation()    → POST /invitations/accept  (public)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invitationsApi, type Invitation } from "../lib/api/invitations.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const invitationKeys = {
  my: ["invitations", "my"] as const,
  byClub: (clubId: string) => ["invitations", "club", clubId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMyInvitations() {
  return useQuery<Invitation[]>({
    queryKey: invitationKeys.my,
    queryFn: async () => {
      const data = await invitationsApi.listMy();
      return data.invitations;
    },
    staleTime: 60_000,
  });
}

export function useClubInvitations(clubId: string) {
  return useQuery<Invitation[]>({
    queryKey: invitationKeys.byClub(clubId),
    queryFn: async () => {
      const data = await invitationsApi.listByClub(clubId);
      return data.invitations;
    },
    enabled: !!clubId,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.my });
    },
  });
}

/** Public — no auth token needed. */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: invitationsApi.accept,
  });
}
