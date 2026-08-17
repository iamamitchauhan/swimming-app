import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Club Admin",
  coach: "Coach",
  parent: "Parent",
};

export const formatDate = (dateString: string) => {
  // expected dateString is "2026-06-17T14:50:00.000Z"
  if (!dateString) return "";

  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Returns a relative "time ago" string for a past date.
 * e.g. "just now", "5 minutes ago", "3 hours ago", "2 days ago",
 * "1 week ago", "3 months ago", "1 year ago".
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * Formats a date as a localized date+time followed by a relative suffix.
 * e.g. "Aug 15, 2026, 6:58 PM (2 days ago)"
 *
 * The date/time portion uses the viewer's local timezone. The relative
 * portion is computed from the current time.
 */
export function formatDateTimeWithRelative(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const dateTime = date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateTime} (${timeAgo(date)})`;
}

export const statusLabel = (s: string) => {
  if (s === "open") return "Published";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const tryoutCoverPhotos = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const origin = baseUrl ? new URL(baseUrl).origin : window.location.origin;

  return [1, 2, 3, 4, 5, 6].map((num) => `${origin}/assets/cover/${num}.jpg`);
};

/**
 * Sum all numeric detailed scores.
 * Ignores yes/no values, booleans, nulls, empties, and non-numeric strings.
 */
export function calculateDetailedScoreTotal(
  detailedScores?: Record<string, string | number | boolean | null | undefined> | null,
): number | null {
  const numericScores = Object.values(detailedScores ?? {})
    .map((v) => (typeof v === "string" ? Number(v) : v))
    .filter((v): v is number => typeof v === "number" && !isNaN(v) && v > 0);

  if (!numericScores.length) return null;
  return numericScores.reduce((a, b) => a + b, 0);
}
