import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistrationForm } from "@/components/registrations/RegistrationForm";
import { parentQuery, tryoutQuery } from "@/lib/queries";
import { tryoutStatus } from "@/lib/api/tryouts";
import { formatDate } from "@/lib/format";
import type { Slot, TryoutSession } from "@/lib/types";
import { toast } from "sonner";

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

export default function TryoutDetailPage() {
  const { id = "" } = useParams();
  const { data: tryout, isLoading } = useQuery(tryoutQuery(id));
  const { data: parent } = useQuery(parentQuery());
  const navigate = useNavigate();
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{
    date: string;
    time: string;
    label: string;
  } | null>(null);

  if (!isLoading && !tryout) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Tryout not found</h1>
        <Button asChild className="mt-4">
          <Link to="/tryouts">Back to tryouts</Link>
        </Button>
      </div>
    );
  }
  if (!tryout) return null;

  console.info("tryout =>", tryout);

  const slots = tryout.slots ?? [];
  const sessions = tryout.sessions ?? [];
  const steps = tryout.steps ?? [];
  const faqs = tryout.faqs ?? [];
  const eligibility = tryout.eligibility ?? [];
  const segments = tryout.segments ?? [];

  console.info("segments =>", segments);

  const status = tryoutStatus({ ...tryout, slots });
  const totalCap = slots.reduce((s, x) => s + x.capacity, 0);
  const totalOpen = slots.reduce((s, x) => s + Math.max(0, x.capacity - x.taken), 0);

  const handleSelectSlot = (slot: Slot) => {
    if (!parent) {
      toast.info("Please log in to register your child.");
      navigate("/login");
      return;
    }
    if (slot.capacity - slot.taken <= 0) {
      toast.error("This slot is full.");
      return;
    }
    setActiveSlotId(slot.id);
    setActiveSessionId(slot.sessionId);
    // Derive display info from sessions data
    for (const sess of sessions) {
      const sl = sess.slots.find((s) => s.id === slot.id);
      if (sl) {
        setSelectedSlotInfo({
          date: formatDate(sess.date),
          time: `${sess.startTime} – ${sess.endTime}`,
          label: `Slot ${sl.slotIndex + 1}`,
        });
        break;
      }
    }
    const el = document.getElementById("registration-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openSlot = slots.find((s) => s.capacity - s.taken > 0) ?? slots[0];
  console.info("tryout.startAt =>", tryout.startAt);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className={`relative w-full overflow-hidden ${getThemeBg(tryout.purpose)}`}>
        {tryout.image && (
          <img
            src={tryout.image}
            alt={tryout.name}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          {/* <Link to="/tryouts" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to tryouts
          </Link> */}

          {/* <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
            ≈ Swim Team Tryout
          </span> */}

          <h1 className="mt-3 font-display text-4xl font-extrabold text-white sm:text-5xl">
            {tryout.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
            {tryout.date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(tryout.startAt)}
              </span>
            )}
            {tryout.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-rose-400" />
                {tryout.location}
              </span>
            )}
          </div>

          {tryout.description && <p className="mt-2 text-sm text-white/70">{tryout.description}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            {tryout.status === "open" ? (
              <Button
                size="lg"
                className="bg-white font-semibold text-slate-900 hover:bg-white/90"
                onClick={() => openSlot && handleSelectSlot(openSlot)}
                disabled={!openSlot}
              >
                Reserve your slot →
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-white font-semibold text-slate-900 hover:bg-white/90"
                disabled
              >
                Registration Closed
              </Button>
            )}
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

      {/* ── Body ─────────────────────────────────────────────────── */}
      {tryout.status !== "closed" ? (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {/* How it works */}
          {steps.length > 0 && (
            <section>
              <h2 className="mb-5 font-display text-xl font-bold">How it works</h2>
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
          <section className="mt-10">
            <div className="overflow-hidden rounded-xl border border-border">
              {/* Header */}
              <div className="flex items-center justify-between bg-slate-800 px-5 py-4 text-white">
                <div>
                  <h2 className="font-display text-base font-bold">Registration Windows</h2>
                  <p className="text-xs text-white/60 uppercase tracking-wider mt-0.5">
                    Select your preferred arrival time
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  Max {openSlot?.capacity ?? "—"} per slot
                </span>
              </div>

              {/* Session groups */}
              {sessions.length > 0 ? (
                <div>
                  {sessions.map((session: TryoutSession) => {
                    const sessionDate = session.date ? new Date(session.date) : null;
                    return (
                      <div key={session.id}>
                        {/* Session label row */}
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
                            <div className="font-semibold text-sm">
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
                        {session.slots.map((sl) => {
                          const full = sl.availableSlots <= 0;
                          const selected = activeSlotId === sl.id;
                          const flatSlot: Slot = {
                            id: sl.id,
                            sessionId: sl.sessionId,
                            label: `${session.date} · Slot ${sl.slotIndex + 1}`,
                            time: `${session.startTime} – ${session.endTime}`,
                            capacity: sl.capacity,
                            taken: sl.registeredCount,
                            availableSlots: sl.availableSlots,
                          };
                          return (
                            <div
                              key={sl.id}
                              className={`flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0 transition-colors ${
                                selected ? "bg-sky-50 dark:bg-sky-950/30" : ""
                              }`}
                            >
                              <span
                                className={`w-8 shrink-0 text-xs font-bold tabular-nums ${selected ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground"}`}
                              >
                                #{sl.slotIndex + 1}
                              </span>
                              {full ? (
                                <span className="text-xs font-bold uppercase tracking-wide text-destructive">
                                  Full
                                </span>
                              ) : selected ? (
                                <span className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                                  Selected
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
                                disabled={full}
                                variant={selected ? "default" : "secondary"}
                                className={
                                  selected
                                    ? "bg-sky-600 px-4 text-white hover:bg-sky-700 disabled:opacity-40"
                                    : "bg-slate-800 px-4 text-white hover:bg-slate-700 disabled:opacity-40"
                                }
                                onClick={() => handleSelectSlot(flatSlot)}
                              >
                                {selected ? "Selected" : "Join Slot"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <p className="px-5 py-3 text-center text-xs text-muted-foreground italic">
                    ↑ Pick a slot above, or leave blank to be auto-assigned the earliest open one.
                  </p>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No sessions available.
                </p>
              )}
            </div>
          </section>

          {/* Segments / Who can participate */}
          {segments.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 font-display text-xl font-bold">Who Can Participate?</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {segments.map((seg) => (
                  <div
                    key={seg.name}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="text-sm font-medium">{seg.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {seg.minAge} - {seg.maxAge} years
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Registration */}

          <section id="registration-section" className="mt-10">
            <h2 className="mb-5 font-display text-xl font-bold">Complete Registration</h2>
            <RegistrationForm
              tryoutId={tryout.id}
              slotId={activeSlotId}
              sessionId={activeSessionId}
              selectedSlotInfo={selectedSlotInfo}
              segments={segments}
            />
          </section>

          {/* Common questions / FAQs */}
          {faqs.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-5 text-center font-display text-xl font-bold">Common questions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {faqs.map((f) => (
                  <div key={f.question} className="rounded-xl border border-border bg-card p-5">
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
        </div>
      ) : (
        <div>
          {/* <section className="mt-10">
            <h2 className="mb-5 font-display text-xl font-bold text-center">Registration Closed</h2>
            <p className="text-sm text-white/70 text-center">
              Registration for this tryout is now closed.
            </p>
          </section> */}
        </div>
      )}
    </div>
  );
}
