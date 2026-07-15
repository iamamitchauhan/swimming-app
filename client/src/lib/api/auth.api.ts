import { apiClient, api } from "./client";
import type { AuthUser } from "../auth.store";

// ─── Request / Response types ─────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
}

export interface VerifyOtpInput {
  email: string;
  otp: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface VerifyOtpResponse {
  token: string;
  user: AuthUser;
  requiresClubSelection: boolean;
  clubs?: ClubOption[];
}

export interface ClubOption {
  clubId: string;
  clubName: string;
  role: string;
  status: string;
}

export interface SelectClubInput {
  clubId: string;
}

export interface SelectClubResponse {
  token: string;
  user: AuthUser;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /auth/register — send verification email */
  register: (input: RegisterInput) => api<null>(apiClient.post("/auth/register", input)),

  /** GET /auth/verify-email?token= — activate account and return token for auto-login */
  verifyEmail: (token: string) =>
    api<VerifyOtpResponse>(apiClient.get("/auth/verify-email", { params: { token } })),

  /** POST /auth/login — request OTP */
  login: (input: LoginInput) => api<null>(apiClient.post("/auth/login", input)),

  /** POST /auth/verify-otp — verify OTP, get JWT */
  verifyOtp: (input: VerifyOtpInput) =>
    api<VerifyOtpResponse>(apiClient.post("/auth/verify-otp", input)),

  /** POST /auth/select-club — select a club for multi-club users, get new JWT */
  selectClub: (input: SelectClubInput) =>
    api<SelectClubResponse>(apiClient.post("/auth/select-club", input)),

  /** GET /auth/my-clubs — list all clubs the user belongs to */
  myClubs: () => api<{ clubs: ClubOption[] }>(apiClient.get("/auth/my-clubs")),

  /** POST /auth/logout */
  logout: () => api<null>(apiClient.post("/auth/logout")),

  /** GET /auth/me — fetch own profile */
  me: () => api<{ user: AuthUser }>(apiClient.get("/auth/me")),
};
