import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, type Group, type CreateGroupInput, type UpdateGroupInput } from "../lib/api/groups.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const groupKeys = {
  all: ["groups"] as const,
  detail: (id: string) => ["groups", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: groupKeys.all,
    queryFn: async () => {
      const data = await groupsApi.list();
      return data.groups;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useGroup(id: string) {
  return useQuery<Group>({
    queryKey: groupKeys.detail(id),
    queryFn: async () => {
      const data = await groupsApi.getById(id);
      return data.group;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => groupsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGroupInput }) =>
      groupsApi.update(id, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      qc.invalidateQueries({ queryKey: groupKeys.detail(variables.id) });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}
