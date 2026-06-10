import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Waves } from "lucide-react";

const regs = [
  { swimmer: "Mia Davies", tryout: "Spring Tryouts 2026", date: "Mar 15, 2026", status: "Confirmed" },
  { swimmer: "Mia Davies", tryout: "Junior Squad Eval", date: "Mar 22, 2026", status: "Pending" },
  { swimmer: "Owen Davies", tryout: "AquaKids Open", date: "Apr 02, 2026", status: "Waitlist" },
];

export default function Registrations() {
  return (
    <PageShell title="My Registrations">
      <div className="space-y-3">
        {regs.map((r, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-aqua/15 text-aqua-foreground flex items-center justify-center">
              <Waves className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{r.tryout}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-3">
                <span>{r.swimmer}</span> <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {r.date}</span>
              </p>
            </div>
            <Badge variant="secondary">{r.status}</Badge>
            <Button variant="outline" size="sm">View</Button>
          </div>
        ))}
      </div>
    </PageShell>
  );
}