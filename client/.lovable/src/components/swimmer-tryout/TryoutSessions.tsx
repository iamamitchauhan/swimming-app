import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TryoutSession } from "./types";

interface Props {
  sessions: TryoutSession[];
  onSelect?: (session: TryoutSession, index: number) => void;
  disabled?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function TryoutSessions({ sessions, onSelect, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section aria-labelledby="sessions-heading">
      <h2 id="sessions-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Available Sessions
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          No sessions are scheduled yet. Check back soon.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s, i) => {
            const isSelected = selected === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelected(i);
                    onSelect?.(s, i);
                  }}
                  className={cn(
                    "group w-full rounded-2xl border bg-card p-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "hover:border-primary/40 hover:shadow-md",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {s.label && (
                    <div className="mb-2 text-sm font-semibold text-primary">{s.label}</div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{formatDate(s.date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="size-4" aria-hidden />
                    <span>
                      {s.startTime}–{s.endTime}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-4 flex h-9 w-full items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors",
                      isSelected
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
