import { Fragment, useState, useMemo, useCallback } from "react";
import { ArrowLeft, Check, Dices, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useSaveScore } from "@/hooks/use-tryout-dashboard";
import type { Registration } from "@/lib/api/tryouts.api";
import {
  SCORING_CRITERIA,
  CATEGORY_ORDER,
  CRITERIA_BY_CATEGORY,
  TOTAL_CRITERIA,
  type Criterion,
} from "@/lib/scoring-criteria";

// ─── Score Controls ───────────────────────────────────────────────────────────

function ScoreControl({
  criterion,
  value,
  onChange,
}: {
  criterion: Criterion;
  value: string | number | boolean | null;
  onChange: (v: string | number | boolean | null) => void;
}) {
  if (criterion.type === "yesno") {
    const isYes = value === "yes" || value === true;
    const isNo = value === "no" || value === false;
    return (
      <div className="inline-flex rounded-lg border overflow-hidden">
        <button
          type="button"
          onClick={() => onChange(isYes ? null : "yes")}
          className={`px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1 transition ${
            isYes ? "bg-emerald-600 text-white" : "bg-background hover:bg-muted"
          }`}
        >
          <Check className="h-3 w-3" /> Y
        </button>
        <button
          type="button"
          onClick={() => onChange(isNo ? null : "no")}
          className={`px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1 border-l transition ${
            isNo ? "bg-rose-600 text-white" : "bg-background hover:bg-muted"
          }`}
        >
          <X className="h-3 w-3" /> N
        </button>
      </div>
    );
  }

  if (criterion.type === "rate15") {
    const current = value != null && value !== "" ? Number(value) : 0;
    return (
      <div className="inline-flex rounded-lg border overflow-hidden">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(current === n ? null : n)}
            className={`w-7 py-1 text-xs font-semibold border-l first:border-l-0 transition ${
              current === n ? "bg-blue-600 text-white" : "bg-background hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Checkbox
      checked={value === true || value === "yes"}
      onCheckedChange={(v) => onChange(v ? true : null)}
    />
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScoreMap = Record<string, Record<string, string | number | boolean | null>>;
type NotesMap = Record<string, string>;

interface Props {
  tryoutId: string;
  registrations: Registration[];
  onBack: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BulkScoreTab({ tryoutId, registrations, onBack }: Props) {
  const saveScoreMutation = useSaveScore(tryoutId);
  const [scores, setScores] = useState<ScoreMap>({});
  const [notesByReg, setNotesByReg] = useState<NotesMap>(() =>
    Object.fromEntries(registrations.map((r) => [r.id, r.notes ?? ""])),
  );
  const [savingAll, setSavingAll] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [highlightMissing, setHighlightMissing] = useState(false);

  // Track committed scores (from server + saved edits) so UI always shows current values
  const [committedScores, setCommittedScores] = useState<ScoreMap>(() => {
    const init: ScoreMap = {};
    for (const r of registrations) {
      if (r.detailed_scores && Object.keys(r.detailed_scores).length > 0) {
        init[r.id] = { ...r.detailed_scores };
      }
    }
    return init;
  });

  // Track committed notes so we can detect textarea edits
  const [committedNotes, setCommittedNotes] = useState<NotesMap>(() =>
    Object.fromEntries(registrations.map((r) => [r.id, r.notes ?? ""])),
  );

  // Get the display value: local edits take priority, then committed scores
  const getScore = useCallback(
    (regId: string, criterionId: string): string | number | boolean | null => {
      if (scores[regId]?.[criterionId] !== undefined) return scores[regId][criterionId];
      if (committedScores[regId]?.[criterionId] !== undefined)
        return committedScores[regId][criterionId];
      return null;
    },
    [scores, committedScores],
  );

  const setScore = useCallback(
    (regId: string, criterionId: string, value: string | number | boolean | null) => {
      setScores((prev) => ({
        ...prev,
        [regId]: { ...prev[regId], [criterionId]: value },
      }));
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(regId);
        return next;
      });
    },
    [],
  );

  const notesDirtyIds = useMemo(
    () =>
      registrations
        .filter((r) => (notesByReg[r.id] ?? "") !== (committedNotes[r.id] ?? ""))
        .map((r) => r.id),
    [notesByReg, committedNotes, registrations],
  );

  const hasEdits = useMemo(
    () => Object.keys(scores).length > 0 || notesDirtyIds.length > 0,
    [scores, notesDirtyIds],
  );

  const dirtyCount = useMemo(() => {
    const scoreIds = new Set(
      Object.keys(scores).filter((id) => Object.keys(scores[id]).length > 0),
    );
    for (const id of notesDirtyIds) scoreIds.add(id);
    return scoreIds.size;
  }, [scores, notesDirtyIds]);

  // Score completion per swimmer
  function getCompletion(regId: string) {
    const allScores = { ...committedScores[regId], ...scores[regId] };
    const done = SCORING_CRITERIA.filter((c) => {
      const v = allScores[c.id];
      return v != null && v !== "" && v !== 0;
    }).length;
    return { done, total: TOTAL_CRITERIA, pct: Math.round((done / TOTAL_CRITERIA) * 100) };
  }

  function getMissingCriteria(regId: string): string[] {
    const allScores = { ...committedScores[regId], ...scores[regId] };
    return SCORING_CRITERIA.filter((c) => {
      const v = allScores[c.id];
      return v == null || v === "" || v === 0;
    }).map((c) => c.label);
  }

  async function saveAll() {
    // Validate: every swimmer must have all criteria scored
    const incomplete = swimmers
      .map((s) => {
        const missing = getMissingCriteria(s.id);
        return missing.length > 0 ? { name: s.swimmer_name, missing } : null;
      })
      .filter(Boolean) as { name: string; missing: string[] }[];

    if (incomplete.length > 0) {
      const messages = incomplete.map(
        (item) => `${item.name}: ${item.missing.length} of ${TOTAL_CRITERIA} criteria missing`,
      );
      toast.error(`All criteria must be scored before saving`, {
        description: messages.join("\n"),
        duration: 6000,
      });
      setHighlightMissing(true);
      return;
    }
    setHighlightMissing(false);

    setSavingAll(true);
    const scoreIds = Object.keys(scores).filter((id) => Object.keys(scores[id]).length > 0);
    const ids = Array.from(new Set([...scoreIds, ...notesDirtyIds]));
    Promise.all(
      ids.map(async (regId) => {
        await saveScoreMutation.mutateAsync({
          regId,
          edits: {
            detailed_scores: scores[regId],
            notes: notesByReg[regId] ?? "",
          } as Partial<Registration>,
        });
      }),
    )
      .then(() => {
        // Merge all saved edits into committed scores
        setCommittedScores((prev) => {
          const next = { ...prev };
          for (const id of scoreIds) {
            next[id] = { ...next[id], ...scores[id] };
          }
          return next;
        });
        setCommittedNotes((prev) => {
          const next = { ...prev };
          for (const id of notesDirtyIds) {
            next[id] = notesByReg[id] ?? "";
          }
          return next;
        });
        setScores({});
        setSavedIds(new Set(registrations.map((r) => r.id)));
        setSavingAll(false);

        toast.success("Scores saved successfully");
        // redirect to main tryout page
        onBack();
      })
      .catch((err) => {
        setSavingAll(false);
        toast.error("Failed to save scores", {
          description: err instanceof Error ? err.message : "Please try again",
        });
      });
  }

  function fillRandomScores() {
    const next: ScoreMap = {};
    for (const swimmer of registrations) {
      next[swimmer.id] = {};
      for (const criterion of SCORING_CRITERIA) {
        if (criterion.type === "yesno") {
          next[swimmer.id][criterion.id] = Math.random() < 0.7 ? "yes" : "no";
        } else if (criterion.type === "rate15") {
          next[swimmer.id][criterion.id] = Math.floor(Math.random() * 5) + 1;
        } else {
          next[swimmer.id][criterion.id] = Math.random() < 0.6 ? true : false;
        }
      }
    }
    setScores(next);
    setSavedIds(new Set());
    toast.success("Random scores filled for all swimmers");
  }

  const swimmers = registrations;

  if (swimmers.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        No swimmers selected. Go back to the roster and select swimmers to score.
      </div>
    );
  }

  return (
    <div className="mx-auto">
      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to roster
      </button>

      {/* ── Gradient header ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white p-6 mb-6 shadow-lg">
        <div className="text-xs uppercase tracking-widest opacity-80">Parallel evaluation</div>
        <h1 className="text-2xl font-bold mt-1">
          Scoring {swimmers.map((s) => s.swimmer_name).join(", ")}
        </h1>
        <p className="text-sm opacity-90 mt-1">Compare criteria across swimmers at once.</p>
      </div>

      {/* ── Scoring Table ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-auto overscroll-contain max-h-[calc(100vh-280px)] pb-20">
          <table className="min-w-max w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted border-b">
                <th className="sticky left-0 top-0 z-40 w-[220px] min-w-[220px] bg-muted text-left p-3 border-r shadow-[4px_0_8px_-6px_rgba(0,0,0,0.35)] md:w-[260px] md:min-w-[260px]">
                  Criterion
                </th>
                {swimmers.map((s) => {
                  const comp = getCompletion(s.id);
                  return (
                    <th
                      key={s.id}
                      className="sticky top-0 z-30 w-[200px] min-w-[200px] bg-muted text-left p-3 border-l md:w-[220px] md:min-w-[220px]"
                    >
                      <div className="font-semibold wrap-break-word text-foreground">
                        {s.swimmer_name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className="border-sky-200 bg-sky-50 text-[10px] font-normal text-sky-700"
                        >
                          {s.swimmer_age} yrs
                        </Badge>
                        {s.segment_name && (
                          <Badge
                            variant="outline"
                            className="border-violet-200 bg-violet-50 text-[10px] font-normal text-violet-700"
                          >
                            {s.segment_name}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-normal ${
                            comp.pct === 100
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {comp.pct}% ({comp.done}/{comp.total})
                        </Badge>
                      </div>
                      {/* <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${comp.pct}%` }}
                        />
                      </div> */}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((category) => (
                <Fragment key={category}>
                  {/* Category group header */}
                  <tr className="bg-blue-50">
                    <td className="sticky left-0 z-20 w-[220px] min-w-[220px] bg-blue-50 p-2 px-3 text-xs font-semibold uppercase tracking-wide text-blue-700 border-r md:w-[260px] md:min-w-[260px]">
                      {category}
                    </td>
                    <td
                      colSpan={swimmers.length}
                      className="p-2 px-3 text-xs font-semibold uppercase tracking-wide text-blue-700"
                    />
                  </tr>
                  {/* Criteria rows */}
                  {CRITERIA_BY_CATEGORY[category].map((criterion) => {
                    const missingSwimmerIds = highlightMissing
                      ? new Set(
                          swimmers
                            .filter((s) => {
                              const v = getScore(s.id, criterion.id);
                              return v == null || v === "" || v === 0;
                            })
                            .map((s) => s.id),
                        )
                      : new Set<string>();
                    return (
                      <tr key={criterion.id} className="border-t hover:bg-muted/20">
                        <td className="sticky left-0 z-20 w-[220px] min-w-[220px] bg-background p-3 border-r align-top md:w-[260px] md:min-w-[260px]">
                          <div className="font-medium">{criterion.label}</div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                            {criterion.type === "yesno"
                              ? "Yes / No"
                              : criterion.type === "rate15"
                                ? "Rate 1–5"
                                : "Checkbox"}
                          </div>
                        </td>
                        {swimmers.map((swimmer) => {
                          const value = getScore(swimmer.id, criterion.id);
                          const isMissing = missingSwimmerIds.has(swimmer.id);
                          return (
                            <td
                              key={swimmer.id}
                              className={`p-3 border-l align-middle ${isMissing ? "bg-red-100/30" : ""}`}
                            >
                              <ScoreControl
                                criterion={criterion}
                                value={value}
                                onChange={(v) => setScore(swimmer.id, criterion.id, v)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              {/* Coach notes section */}
              <tr className="bg-blue-50">
                <td className="sticky left-0 z-20 w-[220px] min-w-[220px] bg-blue-50 p-2 px-3 text-xs font-semibold uppercase tracking-wide text-blue-700 border-r md:w-[260px] md:min-w-[260px]">
                  Coach notes
                </td>
                <td
                  colSpan={swimmers.length}
                  className="p-2 px-3 text-xs font-semibold uppercase tracking-wide text-blue-700"
                />
              </tr>
              <tr className="border-t">
                <td className="sticky left-0 z-20 w-[220px] min-w-[220px] bg-background p-3 border-r align-top md:w-[260px] md:min-w-[260px]">
                  <div className="font-medium">Notes</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                    Optional per swimmer
                  </div>
                </td>
                {swimmers.map((swimmer) => (
                  <td key={swimmer.id} className="p-2 border-l align-top">
                    <Textarea
                      rows={4}
                      value={notesByReg[swimmer.id] ?? ""}
                      onChange={(e) => {
                        setNotesByReg((prev) => ({ ...prev, [swimmer.id]: e.target.value }));
                        setSavedIds((prev) => {
                          const next = new Set(prev);
                          next.delete(swimmer.id);
                          return next;
                        });
                      }}
                      placeholder="Strengths, focus areas…"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fixed bottom save bar ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-40">
        <div className="mx-auto max-w-[1400px] px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground hidden sm:block">
            {dirtyCount > 0 ? (
              <span className="text-amber-600 font-medium">{dirtyCount} unsaved</span>
            ) : savedIds.size > 0 ? (
              <span className="text-green-600 font-medium">All saved</span>
            ) : (
              <span>
                Scoring {swimmers.length} swimmer{swimmers.length > 1 ? "s" : ""} in parallel
              </span>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            {/* <Button variant="outline" onClick={fillRandomScores}>
              <Dices className="h-4 w-4 mr-1" />
              Random fill
            </Button> */}
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              onClick={saveAll}
              disabled={savingAll}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {savingAll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
