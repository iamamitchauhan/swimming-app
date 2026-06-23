import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CalendarDays, MapPin, Users2, Waves, Pencil, ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useTryout } from "@/hooks/use-tryouts";
import { apiClient, api } from "@/lib/api/client";
import { tryoutsApi } from "@/lib/api/tryouts.api";
import type {
  Registration,
  TryoutSlot,
  LeaderboardEntry,
  RegistrationListParams,
  RegistrationListResult,
} from "@/lib/api/tryouts.api";
import { RosterTab } from "./tryout-view/RosterTab";
import { SlotsTab } from "./tryout-view/SlotsTab";
import { WaitlistTab } from "./tryout-view/WaitlistTab";
import { UsaVerifyTab } from "./tryout-view/UsaVerifyTab";
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
  const navigate = useNavigate();

  const { data: tryout, isLoading: tryoutLoading, error: tryoutError } = useTryout(id);

  // ── Data state ───────────────────────────────────────────────────────────────
  const [rosterResult, setRosterResult] = useState<RegistrationListResult>({
    registrations: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [rosterParams, setRosterParams] = useState<RegistrationListParams>({
    page: 1,
    limit: 10,
    sortBy: "swimmer_name",
    sortOrder: "asc",
  });
  // Full (unpaginated) list used by ScoringTab, WaitlistTab, CommsTab
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [slots, setSlots] = useState<TryoutSlot[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("roster");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const registered = allRegistrations.filter((r) => r.status !== "waitlisted");
  const waitlisted = allRegistrations.filter((r) => r.status === "waitlisted");

  // ── Load roster (server-side, paginated) ─────────────────────────────────
  const loadRoster = useCallback(
    async (params: RegistrationListParams) => {
      if (!id) return;
      setLoading(true);
      try {
        const result = await tryoutsApi.getRegistrations(id, params).catch(() => null);
        if (result) setRosterResult(result);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  // ── Load all registrations (for Scoring/Waitlist/Comms tabs) ─────────────
  const loadAllRegistrations = useCallback(async () => {
    if (!id) return;
    try {
      const result = await tryoutsApi.getRegistrations(id, { limit: 1000 }).catch(() => null);
      if (result) setAllRegistrations(result.registrations);
    } catch {
      // no-op
    }
  }, [id]);

  // ── Load slots ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [slotsRes] = await Promise.all([
        api<{ slots: TryoutSlot[] }>(apiClient.get(`/tryouts/${id}/slots`))
          .then((r) => r.slots)
          .catch(() => []),
      ]);
      setSlots(slotsRes);
    } catch {
      // silently handled above
    }
  }, [id]);



  // ── Leaderboard (loaded on tab switch) ───────────────────────────────────
  async function loadLeaderboard() {
    setTab("leaderboard");
    try {
      const data = await api<LeaderboardEntry[]>(apiClient.get(`/tryouts/${id}/leaderboard`)).catch(
        () => [],
      );
      setLeaderboard(data);
    } catch {
      /* no-op */
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function sendDecision(regId: string, status: "offered" | "rejected") {
    try {
      await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/decision`, { status }));
      await Promise.all([loadRoster(rosterParams), loadAllRegistrations()]);
      toast.success(status === "offered" ? "Offer sent!" : "Rejected.");
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function promoteWaitlist(regId: string) {
    try {
      await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/promote`));
      await Promise.all([loadData(), loadRoster(rosterParams), loadAllRegistrations()]);
      toast.success("Promoted from waitlist!");
    } catch {
      toast.error("Failed to promote.");
    }
  }

  async function saveScore(regId: string, edits: Partial<Registration>) {
    await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/score`, edits));
    await Promise.all([loadRoster(rosterParams), loadAllRegistrations()]);
    toast.success("Score saved.");
  }

    useEffect(() => {
    loadData();
    loadRoster(rosterParams);
    loadAllRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, loadRoster, loadAllRegistrations]);

  // ── Tabs definition ───────────────────────────────────────────────────────
  const TABS = [
    { key: "roster", label: `Roster (${rosterResult.total})` },
    { key: "slots", label: "Slots" },
    { key: "waitlist", label: `Waitlist (${waitlisted.length})` },
    { key: "scoring", label: "Scoring" },
    { key: "leaderboard", label: "Leaderboard" },
  ];

  // ── Loading / error states ────────────────────────────────────────────────
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

  console.info("tryout =>", tryout);

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
          value={loading ? "…" : `${rosterResult.total} registered`}
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
          tabs={TABS.map((t) => ({
            value: t.key,
            label: t.label,
            // badge: t.badge != null ? String(t.badge) : undefined,
          }))}
          active={tab}
          onChange={(value) => (value === "leaderboard" ? loadLeaderboard() : setTab(value))}
        />
      </div>
      {/* ── Tab container ──────────────────────────────────────────────────── */}
      <div className="overflow-hidden">
        {/* Tab bar */}

        {/* Tab content */}
        {tab === "roster" && (
          <RosterTab
            tryout={tryout}
            rosterResult={rosterResult}
            rosterParams={rosterParams}
            loading={loading}
            onParamsChange={(params) => {
              const next = { ...rosterParams, ...params };
              setRosterParams(next);
              loadRoster(next);
            }}
            onDecision={sendDecision}
          />
        )}

        {tab === "slots" && <SlotsTab slots={slots} />}

        {tab === "waitlist" && <WaitlistTab waitlisted={waitlisted} onPromote={promoteWaitlist} />}

        {tab === "scoring" && <ScoringTab registered={registered} onSaveScore={saveScore} />}

        {tab === "leaderboard" && (
          <LeaderboardTab leaderboard={leaderboard} onDecision={sendDecision} />
        )}

        
      </div>
    </PageShell>
  );
}
