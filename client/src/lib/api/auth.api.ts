import { apiClient, api } from "./client";
import type { AuthUser } from "../auth.store";

// ─── Request / Response types ─────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
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
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /auth/register — send verification email */
  register: (input: RegisterInput) =>
    api<null>(apiClient.post("/auth/register", input)),

  /** GET /auth/verify-email?token= — activate account */
  verifyEmail: (token: string) =>
    api<{ user: AuthUser }>(
      apiClient.get("/auth/verify-email", { params: { token } }),
    ),

  /** POST /auth/login — request OTP */
  login: (input: LoginInput) =>
    api<null>(apiClient.post("/auth/login", input)),

  /** POST /auth/verify-otp — verify OTP, get JWT */
  verifyOtp: (input: VerifyOtpInput) =>
    api<VerifyOtpResponse>(apiClient.post("/auth/verify-otp", input)),

  /** POST /auth/logout */
  logout: () => api<null>(apiClient.post("/auth/logout")),

  /** GET /auth/me — fetch own profile */
  me: () => api<{ user: AuthUser }>(apiClient.get("/auth/me")),
};
