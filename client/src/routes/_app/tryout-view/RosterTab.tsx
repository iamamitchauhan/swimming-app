import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ManageCoachesDialog } from "./ManageCoachesDialog";
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
} from "@/hooks/use-tryout-dashboard";
import { useGroups } from "@/hooks/use-groups";
import { useAuthStore } from "@/lib/auth.store";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { DecisionConfirmDialog } from "./DecisionConfirmDialog";
import { SentEmailPreviewDialog } from "./SentEmailPreviewDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
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

const DETAILED_SCORE_FIELDS = SCORING_CRITERIA.map((c) => c.id);
const DETAILED_SCORE_TOTAL = DETAILED_SCORE_FIELDS.length;

function avg(r: Registration) {
  return calculateDetailedScoreTotal(r.detailed_scores);
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
  const [manageCoachesOpen, setManageCoachesOpen] = useState(false);
  const [resetConfirmRegId, setResetConfirmRegId] = useState<string | null>(null);
  const [sentEmailPreview, setSentEmailPreview] = useState<{
    regId: string;
    action: "offered" | "rejected";
  } | null>(null);

  const user = useAuthStore((state) => state.user);
  const canManageCoaches = user?.role === "admin" || user?.role === "super_admin";

  function openDecisionDialog(regId: string, status: "offered" | "rejected") {
    setPendingRegId(regId);
    setBulkAction(status);
    setConfirmOpen(true);
  }

  function validateCoachRecommendation(): boolean {
    const missing = registrations.filter((r) => selectedIds.has(r.id) && !r.coach_recommendation);
    if (missing.length > 0) {
      const names = missing.map((r) => r.swimmer_name).join(", ");
      toast.error("Coach recommendation required", {
        description: `Please assign a coach recommendation before proceeding`,
        duration: 6000,
      });
      return false;
    }
    return true;
  }

  // Offer validation: no selected swimmer may have coach recommendation set
  // to "rejected" — they must be assigned to a group first.
  function validateOfferCoachRecommendation(): boolean {
    if (!validateCoachRecommendation()) return false;
    const rejectedOnes = registrations.filter(
      (r) => selectedIds.has(r.id) && r.coach_recommendation === REJECTED_VALUE,
    );
    if (rejectedOnes.length > 0) {
      const names = rejectedOnes.map((r) => r.swimmer_name).join(", ");
      toast.error("Cannot offer — coach recommendation is set to Reject", {
        description: `Please change coach recommendation to a group before offering.`,
        duration: 6000,
      });
      return false;
    }
    return true;
  }

  // Reject validation: every selected swimmer must have coach recommendation
  // set to "rejected" before bulk reject is allowed.
  function validateRejectCoachRecommendation(): boolean {
    if (!validateCoachRecommendation()) return false;
    const notRejected = registrations.filter(
      (r) => selectedIds.has(r.id) && r.coach_recommendation !== REJECTED_VALUE,
    );
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

  function toggleAll() {
    if (allRegisteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        registeredRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        registeredRows.forEach((r) => next.add(r.id));
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
      } else if (selectedIds.size > 0) {
        const ids = Array.from(selectedIds);
        await Promise.all(
          ids.map((id) => sendDecision.mutateAsync({ regId: id, status: bulkAction })),
        );
        setSelectedIds(new Set());
      }
    } catch {
      // Errors are handled by the mutation's onError
    } finally {
      setConfirmOpen(false);
      setBulkAction(null);
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

        {/* Segment filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer">
              {segmentLabel}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(!isCoach || visibleSegments.length > 1) && (
              <DropdownMenuItem onClick={() => onParamsChange({ segmentId: undefined, page: 1 })}>
                All segments
              </DropdownMenuItem>
            )}
            {visibleSegments.map((seg, i) => (
              <DropdownMenuItem
                key={i}
                onClick={() => onParamsChange({ segmentId: (seg as any).id ?? seg.name, page: 1 })}
              >
                {seg.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer capitalize">
              {statusLabel}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onParamsChange({ status: undefined, page: 1 })}>
              All status
            </DropdownMenuItem>
            {ALL_STATUSES.map((s) => (
              <DropdownMenuItem
                className="capitalize"
                key={s}
                onClick={() => onParamsChange({ status: s, page: 1 })}
              >
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Coach Recommendation Filter */}
        <CoachRecommendationFilter
          groups={groups ?? []}
          selected={rosterParams.coachRecommendations ?? []}
          onChange={(next) => onParamsChange({ coachRecommendations: next.length ? next : undefined, page: 1 })}
        />

        {/* Email-sent filter — three states:
            - All emails        → no filter
            - Email sent        → only registrations with ≥1 email_audit_logs row
            - Remaining to send → only registrations with no email_audit_logs row
            Resolved server-side from email_audit_logs. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer">
              <Mail className="h-3.5 w-3.5 text-gray-500" />
              {emailSentLabel}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onParamsChange({ emailSent: undefined, page: 1 })}>
              All registrations
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onParamsChange({ emailSent: true, page: 1 })}>
              With email sent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onParamsChange({ emailSent: false, page: 1 })}>
              Without email sent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canManageCoaches && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setManageCoachesOpen(true)}
          >
            <UserCog className="mr-1.5 h-4 w-4" /> Manage coaches
          </Button>
        )}
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
                <TableCell colSpan={11} className="py-10 text-center text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && registrations.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-gray-400">
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
                      {r.status === "registered" && (
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => toggleRow(r.id)}
                          aria-label={`Select ${r.swimmer_name}`}
                          className="cursor-pointer"
                        />
                      )}
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
                      {r.status === "cancelled" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
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
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold text-blue-700">
                      <CoachRecommendationSelect
                        tryoutId={tryoutId}
                        regId={r.id}
                        value={
                          r.coach_recommendation === REJECTED_VALUE
                            ? undefined
                            : (r.coach_recommendation ?? null)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {r.status !== "registered" || !canManageCoaches ? (
                        <span className="text-gray-400"></span>
                      ) : (
                        (() => {
                          const isRejected = r.coach_recommendation === REJECTED_VALUE;
                          const offerDisabled =
                            !r.coach_recommendation || isRejected;
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
                      {r.email_info && r.email_info.length > 0 && (
                        (() => {
                          const lastEmail = r.email_info![r.email_info!.length - 1];
                          const lastAction = lastEmail.action;
                          // Resend uses the same decision endpoint, which
                          // re-reads coach_recommendation from the DB at send
                          // time — so an admin can update the recommendation
                          // and resend to reflect the new value. Validate the
                          // current recommendation is compatible with the
                          // action being resent (same rules as the offer /
                          // reject buttons above).
                          const isRejected = r.coach_recommendation === REJECTED_VALUE;
                          const resendDisabled =
                            lastAction === "offered"
                              ? !r.coach_recommendation || isRejected
                              : !isRejected;
                          const resendTooltip =
                            lastAction === "offered"
                              ? isRejected
                                ? "Cannot resend offer — coach recommendation is set to Reject."
                                : "Cannot resend offer — please assign a coach recommendation first."
                              : "Cannot resend rejection — coach recommendation is not set to Reject.";

                          const resendBtn = (
                            <button
                              onClick={() => {
                                if (resendDisabled) {
                                  toast.error("Cannot resend", {
                                    description: resendTooltip,
                                    duration: 6000,
                                  });
                                  return;
                                }
                                openDecisionDialog(r.id, lastAction);
                              }}
                              className={`text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1 ${resendDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              <Send className="h-3.5 w-3.5" /> Resend email
                            </button>
                          );

                          return (
                            <div className="flex flex-col gap-1">
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
                              {resendDisabled ? (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block">{resendBtn}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{resendTooltip}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                resendBtn
                              )}
                            </div>
                          );
                        })()
                      )}
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
            onClick={() => {
              if (!validateOfferCoachRecommendation()) return;
              // When exactly one swimmer is selected, treat it as a single
              // action so the email preview can be fetched for that swimmer.
              if (selectedIds.size === 1) {
                setPendingRegId(Array.from(selectedIds)[0]);
              }
              setBulkAction("offered");
              setConfirmOpen(true);
            }}
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition cursor-pointer font-medium"
          >
            <CheckCircle2 className="h-4 w-4" /> Offer
          </button>
          <button
            onClick={() => {
              if (!validateRejectCoachRecommendation()) return;
              if (selectedIds.size === 1) {
                setPendingRegId(Array.from(selectedIds)[0]);
              }
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
                  const ids = Array.from(selectedIds);
                  navigate(`/tryouts/view/${tryoutId}/bulk-scoring?ids=${ids.join(",")}`);
                }}
                className="flex items-center gap-1.5 text-blue-300 hover:text-blue-200 transition cursor-pointer font-medium"
              >
                <ClipboardList className="h-4 w-4" /> Score {selectedIds.size} together
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
          }
        }}
        action={bulkAction}
        onConfirm={handleConfirm}
        isPending={sendDecision.isPending}
        tryoutId={tryoutId}
        regId={pendingRegId}
        selectedCount={selectedIds.size}
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

      <ManageCoachesDialog
        tryoutId={tryoutId}
        open={manageCoachesOpen}
        onOpenChange={setManageCoachesOpen}
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

interface CoachRecommendationFilterProps {
  groups: { _id: string; name: string; color?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function CoachRecommendationFilter({ groups, selected, onChange }: CoachRecommendationFilterProps) {
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

  const groupName = (id: string) => (id === REJECTED_VALUE ? "Reject" : groups.find((g) => g._id === id)?.name ?? id);
  const triggerLabel = isAllSelected
    ? "All recommendations"
    : selected.length <= 2
      ? selected.map(groupName).join(", ")
      : `${selected.slice(0, 2).map(groupName).join(", ")} +${selected.length - 2} more`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer w-56 justify-between">
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() => onChange([])}
          className="cursor-pointer"
        >
          All recommendations
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {groups.map((group) => (
          <DropdownMenuCheckboxItem
            key={group._id}
            checked={selectedSet.has(group._id)}
            onCheckedChange={() => toggle(group._id)}
            onSelect={(e) => e.preventDefault()}
            className="cursor-pointer flex items-center gap-2"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: group.color || "#e5e7eb" }}
              aria-hidden="true"
            />
            {group.name}
          </DropdownMenuCheckboxItem>
        ))}
        {groups.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuCheckboxItem
          checked={selectedSet.has(REJECTED_VALUE)}
          onCheckedChange={() => toggle(REJECTED_VALUE)}
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer flex items-center gap-2"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "#ef4444" }}
            aria-hidden="true"
          />
          Reject
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CoachRecommendationSelect({
  tryoutId,
  regId,
  value,
}: {
  tryoutId: string;
  regId: string;
  value: string | undefined | null;
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
          disabled={isLoading}
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
