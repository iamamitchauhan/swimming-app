import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PopulatedUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Group {
  _id: string;
  name: string;
  color: string;
  description: string;
  clubId: string;
  createdBy: PopulatedUser;
  updatedBy: PopulatedUser;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: PopulatedUser | null;
}

export interface CreateGroupInput {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateGroupInput {
  name: string;
  color?: string;
  description?: string;
}

// ─── API calls ─────────────────────────────────────────────────────────────────

export const groupsApi = {
  /** GET /groups — list groups for the user's club */
  list: () => api<{ groups: Group[] }>(apiClient.get("/groups")),

  /** GET /groups/:id */
  getById: (id: string) => api<{ group: Group }>(apiClient.get(`/groups/${id}`)),

  /** POST /groups */
  create: (input: CreateGroupInput) => api<{ group: Group }>(apiClient.post("/groups", input)),

  /** PUT /groups/:id */
  update: (id: string, input: UpdateGroupInput) =>
    api<{ group: Group }>(apiClient.put(`/groups/${id}`, input)),

  /** DELETE /groups/:id */
  delete: (id: string) => api<null>(apiClient.delete(`/groups/${id}`)),
};
