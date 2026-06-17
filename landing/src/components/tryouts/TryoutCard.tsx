import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { availableSlotsCount, tryoutStatus } from "@/lib/api/tryouts";
import { formatDate, relativeFromNow } from "@/lib/format";
import type { Tryout } from "@/lib/types";

const THEME_CLASSES: Record<string, string> = {
  ocean:    "bg-linear-to-br from-sky-500 to-blue-700",
  sunset:   "bg-linear-to-br from-orange-400 to-pink-600",
  forest:   "bg-linear-to-br from-emerald-500 to-teal-700",
  midnight: "bg-linear-to-br from-slate-700 to-slate-900",
  coral:    "bg-linear-to-br from-rose-400 to-orange-500",
};

function themeBg(theme: string) {
  return THEME_CLASSES[theme] ?? "bg-linear-to-br from-indigo-700 to-slate-900";
}

export function TryoutCard({ tryout }: { tryout: Tryout }) {
  console.info('tryout =>',tryout);
  
  const status = tryoutStatus(tryout);
  const slots = availableSlotsCount(tryout);

  const totalCap = tryout.slots.reduce((s, x) => s + x.capacity, 0);
  const totalTaken = tryout.slots.reduce((s, x) => s + x.taken, 0);
  const pctFilled = totalCap > 0 ? Math.round((totalTaken / totalCap) * 100) : 0;
  const gradClass = themeBg(tryout.purpose);

  return (
    <div className="group overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Hero banner */}
      <div className={`relative h-36 ${gradClass}`}>
        {tryout.image && (
          <img
            src={tryout.image}
            alt={tryout.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />


        {/* Title overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-white drop-shadow">
            {tryout.name}
          </h3>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
            {tryout.sessionCount && tryout.sessionCount > 0 ? (
              <span className="truncate">
                {tryout.sessionCount} session{tryout.sessionCount !== 1 ? "s" : ""} starting {formatDate(tryout.date)}
              </span>
            ) : (
              <span className="truncate">{formatDate(tryout.date)}{tryout.time ? ` · ${tryout.time}` : ""}</span>
            )}
          </div>
          {tryout.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="truncate">{tryout.location}</span>
            </div>
          )}
          {totalCap > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 shrink-0 text-primary/70" />
              <span>{slots} of {totalCap} spots open</span>
            </div>
          )}
        </div>

        {/* Age segments */}
        {tryout.segments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tryout.segments.map((seg, i) => (
              <span key={i} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Ages {seg.minAge}–{seg.maxAge}
              </span>
            ))}
          </div>
        )}

        {/* Slot fill progress */}
        {totalCap > 0 && (
          <div className="mb-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${pctFilled}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{pctFilled}% filled</span>
              <span>{slots} spots left</span>
            </div>
          </div>
        )}

        <p className="mb-3 text-xs text-muted-foreground">
          Registration closes {relativeFromNow(tryout.deadline)}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/tryouts/${tryout.id}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}