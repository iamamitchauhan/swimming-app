import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TryoutStatusBadge } from "./StatusBadge";
import { availableSlotsCount, tryoutStatus } from "@/lib/api/tryouts";
import { formatDate, relativeFromNow } from "@/lib/format";
import type { Tryout } from "@/lib/types";

const THEME_CLASSES: Record<string, string> = {
  ocean:    "bg-gradient-to-br from-sky-500 to-blue-700",
  sunset:   "bg-gradient-to-br from-orange-400 to-pink-600",
  forest:   "bg-gradient-to-br from-emerald-500 to-teal-700",
  midnight: "bg-gradient-to-br from-slate-700 to-slate-900",
  coral:    "bg-gradient-to-br from-rose-400 to-orange-500",
};

function themeBg(theme: string) {
  return THEME_CLASSES[theme] ?? "bg-gradient-to-br from-indigo-700 to-slate-900";
}

export function TryoutCard({ tryout }: { tryout: Tryout }) {
  const status = tryoutStatus(tryout);
  const slots = availableSlotsCount(tryout);

  return (
    <Card className="group overflow-hidden border-border/60 p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative h-40 w-full overflow-hidden bg-muted">
        {tryout.image ? (
          <img
            src={tryout.image}
            alt={tryout.name}
            loading="lazy"
            width={800}
            height={400}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${themeBg(tryout.purpose)}`} />
        )}
        <div className="absolute right-3 top-3">
          <TryoutStatusBadge status={status} />
        </div>
        <div className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs font-semibold text-foreground backdrop-blur">
          Ages {tryout.ageGroup}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ocean">
            {tryout.club}
          </p>
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold text-foreground">
            {tryout.name}
          </h3>
        </div>

        <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary/70" />
            <span className="truncate">{tryout.city}, {tryout.state}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary/70" />
            <span className="truncate">{formatDate(tryout.date)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary/70" />
            <span>{tryout.time}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary/70" />
            <span>{slots} slots left</span>
          </li>
        </ul>

        <p className="text-xs text-muted-foreground">
          Registration closes {relativeFromNow(tryout.deadline)}
        </p>

        <div className="mt-1 flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/tryouts/${tryout.id}`}>View Details</Link>
          </Button>
          <Button asChild className="btn-cta flex-1" disabled={status === "closed"}>
            <Link to={`/tryouts/${tryout.id}#register`}>Register Now</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}