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
import { usersApi, type User } from "../lib/api/users.api";
import type { UserRole } from "../lib/auth.store";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const userKeys = {
  me: ["users", "me"] as const,
  all: (params?: { role?: UserRole; clubId?: string }) =>
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

export function useAllUsers(params?: { role?: UserRole; clubId?: string }) {
  return useQuery<User[]>({
    queryKey: userKeys.all(params),
    queryFn: async () => {
      const data = await usersApi.listAll(params);
      return data.users;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useUsersByClub(clubId: string) {
  return useQuery<User[]>({
    queryKey: userKeys.byClub(clubId),
    queryFn: async () => {
      const data = await usersApi.listByClub(clubId);
      return data.users;
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
