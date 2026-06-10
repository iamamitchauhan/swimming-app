import { apiClient, api } from "./client";
import type { Club } from "./onboarding.api";

export type { Club };

export interface RejectClubInput {
  reason: string;
}

export const clubsApi = {
  /** GET /clubs — list all clubs (super_admin) */
  listAll: () =>
    api<{ clubs: Club[] }>(apiClient.get("/clubs")),

  /** GET /clubs/pending — clubs awaiting approval (super_admin) */
  listPending: () =>
    api<{ clubs: Club[] }>(apiClient.get("/clubs/pending")),

  /** GET /clubs/my — own club (admin) */
  getMy: () =>
    api<{ club: Club }>(apiClient.get("/clubs/my")),

  /** GET /clubs/:id */
  getById: (id: string) =>
    api<{ club: Club }>(apiClient.get(`/clubs/${id}`)),

  /** PUT /clubs/:id/approve (super_admin) */
  approve: (id: string) =>
    api<{ club: Club }>(apiClient.put(`/clubs/${id}/approve`)),

  /** PUT /clubs/:id/reject (super_admin) */
  reject: (id: string, input: RejectClubInput) =>
    api<{ club: Club }>(apiClient.put(`/clubs/${id}/reject`, input)),
};
