/**
 * Admin registration API
 *
 * Used by admin/super_admin to look up a parent's registrations and inspect
 * a single registration's full details (scores, detailedScores, etc.).
 *
 * GET /admin/registrations/parent/:parentId — list registrations by parent
 * GET /admin/registrations/:id             — get a single registration detail
 */
import { apiClient, api } from "./client";

// ─── Populated reference shapes ───────────────────────────────────────────────

export interface PopulatedTryout {
  _id: string;
  name: string;
  status: string;
  location?: string;
  description?: string;
  theme?: string;
  bannerUrl?: string | null;
  createdAt?: string;
  startAt?: string | null;
  endAt?: string | null;
}

export interface PopulatedSwimmer {
  _id: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
}

export interface PopulatedParent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PopulatedSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface PopulatedSlot {
  _id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  label?: string;
  slotIndex?: number;
  capacity?: number;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export type RegistrationStatus =
  | "registered"
  | "waitlisted"
  | "offered"
  | "rejected"
  | "cancelled";

export interface AdminRegistration {
  _id: string;
  tryoutId: PopulatedTryout | string;
  swimmerId: PopulatedSwimmer | string;
  parentId: PopulatedParent | string;
  sessionId: PopulatedSession | string;
  slotId: PopulatedSlot | string;
  segmentId: string;
  status: RegistrationStatus;
  waitlistPosition?: number;
  registeredAt: string;
  emailSent: boolean;
  usaVerificationStatus?: "pending" | "needs_review" | "verified" | "rejected";
  coachRecommendation?: string | null;
  notes?: string;
  swimmerDetails: {
    firstName: string;
    lastName: string;
    dob?: string;
    ageOnTryoutDay: number;
    hasUsaMembership: boolean;
    usaMembershipId?: string;
    clubName?: string;
    guardianName: string;
    guardianEmail: string;
  };
  dynamicAnswers?: Array<{ label: string; value: string | string[] }>;
  scores?: {
    safetyEntryExit?: boolean;
    safetyFloat?: boolean;
    freestyle?: number;
    backstroke?: number;
    breaststroke?: number;
    butterfly?: number;
    totalScore?: number;
  };
  detailedScores?: Record<string, string | number | boolean | null>;
  createdAt: string;
  updatedAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const adminRegistrationsApi = {
  /** GET /admin/registrations/parent/:parentId */
  listByParent: (parentId: string) =>
    api<{ registrations: AdminRegistration[] }>(
      apiClient.get(`/admin/registrations/parent/${parentId}`),
    ),

  /** GET /admin/registrations/:id */
  getById: (id: string) =>
    api<{ registration: AdminRegistration }>(
      apiClient.get(`/admin/registrations/${id}`),
    ),
};
