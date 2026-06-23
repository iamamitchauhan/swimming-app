import { apiClient, api } from "./client";
import type { SelectedQuestion } from "./question-library.api";

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
  status: "draft" | "open" | "published" | "closed";
  sessions: Session[];
  segments: Segment[];
  steps: Step[];
  faqs: Faq[];
  registrationQuestions?: SelectedQuestion[];
  clubId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed from sessions
  startAt?: string | null;
  endAt?: string | null;
  // Computed from aggregation
  sessionCount: number;
  startDate?: string;
  totalSlots: number;
  registeredCount: number;
}

// ─── List params / result ─────────────────────────────────────────────────────

export type TryoutSortField = "name" | "status" | "createdAt" | "updatedAt";
export type SortOrder = "asc" | "desc";

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
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.sortBy) query.set("sortBy", params.sortBy);
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
    if (input.swimmersPerSlot !== undefined)
      fd.append("swimmersPerSlot", String(input.swimmersPerSlot));
    if (input.ctaLabel !== undefined) fd.append("ctaLabel", input.ctaLabel);
    if (input.highlights !== undefined) fd.append("highlights", input.highlights ?? "");
    if (input.additionalInstructions !== undefined)
      fd.append("additionalInstructions", input.additionalInstructions ?? "");
    if (input.status !== undefined) fd.append("status", input.status);
    if (input.sessions !== undefined) fd.append("sessions", JSON.stringify(input.sessions));
    if (input.segments !== undefined) fd.append("segments", JSON.stringify(input.segments));
    if (input.steps !== undefined)
      fd.append("steps", JSON.stringify(input.steps.filter((s) => s.title.trim())));
    if (input.faqs !== undefined)
      fd.append("faqs", JSON.stringify(input.faqs.filter((f) => f.question.trim())));
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

  /**
   * PATCH /tryouts/:id/publish
   * Publishes a draft tryout (sets status to 'open')
   */
  publish: (id: string): Promise<Tryout> =>
    api<{ tryout: Tryout }>(apiClient.patch(`/tryouts/${id}/publish`)).then((res) => res.tryout),

  /**
   * GET /tryouts/public/:id/registration-questions
   * Fetches saved registration questions for a tryout (no auth required).
   */
  getRegistrationQuestions: (id: string): Promise<SelectedQuestion[]> =>
    fetch(`${apiClient.defaults.baseURL}/tryouts/public/${id}/registration-questions`)
      .then((r) => r.json())
      .then((body) => body.data?.questions ?? []),

  /**
   * PUT /tryouts/:id/registration-questions
   * Saves the custom registration questions for a tryout.
   */
  saveRegistrationQuestions: (
    id: string,
    questions: SelectedQuestion[],
  ): Promise<SelectedQuestion[]> =>
    api<{ questions: SelectedQuestion[] }>(
      apiClient.put(`/tryouts/${id}/registration-questions`, { questions }),
    ).then((res) => res.questions),

  /**
   * GET /tryouts/:id/slots
   * Returns all slots for a tryout (admin view)
   */
  getSlots: (id: string): Promise<TryoutSlot[]> =>
    api<{ slots: TryoutSlot[] }>(apiClient.get(`/tryouts/${id}/slots`)).then((res) => res.slots),

  /**
   * GET /tryouts/:id/sessions
   * Returns all sessions for a tryout (admin view)
   */
  getSessions: (id: string): Promise<TryoutSession[]> =>
    api<{ sessions: TryoutSession[] }>(apiClient.get(`/tryouts/${id}/sessions`)).then(
      (res) => res.sessions,
    ),

  /**
   * GET /tryouts/:id/registrations
   * Returns paginated, filtered, and sorted registrations.
   */
  getRegistrations: (
    id: string,
    params: RegistrationListParams = {},
  ): Promise<RegistrationListResult> => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.segmentId) query.set("segmentId", params.segmentId);
    if (params.registerId) query.set("registerId", params.registerId);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    const qs = query.toString();
    return api<RegistrationListResult>(
      apiClient.get(`/tryouts/${id}/registrations${qs ? `?${qs}` : ""}`),
    );
  },

  /**
   * GET /tryouts/:id/registrations/:regId
   * Returns full registration detail (admin/coach view)
   */
  getRegistrationDetail: (tryoutId: string, regId: string): Promise<RegistrationDetail> =>
    api<{ registration: RegistrationDetail }>(
      apiClient.get(`/tryouts/${tryoutId}/registrations/${regId}`),
    ).then((res) => res.registration),

  /**
   * POST /tryouts/:id/bulk-email
   * Sends a templated bulk email to the specified registration IDs.
   * Returns 202 immediately; emails are sent in the background on the server.
   */
  bulkEmail: (
    tryoutId: string,
    payload: {
      registrationIds: string[];
      subject: string;
      body: string;
      action: "offered" | "rejected";
    },
  ): Promise<{ queued: number }> =>
    api<{ queued: number }>(apiClient.post(`/tryouts/${tryoutId}/bulk-email`, payload)),

  /**
   * GET /waitlist/tryout/:tryoutId
   * Returns paginated, searchable, sortable waitlist entries for a tryout.
   */
  getWaitlist: (tryoutId: string, params: WaitlistListParams = {}): Promise<WaitlistListResult> => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    const qs = query.toString();
    return api<WaitlistListResult>(
      apiClient.get(`/waitlist/tryout/${tryoutId}${qs ? `?${qs}` : ""}`),
    );
  },
};

// ─── Admin View Types ─────────────────────────────────────────────────────────

export interface TryoutSlot {
  _id: string;
  tryoutId: string;
  sessionId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  label: string;
  slotIndex: number;
  capacity: number;
  registeredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TryoutSession {
  _id: string;
  tryoutId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string;
  slotDuration: number;
  swimmersPerSlot: number;
  totalSlots: number;
}

export interface Registration {
  id: string;
  swimmer_name: string;
  swimmer_age: number;
  segment_name?: string;
  segment_id?: string;
  session_date?: string;
  slot_start?: string;
  slot_end?: string;
  usa_membership_id?: string;
  usa_verification_status?: string;
  club_name?: string;
  guardian_name?: string;
  guardian_email?: string;
  parent_name?: string;
  parent_email?: string;
  status: "registered" | "waitlisted" | "offered" | "rejected" | "cancelled";
  waitlist_position?: number;
  safety_entry_exit?: boolean | null;
  safety_float?: boolean | null;
  freestyle?: number | string;
  backstroke?: number | string;
  breaststroke?: number | string;
  butterfly?: number | string;
  total_score?: number | string;
  registration_id?: string;
  age_segment?: string;
}

export interface LeaderboardEntry {
  registration_id: string;
  swimmer_name: string;
  swimmer_age: number;
  segment_name?: string;
  age_segment?: string;
  total_score: number | string;
  status: string;
}

export interface RegistrationDetail {
  _id: string;
  tryoutId: string;
  swimmerId: { firstName: string; lastName: string; birthDate?: string };
  parentId: { firstName: string; lastName: string; email: string };
  sessionId: string;
  slotId: string;
  segmentId?: string;
  status: string;
  swimmerDetails: {
    firstName: string;
    lastName: string;
    dob?: string;
    ageOnTryoutDay: number;
    hasUsaMembership: boolean;
    usaMembershipId?: string;
    clubName?: string;
    guardianName: string;
    guardianEmail: string;
  };
  dynamicAnswers?: { label: string; value: string | string[] }[];
  scores?: {
    safetyEntryExit?: boolean;
    safetyFloat?: boolean;
    freestyle?: number;
    backstroke?: number;
    breaststroke?: number;
    butterfly?: number;
    totalScore?: number;
  };
  usaVerificationStatus?: string;
  waitlistPosition?: number;
  registeredAt?: string;
  emailSent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  _id: string;
  tryoutId: string;
  parentId?: string;
  swimmerFirstName: string;
  swimmerLastName: string;
  ageOnTryoutDay: number;
  segmentId?: string;
  guardianName: string;
  guardianEmail: string;
  waitlistPosition: number;
  notifiedAt?: string;
  joinedAt: string;
  createdAt: string;
}

export type WaitlistSortField =
  | "waitlistPosition"
  | "swimmerFirstName"
  | "guardianEmail"
  | "joinedAt";

export interface WaitlistListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: WaitlistSortField;
  sortOrder?: SortOrder;
}

export interface WaitlistListResult {
  entries: WaitlistEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Registration List (server-side) ─────────────────────────────────────────

export type RegistrationSortField = "swimmer_name" | "swimmer_age" | "status";

export interface RegistrationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  segmentId?: string;
  registerId?: string;
  sortBy?: RegistrationSortField;
  sortOrder?: SortOrder;
}

export interface RegistrationListResult {
  registrations: Registration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
