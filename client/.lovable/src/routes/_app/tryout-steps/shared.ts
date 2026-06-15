import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const sessionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    label: z.string(),
  })
  .refine((s) => !s.startTime || !s.endTime || s.endTime > s.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const segmentSchema = z
  .object({
    name: z.string().min(1, "Segment name is required"),
    minAge: z.coerce.number({ invalid_type_error: "Required" }).min(0),
    maxAge: z.coerce.number({ invalid_type_error: "Required" }).min(0),
    level: z.string(),
  })
  .refine((s) => s.minAge <= s.maxAge, {
    message: "Min age must be ≤ max age",
    path: ["maxAge"],
  });

export const stepSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const tryoutSchema = z.object({
  name: z.string().min(1, "Tryout name is required"),
  location: z.string().optional(),
  description: z.string().optional(),
  theme: z.enum(["ocean", "sunset", "forest", "midnight", "coral"]),
  bannerUrl: z.string().optional(),
  sessions: z.array(sessionSchema).min(1, "At least one session is required"),
  slotDuration: z.coerce.number(),
  swimmersPerSlot: z.coerce.number(),
  segments: z.array(segmentSchema),
  steps: z.array(stepSchema),
  additionalInstructions: z.string().optional(),
  ctaLabel: z.string(),
  highlights: z.string().optional(),
  faqs: z.array(faqSchema),
});

export type TryoutFormValues = z.infer<typeof tryoutSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

export const THEMES = [
  { id: "ocean", label: "Ocean", from: "from-sky-500", to: "to-blue-700" },
  { id: "sunset", label: "Sunset", from: "from-orange-400", to: "to-pink-600" },
  { id: "forest", label: "Forest", from: "from-emerald-500", to: "to-teal-700" },
  { id: "midnight", label: "Midnight", from: "from-slate-700", to: "to-slate-900" },
  { id: "coral", label: "Coral", from: "from-rose-400", to: "to-orange-500" },
] as const;

export const LEVELS = [
  "Novice",
  "Beginner",
  "Intermediate",
  "Experienced (USA-S)",
  "Advanced",
  "Competitive",
];

export const SLOT_DURATIONS = [15, 20, 30, 45, 60];

export const DEFAULT_STEPS = [
  { title: "Pick a Slot", description: "Choose a time that works for you." },
  { title: "Swim and Be Evaluated", description: "Our coaches will assess your technique." },
  { title: "Hear Back by Email", description: "We'll send results within 3–5 business days." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function calcSlots(startTime: string, endTime: string, slotDuration: number) {
  if (!startTime || !endTime || !slotDuration) return { slots: 0 };
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const durationMin = eh * 60 + em - (sh * 60 + sm);
  if (durationMin <= 0) return { slots: 0 };
  return { slots: Math.floor(durationMin / slotDuration) };
}

export function buildLabel(date: string, startTime: string, endTime: string) {
  if (!date) return "";
  const d = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return startTime && endTime ? `${d} · ${startTime}–${endTime}` : d;
}

// ─── Wizard step definitions ──────────────────────────────────────────────────

export const WIZARD_STEPS = [
  { id: 1, label: "Basics", description: "Name, location & description" },
  { id: 2, label: "Branding", description: "Theme & banner" },
  { id: 3, label: "Sessions", description: "Time windows & slots" },
  { id: 4, label: "Segments", description: "Age groups & levels" },
  { id: 5, label: "How It Works", description: "Steps & instructions" },
  { id: 6, label: "Presentation", description: "Public card & FAQ" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

// ─── Per-step field sets for trigger validation ───────────────────────────────

export const STEP_FIELDS: Record<WizardStepId, (keyof TryoutFormValues)[]> = {
  1: ["name", "location", "description"],
  2: ["theme", "bannerUrl"],
  3: ["sessions", "slotDuration", "swimmersPerSlot"],
  4: ["segments"],
  5: ["steps", "additionalInstructions"],
  6: ["ctaLabel", "highlights", "faqs"],
};
