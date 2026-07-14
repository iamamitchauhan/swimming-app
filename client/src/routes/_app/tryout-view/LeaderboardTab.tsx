import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTryoutLeaderboard, useSendDecision } from "@/hooks/use-tryout-dashboard";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { LeaderboardEntry } from "@/lib/api/tryouts.api";
import { calculateDetailedScoreTotal } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth.store";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RANK_COLORS = [
  "bg-yellow-400 text-yellow-900",
  "bg-gray-300 text-gray-700",
  "bg-amber-600 text-white",
];

function countYesNo(detailedScores?: Record<string, string | number | boolean | null>) {
  const values = Object.values(detailedScores ?? {});
  const yes = values.filter((v) => v === "yes" || v === true).length;
  const no = values.filter((v) => v === "no" || v === false).length;
  return { yes, no };
}

export function LeaderboardTab({ tryoutId }: Props) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(true);
  }, []);

  const { data: leaderboard = [], isLoading } = useTryoutLeaderboard(tryoutId, enabled);
  const decision = useSendDecision(tryoutId);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"offered" | "rejected" | null>(null);
  const [pendingRegId, setPendingRegId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const canManageCoaches = user?.role === "admin" || user?.role === "super_admin";

  function openDecisionDialog(regId: string, status: "offered" | "rejected") {
    setPendingRegId(regId);
    setBulkAction(status);
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!pendingRegId || !bulkAction) return;
    decision.mutate({ regId: pendingRegId, status: bulkAction });
    setConfirmOpen(false);
    setBulkAction(null);
    setPendingRegId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading leaderboard…
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-400 text-center py-8">No scores yet</p>
      </div>
    );
  }

  const segments = [...new Set(leaderboard.map((l) => l.segment_name || l.age_segment || "Other"))];

  function OfferReject({ l }: { l: LeaderboardEntry }) {
    const hasAvg = calculateDetailedScoreTotal(l.detailed_scores) !== null;
    const offerBtn = (
      <button
        disabled={!hasAvg}
        onClick={() => openDecisionDialog(l.registration_id, "offered")}
        className="text-xs text-green-600 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Offer
      </button>
    );
    const rejectBtn = (
      <button
        disabled={!hasAvg}
        onClick={() => openDecisionDialog(l.registration_id, "rejected")}
        className="text-xs text-red-500 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <XCircle className="h-3.5 w-3.5" /> Reject
      </button>
    );
    return (
      <div className="flex items-center gap-2 justify-end">
        {hasAvg ? (
          offerBtn
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">{offerBtn}</span>
              </TooltipTrigger>
              <TooltipContent side="left">Cannot offer without an average score.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {hasAvg ? (
          rejectBtn
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block">{rejectBtn}</span>
              </TooltipTrigger>
              <TooltipContent side="left">Cannot reject without an average score.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  function YesNoBadge({ l }: { l: LeaderboardEntry }) {
    const { yes, no } = countYesNo(l.detailed_scores);
    if (yes === 0 && no === 0) return <span className="text-gray-400">—</span>;
    return (
      <div className="flex items-center gap-1.5 text-sm justify-center">
        <span className="text-green-600 font-medium">{yes}</span>
        <span className="text-gray-400 font-normal">/</span>
        <span className="text-red-500 font-medium">{no}</span>
      </div>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
      registered: "bg-blue-50 text-blue-600 border-blue-100",
      offered: "bg-green-50 text-green-600 border-green-100",
      rejected: "bg-red-50 text-red-500 border-red-100",
      waitlisted: "bg-yellow-50 text-yellow-600 border-yellow-100",
      cancelled: "bg-gray-50 text-gray-500 border-gray-100",
    };
    return (
      <span
        className={`text-[10px] font-bold capitalize tracking-wider rounded px-1.5 py-0.5 border ${colors[status] || colors.registered}`}
      >
        {status}
      </span>
    );
  }

  return (
    <>
      <div className="py-4 space-y-6">
        {segments.map((seg) => {
          const group = leaderboard.filter(
            (l) => (l.segment_name || l.age_segment || "Other") === seg,
          );
          return (
            <div
              key={seg}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">{seg}</h3>
                <span className="text-xs text-gray-400">{group.length} scored</span>
              </div>

              {/* ── Mobile: cards per swimmer (hidden on lg+) ───────────────────── */}
              <div className="lg:hidden divide-y divide-gray-50">
                {group.map((l, i) => (
                  <div key={l.registration_id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            RANK_COLORS[i] || "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {l.swimmer_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            age {l.swimmer_age}
                            {l.segment_name ? ` · ${l.segment_name}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-gray-900">
                          {calculateDetailedScoreTotal(l.detailed_scores) ?? "—"}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                          Score
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <YesNoBadge l={l} />
                        <StatusBadge status={l.status} />
                      </div>
                      {l.status === "registered" && canManageCoaches && <OfferReject l={l} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop: table (hidden below lg) ─────────────────────────────── */}
              <div className="hidden lg:block overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Swimmer</TableHead>
                      <TableHead className="w-24 max-w-24 text-center">Yes / No</TableHead>
                      <TableHead className="w-20 max-w-20 text-center">Score</TableHead>
                      <TableHead className="w-24 max-w-24 text-center">Status</TableHead>
                      <TableHead className="w-36 max-w-36 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-50">
                    {group.map((l, i) => (
                      <TableRow key={l.registration_id} className="hover:bg-gray-50 transition">
                        <TableCell className="text-center px-4 py-3 w-12">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${
                              RANK_COLORS[i] || "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-medium text-gray-900">{l.swimmer_name}</div>
                          <div className="text-xs text-gray-400">
                            {l.segment_name || l.age_segment}
                            {l.swimmer_age ? ` · Age ${l.swimmer_age}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-4 py-3 w-24 max-w-24">
                          <YesNoBadge l={l} />
                        </TableCell>
                        <TableCell className="text-center px-4 py-3 w-20 max-w-20">
                          <div className="text-xl font-bold text-gray-900">
                            {calculateDetailedScoreTotal(l.detailed_scores) ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-4 py-3 w-24 max-w-24">
                          <StatusBadge status={l.status} />
                        </TableCell>
                        <TableCell className="text-right px-4 py-3 w-36 max-w-36">
                          {l.status === "registered" && canManageCoaches ? (
                            <OfferReject l={l} />
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {bulkAction === "offered" ? "Offer" : "Reject"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {bulkAction === "offered" ? "offer" : "reject"} this swimmer?
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
              disabled={decision.isPending}
              className={
                bulkAction === "offered"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {decision.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
