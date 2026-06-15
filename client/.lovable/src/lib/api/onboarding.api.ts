import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Club {
  _id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  ownerId: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStatus {
  step: number;
  club: Club | null;
}

export interface Step1Input {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface Step2Input {
  coachEmails: string[];
}

export interface Step2Response {
  invited: string[];
  skipped: string[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const onboardingApi = {
  /** GET /onboarding/status */
  getStatus: () =>
    api<OnboardingStatus>(apiClient.get("/onboarding/status")),

  /** PUT /onboarding/step/1 — save club info */
  saveStep1: (input: Step1Input) =>
    api<{ club: Club }>(apiClient.put("/onboarding/step/1", input)),

  /** PUT /onboarding/step/2 — invite coaches */
  saveStep2: (input: Step2Input) =>
    api<Step2Response>(apiClient.put("/onboarding/step/2", input)),

  /** PUT /onboarding/step/3 — submit for review */
  submit: () =>
    api<{ club: Club }>(apiClient.put("/onboarding/step/3")),
};
