import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ManageCoachesDialog } from "./ManageCoachesDialog";
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
import { useTryoutRegistration, useSendDecision, useSaveScore } from "@/hooks/use-tryout-dashboard";
import { useGroups } from "@/hooks/use-groups";
import { useAuthStore } from "@/lib/auth.store";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
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
import { SearchInput } from "@/components/search-input";

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

const DETAILED_SCORE_TOTAL = 23;

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
  const done = Object.values(r.detailed_scores ?? {}).filter(
    (value) => value !== null && value !== undefined && value !== "" && value !== 0,
  ).length;
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
    sortBy: "swimmer_name",
    sortOrder: "asc",
  });
  const { data: rosterResult, isFetching: loading } = useTryoutRegistration(tryoutId, rosterParams);
  const { registrations = [], total = 0, page = 1, totalPages = 0 } = rosterResult ?? {};
  const sendDecision = useSendDecision(tryoutId);

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

  const user = useAuthStore((state) => state.user);
  const canManageCoaches = user?.role === "admin" || user?.role === "super_admin";

  function openDecisionDialog(regId: string, status: "offered" | "rejected") {
    setPendingRegId(regId);
    setBulkAction(status);
    setConfirmOpen(true);
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

  const segmentLabel =
    tryout?.segments?.find(
      (s) => (s as any).id === rosterParams.segmentId || s.name === rosterParams.segmentId,
    )?.name ?? (rosterParams.segmentId ? rosterParams.segmentId : "All segments");

  const statusLabel = rosterParams.status
    ? rosterParams.status.charAt(0).toUpperCase() + rosterParams.status.slice(1)
    : "All status";

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
            <DropdownMenuItem onClick={() => onParamsChange({ segmentId: undefined, page: 1 })}>
              All segments
            </DropdownMenuItem>
            {tryout?.segments?.map((seg, i) => (
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
      <div className="rounded-xl border border-gray-200 overflow-hidden mt-4">
        <Table>
          <TableHeader>
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
              <TableHead>When</TableHead>
              <TableHead>USA-S ID</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort("status")}
              >
                Status
                <SortIcon field="status" active={sortBy} order={sortOrder} />
              </TableHead>
              <TableHead>Evaluation</TableHead>
              <TableHead>Coach Recommendation</TableHead>
              <TableHead>Yes/No</TableHead>
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
                      {r.session_date ? fmtDate(r.session_date) : "—"}
                      {r.slot_start && (
                        <span className="text-gray-400">
                          {" "}
                          · {fmtTime(r.slot_start)}–{fmtTime(r.slot_end)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {r.usa_membership_id ? (
                        <div>
                          <div className="font-mono text-xs text-gray-700">
                            {r.usa_membership_id}
                          </div>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full ${VERIFY_COLORS[verSt]}`}
                          >
                            {VERIFY_LABELS[verSt]}
                          </span>
                        </div>
                      ) : (
                        "—"
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
                      <button
                        onClick={() =>
                          navigate(`/tryouts/view/${tryoutId}/bulk-scoring?ids=${r.id}`)
                        }
                        className="hover:underline cursor-pointer"
                        title="Open in Scoring tab"
                      >
                        <div>{avg(r) || <span className="text-gray-400">Score</span>}</div>
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
                    <TableCell className="px-4 py-3">
                      {r.status !== "registered" || !canManageCoaches ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        (() => {
                          const isComplete = detailedScoreCompletion(r).pct === 100;
                          const offerBtn = (
                            <button
                              disabled={!isComplete}
                              onClick={() => openDecisionDialog(r.id, "offered")}
                              className="text-xs text-green-600 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Offer
                            </button>
                          );
                          const rejectBtn = (
                            <button
                              disabled={!isComplete}
                              onClick={() => openDecisionDialog(r.id, "rejected")}
                              className="text-xs text-red-500 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          );
                          return (
                            <div className="flex items-center gap-2">
                              {isComplete ? (
                                offerBtn
                              ) : (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block">{offerBtn}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Cannot offer until scoring is 100% complete.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {isComplete ? (
                                rejectBtn
                              ) : (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block">{rejectBtn}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Cannot reject until scoring is 100% complete.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          );
                        })()
                      )}
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
              setBulkAction("offered");
              setConfirmOpen(true);
            }}
            className="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition cursor-pointer font-medium"
          >
            <CheckCircle2 className="h-4 w-4" /> Offer
          </button>
          <button
            onClick={() => {
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
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Showing{" "}
            <span className="font-medium">
              {(page - 1) * (rosterParams.limit ?? 20) + 1}–
              {Math.min(page * (rosterParams.limit ?? 20), total)}
            </span>{" "}
            of <span className="font-medium">{total}</span> results
          </span>
          <div className="flex items-center gap-2">
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {bulkAction === "offered" ? "Offer" : "Reject"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRegId
                ? `Are you sure you want to ${bulkAction === "offered" ? "offer" : "reject"} this swimmer?`
                : `Are you sure you want to ${bulkAction === "offered" ? "offer" : "reject"} the ${selectedIds.size} selected swimmers?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                setBulkAction(null);
                setPendingRegId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={sendDecision.isPending}
              className={
                bulkAction === "offered"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {sendDecision.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm
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
    </div>
  );
}

// ─── Coach Recommendation Dropdown ─────────────────────────────────────────────

const REJECTED_VALUE = "__rejected__";

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
