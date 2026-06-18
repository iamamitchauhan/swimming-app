import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, CalendarDays, MapPin, Users2, Waves, Pencil, ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTryout } from "@/hooks/use-tryouts";
import { apiClient, api } from "@/lib/api/client";
import type { Registration, TryoutSlot, LeaderboardEntry } from "@/lib/api/tryouts.api";
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

const THEME_STYLES: Record<
  string,
  { activeBg: string; activeText: string; badgeBg: string; badgeText: string }
> = {
  ocean: {
    activeBg: "bg-blue-600",
    activeText: "text-white",
    badgeBg: "bg-amber-400",
    badgeText: "text-amber-900",
  },
  sunset: {
    activeBg: "bg-orange-500",
    activeText: "text-white",
    badgeBg: "bg-red-400",
    badgeText: "text-red-900",
  },
  forest: {
    activeBg: "bg-green-600",
    activeText: "text-white",
    badgeBg: "bg-yellow-400",
    badgeText: "text-yellow-900",
  },
  midnight: {
    activeBg: "bg-indigo-700",
    activeText: "text-white",
    badgeBg: "bg-sky-400",
    badgeText: "text-sky-900",
  },
  coral: {
    activeBg: "bg-rose-500",
    activeText: "text-white",
    badgeBg: "bg-teal-400",
    badgeText: "text-teal-900",
  },
};

function themeStyle(theme?: string) {
  return THEME_STYLES[theme ?? "ocean"] ?? THEME_STYLES["ocean"];
}

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
  const [roster, setRoster] = useState<Registration[]>([]);
  const [slots, setSlots] = useState<TryoutSlot[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("roster");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const registered = roster.filter((r) => r.status !== "waitlisted");
  const waitlisted = roster.filter((r) => r.status === "waitlisted");
  const needsReviewCount = roster.filter(
    (r) =>
      r.usa_membership_id &&
      (r.usa_verification_status === "needs_review" ||
        r.usa_verification_status === "pending" ||
        !r.usa_verification_status),
  ).length;

  // ── Load roster + slots ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rosterRes, slotsRes] = await Promise.all([
        api<Registration[]>(apiClient.get(`/tryouts/${id}/registrations`)).catch(() => []),
        api<{ slots: TryoutSlot[] }>(apiClient.get(`/tryouts/${id}/slots`))
          .then((r) => r.slots)
          .catch(() => []),
      ]);
      setRoster(rosterRes);
      setSlots(slotsRes);
    } catch {
      // silently handled above
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setRoster((prev) => prev.map((r) => (r.id === regId ? { ...r, status } : r)));
      toast.success(status === "offered" ? "Offer sent!" : "Rejected.");
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function promoteWaitlist(regId: string) {
    try {
      await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/promote`));
      await loadData();
      toast.success("Promoted from waitlist!");
    } catch {
      toast.error("Failed to promote.");
    }
  }

  async function setVerifyStatus(regId: string, status: string) {
    try {
      await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/verify`, { status }));
      setRoster((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, usa_verification_status: status } : r)),
      );
      toast.success("Verification status updated.");
    } catch {
      toast.error("Failed to update verification.");
    }
  }

  async function saveScore(regId: string, edits: Partial<Registration>) {
    await api(apiClient.put(`/tryouts/${id}/registrations/${regId}/score`, edits));
    setRoster((prev) => prev.map((r) => (r.id === regId ? { ...r, ...edits } : r)));
    toast.success("Score saved.");
  }

  async function sendComm(params: {
    audience: string;
    subject: string;
    body: string;
    recipients: Registration[];
  }) {
    await api(
      apiClient.post(`/tryouts/${id}/comms`, {
        audience: params.audience,
        subject: params.subject,
        body: params.body,
      }),
    );
    toast.success(`Email sent to ${params.recipients.length} recipients.`);
  }

  // ── Tabs definition ───────────────────────────────────────────────────────
  const TABS = [
    { key: "roster", label: `Roster (${registered.length})` },
    { key: "slots", label: "Slots" },
    { key: "waitlist", label: `Waitlist (${waitlisted.length})` },
    {
      key: "usa-verify",
      label: "USA-S Verify",
      badge: needsReviewCount > 0 ? needsReviewCount : null,
    },
    { key: "scoring", label: "Scoring" },
    { key: "leaderboard", label: "Leaderboard" },
    // { key: "comms",       label: "Comms" },
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
        <Button variant="outline" size="sm" onClick={() => navigate(`/tryouts/edit/${id}`)}>
          <Pencil className="h-4 w-4 mr-1.5" /> Edit
        </Button>
      </div>

      {/* ── Tryout details ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <InfoTile icon={CalendarDays} label="Date" value={firstSessionDate(tryout.sessions)} />
        <InfoTile icon={MapPin} label="Location" value={tryout.location || "—"} />
        <InfoTile
          icon={Users2}
          label="Registrations"
          value={loading ? "…" : `${registered.length} registered`}
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

      {/* ── Tab container ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {(() => {
            const theme = themeStyle(tryout.theme);
            return TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => (t.key === "leaderboard" ? loadLeaderboard() : setTab(t.key))}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium transition whitespace-nowrap ${
                  tab === t.key
                    ? `${theme.activeBg} ${theme.activeText}`
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {t.label}
                {t.badge && (
                  <span
                    className={`${theme.badgeBg} ${theme.badgeText} text-xs font-bold px-1.5 py-0.5 rounded-full`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ));
          })()}
        </div>

        {/* Tab content */}
        {tab === "roster" && (
          <RosterTab tryout={tryout} registered={registered} onDecision={sendDecision} />
        )}

        {tab === "slots" && <SlotsTab slots={slots} />}

        {tab === "waitlist" && <WaitlistTab waitlisted={waitlisted} onPromote={promoteWaitlist} />}

        {tab === "usa-verify" && (
          <UsaVerifyTab roster={roster} onSetVerifyStatus={setVerifyStatus} />
        )}

        {tab === "scoring" && <ScoringTab registered={registered} onSaveScore={saveScore} />}

        {tab === "leaderboard" && (
          <LeaderboardTab leaderboard={leaderboard} onDecision={sendDecision} />
        )}

        {tab === "comms" && <CommsTab roster={roster} waitlisted={waitlisted} onSend={sendComm} />}
      </div>
    </PageShell>
  );
}
