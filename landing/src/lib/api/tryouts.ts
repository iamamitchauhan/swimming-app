import { MOCK_TRYOUTS, PLATFORM_STATS } from "../mock-data";
import type { Tryout, TryoutStatus } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

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

function mapSortToApi(sort: TryoutFilters["sort"]): { sortBy: string; sortOrder: string } {
  switch (sort) {
    case "earliest":
      return { sortBy: "createdAt", sortOrder: "asc" };
    case "most_slots":
      return { sortBy: "createdAt", sortOrder: "desc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

// Maps backend PlainTryout shape to frontend Tryout interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTryout(raw: any): Tryout {
  const firstSegment = raw.segments?.[0];

  const sessions = (raw.sessions ?? []).map((s: any) => ({
    id: s._id ?? s.id,
    date: s.date ?? "",
    startTime: s.startTime ?? "",
    endTime: s.endTime ?? "",
    label: s.label ?? `${s.date} · ${s.startTime}–${s.endTime}`,
    slotDuration: s.slotDuration ?? raw.slotDuration ?? 30,
    swimmersPerSlot: s.swimmersPerSlot ?? raw.swimmersPerSlot ?? 4,
    totalSlots: s.totalSlots ?? 0,
    slots: (s.slots ?? []).map((sl: any) => ({
      id: sl._id ?? sl.id,
      sessionId: sl.sessionId ?? s._id,
      slotIndex: sl.slotIndex ?? 0,
      startTime: sl.startTime ?? s.startTime ?? "",
      endTime: sl.endTime ?? s.endTime ?? "",
      label: sl.label ?? s.label ?? "",
      capacity: sl.capacity ?? raw.swimmersPerSlot ?? 4,
      registeredCount: sl.registeredCount ?? 0,
      availableSlots:
        sl.availableSlots ?? Math.max(0, (sl.capacity ?? 0) - (sl.registeredCount ?? 0)),
    })),
  }));

  // Flatten per-slot detail when sessions are embedded (detail endpoint)
  // Fall back to aggregated totals from list endpoint (totalSlots / registeredCount)
  let slots = sessions.flatMap((s: any) =>
    s.slots.map((sl: any) => ({
      id: sl.id,
      sessionId: sl.sessionId,
      label: `${s.date} · Slot ${sl.slotIndex + 1}`,
      time: `${s.startTime} – ${s.endTime}`,
      capacity: sl.capacity,
      taken: sl.registeredCount,
      availableSlots: sl.availableSlots,
    })),
  );

  // When the list endpoint returns aggregated totals instead of embedded slots,
  // synthesise a single summary slot so capacity/taken calculations work on the card.
  if (slots.length === 0 && (raw.totalSlots ?? 0) > 0) {
    slots = [
      {
        id: `${raw._id ?? raw.id}-summary`,
        sessionId: "",
        label: "Summary",
        time: "",
        capacity: raw.totalSlots as number,
        taken: raw.registeredCount ?? 0,
        availableSlots: Math.max(0, (raw.totalSlots as number) - (raw.registeredCount ?? 0)),
      },
    ];
  }

  // Derive date/time: prefer aggregated startDate from list, then first embedded session
  const firstSession = raw.sessions?.[0];
  const date = raw.startDate ?? firstSession?.date ?? "";
  const time = firstSession ? `${firstSession.startTime} – ${firstSession.endTime}` : "";

  return {
    id: raw._id ?? raw.id,
    name: raw.name,
    club: raw.clubId ?? "",
    ageGroup: firstSegment ? `${firstSegment.minAge}–${firstSegment.maxAge}` : "",
    skillLevel: firstSegment?.level ?? "",
    state: "",
    status: raw.status ?? "open",
    city: raw.location ?? "",
    location: raw.location ?? "",
    poolName: raw.location ?? "",
    address: raw.location ?? "",
    coachName: "",
    date,
    time,
    deadline: date,
    startAt: raw.startAt ?? "",
    endAt: raw.endAt ?? "",
    description: raw.description ?? "",
    purpose: raw.theme ?? "",
    eligibility: raw.segments?.map((s: any) => s.name) ?? [],
    segments: raw.segments ?? [],
    steps:
      raw.steps?.map((s: any) => ({ title: s.title ?? "", description: s.description ?? "" })) ??
      [],
    faqs: raw.faqs?.map((f: any) => ({ question: f.question ?? "", answer: f.answer ?? "" })) ?? [],
    image: raw.bannerUrl ?? "",
    slots,
    sessions,
    sessionCount: raw.sessionCount ?? sessions.length,
  };
}

export async function fetchTryouts(filters: TryoutFilters = {}): Promise<Tryout[]> {
  const { sortBy, sortOrder } = mapSortToApi(filters.sort);
  const params = new URLSearchParams({ limit: "50", sortBy, sortOrder });
  if (filters.search) params.set("search", filters.search);

  const response = await fetch(`${API_BASE}/tryouts/public?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch tryouts");

  const body = await response.json();
  const rawList: any[] = body.data?.tryouts ?? [];
  let list = rawList.map(mapTryout);

  // Client-side filters not supported by the public API
  if (filters.ageGroup) list = list.filter((t) => t.ageGroup === filters.ageGroup);
  if (filters.state) list = list.filter((t) => t.state === filters.state);
  if (filters.city) list = list.filter((t) => t.city === filters.city);
  if (filters.club) list = list.filter((t) => t.club === filters.club);

  if (filters.sort === "most_slots") {
    list.sort((a, b) => availableSlotsCount(b) - availableSlotsCount(a));
  }

  return list;
}

export async function fetchTryoutById(id: string): Promise<Tryout | null> {
  const response = await fetch(`${API_BASE}/tryouts/public/${id}`);
  if (!response.ok) return null;
  const body = await response.json();
  return body.data ? mapTryout(body.data) : null;
}

export async function fetchStats() {
  const response = await fetch(`${API_BASE}/public/stats`);
  if (!response.ok) throw new Error("Failed to fetch stats");
  const body = await response.json();
  return body.data ?? PLATFORM_STATS;
}

export function uniqueValues<K extends keyof Tryout>(key: K): string[] {
  return Array.from(new Set(MOCK_TRYOUTS.map((t) => String(t[key])))).sort();
}
