import { apiClient, api } from "./client";
import type { AuthUser, UserRole } from "../auth.store";

export type { AuthUser as User };

export interface PendingInvitation {
  _id: string;
  email: string;
  role: string;
  clubId: string;
  invitedBy: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface ClubUserItem {
  type: 'user' | 'invitation';
  data: AuthUser | PendingInvitation;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
}

export interface PaginatedUsersResponse {
  users: AuthUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const usersApi = {
  /** GET /users/me */
  getMe: () =>
    api<{ user: AuthUser }>(apiClient.get("/users/me")),

  /** PUT /users/me */
  updateMe: (input: UpdateProfileInput) =>
    api<{ user: AuthUser }>(apiClient.put("/users/me", input)),

  /** GET /users?role=&roles=&statuses=&clubId=&search=&page=&limit= (super_admin) */
  listAll: (params?: {
    role?: UserRole;
    roles?: UserRole[];
    statuses?: string[];
    clubId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.roles?.length) query.set("roles", params.roles.join(","));
    if (params?.statuses?.length) query.set("statuses", params.statuses.join(","));
    if (params?.clubId) query.set("clubId", params.clubId);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api<PaginatedUsersResponse>(apiClient.get(`/users${qs ? `?${qs}` : ""}`));
  },

  /** GET /users/club/:clubId */
  listByClub: (clubId: string) =>
    api<ClubUserItem[]>(apiClient.get(`/users/club/${clubId}`)),

  /** GET /users/:userId (super_admin) */
  getById: (userId: string) =>
    api<{ user: AuthUser }>(apiClient.get(`/users/${userId}`)),

  /** PATCH /users/:userId/role */
  changeRole: (userId: string, role: string) =>
    api<{ user: AuthUser }>(apiClient.patch(`/users/${userId}/role`, { role })),

  /** DELETE /users/:userId/club */
  removeFromClub: (userId: string) =>
    api<null>(apiClient.delete(`/users/${userId}/club`)),
};
