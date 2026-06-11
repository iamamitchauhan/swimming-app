import { apiClient, api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Session {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface Segment {
  name: string;
  minAge: number;
  maxAge: number;
  level: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface CreateTryoutInput {
  name: string;
  location?: string;
  description?: string;
  theme: "ocean" | "sunset" | "forest" | "midnight" | "coral";
  bannerUrl?: string;
  slotDuration: number;
  swimmersPerSlot: number;
  ctaLabel: string;
  highlights?: string;
  additionalInstructions?: string;
  status: "draft" | "open";
  sessions: Session[];
  segments: Segment[];
  steps: Step[];
  faqs: Faq[];
  banner?: File;
}

export interface Tryout {
  _id: string;
  name: string;
  location?: string;
  description?: string;
  theme: string;
  bannerUrl?: string;
  slotDuration: number;
  swimmersPerSlot: number;
  ctaLabel: string;
  highlights?: string;
  additionalInstructions?: string;
  status: string;
  sessions: Session[];
  segments: Segment[];
  steps: Step[];
  faqs: Faq[];
  clubId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── List params / result ─────────────────────────────────────────────────────

export type TryoutSortField = 'name' | 'status' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface TryoutListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: TryoutSortField;
  sortOrder?: SortOrder;
}

export interface TryoutListResult {
  tryouts: Tryout[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const tryoutsApi = {
  /**
   * POST /tryouts
   * Creates a new tryout with multipart/form-data (supports banner file upload)
   */
  create: async (input: CreateTryoutInput): Promise<Tryout> => {
    const fd = new FormData();
    fd.append("name", input.name);
    fd.append("location", input.location ?? "");
    fd.append("description", input.description ?? "");
    fd.append("theme", input.theme);
    fd.append("bannerUrl", input.bannerUrl ?? "");
    fd.append("slotDuration", String(input.slotDuration));
    fd.append("swimmersPerSlot", String(input.swimmersPerSlot));
    fd.append("ctaLabel", input.ctaLabel);
    fd.append("highlights", input.highlights ?? "");
    fd.append("additionalInstructions", input.additionalInstructions ?? "");
    fd.append("status", input.status);
    fd.append("sessions", JSON.stringify(input.sessions));
    fd.append("segments", JSON.stringify(input.segments));
    fd.append("steps", JSON.stringify(input.steps.filter((s) => s.title.trim())));
    fd.append("faqs", JSON.stringify(input.faqs.filter((f) => f.question.trim())));
    if (input.banner) fd.append("banner", input.banner);

    return api<{ tryout: Tryout }>(
      apiClient.post("/tryouts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    ).then((res) => res.tryout);
  },

  /**
   * GET /tryouts
   * Lists tryouts for the current user's club with pagination, filters, and sort.
   */
  list: (params: TryoutListParams = {}): Promise<TryoutListResult> => {
    const query = new URLSearchParams();
    if (params.page)      query.set("page",      String(params.page));
    if (params.limit)     query.set("limit",     String(params.limit));
    if (params.search)    query.set("search",    params.search);
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.dateFrom)  query.set("dateFrom",  params.dateFrom);
    if (params.dateTo)    query.set("dateTo",    params.dateTo);
    if (params.sortBy)    query.set("sortBy",    params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    const qs = query.toString();
    return api<TryoutListResult>(apiClient.get(`/tryouts${qs ? `?${qs}` : ""}`));
  },

  /**
   * GET /tryouts/:id
   * Gets a single tryout by ID
   */
  getById: (id: string) =>
    api<{ tryout: Tryout }>(apiClient.get(`/tryouts/${id}`)).then((res) => res.tryout),

  /**
   * PUT /tryouts/:id
   * Updates an existing tryout
   */
  update: async (id: string, input: Partial<CreateTryoutInput>): Promise<Tryout> => {
    const fd = new FormData();
    if (input.name !== undefined) fd.append("name", input.name);
    if (input.location !== undefined) fd.append("location", input.location ?? "");
    if (input.description !== undefined) fd.append("description", input.description ?? "");
    if (input.theme !== undefined) fd.append("theme", input.theme);
    if (input.bannerUrl !== undefined) fd.append("bannerUrl", input.bannerUrl ?? "");
    if (input.slotDuration !== undefined) fd.append("slotDuration", String(input.slotDuration));
    if (input.swimmersPerSlot !== undefined) fd.append("swimmersPerSlot", String(input.swimmersPerSlot));
    if (input.ctaLabel !== undefined) fd.append("ctaLabel", input.ctaLabel);
    if (input.highlights !== undefined) fd.append("highlights", input.highlights ?? "");
    if (input.additionalInstructions !== undefined) fd.append("additionalInstructions", input.additionalInstructions ?? "");
    if (input.status !== undefined) fd.append("status", input.status);
    if (input.sessions !== undefined) fd.append("sessions", JSON.stringify(input.sessions));
    if (input.segments !== undefined) fd.append("segments", JSON.stringify(input.segments));
    if (input.steps !== undefined) fd.append("steps", JSON.stringify(input.steps.filter((s) => s.title.trim())));
    if (input.faqs !== undefined) fd.append("faqs", JSON.stringify(input.faqs.filter((f) => f.question.trim())));
    if (input.banner !== undefined) fd.append("banner", input.banner);

    return api<{ tryout: Tryout }>(
      apiClient.put(`/tryouts/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    ).then((res) => res.tryout);
  },

  /**
   * DELETE /tryouts/:id
   * Deletes a tryout
   */
  delete: (id: string) => apiClient.delete(`/tryouts/${id}`),
};
