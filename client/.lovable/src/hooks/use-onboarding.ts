/**
 * Onboarding hooks
 *
 * useOnboardingStatus()  → GET  /onboarding/status
 * useSaveStep1()         → PUT  /onboarding/step/1
 * useSaveStep2()         → PUT  /onboarding/step/2
 * useSubmitClub()        → PUT  /onboarding/step/3
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingApi, type OnboardingStatus } from "../lib/api/onboarding.api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const onboardingKeys = {
  status: ["onboarding", "status"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useOnboardingStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<OnboardingStatus>({
    queryKey: onboardingKeys.status,
    queryFn: onboardingApi.getStatus,
    staleTime: 60_000,
    enabled,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useSaveStep1() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.saveStep1,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useSaveStep2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.saveStep2,
    onSuccess: () => qc.invalidateQueries({ queryKey: onboardingKeys.status }),
  });
}

export function useSubmitClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.submit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingKeys.status });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
