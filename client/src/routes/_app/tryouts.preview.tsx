import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { RegistrationFormPreview } from "./tryout-steps/registration-form-preview";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useTryout } from "@/hooks/use-tryouts";
import type { Tryout, TryoutSession, TryoutSlot } from "@/lib/api/tryouts.api";
import { useQuery } from "@tanstack/react-query";
import { tryoutsApi } from "@/lib/api/tryouts.api";
import { tryoutKeys } from "@/hooks/use-tryouts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Theme helpers ─────────────────────────────────────────────────────────────

const THEMES = [
  { id: "ocean", from: "from-sky-500", to: "to-blue-700" },
  { id: "sunset", from: "from-orange-400", to: "to-pink-600" },
  { id: "forest", from: "from-emerald-500", to: "to-teal-700" },
  { id: "midnight", from: "from-slate-700", to: "to-slate-900" },
  { id: "coral", from: "from-rose-400", to: "to-orange-500" },
] as const;

function getThemeBg(theme: string): string {
  const match = THEMES.find((t) => t.id === theme);
  return match
    ? `bg-gradient-to-br ${match.from} ${match.to}`
    : "bg-gradient-to-br from-indigo-700 to-slate-900";
}

console.log(formatDate("2026-06-17T14:50:00.000Z"));
// Wed, 17 Jun 2026

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TryoutPreviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tryout, isLoading, isError, error } = useTryout(id);

  const { data: sessions = [] } = useQuery<TryoutSession[]>({
    queryKey: [...tryoutKeys.detail(id), "sessions"],
    queryFn: () => tryoutsApi.getSessions(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: slots = [] } = useQuery<TryoutSlot[]>({
    queryKey: [...tryoutKeys.detail(id), "slots"],
    queryFn: () => tryoutsApi.getSlots(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  // fetch questions
  const { data: registrationQuestions = [] } = useQuery<any[]>({
    queryKey: [...tryoutKeys.detail(id), "registrationQuestions"],
    queryFn: () => tryoutsApi.getRegistrationQuestions(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center gap-2 bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading preview…</span>
      </div>
    );
  }

  if (isError || !tryout) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error instanceof Error ? error.message : "Failed to load tryout."}</span>
        </div>
      </div>
    );
  }

  const steps = tryout.steps ?? [];
  const faqs = tryout.faqs ?? [];
  const segments = tryout.segments ?? [];

  // Group slots by session
  const slotsBySession = slots.reduce<Record<string, TryoutSlot[]>>((acc, slot) => {
    const key = slot.sessionId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const totalCap = slots.reduce((s, x) => s + x.capacity, 0);
  const totalOpen = slots.reduce((s, x) => s + Math.max(0, x.capacity - x.registeredCount), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {/* ── Preview banner ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-500/30 bg-white px-6 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Preview Mode — this is how your tryout looks to registrants
        </span>
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className={cn("relative w-full overflow-hidden", getThemeBg(tryout.theme))}>
        {tryout.bannerUrl && (
          <img
            src={tryout.bannerUrl}
            alt={tryout.name}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-5xl">
            {tryout.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
            {tryout.startAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(tryout.startAt)}
              </span>
            )}
            {tryout.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {tryout.location}
              </span>
            )}
          </div>

          {tryout.description && (
            <p className="mt-2 text-sm text-white/70 wrap-break-word">{tryout.description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="bg-white font-semibold text-slate-900 hover:bg-white/90"
              disabled
            >
              {"Reserve your slot →"}
            </Button>
            {tryout.status !== "closed" && (
              <div>
                <span className="text-2xl font-extrabold text-white">
                  {totalOpen} of {totalCap}
                </span>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                  Registration Open
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* How it works */}
        {steps.length > 0 && (
          <section>
            <h2 className="mb-5 font-display text-xl font-bold">How it works</h2>

            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
              {steps.map((step, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-muted text-sm font-extrabold text-muted-foreground">
                    {i + 1}
                  </div>

                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Registration Windows */}
        <section className="mt-10">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between bg-slate-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-base font-bold">Registration Windows</h2>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-white/60">
                  Select your preferred arrival time
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {tryout.swimmersPerSlot} per slot
              </span>
            </div>

            {sessions.length > 0 ? (
              <div>
                {sessions.map((session) => {
                  const sessionDate = session.date ? new Date(session.date + "T00:00:00") : null;
                  const sessionSlots = (slotsBySession[session._id] ?? []).sort(
                    (a, b) => a.slotIndex - b.slotIndex,
                  );
                  return (
                    <div key={session._id}>
                      {/* Session header row */}
                      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-5 py-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-800 text-white">
                          <span className="text-[10px] font-semibold uppercase leading-none">
                            {sessionDate
                              ? sessionDate.toLocaleString("en", { weekday: "short" })
                              : "—"}
                          </span>
                          <span className="text-lg font-extrabold leading-none">
                            {sessionDate ? sessionDate.getDate() : "—"}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {sessionDate ? formatDate(session.date) : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.startTime} – {session.endTime} · {session.slotDuration} min
                            slots
                          </div>
                        </div>
                        <span className="ml-auto rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                          {session.totalSlots} slots · {session.swimmersPerSlot} per slot
                        </span>
                      </div>

                      {/* Slot rows */}
                      {sessionSlots.length > 0 ? (
                        sessionSlots.map((sl) => {
                          const full = sl.registeredCount >= sl.capacity;
                          return (
                            <div
                              key={sl._id}
                              className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
                            >
                              <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                                #{sl.slotIndex + 1}
                              </span>
                              {full ? (
                                <span className="text-xs font-bold uppercase tracking-wide text-destructive">
                                  Full
                                </span>
                              ) : (
                                <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                                  Open
                                </span>
                              )}
                              <span className="ml-auto mr-4 text-xs text-muted-foreground tabular-nums">
                                {sl.registeredCount} / {sl.capacity}
                                <br />
                                <span className="text-[10px] uppercase tracking-wider">
                                  Reserved
                                </span>
                              </span>
                              <Button
                                size="sm"
                                disabled
                                variant="secondary"
                                className="bg-slate-800 px-4 text-white hover:bg-slate-700 disabled:opacity-40"
                              >
                                Join Slot
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-5 py-4 text-sm text-muted-foreground italic">
                          No slots generated yet.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No sessions available.
              </p>
            )}
          </div>
        </section>

        {/* Who can participate */}
        {segments.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-5 text-xl font-bold">Who Can Participate?</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map((seg, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium">{seg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Ages {seg.minAge}–{seg.maxAge}
                      {seg.level ? ` · ${seg.level}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Additional instructions */}
        {tryout.additionalInstructions && (
          <section className="mt-10">
            <h2 className="mb-3 text-xl font-bold">Additional Instructions</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {tryout.additionalInstructions}
            </p>
          </section>
        )}

        <RegistrationFormPreview selectedQuestions={registrationQuestions} />

        {/* FAQs */}
        {faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-5 text-center font-display text-xl font-bold">Common questions</h2>
            <Accordion
              type="single"
              collapsible
              className="rounded-xl border border-border bg-card px-5"
            >
              {faqs.map((f) => (
                <AccordionItem key={f.question} value={f.question}>
                  <AccordionTrigger className="text-sm font-semibold">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}
      </div>
    </div>
  );
}
