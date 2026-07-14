import { apiClient, api } from "./client";
import type { Club } from "./onboarding.api";

export type { Club };

export interface RejectClubInput {
  reason: string;
}

export const clubsApi = {
  /** GET /clubs — list all clubs (super_admin) */
  listAll: () => api<{ clubs: Club[] }>(apiClient.get("/clubs")),

  fetchClubGroups: (queryString: string) =>
    api<{ groups: { name: string; _id: string }[] }>(
      apiClient.get(`/groups${queryString ? `?${queryString}` : ""}`),
    ),

  /** GET /clubs/pending — clubs awaiting approval (super_admin) */
  listPending: () => api<{ clubs: Club[] }>(apiClient.get("/clubs/pending")),

  /** GET /clubs/my — own club (admin) */
  getMy: () => api<{ club: Club }>(apiClient.get("/clubs/my")),

  /** GET /clubs/:id */
  getById: (id: string) => api<{ club: Club }>(apiClient.get(`/clubs/${id}`)),

  /** PUT /clubs/:id/approve (super_admin) */
  approve: (id: string) => api<{ club: Club }>(apiClient.put(`/clubs/${id}/approve`)),

  /** PUT /clubs/:id/reject (super_admin) */
  reject: (id: string, input: RejectClubInput) =>
    api<{ club: Club }>(apiClient.put(`/clubs/${id}/reject`, input)),

  getCoaches: () =>
    api<{
      coaches: {
        _id: string;
        email: string;
        role: "admin" | "coach";
        status: string;
        firstName: string;
        lastName: string;
        createdAt: string;
      }[];
    }>(apiClient.get("/clubs/coaches")),

  clubState: () =>
    api<{
      club: {
        _id: string;
        ownerId: string;
        status: string;
        __v: number;
        address: string;
        clubSize: string;
        createdAt: string;
        logoUrl: null;
        name: string;
        phone: string;
        region: string;
        rejectionReason: null;
        updatedAt: string;
      };
      memberCount: number;
      coachCount: number;
      tryoutCount: number;
      registeredSwimmerCount: number;
      pendingRegistrationCount: number;
      activeTryoutCount: number;
    }>(apiClient.get("/clubs/state")),

  adminState: () =>
    api<{
      totalUsers: number;
      totalClubs: number;
      activeTryouts: number;
      pendingApprovals: number;
    }>(apiClient.get("/clubs/admin-state")),
};
