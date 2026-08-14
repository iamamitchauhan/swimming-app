import { db, uid, wait } from "../mock-db";
import type { Parent } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  redirectUrl?: string;
}

export async function registerParent(input: RegisterInput): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/parent/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Registration failed");
  }

  return response.json();
}

export async function verifyEmail(
  token: string,
): Promise<{ token: string; user: Parent; redirectUrl?: string }> {
  const response = await fetch(
    `${API_BASE}/parent/auth/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Email verification failed");
  }

  const result = await response.json();

  // Backend wraps response in { success, message, data: { token, user, redirectUrl? } }
  const { token: authToken, user: rawUser, redirectUrl } = result.data;

  const user: Parent = {
    id: rawUser.id,
    firstName: rawUser.firstName,
    lastName: rawUser.lastName,
    email: rawUser.email,
    emailVerified: rawUser.emailVerified,
  };

  return { token: authToken, user, redirectUrl };
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  // For demo purposes, we'll use the mock implementation since the backend doesn't have a resend endpoint
  await wait(300);
  const pending = db.getPendingOtp();
  if (!pending) throw new Error("No pending registration.");
  return { message: "Verification email resent." };
}

export async function requestLoginOtp(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/parent/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Failed to send OTP");
  return body;
}

export async function verifyLoginOtp(
  email: string,
  otp: string,
): Promise<{ token: string; user: Parent }> {
  const response = await fetch(`${API_BASE}/parent/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "OTP verification failed");

  const { token: authToken, user: rawUser } = body.data;
  const user: Parent = {
    id: rawUser.id,
    firstName: rawUser.firstName,
    lastName: rawUser.lastName,
    email: rawUser.email,
    emailVerified: rawUser.emailVerified,
  };
  return { token: authToken, user };
}

export async function logout(): Promise<void> {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  db.setParent(null);
}

export async function getCurrentParent(): Promise<Parent | null> {
  // First check localStorage for a real session from backend
  const stored = localStorage.getItem("auth_user");
  if (stored) {
    try {
      return JSON.parse(stored) as Parent;
    } catch {
      localStorage.removeItem("auth_user");
    }
  }
  // Fall back to mock-db session
  return db.getParent();
}

export async function updateProfile(patch: Partial<Parent>): Promise<Parent> {
  await wait(300);
  const current = db.getParent();
  if (!current) throw new Error("Not authenticated");
  const next = { ...current, ...patch };
  db.setParent(next);
  return next;
}
