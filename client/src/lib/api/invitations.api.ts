import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvitationRole = "admin" | "coach";
export type InvitationStatus = "pending" | "accepted" | "expired";

export interface Invitation {
  _id: string;
  email: string;
  role: InvitationRole;
  clubId: string;
  club: {
    _id: string;
    name: string;
  };
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface SendInvitationInput {
  email: string;
  role: InvitationRole;
}

export interface AcceptInvitationInput {
  token: string;
  firstName: string;
  lastName: string;
}

export interface AcceptInvitationResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    clubId: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    status: string;
    onboardingStep: number;
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const invitationsApi = {
  /** POST /invitations */
  send: (input: SendInvitationInput) =>
    api<{ invitation: Invitation }>(apiClient.post("/invitations", input)),

  /** POST /invitations/accept — public, no auth required */
  accept: (input: AcceptInvitationInput) =>
    api<AcceptInvitationResponse>(apiClient.post("/invitations/accept", input)),

  /** GET /invitations/my — sent by me */
  listMy: () => api<{ invitations: Invitation[] }>(apiClient.get("/invitations/my")),

  /** GET /invitations/club/:clubId */
  listByClub: (clubId: string) =>
    api<{ invitations: Invitation[] }>(apiClient.get(`/invitations/club/${clubId}`)),

  /** POST /invitations/:invitationId/resend */
  resend: (invitationId: string) =>
    api<{ invitation: Invitation }>(apiClient.post(`/invitations/${invitationId}/resend`)),

  /** DELETE /invitations/:invitationId */
  cancel: (invitationId: string) => api<null>(apiClient.delete(`/invitations/${invitationId}`)),
};
