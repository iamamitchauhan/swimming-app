import { db, uid, wait } from "../mock-db";
import type { MyTryoutItem, Registration } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

export type QuestionType = "text" | "textarea" | "radio" | "checkbox";

export interface RegistrationQuestion {
  categoryId: string;
  category: string;
  questionIndex: number;
  type: QuestionType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  meta?: Record<string, any>;
}

export async function fetchTryoutRegistrationQuestions(
  tryoutId: string,
): Promise<RegistrationQuestion[]> {
  const res = await fetch(`${API_BASE}/tryouts/public/${tryoutId}/registration-questions`);
  if (!res.ok) return [];
  const body = await res.json();
  return body.data?.questions ?? [];
}

export interface DynamicAnswer {
  label: string;
  value: string | string[];
}

export interface CreateRegistrationInput {
  tryoutId: string;
  sessionId: string;
  slotId: string;
  segmentId?: string;
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  hasUsaMembership: boolean;
  usaMembershipId?: string;
  clubName?: string;
  guardianName: string;
  guardianEmail: string;
  dynamicAnswers?: DynamicAnswer[];
}

export async function fetchRegistrations(): Promise<Registration[]> {
  await wait(200);
  return db.getRegistrations().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function fetchRegistrationById(id: string): Promise<Registration | null> {
  await wait(150);
  return db.getRegistrations().find((r) => r.id === id) ?? null;
}

export async function createRegistration(input: CreateRegistrationInput): Promise<{ id: string }> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/registrations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message ?? "Registration failed. Please try again.");
  }

  return { id: body.data?.registration?._id ?? "" };
}

export async function cancelRegistrationById(id: string): Promise<Registration | null> {
  console.info("cancelRegistrationById id => ", id);
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/registrations/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!res.ok) throw new Error("Failed to cancel registration");
  const body = await res.json();
  return body.data?.registration ?? null;
}

export async function fetchNotifications() {
  await wait(120);
  return db.getNotifications().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function markAllNotificationsRead() {
  await wait(100);
  db.setNotifications(db.getNotifications().map((n) => ({ ...n, read: true })));
}

export interface JoinWaitlistInput {
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  segmentId?: string;
  guardianName: string;
  guardianEmail: string;
}

export async function joinWaitlist(
  tryoutId: string,
  input: JoinWaitlistInput,
): Promise<{ position: number; joinedAt: string }> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/waitlist/${tryoutId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.message ?? "Failed to join waitlist. Please try again.");
  }

  return {
    position: body.data?.waitlist?.position ?? 1,
    joinedAt: body.data?.waitlist?.joinedAt ?? new Date().toISOString(),
  };
}

export interface WaitlistEntry {
  _id: string;
  tryoutId: string;
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  segmentId?: string;
  guardianName: string;
  guardianEmail: string;
  waitlistPosition: number;
}

export async function fetchWaitlistEntry(id: string): Promise<WaitlistEntry | null> {
  const res = await fetch(`${API_BASE}/waitlist/entry/${id}`);
  if (!res.ok) return null;
  const body = await res.json();
  return body.data?.entry ?? null;
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  const token = localStorage.getItem("auth_token");
  await fetch(`${API_BASE}/waitlist/entry/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function fetchMyTryouts(): Promise<MyTryoutItem[]> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/registrations/my-tryouts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to fetch registrations");
  const body = await res.json();
  return body.data?.tryouts ?? [];
}
