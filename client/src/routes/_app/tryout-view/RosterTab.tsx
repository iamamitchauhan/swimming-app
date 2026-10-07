import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Info,
  Loader2,
  Mail,
  MoreVertical,
  RotateCcw,
  Smartphone,
  X,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SCORING_CRITERIA } from "@/lib/scoring-criteria";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { calculateDetailedScoreTotal, cn } from "@/lib/utils";
import type {
  Registration,
  RegistrationListParams,
  RegistrationSortField,
  SortOrder,
} from "@/lib/api/tryouts.api";
import { useTryout } from "@/hooks/use-tryouts";
import {
  useTryoutRegistration,
  useTryoutSlots,
  useSendDecision,
  useSaveScore,
  useResetScore,
  useCheckInMutation,
  tryoutDashboardKeys,
} from "@/hooks/use-tryout-dashboard";
import { useGroups } from "@/hooks/use-groups";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useAuthStore } from "@/lib/auth.store";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { DecisionConfirmDialog } from "./DecisionConfirmDialog";
import { CheckInPopover } from "./CheckInPopover";
import { SentEmailPreviewDialog } from "./SentEmailPreviewDialog";
import { RosterFilterBar, REJECTED_VALUE, COACH_VISIBLE_STATUSES } from "./RosterFilters";
import { RosterCard } from "./RosterCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Bulk scoring handles at most this many swimmers at once. Coaches only have the
 * "Score together" bulk action, so their selection is capped here to keep the
 * action bar from going empty. Admins stay unlimited (they can bulk check-in,
 * offer and reject any number of swimmers).
 */
const MAX_BULK_SCORE_SWIMMERS = 5;

/** Remembers that a coach has dismissed the one-time landscape-mode hint. */
const LANDSCAPE_ALERT_KEY = "swimclub.coach.landscape-alert-seen";

/** Phone-sized screens held upright (below Tailwind's `md` tablet breakpoint). */
const PHONE_PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 767px)";

const STATUS_COLORS: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  offered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
  waitlisted: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const VERIFY_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  needs_review: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-500",
};

const VERIFY_LABELS: Record<string, string> = {
  pending: "Pending",
  needs_review: "Needs review",
  verified: "Verified",
  rejected: "Rejected",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t?: string) {
  if (!t) return "";
  if (/^\d{1,2}:\d{2}\s*[AaPp][Mm]$/.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "9:05 AM" from an ISO check-in timestamp. "" when empty/invalid. */
function fmtCheckInTime(input?: string | null) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Sep 26, 2026 · 9:05 AM" — full check-in timestamp for the tooltip. */
function fmtCheckInFull(input?: string | null) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${date} · ${fmtCheckInTime(input)}`;
}

const DETAILED_SCORE_FIELDS = SCORING_CRITERIA.map((c) => c.id);
const DETAILED_SCORE_TOTAL = DETAILED_SCORE_FIELDS.length;

function avg(r: Registration) {
  return calculateDetailedScoreTotal(r.detailed_scores);
}

/** True when the swimmer has any recorded score — detailed criteria or a stroke total. */
function hasScore(r: Registration) {
  if (avg(r) != null) return true;
  const total = r.total_score;
  return total != null && total !== "" && Number(total) > 0;
}

/**
 * Cancelled or waitlisted — not an active part of the tryout, so the roster
 * exposes no actions for these rows. A waitlisted swimmer only becomes active
 * once promoted to `registered`.
 */
function isInactive(r: Registration) {
  return r.status === "cancelled" || r.status === "waitlisted";
}

/**
 * Scoring is only allowed once the swimmer is checked in, and never for
 * cancelled, waitlisted or rejected registrations.
 */
function canAddScore(r: Registration) {
  return !!r.checked_in_at && !isInactive(r) && r.status !== "rejected";
}

/** The coach-recommendation dropdown unlocks only after a check-in + a score. */
function canEditCoachRecommendation(r: Registration) {
  return canAddScore(r) && hasAnyScore(r);
}

/** Toast how many selected rows a bulk action skipped because they were ineligible. */
function notifySkipped(skipped: number, reason: string) {
  if (skipped > 0) {
    toast.info(`Skipped ${skipped} swimmer${skipped === 1 ? "" : "s"}`, {
      id: "roster-skipped",
      description: reason,
    });
  }
}

function countYesNo(r: Registration) {
  const values = Object.values(r.detailed_scores ?? {});
  const yes = values.filter((v) => v === "yes" || v === true).length;
  const no = values.filter((v) => v === "no" || v === false).length;
  return { yes, no };
}

/** True when the swimmer has any recorded score — a numeric score or a Yes/No answer. */
function hasAnyScore(r: Registration) {
  if (hasScore(r)) return true;
  const { yes, no } = countYesNo(r);
  return yes + no > 0;
}

function detailedScoreCompletion(r: Registration) {
  const done = DETAILED_SCORE_FIELDS.filter((field) => {
    const value = r.detailed_scores?.[field];
    return value !== null && value !== undefined && value !== "" && value !== 0;
  }).length;

  return {
    done,
    total: DETAILED_SCORE_TOTAL,
    pct: Math.round((done / DETAILED_SCORE_TOTAL) * 100),
  };
}

// ─── SortIcon ─────────────────────────────────────────────────────────────────

function SortIcon({ field, active, order }: { field: string; active: string; order: SortOrder }) {
  if (field !== active) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 ml-1 inline" />;
  return order === "asc" ? (
    <ChevronUp className="h-3.5 w-3.5 text-white ml-1 inline" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 text-white ml-1 inline" />
  );
}

// ─── Bulk action button ─────────────────────────────────────────────────────────

/** Plain text action used inside the floating bulk-action pill. */
function BulkAction({
  onClick,
  disabled = false,
  tone = "neutral",
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "neutral" | "success" | "danger" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "text-gray-300 hover:bg-white/10 hover:text-white",
    success: "text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300",
    danger: "text-red-400 hover:bg-red-400/10 hover:text-red-300",
    info: "text-blue-300 hover:bg-blue-400/10 hover:text-blue-200",
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RosterTab({ tryoutId }: Props) {
  const { data: tryout } = useTryout(tryoutId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [rosterParams, setRosterParams] = useState<RegistrationListParams>(() => ({
    page: 1,
    limit: 10,
    sortBy: "session_time",
    sortOrder: "asc",
    // Coaches default to the check-in filter (they can only score checked-in
    // swimmers); it can still be switched back to "All check-ins". They also
    // never see waitlisted or cancelled registrations.
    ...(user?.role === "coach" ? { checkedIn: true, statuses: COACH_VISIBLE_STATUSES } : {}),
  }));
  const { data: rosterResult, isLoading: loading } = useTryoutRegistration(tryoutId, rosterParams);
  const { registrations = [], total = 0, page = 1, totalPages = 0 } = rosterResult ?? {};
  const { data: slots = [] } = useTryoutSlots(tryoutId);
  const sendDecision = useSendDecision(tryoutId);
  const resetScore = useResetScore(tryoutId);
  const checkInMutation = useCheckInMutation(tryoutId);
  const { data: groups } = useGroups();
  const isPhonePortrait = useMediaQuery(PHONE_PORTRAIT_QUERY);

  function onParamsChange(params: Partial<RegistrationListParams>) {
    setRosterParams((prev) => ({ ...prev, ...params }));
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);

  // ── Bulk selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"offered" | "rejected" | null>(null);
  const [pendingRegId, setPendingRegId] = useState<string | null>(null);
  const [resetConfirmRegId, setResetConfirmRegId] = useState<string | null>(null);
  const [sentEmailPreview, setSentEmailPreview] = useState<{
    regId: string;
    action: "offered" | "rejected";
  } | null>(null);
  const [pendingRegIds, setPendingRegIds] = useState<string[]>([]);
  // Registration ids the current bulk offer/reject targets (after skipping
  // ineligible rows). Empty for single-row actions.
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [landscapeAlertOpen, setLandscapeAlertOpen] = useState(false);

  const canManageCoaches = user?.role === "admin" || user?.role === "super_admin";

  function openDecisionDialog(regId: string, status: "offered" | "rejected") {
    setPendingRegId(regId);
    setBulkTargetIds([]);
    setBulkAction(status);
    setConfirmOpen(true);
  }

  function validateCoachRecommendation(rows: Registration[]): boolean {
    const missing = rows.filter((r) => !r.coach_recommendation);
    if (missing.length > 0) {
      toast.error("Coach recommendation required", {
        id: "coach-rec-required",
        description: `Please assign a coach recommendation before proceeding`,
        duration: 6000,
      });
      return false;
    }
    return true;
  }

  // Offer validation: no swimmer may have coach recommendation set to
  // "rejected" — they must be assigned to a group first.
  function validateOfferCoachRecommendation(rows: Registration[]): boolean {
    if (!validateCoachRecommendation(rows)) return false;
    const rejectedOnes = rows.filter((r) => r.coach_recommendation === REJECTED_VALUE);
    if (rejectedOnes.length > 0) {
      toast.error("Cannot offer — coach recommendation is set to Reject", {
        id: "offer-rec-is-reject",
        description: `Please change coach recommendation to a group before offering.`,
        duration: 6000,
      });
      return false;
    }
    return true;
  }

  // Reject validation: every swimmer must have coach recommendation set to
  // "rejected" before bulk reject is allowed.
  function validateRejectCoachRecommendation(rows: Registration[]): boolean {
    if (!validateCoachRecommendation(rows)) return false;
    const notRejected = rows.filter((r) => r.coach_recommendation !== REJECTED_VALUE);
    if (notRejected.length > 0) {
      const names = notRejected.map((r) => r.swimmer_name).join(", ");
      toast.error("Coach recommendation must be set to Reject", {
        id: "reject-rec-not-reject",
        description: `Please change coach recommendation to Reject before rejecting.`,
        duration: 6000,
      });
      return false;
    }
    return true;
  }

  useEffect(() => {
    setSelectedIds(new Set());
  }, [rosterResult]);

  const registeredRows = registrations.filter((r) => r.status === "registered");
  const allRegisteredSelected =
    registeredRows.length > 0 && registeredRows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  // Selected rows on the current page, plus the subsets each bulk action may
  // touch. Ineligible rows are skipped (see the bulk handlers below).
  const selectedRows = registrations.filter((r) => selectedIds.has(r.id));
  const scoreEligibleRows = selectedRows.filter(canAddScore);
  const offerRejectEligibleRows = selectedRows.filter((r) => r.status === "registered");
  const checkInEligibleRows = selectedRows.filter((r) => !isInactive(r));

  /** Coaches can't select past the bulk-scoring cap. */
  function atSelectionLimit() {
    return isCoach && selectedIds.size >= MAX_BULK_SCORE_SWIMMERS;
  }

  function notifySelectionLimit() {
    toast.info(`You can select up to ${MAX_BULK_SCORE_SWIMMERS} swimmers`, {
      id: "roster-selection-limit",
      description: `Bulk scoring supports up to ${MAX_BULK_SCORE_SWIMMERS} swimmers at a time.`,
    });
  }

  function toggleAll() {
    if (allRegisteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        registrations.forEach((r) => next.delete(r.id));
        return next;
      });
      return;
    }
    const toAdd = registrations.filter((r) => !selectedIds.has(r.id));
    const room = isCoach ? MAX_BULK_SCORE_SWIMMERS - selectedIds.size : toAdd.length;
    if (toAdd.length > room) notifySelectionLimit();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of toAdd) {
        if (isCoach && next.size >= MAX_BULK_SCORE_SWIMMERS) break;
        next.add(r.id);
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    if (!selectedIds.has(id) && atSelectionLimit()) {
      notifySelectionLimit();
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Navigate to bulk scoring for the selected, score-eligible swimmers. */
  function goToBulkScoring() {
    if (scoreEligibleRows.length === 0) {
      toast.error("No swimmers can be scored", {
        id: "no-score-eligible",
        description:
          "Scoring requires a check-in; cancelled, waitlisted and rejected swimmers can't be scored.",
      });
      return;
    }
    notifySkipped(
      selectedRows.length - scoreEligibleRows.length,
      "Scoring requires a check-in; cancelled, waitlisted and rejected swimmers were skipped.",
    );
    const ids = scoreEligibleRows.map((r) => r.id);
    // Seed the bulk-scoring registrations query with the rows already on screen
    // so the scoring view renders instantly instead of re-fetching them by id.
    // The query key must mirror BulkScoringPage exactly (page 1, limit = ids).
    qc.setQueryData(
      tryoutDashboardKeys.roster(tryoutId, {
        page: 1,
        limit: Math.max(ids.length, 1),
        registerIds: ids,
      }),
      {
        registrations: scoreEligibleRows,
        total: scoreEligibleRows.length,
        page: 1,
        limit: Math.max(ids.length, 1),
        totalPages: 1,
      },
    );
    navigate(`/tryouts/view/${tryoutId}/bulk-scoring?ids=${ids.join(",")}`);
  }

  async function handleConfirm() {
    if (!bulkAction) return;
    try {
      if (pendingRegId) {
        await sendDecision.mutateAsync({ regId: pendingRegId, status: bulkAction });
        setPendingRegId(null);
      } else if (bulkTargetIds.length > 0) {
        await Promise.all(
          bulkTargetIds.map((id) => sendDecision.mutateAsync({ regId: id, status: bulkAction })),
        );
        setSelectedIds(new Set());
      }
    } catch {
      // Errors are handled by the mutation's onError
    } finally {
      setConfirmOpen(false);
      setBulkAction(null);
      setBulkTargetIds([]);
    }
  }

  /**
   * Check in / un-check registrations. When `checkedInAt` is omitted the server
   * defaults to now. Resolves `true` on success.
   */
  async function setCheckIn(
    regIds: string[],
    checkedIn: boolean,
    checkedInAt?: string,
  ): Promise<boolean> {
    setPendingRegIds((prev) => Array.from(new Set([...prev, ...regIds])));
    try {
      await checkInMutation.mutateAsync({ registrationIds: regIds, checkedIn, checkedInAt });
      return true;
    } catch {
      // Errors are surfaced by the mutation's onError.
      return false;
    } finally {
      setPendingRegIds((prev) => prev.filter((id) => !regIds.includes(id)));
    }
  }

  const sortBy = rosterParams.sortBy ?? "swimmer_name";
  const sortOrder = rosterParams.sortOrder ?? "asc";

  function handleSort(field: RegistrationSortField) {
    if (sortBy === field) {
      onParamsChange({ sortBy: field, sortOrder: sortOrder === "asc" ? "desc" : "asc", page: 1 });
    } else {
      onParamsChange({ sortBy: field, sortOrder: "asc", page: 1 });
    }
  }

  // ── Coach segment scoping ──────────────────────────────────────────────────
  const isCoach = user?.role === "coach";
  const coachAssignment = isCoach
    ? tryout?.coachAssignments?.find((a) => a.coachId === user?.id)
    : undefined;
  const visibleSegments = isCoach
    ? (tryout?.segments ?? []).filter((seg) =>
        (coachAssignment?.segmentIds ?? []).includes((seg as any).id ?? seg.name),
      )
    : (tryout?.segments ?? []);

  // Auto-select the single assigned segment for coaches
  useEffect(() => {
    if (isCoach && tryout && coachAssignment && !rosterParams.segmentIds?.length) {
      if (visibleSegments.length === 1) {
        const seg = visibleSegments[0];
        onParamsChange({ segmentIds: [(seg as any).id ?? seg.name], page: 1 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach, tryout, coachAssignment]);

  // Coaches default to the check-in filter — they can only score checked-in
  // swimmers — but can still switch back to "All check-ins".
  useEffect(() => {
    if (isCoach) {
      setRosterParams((prev) =>
        prev.checkedIn === undefined ? { ...prev, checkedIn: true, page: 1 } : prev,
      );
    }
  }, [isCoach]);

  // Coaches never see waitlisted or cancelled registrations. Re-apply the
  // status filter if the user object only loads after the first render.
  useEffect(() => {
    if (isCoach) {
      setRosterParams((prev) =>
        prev.statuses === undefined ? { ...prev, statuses: COACH_VISIBLE_STATUSES, page: 1 } : prev,
      );
    }
  }, [isCoach]);

  // Coaches get a one-time nudge to rotate their device to landscape, shown only
  // on phone-sized portrait screens. Once dismissed it's remembered so it never
  // shows again; rotating to landscape simply hides it (without dismissing).
  useEffect(() => {
    if (!isCoach || !isPhonePortrait) {
      setLandscapeAlertOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(LANDSCAPE_ALERT_KEY) !== "true") setLandscapeAlertOpen(true);
    } catch {
      // localStorage unavailable (e.g. private mode) — show it anyway.
      setLandscapeAlertOpen(true);
    }
  }, [isCoach, isPhonePortrait]);

  function dismissLandscapeAlert() {
    try {
      localStorage.setItem(LANDSCAPE_ALERT_KEY, "true");
    } catch {
      // Ignore storage failures — the alert just reappears next visit.
    }
    setLandscapeAlertOpen(false);
  }

  const filterSegments = visibleSegments.map((seg) => ({
    id: (seg as any).id ?? seg.name,
    name: seg.name,
  }));

  return (
    <div>
      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <RosterFilterBar
        role={isCoach ? "coach" : "admin"}
        segments={filterSegments}
        slots={slots}
        groups={groups ?? []}
        params={rosterParams}
        onChange={onParamsChange}
        search={rosterParams.search ?? ""}
        onSearch={(v) => onParamsChange({ search: v, page: 1 })}
        total={total}
        fmtDate={fmtDate}
        fmtTime={fmtTime}
      />

      {/* Nudge portrait-phone users to rotate — that's the only case where the
          roster falls back to cards. */}
      <div className="mt-4 hidden phone-portrait:block">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              For a better viewing experience, please use landscape mode on your device.
            </span>
          </div>
        </div>
      </div>

      {/* Add sorting column dropdown */}

      {/* ── Roster: table on tablet/desktop and landscape phones, cards only
          on portrait phones ─────────────────────────────────────────────── */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-gray-200 sm:block phone-landscape:block">
        <Table>
          <TableHeader className="sticky top-0 z-20 rounded-t-xl">
            <TableRow>
              <TableHead className="w-10 px-4">
                <Checkbox
                  checked={allRegisteredSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all registered"
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("swimmer_name")}
              >
                Swimmer Info
                <SortIcon field="swimmer_name" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("swimmer_age")}
              >
                Segment /<br className="lg:hidden" /> Age
                <SortIcon field="swimmer_age" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("session_time")}
              >
                Slot
                <SortIcon field="session_time" active={sortBy} order={sortOrder} />
              </TableHead>
              {!isCoach && (
                <>
                  <TableHead
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <SortIcon field="status" active={sortBy} order={sortOrder} />
                  </TableHead>
                  <TableHead>Check-in</TableHead>
                </>
              )}
              <TableHead>Evaluation</TableHead>
              <TableHead>Coach Recommendation</TableHead>
              {!isCoach && <TableHead>Decision</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {loading && (
              <TableRow>
                <TableCell colSpan={isCoach ? 6 : 9} className="py-10 text-center text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={isCoach ? 6 : 9} className="py-10 text-center text-gray-400">
                  No registrations found
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              registrations.map((r) => {
                const verSt = r.usa_verification_status || "pending";
                return (
                  <TableRow
                    key={r.id}
                    className={`hover:bg-gray-50 transition ${selectedIds.has(r.id) ? "bg-blue-50" : ""}`}
                  >
                    <TableCell className="w-10 px-4 py-3">
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleRow(r.id)}
                        aria-label={`Select ${r.swimmer_name}`}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div
                        className="cursor-pointer text-blue-700 hover:underline"
                        onClick={() => {
                          setSelectedRegId(r.id);
                          setModalOpen(true);
                        }}
                      >
                        {r.swimmer_name}
                      </div>
                      {(r.guardian_name || r.parent_name) && (
                        <div className="text-xs text-gray-400">
                          Parent: {r.guardian_name || r.parent_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-gray-600">{r.segment_name || "—"}</div>
                      <div className="text-xs text-gray-400">Age {r.swimmer_age}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="text-gray-600">
                        {r.slot_id?.startTime
                          ? `${fmtTime(r.slot_id.startTime)} – ${fmtTime(r.slot_id.endTime)}`
                          : "—"}
                      </div>
                      {r.session_date && (
                        <div className="text-xs text-gray-400">{fmtDate(r.session_date)}</div>
                      )}
                    </TableCell>
                    {!isCoach && (
                      <>
                        <TableCell className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status]}`}
                          >
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <CheckInControl
                            registration={r}
                            isPending={pendingRegIds.includes(r.id)}
                            onSetCheckIn={setCheckIn}
                          />
                        </TableCell>
                      </>
                    )}

                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      <ScoreControl
                        registration={r}
                        tryoutId={tryoutId}
                        onReset={setResetConfirmRegId}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      <CoachRecommendationControl registration={r} tryoutId={tryoutId} />
                    </TableCell>
                    {!isCoach && (
                      <TableCell className="px-4 py-3">
                        <DecisionActions
                          registration={r}
                          canManageCoaches={canManageCoaches}
                          onOpenDecision={openDecisionDialog}
                          onViewSentEmail={setSentEmailPreview}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* ── Roster cards (portrait phones only) ───────────────────────────── */}
      <div className="mt-3 space-y-2 sm:hidden phone-landscape:hidden">
        {loading && (
          <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-gray-400">
            <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
            Loading…
          </div>
        )}
        {!loading && registrations.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-gray-400">
            No registrations found
          </div>
        )}
        {!loading &&
          registrations.map((r) => {
            const hasEmail = !!r.email_info && r.email_info.length > 0;
            // Cancelled/waitlisted rows expose no score or recommendation actions.
            const inactive = isInactive(r);
            // Offer/Reject footer shows for admins on registered rows, plus any
            // row that already has an email audit trail.
            const hasFooter =
              !isCoach && ((r.status === "registered" && canManageCoaches) || hasEmail);
            return (
              <RosterCard
                key={r.id}
                registration={r}
                selected={selectedIds.has(r.id)}
                onToggle={() => toggleRow(r.id)}
                onOpenDetail={() => {
                  setSelectedRegId(r.id);
                  setModalOpen(true);
                }}
                status={isCoach ? undefined : r.status}
                checkInControl={
                  isCoach ? undefined : (
                    <CheckInControl
                      registration={r}
                      isPending={pendingRegIds.includes(r.id)}
                      onSetCheckIn={setCheckIn}
                      variant="card"
                    />
                  )
                }
                scoreControl={
                  inactive ? undefined : (
                    <ScoreControl
                      registration={r}
                      tryoutId={tryoutId}
                      onReset={setResetConfirmRegId}
                      variant="card"
                    />
                  )
                }
                recommendationControl={
                  inactive ? undefined : (
                    <CoachRecommendationControl
                      registration={r}
                      tryoutId={tryoutId}
                      variant="card"
                    />
                  )
                }
                footer={
                  hasFooter ? (
                    <DecisionActions
                      registration={r}
                      canManageCoaches={canManageCoaches}
                      onOpenDecision={openDecisionDialog}
                      onViewSentEmail={setSentEmailPreview}
                      variant="card"
                    />
                  ) : undefined
                }
              />
            );
          })}
      </div>

      {/* ── Bulk action bar — one compact pill for coaches and admins ──────── */}
      {someSelected && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 sm:pb-5">
          <div className="flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-x-0.5 gap-y-1 rounded-2xl bg-gray-900 px-2 py-2 text-sm text-white shadow-2xl ring-1 ring-white/10">
            <button
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gray-300 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="shrink-0 whitespace-nowrap px-2 text-gray-300">
              <span className="font-semibold text-white">{selectedIds.size}</span> of {total}{" "}
              selected
            </span>

            <span className="mx-1 hidden h-5 w-px shrink-0 bg-white/15 sm:block" />

            {!isCoach && (
              <>
                <BulkAction
                  tone="success"
                  disabled={checkInEligibleRows.some((r) => pendingRegIds.includes(r.id))}
                  onClick={async () => {
                    if (checkInEligibleRows.length === 0) {
                      toast.error("No swimmers can be checked in", {
                        id: "no-checkin-eligible",
                        description: "Cancelled and waitlisted registrations can't be checked in.",
                      });
                      return;
                    }
                    notifySkipped(
                      selectedRows.length - checkInEligibleRows.length,
                      "Cancelled and waitlisted registrations can't be checked in.",
                    );
                    if (
                      await setCheckIn(
                        checkInEligibleRows.map((r) => r.id),
                        true,
                      )
                    ) {
                      setSelectedIds(new Set());
                    }
                  }}
                >
                  Check in
                </BulkAction>

                <BulkAction
                  disabled={Array.from(selectedIds).some((id) => pendingRegIds.includes(id))}
                  onClick={async () => {
                    const ids = Array.from(selectedIds);
                    if (await setCheckIn(ids, false)) setSelectedIds(new Set());
                  }}
                >
                  Un-check
                </BulkAction>

                <BulkAction
                  tone="success"
                  onClick={() => {
                    if (offerRejectEligibleRows.length === 0) {
                      toast.error("No swimmers can be offered", {
                        id: "no-offer-eligible",
                        description: "Only registered swimmers can be offered.",
                      });
                      return;
                    }
                    if (!validateOfferCoachRecommendation(offerRejectEligibleRows)) return;
                    notifySkipped(
                      selectedRows.length - offerRejectEligibleRows.length,
                      "Only registered swimmers were included.",
                    );
                    // When exactly one swimmer is eligible, treat it as a single
                    // action so the email preview can be fetched for that swimmer.
                    if (offerRejectEligibleRows.length === 1) {
                      setPendingRegId(offerRejectEligibleRows[0].id);
                    }
                    setBulkTargetIds(offerRejectEligibleRows.map((r) => r.id));
                    setBulkAction("offered");
                    setConfirmOpen(true);
                  }}
                >
                  Offer
                </BulkAction>

                <BulkAction
                  tone="danger"
                  onClick={() => {
                    if (offerRejectEligibleRows.length === 0) {
                      toast.error("No swimmers can be rejected", {
                        id: "no-reject-eligible",
                        description: "Only registered swimmers can be rejected.",
                      });
                      return;
                    }
                    if (!validateRejectCoachRecommendation(offerRejectEligibleRows)) return;
                    notifySkipped(
                      selectedRows.length - offerRejectEligibleRows.length,
                      "Only registered swimmers were included.",
                    );
                    if (offerRejectEligibleRows.length === 1) {
                      setPendingRegId(offerRejectEligibleRows[0].id);
                    }
                    setBulkTargetIds(offerRejectEligibleRows.map((r) => r.id));
                    setBulkAction("rejected");
                    setConfirmOpen(true);
                  }}
                >
                  Reject
                </BulkAction>
              </>
            )}

            {selectedIds.size <= MAX_BULK_SCORE_SWIMMERS && (
              <BulkAction tone="info" onClick={goToBulkScoring}>
                Score{scoreEligibleRows.length > 0 ? ` ${scoreEligibleRows.length}` : ""} together
              </BulkAction>
            )}
          </div>
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="sticky bottom-0 z-20 mt-4 flex items-center justify-between gap-3 border-t px-3 py-3 text-sm text-gray-600 backdrop-blur phone:gap-2 phone:py-2 phone:text-xs -mx-0.5 rounded-b-xl border bg-white p-4 transition border-gray-200">
          <span className="whitespace-nowrap">
            <span className="phone:hidden">Showing </span>
            <span className="font-medium">
              {(page - 1) * (rosterParams.limit ?? 20) + 1}–
              {Math.min(page * (rosterParams.limit ?? 20), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span>
            <span className="phone:hidden"> results</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 phone:gap-1.5">
            {/* Page size selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={`Page size: ${rosterParams.limit ?? 20}`}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer phone:gap-1.5 phone:px-2 phone:py-1 phone:text-xs"
                >
                  {rosterParams.limit ?? 20}
                  <span className="text-gray-500 phone:hidden">/ page</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[5, 10, 20, 50, 100].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => onParamsChange({ limit: size, page: 1 })}
                  >
                    {size}
                    {(rosterParams.limit ?? 20) === size && (
                      <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="phone:h-7 phone:px-2"
              disabled={page <= 1}
              onClick={() => onParamsChange({ page: page - 1 })}
            >
              Previous
            </Button>
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="phone:h-7 phone:px-2"
              disabled={page >= totalPages}
              onClick={() => onParamsChange({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <DecisionConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => {
          setConfirmOpen(v);
          if (!v) {
            setBulkAction(null);
            setPendingRegId(null);
            setBulkTargetIds([]);
          }
        }}
        action={bulkAction}
        onConfirm={handleConfirm}
        isPending={sendDecision.isPending}
        tryoutId={tryoutId}
        regId={pendingRegId}
        selectedCount={bulkTargetIds.length}
      />

      <AlertDialog
        open={resetConfirmRegId !== null}
        onOpenChange={(open) => {
          if (!open) setResetConfirmRegId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset score?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all scores for this swimmer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmRegId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!resetConfirmRegId) return;
                try {
                  await resetScore.mutateAsync(resetConfirmRegId);
                } catch {
                  // Errors are handled by the mutation's onError
                } finally {
                  setResetConfirmRegId(null);
                }
              }}
              disabled={resetScore.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetScore.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={landscapeAlertOpen}
        onOpenChange={(open) => {
          if (!open) dismissLandscapeAlert();
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <Smartphone className="h-8 w-8 animate-rotate-device text-primary motion-reduce:animate-none" />
            </div>
            <AlertDialogTitle className="text-center">Landscape mode recommended</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              For a better viewing experience, please use landscape mode on your device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:justify-center">
            <AlertDialogAction onClick={dismissLandscapeAlert} className="w-full sm:w-auto sm:px-8">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RegistrationDetailModal
        tryoutId={tryoutId}
        registrationId={selectedRegId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <SentEmailPreviewDialog
        open={sentEmailPreview !== null}
        onOpenChange={(v) => {
          if (!v) setSentEmailPreview(null);
        }}
        tryoutId={tryoutId}
        regId={sentEmailPreview?.regId ?? null}
        action={sentEmailPreview?.action ?? "offered"}
      />
    </div>
  );
}

// ─── Coach Recommendation Dropdown ─────────────────────────────────────────────

function CoachRecommendationSelect({
  tryoutId,
  regId,
  value,
  disabled,
  variant = "table",
}: {
  tryoutId: string;
  regId: string;
  value: string | undefined | null;
  /** Read-only mode — shows the recorded value but can't be changed. */
  disabled?: boolean;
  variant?: "table" | "card";
}) {
  const saveScore = useSaveScore(tryoutId);
  const { data: groups, isLoading } = useGroups();

  const selectedGroup = groups?.find((g) => g._id === value);

  const isRejected = value === undefined;
  const dotColor = value ? (selectedGroup?.color ?? "#9ca3af") : isRejected ? "#ef4444" : "#d1d5db";
  const isCard = variant === "card";
  const groupHex =
    selectedGroup?.color && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(selectedGroup.color)
      ? selectedGroup.color
      : null;
  // Card pills are tinted with the group's colour; a rejected recommendation
  // gets a red tint.
  const cardStyle =
    isCard && groupHex
      ? {
          backgroundColor: `color-mix(in oklab, ${groupHex} 14%, white)`,
          borderColor: `color-mix(in oklab, ${groupHex} 32%, white)`,
          color: `color-mix(in oklab, ${groupHex} 72%, black)`,
        }
      : isCard && isRejected
        ? {
            backgroundColor: "color-mix(in oklab, #ef4444 12%, white)",
            borderColor: "color-mix(in oklab, #ef4444 32%, white)",
            color: "#b91c1c",
          }
        : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isLoading || disabled}
          style={cardStyle}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border transition cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed",
            isCard
              ? cn(
                  "w-full justify-center px-3 py-1.5 text-sm font-semibold",
                  !cardStyle && "bg-gray-50 text-gray-600 border-gray-200",
                )
              : "text-xs px-2.5 py-1 font-medium bg-gray-50 text-gray-700 border-gray-200",
          )}
        >
          {isLoading ? (
            <Loader2 className="inline h-3 w-3 animate-spin" />
          ) : (
            <>
              {value !== null && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: dotColor }}
                  aria-hidden="true"
                />
              )}
              {isRejected
                ? "Reject"
                : (selectedGroup?.name ?? (isCard ? "Coach recommendation" : "Select"))}
              <ChevronDown
                className={cn("inline -mr-0.5 ml-1", isCard ? "h-3.5 w-3.5" : "h-3 w-3")}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Assign group
        </DropdownMenuLabel>
        {groups?.map((group) => (
          <DropdownMenuItem
            key={group._id}
            onClick={() => {
              saveScore.mutate({
                regId,
                edits: { coach_recommendation: group._id } as Partial<Registration>,
              });
            }}
            className={`cursor-pointer flex items-center gap-2 ${value === group._id ? "font-bold" : ""}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: group.color || "#e5e7eb" }}
              aria-hidden="true"
            />
            {group.name}
          </DropdownMenuItem>
        ))}
        {groups && groups.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          No group recommended
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            saveScore.mutate({
              regId,
              edits: { coach_recommendation: REJECTED_VALUE } as Partial<Registration>,
            });
          }}
          className={`cursor-pointer flex items-center gap-2 ${isRejected ? "font-bold" : ""}`}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "#ef4444" }}
            aria-hidden="true"
          />
          Reject
        </DropdownMenuItem>
        {(value !== null || isRejected) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                saveScore.mutate({
                  regId,
                  edits: { coach_recommendation: null } as Partial<Registration>,
                });
              }}
              className="cursor-pointer text-gray-400"
            >
              Clear
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Shared roster row controls ──────────────────────────────────────────────
// Used by both the desktop table and the mobile/tablet cards so the two views
// stay behaviourally identical.

/**
 * Green/red Yes/No tally. When `onReset` is provided the tally is a popover
 * trigger that shows the breakdown and a "Reset scores" action; otherwise it
 * renders as plain read-only text.
 */
function YesNoValue({
  registration: r,
  onReset,
  variant = "table",
}: {
  registration: Registration;
  onReset?: (regId: string) => void;
  variant?: "table" | "card";
}) {
  const { yes, no } = countYesNo(r);
  if (yes === 0 && no === 0) return <span className="text-gray-400">—</span>;

  const tally = (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="font-semibold text-green-600">{yes}</span>
      <span className="font-normal text-gray-400">/</span>
      <span className="font-semibold text-red-500">{no}</span>
    </span>
  );

  if (!onReset) return tally;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Yes/No breakdown for ${r.swimmer_name}`}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 transition-colors",
            variant === "card"
              ? "rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1.5 hover:bg-blue-50"
              : "rounded-lg border border-blue-200 bg-blue-50/50 px-2.5 py-1 hover:bg-blue-50",
          )}
        >
          {tally}
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <div className="grid grid-cols-2 divide-x">
          <div className="px-4 py-3 text-center">
            <div className="text-2xl font-bold text-green-600">{yes}</div>
            <div className="text-xs font-semibold text-green-600">Yes</div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-2xl font-bold text-red-500">{no}</div>
            <div className="text-xs font-semibold text-red-500">No</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onReset(r.id)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 border-t px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
        >
          <RotateCcw className="h-4 w-4" /> Reset scores
        </button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Checked-in chip, "Check in" button, or em-dash. Fixed height + min width so
 * the pill → checked-in transition (and the in-flight spinner) never resize
 * the row/column.
 */
function CheckInControl({
  registration: r,
  isPending,
  onSetCheckIn,
  variant = "table",
}: {
  registration: Registration;
  isPending: boolean;
  onSetCheckIn: (regIds: string[], checkedIn: boolean, checkedInAt?: string) => Promise<boolean>;
  /** "card" is the compact header layout used by the mobile/tablet cards. */
  variant?: "table" | "card";
}) {
  const isCard = variant === "card";
  return (
    <div className={cn("flex items-center", !isCard && "h-10 min-w-26")}>
      {isInactive(r) ? (
        <span className="text-muted-foreground"></span>
      ) : r.checked_in_at ? (
        <CheckInPopover
          checkedInAt={r.checked_in_at}
          timeLabel={fmtCheckInTime(r.checked_in_at)}
          fullLabel={fmtCheckInFull(r.checked_in_at)}
          checkedInByName={r.checked_in_by_name}
          ariaLabel={`Edit check-in for ${r.swimmer_name}`}
          onSave={(checkedInAt) => onSetCheckIn([r.id], true, checkedInAt)}
          onUndo={() => onSetCheckIn([r.id], false)}
          canUndo={!hasAnyScore(r)}
          isPending={isPending}
          variant={isCard ? "card" : "default"}
        />
      ) : r.status !== "registered" ? (
        <span className="text-muted-foreground"></span>
      ) : (
        <button
          type="button"
          onClick={() => onSetCheckIn([r.id], true)}
          disabled={isPending}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/40 font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50",
            isCard ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
          )}
        >
          {isPending ? (
            <Loader2 className={cn("animate-spin", isCard ? "h-3.5 w-3.5" : "h-4 w-4")} />
          ) : (
            <Clock className={cn(isCard ? "h-3.5 w-3.5" : "h-4 w-4")} />
          )}
          Check in
        </button>
      )}
    </div>
  );
}

/** Editable score link (with reset), or a read-only score for non-scoreable rows. */
function ScoreControl({
  registration: r,
  tryoutId,
  onReset,
  variant = "table",
}: {
  registration: Registration;
  tryoutId: string;
  onReset: (regId: string) => void;
  variant?: "table" | "card";
}) {
  const navigate = useNavigate();
  const isCard = variant === "card";

  if (isInactive(r)) return <span className="text-gray-400"></span>;

  if (canAddScore(r)) {
    const { yes, no } = countYesNo(r);
    // Once Yes/No answers exist, the cell shows a clickable tally whose popover
    // carries the breakdown + reset action.
    if (yes + no > 0) {
      return <YesNoValue registration={r} onReset={onReset} variant={variant} />;
    }

    // Nothing recorded yet — keep the entry point so coaches can start scoring.
    return (
      <button
        onClick={() => navigate(`/tryouts/view/${tryoutId}/bulk-scoring?ids=${r.id}`)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap bg-primary font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90",
          isCard ? "rounded-lg px-3 py-2 text-sm" : "rounded-full px-3 py-1 text-sm",
        )}
      >
        <ClipboardList className="h-4 w-4" /> Add Score
      </button>
    );
  }

  if (hasScore(r)) {
    // Not scoreable (not checked in, or rejected) — show the existing score
    // read-only rather than the Add Score link.
    return <span className="text-sm font-medium text-gray-500">{avg(r) ?? r.total_score}</span>;
  }

  // Card: keep the entry point visible (greyed out) until the swimmer is checked
  // in, so the action row keeps its shape instead of collapsing.
  if (isCard && !r.checked_in_at && r.status === "registered") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow opacity-50"
      >
        <ClipboardList className="h-4 w-4" /> Add Score
      </button>
    );
  }

  return <span className="text-gray-400"></span>;
}

/** Coach-recommendation dropdown; read-only for rejected rows. */
function CoachRecommendationControl({
  registration: r,
  tryoutId,
  variant = "table",
}: {
  registration: Registration;
  tryoutId: string;
  variant?: "table" | "card";
}) {
  if (isInactive(r)) return <span className="text-gray-400"></span>;

  const value =
    r.coach_recommendation === REJECTED_VALUE ? undefined : (r.coach_recommendation ?? null);

  // Rejected rows keep their recorded recommendation visible (that's why they
  // were rejected) but read-only.
  if (r.status === "rejected") {
    return (
      <CoachRecommendationSelect
        tryoutId={tryoutId}
        regId={r.id}
        value={value}
        disabled
        variant={variant}
      />
    );
  }

  if (canEditCoachRecommendation(r)) {
    return (
      <CoachRecommendationSelect tryoutId={tryoutId} regId={r.id} value={value} variant={variant} />
    );
  }

  // Card: keep the dropdown visible (disabled) until a check-in + score unlock
  // it, so the action row keeps its shape instead of collapsing.
  if (variant === "card") {
    return (
      <CoachRecommendationSelect
        tryoutId={tryoutId}
        regId={r.id}
        value={value}
        disabled
        variant={variant}
      />
    );
  }

  return <span className="text-gray-400"></span>;
}

/** Offer/Reject actions plus the "view sent email" / resend menu. */
function DecisionActions({
  registration: r,
  canManageCoaches,
  onOpenDecision,
  onViewSentEmail,
  variant = "table",
}: {
  registration: Registration;
  canManageCoaches: boolean;
  onOpenDecision: (regId: string, status: "offered" | "rejected") => void;
  onViewSentEmail: (v: { regId: string; action: "offered" | "rejected" }) => void;
  variant?: "table" | "card";
}) {
  const isCard = variant === "card";
  return (
    <>
      {r.status === "registered" &&
        canManageCoaches &&
        (() => {
          const isRejected = r.coach_recommendation === REJECTED_VALUE;
          const offerDisabled = !r.coach_recommendation || isRejected;
          const offerTooltip = isRejected
            ? "Cannot offer — coach recommendation is set to Reject."
            : "Cannot offer — please assign a coach recommendation first.";
          const rejectDisabled = !isRejected;
          const rejectTooltip = !r.coach_recommendation
            ? "Cannot reject — please assign a coach recommendation of Reject first."
            : "Cannot reject — coach recommendation is not set to Reject.";

          const offerBtn = isCard ? (
            <Button
              variant="default"
              onClick={() => {
                if (offerDisabled) {
                  toast.error("Cannot offer", {
                    id: "cannot-offer",
                    description: offerTooltip,
                    duration: 6000,
                  });
                  return;
                }
                onOpenDecision(r.id, "offered");
              }}
              className={cn("w-full flex-1", offerDisabled && "opacity-40")}
            >
              Offer
            </Button>
          ) : (
            <button
              onClick={() => {
                if (offerDisabled) {
                  toast.error("Cannot offer", {
                    id: "cannot-offer",
                    description: offerTooltip,
                    duration: 6000,
                  });
                  return;
                }
                onOpenDecision(r.id, "offered");
              }}
              className={`text-xs text-green-600 hover:underline cursor-pointer flex items-center gap-1 ${offerDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Offer
            </button>
          );
          const rejectBtn = isCard ? (
            <Button
              variant="outline"
              onClick={() => {
                if (rejectDisabled) {
                  toast.error("Cannot reject", {
                    id: "cannot-reject",
                    description: rejectTooltip,
                    duration: 6000,
                  });
                  return;
                }
                onOpenDecision(r.id, "rejected");
              }}
              className={cn("w-full flex-1", rejectDisabled && "opacity-40")}
            >
              Reject
            </Button>
          ) : (
            <button
              onClick={() => {
                if (rejectDisabled) {
                  toast.error("Cannot reject", {
                    id: "cannot-reject",
                    description: rejectTooltip,
                    duration: 6000,
                  });
                  return;
                }
                onOpenDecision(r.id, "rejected");
              }}
              className={`text-xs text-red-500 hover:underline cursor-pointer flex items-center gap-1 ${rejectDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          );
          return (
            <div className="flex items-center gap-2">
              {offerDisabled ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("block", isCard && "flex-1")}>{offerBtn}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{offerTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                offerBtn
              )}
              {rejectDisabled ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("block", isCard && "flex-1")}>{rejectBtn}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{rejectTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                rejectBtn
              )}
            </div>
          );
        })()}

      {/* view sent email preview — shown for rows that have at least one entry
          in email_info (i.e. an email was actually sent and recorded in
          email_audit_logs). The action (offer/reject) is taken from the most
          recent email_info entry. */}
      {r.email_info &&
        r.email_info.length > 0 &&
        (() => {
          const lastEmail = r.email_info![r.email_info!.length - 1];
          const lastAction = lastEmail.action;
          const isRejected = r.coach_recommendation === REJECTED_VALUE;
          const offerDisabled = !r.coach_recommendation || isRejected;
          const rejectDisabled = !isRejected;
          const offerTooltip = isRejected
            ? "Cannot resend offer — coach recommendation is set to Reject."
            : "Cannot resend offer — please assign a coach recommendation first.";
          const rejectTooltip = !r.coach_recommendation
            ? "Cannot resend rejection — please assign a coach recommendation of Reject first."
            : "Cannot resend rejection — coach recommendation is not set to Reject.";

          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewSentEmail({ regId: r.id, action: lastAction })}
                className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Mail className="h-3.5 w-3.5" /> View sent email
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-gray-500 hover:text-gray-700 cursor-pointer flex items-center">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    RESEND COMMUNICATION
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (offerDisabled) {
                        toast.error("Cannot resend offer", {
                          id: "cannot-resend-offer",
                          description: offerTooltip,
                          duration: 6000,
                        });
                        return;
                      }
                      onOpenDecision(r.id, "offered");
                    }}
                    className={`cursor-pointer flex items-center gap-2 ${offerDisabled ? "opacity-40" : ""}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Resend as Offer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (rejectDisabled) {
                        toast.error("Cannot resend rejection", {
                          id: "cannot-resend-rejection",
                          description: rejectTooltip,
                          duration: 6000,
                        });
                        return;
                      }
                      onOpenDecision(r.id, "rejected");
                    }}
                    className={`cursor-pointer flex items-center gap-2 ${rejectDisabled ? "opacity-40" : ""}`}
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Resend as Reject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })()}
    </>
  );
}
