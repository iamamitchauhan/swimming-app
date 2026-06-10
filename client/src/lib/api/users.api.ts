import { apiClient, api } from "./client";
import type { AuthUser, UserRole } from "../auth.store";

export type { AuthUser as User };

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
}

export const usersApi = {
  /** GET /users/me */
  getMe: () =>
    api<{ user: AuthUser }>(apiClient.get("/users/me")),

  /** PUT /users/me */
  updateMe: (input: UpdateProfileInput) =>
    api<{ user: AuthUser }>(apiClient.put("/users/me", input)),

  /** GET /users?role=&clubId= (super_admin) */
  listAll: (params?: { role?: UserRole; clubId?: string }) =>
    api<{ users: AuthUser[] }>(apiClient.get("/users", { params })),

  /** GET /users/club/:clubId */
  listByClub: (clubId: string) =>
    api<{ users: AuthUser[] }>(apiClient.get(`/users/club/${clubId}`)),

  /** GET /users/:userId (super_admin) */
  getById: (userId: string) =>
    api<{ user: AuthUser }>(apiClient.get(`/users/${userId}`)),
};
