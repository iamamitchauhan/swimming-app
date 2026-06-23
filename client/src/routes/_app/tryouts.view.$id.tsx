import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, CalendarDays, MapPin, Users2, Waves } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useTryout } from "@/hooks/use-tryouts";
import { useTryoutRegistration } from "@/hooks/use-tryout-dashboard";
import { RosterTab } from "./tryout-view/RosterTab";
import { SlotsTab } from "./tryout-view/SlotsTab";
import { WaitlistTab } from "./tryout-view/WaitlistTab";
import { ScoringTab } from "./tryout-view/ScoringTab";
import { LeaderboardTab } from "./tryout-view/LeaderboardTab";
import { CommsTab } from "./tryout-view/CommsTab";
import { statusLabel } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, string> = {
  open: "bg-success/10 text-success border-success/20",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-destructive/10 text-destructive border-destructive/20",
};

function firstSessionDate(sessions?: { date: string }[]) {
  const d = sessions?.[0]?.date;
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── InfoTile ─────────────────────────────────────────────────────────────────

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TryoutViewPage() {
  const { id = "" } = useParams<{ id: string }>();

  const { data: tryout, isLoading: tryoutLoading, error: tryoutError } = useTryout(id);
  const { data: rosterResult } = useTryoutRegistration(id, { page: 1, limit: 1 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") ?? "roster");
  const registerId = searchParams.get("registerId") ?? undefined;

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== tab) setTab(urlTab);
  }, [searchParams]);

  function handleTabChange(next: string) {
    setTab(next);
    const params: Record<string, string> = { tab: next };
    setSearchParams(params, { replace: true });
  }

  const TABS = [
    { key: "roster", label: `Roster (${rosterResult?.total ?? 0})` },
    { key: "slots", label: "Slots" },
    { key: "waitlist", label: "Waitlist" },
    { key: "scoring", label: "Scoring" },
    { key: "leaderboard", label: "Leaderboard" },
    // { key: "comms", label: "Comms" },
  ];

  if (tryoutLoading) {
    return (
      <PageShell title="Loading…" crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: "…" }]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (tryoutError || !tryout) {
    return (
      <PageShell title="Not found" crumbs={[{ label: "Tryouts", href: "/tryouts" }]}>
        <div className="text-center py-24 text-muted-foreground">Tryout not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={""}
      crumbs={[{ label: "Tryouts", href: "/tryouts" }, { label: tryout.name }]}
      actions={<> </>}
    >
      <div className="flex justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold">{tryout.name}</h2>
        </div>
      </div>

      {/* ── Tryout details ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <InfoTile icon={CalendarDays} label="Date" value={firstSessionDate(tryout.sessions)} />
        <InfoTile icon={MapPin} label="Location" value={tryout.location || "—"} />
        <InfoTile
          icon={Users2}
          label="Registrations"
          value={`${rosterResult?.total ?? "…"} registered`}
        />
        <InfoTile
          icon={Waves}
          label="Status"
          value={
            <Badge variant="outline" className={STATUS_VARIANT[tryout.status] ?? ""}>
              {statusLabel(tryout.status)}
            </Badge>
          }
        />
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        <SegmentedTabs
          tabs={TABS.map((t) => ({ value: t.key, label: t.label }))}
          active={tab}
          onChange={handleTabChange}
        />
      </div>

      <div className="overflow-hidden">
        {tab === "roster" && <RosterTab tryoutId={id} />}
        {tab === "slots" && <SlotsTab tryoutId={id} />}
        {tab === "waitlist" && <WaitlistTab tryoutId={id} />}
        {tab === "scoring" && <ScoringTab tryoutId={id} registerId={registerId} />}
        {tab === "leaderboard" && <LeaderboardTab tryoutId={id} />}
        {tab === "comms" && <CommsTab tryoutId={id} />}
      </div>
    </PageShell>
  );
}
