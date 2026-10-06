import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTryoutLeaderboard, useSaveScore } from "@/hooks/use-tryout-dashboard";
import { useGroups } from "@/hooks/use-groups";
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
import type { LeaderboardEntry, Registration } from "@/lib/api/tryouts.api";
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

  const user = useAuthStore((state) => state.user);
  const canManageCoaches = user?.role === "admin" || user?.role === "super_admin";

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
        className={`rounded-full text-[10px] font-bold capitalize tracking-wider rounded px-1.5 py-0.5 border ${colors[status] || colors.registered}`}
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
              <div className="flex items-center justify-between px-4 py-3 sm:px-5 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{seg}</h3>
                <span className="text-xs text-gray-400">{group.length} scored</span>
              </div>

              {/* ── Mobile / Tablet: cards per swimmer (hidden on xl+) ──────────── */}
              <div className="xl:hidden divide-y divide-gray-50">
                {group.map((l, i) => (
                  <div key={l.registration_id} className="px-4 py-3.5 space-y-3 sm:px-5 sm:py-4">
                    {/* Row 1: rank + swimmer info */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            i < 3 ? RANK_COLORS[i] : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            {l.swimmer_name}
                          </div>
                          <div className="text-xs text-gray-400">
                            age {l.swimmer_age}
                            {l.segment_name ? ` · ${l.segment_name}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: badges + coach recommendation */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
                      <div className="flex items-center gap-2 flex-col">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          Evaluation
                        </span>
                        <YesNoBadge l={l} />
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={l.status} />
                      </div>
                      {l.coach_recommendation_name && !canManageCoaches && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                            Rec
                          </span>
                          <span className="text-xs text-gray-600 font-medium">
                            {l.coach_recommendation_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Row 3: coach recommendation select */}
                    {canManageCoaches && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-50">
                        <div className="flex items-start gap-2 flex-col">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                            Coach recommendation
                          </span>
                          <CoachRecommendationSelect
                            tryoutId={tryoutId}
                            regId={l.registration_id}
                            value={
                              l.coach_recommendation === REJECTED_VALUE
                                ? undefined
                                : (l.coach_recommendation ?? null)
                            }
                            disabled={l.status === "rejected"}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Desktop: table (hidden below xl) ─────────────────────────────── */}
              <div className="hidden xl:block overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Swimmer</TableHead>
                      <TableHead className="w-24 max-w-24 text-center">Evaluation</TableHead>
                      <TableHead className="w-52 max-w-52 text-center whitespace-nowrap">
                        Coach Recommendation
                      </TableHead>
                      <TableHead className="w-28 min-w-28 max-w-28 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-50">
                    {group.map((l, i) => (
                      <TableRow key={l.registration_id} className="hover:bg-gray-50 transition">
                        <TableCell className="text-center align-middle px-4 py-3 w-12">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto bg-gray-100 text-gray-500">
                            {i + 1}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle px-4 py-3">
                          <div className="font-medium text-gray-900">{l.swimmer_name}</div>
                          <div className="text-xs text-gray-400">
                            {l.segment_name || l.age_segment}
                            {l.swimmer_age ? ` · Age ${l.swimmer_age}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle px-4 py-3 w-24 max-w-24">
                          <YesNoBadge l={l} />
                        </TableCell>
                        <TableCell className="text-center align-middle px-4 py-3 w-52 max-w-52">
                          {canManageCoaches ? (
                            <CoachRecommendationSelect
                              tryoutId={tryoutId}
                              regId={l.registration_id}
                              value={
                                l.coach_recommendation === REJECTED_VALUE
                                  ? undefined
                                  : (l.coach_recommendation ?? null)
                              }
                              disabled={l.status === "rejected"}
                            />
                          ) : (
                            <span className="text-sm text-gray-700">
                              {l.coach_recommendation_name || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center align-middle px-4 py-3 w-28 min-w-28 max-w-28">
                          <StatusBadge status={l.status} />
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
    </>
  );
}

// ─── Coach Recommendation Dropdown ─────────────────────────────────────────────

const REJECTED_VALUE = "__rejected__";

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
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1.5 rounded-full border font-medium transition cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 text-gray-700 border-gray-200"
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
