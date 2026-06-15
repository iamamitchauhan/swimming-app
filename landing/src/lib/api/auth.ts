import { db, uid, wait } from "../mock-db";
import type { Parent } from "../types";

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
}

export async function registerParent(input: RegisterInput): Promise<{ message: string }> {
  // TODO: Replace with actual API call to parent register endpoint
  // POST /api/v1/parent/register
  await wait(400);
  
  // Mock email verification - in real implementation, this would call the backend
  const parent: Parent = {
    id: uid("usr"),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    emailVerified: false,
  };
  
  // Store pending registration for demo purposes
  db.setPendingOtp({ parent, code: "123456" });
  return { message: "Verification email sent. Please check your inbox." };
}

export async function verifyEmail(token: string): Promise<{ token: string; user: Parent }> {
  // TODO: Replace with actual API call to verify email endpoint
  // POST /api/v1/parent/verify-email
  await wait(300);
  
  // For demo, use OTP code as token
  const pending = db.getPendingOtp();
  if (!pending) throw new Error("No pending registration. Please sign up again.");
  if (token.trim() !== pending.code) throw new Error("Invalid verification code. Try 123456.");
  
  const parent: Parent = { ...pending.parent, emailVerified: true };
  db.setParent(parent);
  db.setPendingOtp(null);
  
  // Mock JWT token
  const mockToken = `mock-jwt-${parent.id}`;
  return { token: mockToken, user: parent };
}

export async function resendVerification(): Promise<{ message: string }> {
  // TODO: Replace with actual API call to resend verification
  await wait(300);
  const pending = db.getPendingOtp();
  if (!pending) throw new Error("No pending registration.");
  return { message: "Verification email resent." };
}

export async function login(email: string, _password: string): Promise<Parent> {
  await wait(350);
  const existing = db.getParent();
  if (existing && existing.email.toLowerCase() === email.toLowerCase()) {
    return existing;
  }
  // Create a quick mock account so demo logins always work.
  const parent: Parent = {
    id: uid("usr"),
    firstName: email.split("@")[0] || "Parent",
    lastName: "Demo",
    email,
    emailVerified: true,
  };
  db.setParent(parent);
  return parent;
}

export async function logout(): Promise<void> {
  await wait(100);
  db.setParent(null);
}

export async function getCurrentParent(): Promise<Parent | null> {
  await wait(50);
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