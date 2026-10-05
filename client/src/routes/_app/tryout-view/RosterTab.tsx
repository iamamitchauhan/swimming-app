import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Filter,
  Loader2,
  Mail,
  MoreVertical,
  RotateCcw,
  Undo2,
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
import { calculateDetailedScoreTotal } from "@/lib/utils";
import type {
  Registration,
  RegistrationListParams,
  RegistrationSortField,
  SortOrder,
} from "@/lib/api/tryouts.api";
import { useTryout } from "@/hooks/use-tryouts";
import {
  useTryoutRegistration,
  useSendDecision,
  useSaveScore,
  useResetScore,
  useCheckInMutation,
} from "@/hooks/use-tryout-dashboard";
import { useGroups } from "@/hooks/use-groups";
import { useAuthStore } from "@/lib/auth.store";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { DecisionConfirmDialog } from "./DecisionConfirmDialog";
import { CheckInPopover } from "./CheckInPopover";
import { SentEmailPreviewDialog } from "./SentEmailPreviewDialog";
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
import { SearchInput } from "@/components/search-input";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const ALL_STATUSES = ["registered", "waitlisted", "offered", "rejected", "cancelled"] as const;

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
  return canAddScore(r) && hasScore(r);
}

/** Toast how many selected rows a bulk action skipped because they were ineligible. */
function notifySkipped(skipped: number, reason: string) {
  if (skipped > 0) {
    toast.info(`Skipped ${skipped} swimmer${skipped === 1 ? "" : "s"}`, { description: reason });
  }
}

function countYesNo(r: Registration) {
  const values = Object.values(r.detailed_scores ?? {});
  const yes = values.filter((v) => v === "yes" || v === true).length;
  const no = values.filter((v) => v === "no" || v === false).length;
  return { yes, no };
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RosterTab({ tryoutId }: Props) {
  const { data: tryout } = useTryout(tryoutId);
  const navigate = useNavigate();
  const [rosterParams, setRosterParams] = useState<RegistrationListParams>({
    page: 1,
    limit: 10,
    sortBy: "session_time",
    sortOrder: "asc",
  });
  const { data: rosterResult, isLoading: loading } = useTryoutRegistration(tryoutId, rosterParams);
  const { registrations = [], total = 0, page = 1, totalPages = 0 } = rosterResult ?? {};
  const sendDecision = useSendDecision(tryoutId);
  const resetScore = useResetScore(tryoutId);
  const checkInMutation = useCheckInMutation(tryoutId);
  const { data: groups } = useGroups();

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

  const user = useAuthStore((state) => state.user);
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

  function toggleAll() {
    if (allRegisteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        registrations.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        registrations.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    if (isCoach && tryout && coachAssignment && !rosterParams.segmentId) {
      if (visibleSegments.length === 1) {
        const seg = visibleSegments[0];
        onParamsChange({ segmentId: (seg as any).id ?? seg.name, page: 1 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoach, tryout, coachAssignment]);

  const segmentLabel = !rosterParams.segmentId
    ? "All segments"
    : (tryout?.segments?.find(
        (s) => (s as any).id === rosterParams.segmentId || s.name === rosterParams.segmentId,
      )?.name ?? rosterParams.segmentId);

  const statusLabel = rosterParams.status
    ? rosterParams.status.charAt(0).toUpperCase() + rosterParams.status.slice(1)
    : "All status";

  const emailSentLabel =
    rosterParams.emailSent === true
      ? "With email sent"
      : rosterParams.emailSent === false
        ? "Without email sent"
        : "All registrations";

  const checkedInLabel =
    rosterParams.checkedIn === true
      ? "Checked in"
      : rosterParams.checkedIn === false
        ? "Not checked in"
        : "All check-ins";

  const selectedRecommendations = rosterParams.coachRecommendations ?? [];
  const recommendationName = (id: string) =>
    id === REJECTED_VALUE ? "Reject" : (groups?.find((g) => g._id === id)?.name ?? id);

  // One chip per active filter group, shown next to the Filters button.
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (rosterParams.checkedIn !== undefined) {
    activeChips.push({
      key: "checkedIn",
      label: `Check-in: ${checkedInLabel}`,
      onRemove: () => onParamsChange({ checkedIn: undefined, page: 1 }),
    });
  }
  if (rosterParams.segmentId) {
    activeChips.push({
      key: "segment",
      label: `Segment: ${segmentLabel}`,
      onRemove: () => onParamsChange({ segmentId: undefined, page: 1 }),
    });
  }
  if (rosterParams.status) {
    activeChips.push({
      key: "status",
      label: `Status: ${statusLabel}`,
      onRemove: () => onParamsChange({ status: undefined, page: 1 }),
    });
  }
  if (selectedRecommendations.length > 0) {
    activeChips.push({
      key: "recommendation",
      label: `Recommendation: ${selectedRecommendations.map(recommendationName).join(", ")}`,
      onRemove: () => onParamsChange({ coachRecommendations: undefined, page: 1 }),
    });
  }
  if (rosterParams.emailSent !== undefined) {
    activeChips.push({
      key: "emailSent",
      label: `Email: ${emailSentLabel}`,
      onRemove: () => onParamsChange({ emailSent: undefined, page: 1 }),
    });
  }
  const activeFilterCount = activeChips.length;

  function clearAllFilters() {
    onParamsChange({
      checkedIn: undefined,
      segmentId: undefined,
      status: undefined,
      coachRecommendations: undefined,
      emailSent: undefined,
      page: 1,
    });
  }

  return (
    <div>
      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 py-4 border-b border-gray-50 px-0.5 mt-1">
        <SearchInput
          value={rosterParams.search ?? ""}
          onChange={(v) => onParamsChange({ search: v, page: 1 })}
          placeholder="Search swimmer or parent email…"
          className="flex-1 min-w-48 bg-white"
          debounceMs={350}
        />

        {activeChips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
          >
            {chip.label}
            <button
              type="button"
              onClick={chip.onRemove}
              className="text-gray-400 hover:text-gray-700 cursor-pointer"
              aria-label={`Remove ${chip.label} filter`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear all
          </button>
        )}

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button className="shrink-0 gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded bg-white/25 px-1.5 text-xs font-medium">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[28rem] p-0">
            <div className="grid gap-5 p-4">
              <FilterGroup title="Check-in">
                <FilterChip
                  selected={rosterParams.checkedIn === undefined}
                  onClick={() => onParamsChange({ checkedIn: undefined, page: 1 })}
                >
                  All check-ins
                </FilterChip>
                <FilterChip
                  selected={rosterParams.checkedIn === true}
                  onClick={() => onParamsChange({ checkedIn: true, page: 1 })}
                >
                  Checked in
                </FilterChip>
                <FilterChip
                  selected={rosterParams.checkedIn === false}
                  onClick={() => onParamsChange({ checkedIn: false, page: 1 })}
                >
                  Not checked in
                </FilterChip>
              </FilterGroup>

              <FilterGroup title="Segment">
                {(!isCoach || visibleSegments.length > 1) && (
                  <FilterChip
                    selected={!rosterParams.segmentId}
                    onClick={() => onParamsChange({ segmentId: undefined, page: 1 })}
                  >
                    All segments
                  </FilterChip>
                )}
                {visibleSegments.map((seg, i) => {
                  const value = (seg as any).id ?? seg.name;
                  return (
                    <FilterChip
                      key={i}
                      selected={rosterParams.segmentId === value}
                      onClick={() => onParamsChange({ segmentId: value, page: 1 })}
                    >
                      {seg.name}
                    </FilterChip>
                  );
                })}
              </FilterGroup>

              <FilterGroup title="Status">
                <FilterChip
                  selected={!rosterParams.status}
                  onClick={() => onParamsChange({ status: undefined, page: 1 })}
                >
                  All statuses
                </FilterChip>
                {ALL_STATUSES.map((s) => (
                  <FilterChip
                    key={s}
                    selected={rosterParams.status === s}
                    onClick={() => onParamsChange({ status: s, page: 1 })}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup title="Recommendation">
                <CoachRecommendationChips
                  groups={groups ?? []}
                  selected={selectedRecommendations}
                  onChange={(next) =>
                    onParamsChange({
                      coachRecommendations: next.length ? next : undefined,
                      page: 1,
                    })
                  }
                />
              </FilterGroup>

              {/* Email-sent filter — three states:
                  - All emails        → no filter
                  - Email sent        → only registrations with ≥1 email_audit_logs row
                  - Remaining to send → only registrations with no email_audit_logs row
                  Resolved server-side from email_audit_logs. */}
              <FilterGroup title="Email">
                <FilterChip
                  selected={rosterParams.emailSent === undefined}
                  onClick={() => onParamsChange({ emailSent: undefined, page: 1 })}
                >
                  All registrations
                </FilterChip>
                <FilterChip
                  selected={rosterParams.emailSent === true}
                  onClick={() => onParamsChange({ emailSent: true, page: 1 })}
                >
                  With email sent
                </FilterChip>
                <FilterChip
                  selected={rosterParams.emailSent === false}
                  onClick={() => onParamsChange({ emailSent: false, page: 1 })}
                >
                  Without email sent
                </FilterChip>
              </FilterGroup>
            </div>

            <div className="flex items-center justify-between border-t px-4 py-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear all
              </button>
              <Button onClick={() => setFiltersOpen(false)}>Apply filter</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 mt-4 [&>div]:overflow-visible">
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
                Swimmer
                <SortIcon field="swimmer_name" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("swimmer_age")}
              >
                Age
                <SortIcon field="swimmer_age" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Segment</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("session_time")}
              >
                When
                <SortIcon field="session_time" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon field="status" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Yes/No</TableHead>
              <TableHead>Evaluation</TableHead>
              <TableHead>Coach Recommendation</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-50">
            {loading && (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="py-10 text-center text-gray-400">
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
                    <TableCell
                      className="text-blue-700 cursor-pointer hover:underline px-4 py-3"
                      onClick={() => {
                        setSelectedRegId(r.id);
                        setModalOpen(true);
                      }}
                    >
                      {r.swimmer_name}
                    </TableCell>
                    <TableCell className="text-gray-500 px-4 py-3">{r.swimmer_age}</TableCell>
                    <TableCell className="text-gray-600 px-4 py-3">
                      {r.segment_name || "—"}
                    </TableCell>
                    <TableCell className="text-gray-600 px-4 py-3 whitespace-nowrap">
                      {r.session_date ? fmtDate(r.session_date) : "—"} <br />
                      {r.slot_id?.startTime && (
                        <span className="text-gray-400">
                          {fmtTime(r.slot_id.startTime)} – {fmtTime(r.slot_id.endTime)}
                        </span>
                      )}
                    </TableCell>
                    {/* Fixed height + min width so the pill → checked-in transition
                        (and the in-flight spinner) never resize the row/column. */}
                    <TableCell className="px-4 py-3">
                      <div className="flex h-10 min-w-26 items-center">
                        {isInactive(r) ? (
                          <span className="text-muted-foreground">—</span>
                        ) : r.checked_in_at ? (
                          <CheckInPopover
                            checkedInAt={r.checked_in_at}
                            timeLabel={fmtCheckInTime(r.checked_in_at)}
                            fullLabel={fmtCheckInFull(r.checked_in_at)}
                            checkedInByName={r.checked_in_by_name}
                            ariaLabel={`Edit check-in for ${r.swimmer_name}`}
                            onSave={(checkedInAt) => setCheckIn([r.id], true, checkedInAt)}
                            onUndo={() => setCheckIn([r.id], false)}
                            isPending={pendingRegIds.includes(r.id)}
                          />
                        ) : r.status !== "registered" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCheckIn([r.id], true)}
                            disabled={pendingRegIds.includes(r.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/40 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {pendingRegIds.includes(r.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            Check in
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-gray-700">{r.guardian_name || r.parent_name}</div>
                      <div className="text-xs text-gray-400">
                        {r.guardian_email || r.parent_email}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </TableCell>

                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      {(() => {
                        const { yes, no } = countYesNo(r);
                        if (yes === 0 && no === 0) return <span className="text-gray-400">—</span>;
                        return (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">{yes}</span>
                            <span className="text-gray-400 font-normal">/</span>
                            <span className="text-red-500">{no}</span>
                          </div>
                        );
                      })()}

                      {/* show yes/no chip like this [(10)Yes/(5)No] */}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      {isInactive(r) ? (
                        <span className="text-gray-400">—</span>
                      ) : canAddScore(r) ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/tryouts/view/${tryoutId}/bulk-scoring?ids=${r.id}`)
                            }
                            className="hover:underline cursor-pointer text-sm"
                          >
                            <div>{avg(r) || <span className="">Add Score</span>}</div>
                            {/* <div className="text-xs font-normal text-gray-400">
                              {(() => {
                                const completion = detailedScoreCompletion(r);
                                return `${completion.pct}% (${completion.done}/${completion.total})`;
                              })()}
                            </div>
                            <div className="mt-1 h-1 w-20 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${detailedScoreCompletion(r).pct}%` }}
                              />
                            </div> */}
                          </button>
                          {avg(r) ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setResetConfirmRegId(r.id)}
                                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Reset score</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      ) : hasScore(r) ? (
                        // Not scoreable (not checked in, or rejected) — show the
                        // existing score read-only rather than the Add Score link.
                        <span className="text-sm font-medium text-gray-500">
                          {avg(r) ?? r.total_score}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      {isInactive(r) ? (
                        <span className="text-gray-400">—</span>
                      ) : r.status === "rejected" ? (
                        // Rejected rows keep their recorded recommendation visible
                        // (that's why they were rejected) but read-only.
                        <CoachRecommendationSelect
                          tryoutId={tryoutId}
                          regId={r.id}
                          value={
                            r.coach_recommendation === REJECTED_VALUE
                              ? undefined
                              : (r.coach_recommendation ?? null)
                          }
                          disabled
                        />
                      ) : canEditCoachRecommendation(r) ? (
                        <CoachRecommendationSelect
                          tryoutId={tryoutId}
                          regId={r.id}
                          value={
                            r.coach_recommendation === REJECTED_VALUE
                              ? undefined
                              : (r.coach_recommendation ?? null)
                          }
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {r.status !== "registered" || !canManageCoaches ? (
                        <span className="text-gray-400"></span>
                      ) : (
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

                          const offerBtn = (
                            <button
                              onClick={() => {
                                if (offerDisabled) {
                                  toast.error("Cannot offer", {
                                    description: offerTooltip,
                                    duration: 6000,
                                  });
                                  return;
                                }
                                openDecisionDialog(r.id, "offered");
                              }}
                              className={`text-xs text-green-600 hover:underline cursor-pointer flex items-center gap-1 ${offerDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Offer
                            </button>
                          );
                          const rejectBtn = (
                            <button
                              onClick={() => {
                                if (rejectDisabled) {
                                  toast.error("Cannot reject", {
                                    description: rejectTooltip,
                                    duration: 6000,
                                  });
                                  return;
                                }
                                openDecisionDialog(r.id, "rejected");
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
                                      <span className="block">{offerBtn}</span>
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
                                      <span className="block">{rejectBtn}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{rejectTooltip}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                rejectBtn
                              )}
                            </div>
                          );
                        })()
                      )}
                      {/* view sent email preview — shown for rows that have at
                          least one entry in email_info (i.e. an email was
                          actually sent and recorded in email_audit_logs).
                          The action (offer/reject) is taken from the most
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
                                onClick={() =>
                                  setSentEmailPreview({
                                    regId: r.id,
                                    action: lastAction,
                                  })
                                }
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
                                          description: offerTooltip,
                                          duration: 6000,
                                        });
                                        return;
                                      }
                                      openDecisionDialog(r.id, "offered");
                                    }}
                                    className={`cursor-pointer flex items-center gap-2 ${offerDisabled ? "opacity-40" : ""}`}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Resend
                                    as Offer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (rejectDisabled) {
                                        toast.error("Cannot resend rejection", {
                                          description: rejectTooltip,
                                          duration: 6000,
                                        });
                                        return;
                                      }
                                      openDecisionDialog(r.id, "rejected");
                                    }}
                                    className={`cursor-pointer flex items-center gap-2 ${rejectDisabled ? "opacity-40" : ""}`}
                                  >
                                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Resend as
                                    Reject
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          );
                        })()}
                      {/* Resend email */}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-gray-900 text-white shadow-2xl px-5 py-3 text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-xs font-bold">
              {selectedIds.size}
            </span>
            Selected
          </span>
          <div className="h-4 w-px bg-gray-600" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1.5 text-gray-300 hover:text-white transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
          <div className="h-4 w-px bg-gray-600" />
          <button
            onClick={async () => {
              if (checkInEligibleRows.length === 0) {
                toast.error("No swimmers can be checked in", {
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
            disabled={checkInEligibleRows.some((r) => pendingRegIds.includes(r.id))}
            className="flex items-center gap-1.5 font-medium text-emerald-300 hover:text-emerald-200 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> Check in
          </button>
          <button
            onClick={async () => {
              const ids = Array.from(selectedIds);
              if (await setCheckIn(ids, false)) setSelectedIds(new Set());
            }}
            disabled={Array.from(selectedIds).some((id) => pendingRegIds.includes(id))}
            className="flex items-center gap-1.5 font-medium text-gray-300 hover:text-white transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" /> Un-check
          </button>
          <div className="h-4 w-px bg-gray-600" />
          <button
            onClick={() => {
              if (offerRejectEligibleRows.length === 0) {
                toast.error("No swimmers can be offered", {
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
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition cursor-pointer font-medium"
          >
            <CheckCircle2 className="h-4 w-4" /> Offer
          </button>
          <button
            onClick={() => {
              if (offerRejectEligibleRows.length === 0) {
                toast.error("No swimmers can be rejected", {
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
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition cursor-pointer font-medium"
          >
            <XCircle className="h-4 w-4" /> Reject
          </button>
          {selectedIds.size <= 4 && (
            <>
              <div className="h-4 w-px bg-gray-600" />
              <button
                onClick={() => {
                  if (scoreEligibleRows.length === 0) {
                    toast.error("No swimmers can be scored", {
                      description:
                        "Scoring requires a check-in; cancelled, waitlisted and rejected swimmers can't be scored.",
                    });
                    return;
                  }
                  notifySkipped(
                    selectedRows.length - scoreEligibleRows.length,
                    "Scoring requires a check-in; cancelled, waitlisted and rejected swimmers were skipped.",
                  );
                  navigate(
                    `/tryouts/view/${tryoutId}/bulk-scoring?ids=${scoreEligibleRows.map((r) => r.id).join(",")}`,
                  );
                }}
                className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 transition cursor-pointer font-medium"
              >
                <ClipboardList className="h-4 w-4" /> Score {scoreEligibleRows.length} together
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {total > 0 && (
        <div className="sticky bottom-0 z-20 flex items-center justify-between mt-4 text-sm text-gray-600 bg-white/95 backdrop-blur border-t border-gray-100 py-3 -mx-0.5 px-0.5">
          <span>
            Showing{" "}
            <span className="font-medium">
              {(page - 1) * (rosterParams.limit ?? 20) + 1}–
              {Math.min(page * (rosterParams.limit ?? 20), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span> results
          </span>
          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer">
                  {rosterParams.limit ?? 20}
                  <span className="text-gray-500">/ page</span>
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

const REJECTED_VALUE = "__rejected__";

// ─── Coach Recommendation Filter (multi-select) ───────────────────────────────

/** Toggleable pill used inside the roster filters popover. */
function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition cursor-pointer ${
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/** A labelled group of filter chips inside the roster filters popover. */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface CoachRecommendationChipsProps {
  groups: { _id: string; name: string; color?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function CoachRecommendationChips({ groups, selected, onChange }: CoachRecommendationChipsProps) {
  const allOptions = [...groups.map((g) => g._id), REJECTED_VALUE];
  // `selected = []` (no filter) is treated as "all selected" visually.
  // This keeps unassigned registrations (null recommendation) visible,
  // since no filter is sent to the backend.
  const isAllSelected = selected.length === 0;
  const selectedSet = new Set(isAllSelected ? allOptions : selected);

  function toggle(value: string) {
    if (isAllSelected) {
      // Currently showing all — unchecking one filters to everything except it
      onChange(allOptions.filter((v) => v !== value));
      return;
    }
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // If all options are checked again, collapse back to no filter (= show all)
    if (next.size === allOptions.length) {
      onChange([]);
    } else {
      onChange(Array.from(next));
    }
  }

  return (
    <>
      <FilterChip selected={isAllSelected} onClick={() => onChange([])}>
        All recommendations
      </FilterChip>
      {groups.map((group) => (
        <FilterChip
          key={group._id}
          selected={selectedSet.has(group._id)}
          onClick={() => toggle(group._id)}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: group.color || "#e5e7eb" }}
            aria-hidden="true"
          />
          {group.name}
        </FilterChip>
      ))}
      <FilterChip selected={selectedSet.has(REJECTED_VALUE)} onClick={() => toggle(REJECTED_VALUE)}>
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#ef4444" }}
          aria-hidden="true"
        />
        Reject
      </FilterChip>
    </>
  );
}

function CoachRecommendationSelect({
  tryoutId,
  regId,
  value,
  disabled,
}: {
  tryoutId: string;
  regId: string;
  value: string | undefined | null;
  /** Read-only mode — shows the recorded value but can't be changed. */
  disabled?: boolean;
}) {
  const saveScore = useSaveScore(tryoutId);
  const { data: groups, isLoading } = useGroups();

  const selectedGroup = groups?.find((g) => g._id === value);

  const isRejected = value === undefined;
  const dotColor = value ? (selectedGroup?.color ?? "#9ca3af") : isRejected ? "#ef4444" : "#d1d5db";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isLoading || disabled}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 text-gray-700 border-gray-200"
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
              {isRejected ? "Reject" : (selectedGroup?.name ?? "Select")}
              <ChevronDown className="inline h-3 w-3 ml-1 -mr-0.5" />
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
