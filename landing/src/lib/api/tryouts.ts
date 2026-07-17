import { MOCK_TRYOUTS, PLATFORM_STATS } from "../mock-data";
import type { Tryout, TryoutStatus } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1";

export interface AgeGroupOption {
  label: string;
  minAge: number;
  maxAge: number;
}

export const AGE_GROUP_OPTIONS: AgeGroupOption[] = [
  { label: "0–5", minAge: 0, maxAge: 5 },
  { label: "6–10", minAge: 6, maxAge: 10 },
  { label: "11–15", minAge: 11, maxAge: 15 },
  { label: "16–20", minAge: 16, maxAge: 20 },
];

export interface TryoutFilters {
  search?: string;
  minAge?: number;
  maxAge?: number;
  clubId?: string;
  sort?: "latest" | "earliest";
  page?: number;
  limit?: number;
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
  if (sort === "earliest") return { sortBy: "createdAt", sortOrder: "asc" };
  return { sortBy: "createdAt", sortOrder: "desc" };
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
    const totalCap = raw.totalCapacity ?? (raw.totalSlots as number) * (raw.swimmersPerSlot ?? 4);
    const taken = Math.min(raw.registeredCount ?? 0, totalCap);
    slots = [
      {
        id: `${raw._id ?? raw.id}-summary`,
        sessionId: "",
        label: "Summary",
        time: "",
        capacity: totalCap,
        taken,
        availableSlots: Math.max(0, totalCap - taken),
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
    club: raw.clubName ?? raw.clubId ?? "",
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

export interface TryoutListResult {
  tryouts: Tryout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchTryouts(filters: TryoutFilters = {}): Promise<TryoutListResult> {
  const { sortBy, sortOrder } = mapSortToApi(filters.sort);
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 12),
    sortBy,
    sortOrder,
  });
  if (filters.search) params.set("search", filters.search);
  if (filters.clubId) params.set("clubId", filters.clubId);
  if (filters.minAge !== undefined) params.set("minAge", String(filters.minAge));
  if (filters.maxAge !== undefined) params.set("maxAge", String(filters.maxAge));

  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE}/tryouts/public?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to fetch tryouts");

  const body = await response.json();
  const rawList: any[] = body.data?.tryouts ?? [];
  return {
    tryouts: rawList.map(mapTryout),
    total: body.data?.total ?? rawList.length,
    page: body.data?.page ?? 1,
    limit: body.data?.limit ?? 12,
    totalPages: body.data?.totalPages ?? 1,
  };
}

export async function fetchTryoutById(id: string): Promise<Tryout | null> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE}/tryouts/public/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body.data ? mapTryout(body.data) : null;
}

export async function fetchClubs(): Promise<{ id: string; name: string }[]> {
  const response = await fetch(`${API_BASE}/public/clubs`);
  if (!response.ok) throw new Error("Failed to fetch clubs");
  const body = await response.json();
  return body.data?.clubs ?? [];
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
