/**
 * Admin registration hooks
 *
 * useParentRegistrations(parentId) — GET /admin/registrations/parent/:parentId
 * useRegistrationDetail(id)        — GET /admin/registrations/:id
 */
import { useQuery } from "@tanstack/react-query";
import {
  adminRegistrationsApi,
  type AdminRegistration,
} from "../lib/api/admin-registrations.api";

export const adminRegistrationKeys = {
  byParent: (parentId: string) => ["admin-registrations", "parent", parentId] as const,
  detail: (id: string) => ["admin-registrations", id] as const,
};

export function useParentRegistrations(parentId: string | null | undefined) {
  return useQuery<AdminRegistration[]>({
    queryKey: adminRegistrationKeys.byParent(parentId ?? ""),
    queryFn: async () => {
      const data = await adminRegistrationsApi.listByParent(parentId!);
      return data.registrations;
    },
    enabled: !!parentId,
    staleTime: 60 * 1000,
  });
}

export function useRegistrationDetail(id: string | null | undefined) {
  return useQuery<AdminRegistration>({
    queryKey: adminRegistrationKeys.detail(id ?? ""),
    queryFn: async () => {
      const data = await adminRegistrationsApi.getById(id!);
      return data.registration;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
