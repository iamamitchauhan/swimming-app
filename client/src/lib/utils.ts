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

export const statusLabel = (s: string) => {
  if (s === "open") return "Published";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const tryoutCoverPhotos = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  const origin = baseUrl ? new URL(baseUrl).origin : window.location.origin;

  return [1, 2, 3, 4, 5, 6].map((num) => `${origin}/assets/cover/${num}.jpg`);
};
