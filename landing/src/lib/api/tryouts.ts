import { MOCK_TRYOUTS, PLATFORM_STATS } from "../mock-data";
import type { Tryout, TryoutStatus } from "../types";
import { wait } from "../mock-db";

export interface TryoutFilters {
  search?: string;
  ageGroup?: string;
  state?: string;
  city?: string;
  club?: string;
  sort?: "latest" | "earliest" | "most_slots";
}

export function tryoutStatus(t: Tryout): TryoutStatus {
  const totalCap = t.slots.reduce((s, x) => s + x.capacity, 0);
  const totalTaken = t.slots.reduce((s, x) => s + x.taken, 0);
  const left = totalCap - totalTaken;
  if (new Date(t.deadline).getTime() < Date.now() || left <= 0) return "closed";
  if (left / totalCap < 0.15) return "almost_full";
  return "open";
}

export function availableSlotsCount(t: Tryout) {
  return t.slots.reduce((s, x) => s + Math.max(0, x.capacity - x.taken), 0);
}

export async function fetchTryouts(filters: TryoutFilters = {}): Promise<Tryout[]> {
  await wait(250);
  let list = [...MOCK_TRYOUTS];
  const q = filters.search?.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.club.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q),
    );
  }
  if (filters.ageGroup) list = list.filter((t) => t.ageGroup === filters.ageGroup);
  if (filters.state) list = list.filter((t) => t.state === filters.state);
  if (filters.city) list = list.filter((t) => t.city === filters.city);
  if (filters.club) list = list.filter((t) => t.club === filters.club);

  switch (filters.sort) {
    case "earliest":
      list.sort((a, b) => +new Date(a.date) - +new Date(b.date));
      break;
    case "most_slots":
      list.sort((a, b) => availableSlotsCount(b) - availableSlotsCount(a));
      break;
    default:
      list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }
  return list;
}

export async function fetchTryoutById(id: string): Promise<Tryout | null> {
  await wait(200);
  return MOCK_TRYOUTS.find((t) => t.id === id) ?? null;
}

export async function fetchStats() {
  await wait(150);
  return PLATFORM_STATS;
}

export function uniqueValues<K extends keyof Tryout>(key: K): string[] {
  return Array.from(new Set(MOCK_TRYOUTS.map((t) => String(t[key])))).sort();
}