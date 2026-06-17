import { ArrowLeft, Calendar, CheckCircle2, Clock, Loader2, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TryoutFormValues, THEMES, calcSlots } from "./shared";
import { SelectedQuestion } from "@/lib/api/question-library.api";
import { RegistrationFormPreview } from "./registration-form-preview";

interface Props {
  values: TryoutFormValues;
  bannerPreview: string;
  onPublish: () => void;
  onBack: () => void;
  isPending: boolean;
  canPublish: boolean;
  selectedQuestions?: SelectedQuestion[];
}

function getThemeBg(theme: string): string {
  const match = THEMES.find((t) => t.id === theme);
  return match
    ? cn("bg-gradient-to-br", match.from, match.to)
    : "bg-gradient-to-br from-indigo-700 to-slate-900";
}

function formatSessionDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function StepReviewPublish({ values, bannerPreview, onPublish, onBack, isPending, canPublish, selectedQuestions = [] }: Props) {
  const activeBanner = bannerPreview || values.bannerUrl || "";
  const sessions = values.sessions ?? [];
  const steps = values.steps?.filter((s) => s.title.trim()) ?? [];
  const segments = values.segments ?? [];
  const faqs = values.faqs?.filter((f) => f.question.trim()) ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">

      {/* ── Preview mode header ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-500/30 bg-white px-6 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          Preview Mode — this is how your tryout looks to registrants
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack} disabled={isPending}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            size="sm"
            onClick={onPublish}
            disabled={isPending || !canPublish}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className={cn("relative w-full overflow-hidden", getThemeBg(values.theme))}>
        {activeBanner && (
          <img
            src={activeBanner}
            alt={values.name}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
            Swim Team Tryout
          </span>

          <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">
            {values.name || <span className="opacity-50 italic">Untitled Tryout</span>}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
            {sessions[0]?.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatSessionDate(sessions[0].date)}
              </span>
            )}
            {values.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-rose-400" />
                {values.location}
              </span>
            )}
          </div>

          {values.description && (
            <p className="mt-2 max-w-2xl text-sm text-white/70">{values.description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="bg-white font-semibold text-slate-900 hover:bg-white/90"
              disabled
            >
              {values.ctaLabel || "Reserve your slot →"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-10">

        {/* How it works */}
        {steps.length > 0 && (
          <section>
            <h2 className="mb-5 text-xl font-bold">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-3">
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
        <section>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between bg-slate-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-base font-bold">Registration Windows</h2>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-white/60">
                  Select your preferred arrival time
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                {values.swimmersPerSlot} per slot
              </span>
            </div>

            {sessions.length > 0 ? (
              <div>
                {sessions.map((session, idx) => {
                  const sessionDate = session.date ? new Date(session.date + "T00:00:00") : null;
                  const { slots: totalSlots } = calcSlots(session.startTime, session.endTime, values.slotDuration);
                  const slotRows = Array.from({ length: totalSlots }, (_, i) => i);
                  return (
                    <div key={idx}>
                      {/* Session header row */}
                      <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-5 py-3">
                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-800 text-white">
                          <span className="text-[10px] font-semibold uppercase leading-none">
                            {sessionDate ? sessionDate.toLocaleString("en", { weekday: "short" }) : "—"}
                          </span>
                          <span className="text-lg font-extrabold leading-none">
                            {sessionDate ? sessionDate.getDate() : "—"}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold">
                            {session.date ? formatSessionDate(session.date) : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.startTime} – {session.endTime} · {values.slotDuration} min slots
                          </div>
                        </div>
                        <span className="ml-auto rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold">
                          {totalSlots} slots · {values.swimmersPerSlot} per slot
                        </span>
                      </div>

                      {/* Slot rows */}
                      {slotRows.map((i) => (
                        <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0">
                          <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                            #{i + 1}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Open</span>
                          <span className="ml-auto mr-4 text-xs text-muted-foreground tabular-nums">
                            0 / {values.swimmersPerSlot}
                            <br />
                            <span className="text-[10px] uppercase tracking-wider">Reserved</span>
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
                      ))}
                    </div>
                  );
                })}
                <p className="px-5 py-3 text-center text-xs italic text-muted-foreground">
                  ↑ Slot booking will be available once published.
                </p>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">No sessions configured.</p>
            )}
          </div>
        </section>

        {/* Who can participate */}
        {segments.length > 0 && (
          <section>
            <h2 className="mb-5 text-xl font-bold">Who Can Participate?</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{seg.name}</p>
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
        {values.additionalInstructions && (
          <section>
            <h2 className="mb-3 text-xl font-bold">Additional Instructions</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {values.additionalInstructions}
            </p>
          </section>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <section>
            <h2 className="mb-5 text-center text-xl font-bold">Common questions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-2 flex items-start gap-2">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Clock className="h-3 w-3" />
                    </span>
                    <h3 className="text-sm font-semibold">{f.question}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <RegistrationFormPreview selectedQuestions={selectedQuestions} />

      </div>
    </div>
  );
}
