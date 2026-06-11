/**
 * Users hooks
 *
 * useMe()             → GET  /users/me
 * useUpdateMe()       → PUT  /users/me
 * useAllUsers()       → GET  /users               (super_admin)
 * useUsersByClub(id)  → GET  /users/club/:clubId
 * useUser(id)         → GET  /users/:userId        (super_admin)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, type User, type ClubUserItem, type PaginatedUsersResponse } from "../lib/api/users.api";
import type { UserRole } from "../lib/auth.store";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const userKeys = {
  me: ["users", "me"] as const,
  all: (params?: { role?: UserRole; clubId?: string; search?: string; page?: number; limit?: number }) =>
    ["users", "all", params] as const,
  byClub: (clubId: string) => ["users", "club", clubId] as const,
  detail: (id: string) => ["users", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: userKeys.me,
    queryFn: async () => {
      const data = await usersApi.getMe();
      return data.user;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllUsers(params?: { role?: UserRole; clubId?: string; search?: string; page?: number; limit?: number }) {
  return useQuery<PaginatedUsersResponse>({
    queryKey: userKeys.all(params),
    queryFn: () => usersApi.listAll(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUsersByClub(clubId: string) {
  return useQuery<ClubUserItem[]>({
    queryKey: userKeys.byClub(clubId),
    queryFn: async () => {
      return usersApi.listByClub(clubId);
    },
    enabled: !!clubId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUser(userId: string) {
  return useQuery<User>({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const data = await usersApi.getById(userId);
      return data.user;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (data) => {
      qc.setQueryData(userKeys.me, data.user);
    },
  });
}

export function useChangeRole(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      usersApi.changeRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.byClub(clubId) });
    },
  });
}

export function useRemoveFromClub(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.removeFromClub(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.byClub(clubId) });
    },
  });
}
