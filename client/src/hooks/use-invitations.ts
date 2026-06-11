/**
 * Invitations hooks
 *
 * useMyInvitations()       → GET  /invitations/my
 * useClubInvitations(id)   → GET  /invitations/club/:clubId
 * useSendInvitation()      → POST /invitations
 * useAcceptInvitation()    → POST /invitations/accept  (public, auto-login)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invitationsApi, type Invitation } from "../lib/api/invitations.api";
import { userKeys } from "./use-users";
import { useAuthStore } from "../lib/auth.store";
import { authKeys } from "./use-auth";

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

export function useSendInvitation(clubId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.send,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.my });
      if (clubId) {
        qc.invalidateQueries({ queryKey: userKeys.byClub(clubId) });
      }
    },
  });
}

export function useResendInvitation(clubId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.resend,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.my });
      if (clubId) {
        qc.invalidateQueries({ queryKey: userKeys.byClub(clubId) });
      }
    },
  });
}

export function useCancelInvitation(clubId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: invitationsApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invitationKeys.my });
      if (clubId) {
        qc.invalidateQueries({ queryKey: userKeys.byClub(clubId) });
      }
    },
  });
}

/** Public — no auth token needed. Auto-logins after successful acceptance. */
export function useAcceptInvitation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: invitationsApi.accept,
    onSuccess: (data) => {
      const userWithId = { ...data.user, _id: data.user.id, role: data.user.role as any };
      setAuth(data.token, userWithId);
      qc.setQueryData(authKeys.me, userWithId);
    },
  });
}
