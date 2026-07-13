import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTryoutLeaderboard, useSendDecision } from "@/hooks/use-tryout-dashboard";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BulkEmailDialog } from "./BulkEmailDialog";
import { tryoutsApi } from "@/lib/api/tryouts.api";

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

  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"offered" | "rejected" | null>(null);
  const [pendingRegId, setPendingRegId] = useState<string | null>(null);

  function openDecisionDialog(regId: string, status: "offered" | "rejected") {
    setPendingRegId(regId);
    setBulkAction(status);
    setBulkEmailOpen(true);
  }

  async function handleSend(subject: string, body: string) {
    if (!pendingRegId || !bulkAction) return;
    await tryoutsApi.bulkEmail(tryoutId, {
      registrationIds: [pendingRegId],
      subject,
      body,
      action: bulkAction,
    });
    decision.mutate({ regId: pendingRegId, status: bulkAction });
    setBulkEmailOpen(false);
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
              className="overflow-x-auto bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800">{seg}</h3>
                <span className="text-xs text-gray-400">{group.length} scored</span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.map((l, i) => (
                  <div key={l.registration_id} className="flex items-center gap-4 px-5 py-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        RANK_COLORS[i] || "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{l.swimmer_name}</span>
                      <span className="text-gray-400 text-sm ml-2">age {l.swimmer_age}</span>
                    </div>

                    {(() => {
                      const { yes, no } = countYesNo(l.detailed_scores);
                      if (yes === 0 && no === 0) return null;
                      return (
                        <div className="flex items-center gap-1.5 text-sm ml-3">
                          <span className="text-green-600 font-medium">{yes}</span>
                          <span className="text-gray-400 font-normal">/</span>
                          <span className="text-red-500 font-medium">{no}</span>
                        </div>
                      );
                    })()}

                    {l.status === "registered" && (
                      <div className="flex gap-1.5 ml-3">
                        {(() => {
                          const hasAvg = !!parseFloat(String(l.total_score)).toFixed(1);
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
                            <div className="flex items-center gap-2">
                              {hasAvg ? (
                                offerBtn
                              ) : (
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block">{offerBtn}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Cannot offer without an average score.
                                    </TooltipContent>
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
                                    <TooltipContent side="left">
                                      Cannot reject without an average score.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div className="w-12 text-right">
                      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Score
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {parseFloat(String(l.total_score)).toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <BulkEmailDialog
        open={bulkEmailOpen}
        action={bulkAction}
        count={1}
        onClose={() => {
          setBulkEmailOpen(false);
          setBulkAction(null);
          setPendingRegId(null);
        }}
        onSend={handleSend}
      />
    </>
  );
}
