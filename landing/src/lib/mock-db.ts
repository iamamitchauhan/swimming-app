import type { Child, Notification, Parent, Registration } from "./types";

/**
 * Mock localStorage-backed store. Replace any function in src/lib/api/*
 * with a real fetch() call without touching the rest of the app.
 */
const KEYS = {
  parent: "spp.parent",
  pendingOtp: "spp.pendingOtp",
  children: "spp.children",
  registrations: "spp.registrations",
  notifications: "spp.notifications",
} as const;

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  getParent: () => read<Parent | null>(KEYS.parent, null),
  setParent: (p: Parent | null) =>
    p ? write(KEYS.parent, p) : isBrowser() && window.localStorage.removeItem(KEYS.parent),
  getPendingOtp: () =>
    read<{ parent: Parent; code: string } | null>(KEYS.pendingOtp, null),
  setPendingOtp: (v: { parent: Parent; code: string } | null) =>
    v
      ? write(KEYS.pendingOtp, v)
      : isBrowser() && window.localStorage.removeItem(KEYS.pendingOtp),
  getChildren: () => read<Child[]>(KEYS.children, []),
  setChildren: (c: Child[]) => write(KEYS.children, c),
  getRegistrations: () => read<Registration[]>(KEYS.registrations, []),
  setRegistrations: (r: Registration[]) => write(KEYS.registrations, r),
  getNotifications: () => read<Notification[]>(KEYS.notifications, []),
  setNotifications: (n: Notification[]) => write(KEYS.notifications, n),
};

export const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

export const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));