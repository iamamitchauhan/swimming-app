import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Dices, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveScore } from "@/hooks/use-tryout-dashboard";
import { useSegmentQuestionsQuery } from "@/hooks/use-scoring-questions";
import { cn } from "@/lib/utils";
import type { Registration } from "@/lib/api/tryouts.api";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScoreValue = string | number | boolean | null;
type ScoreMap = Record<string, Record<string, ScoreValue>>;
type NotesMap = Record<string, string>;

interface Props {
  tryoutId: string;
  registrations: Registration[];
  onBack: () => void;
}

interface ScoreGroup {
  segmentId: string;
  name: string;
  swimmers: Registration[];
  questions: ScoringQuestion[];
}

/** A value counts as "answered" once it is set, non-empty and not a zero rating. */
function isAnswered(value: ScoreValue): boolean {
  return value != null && value !== "" && value !== 0;
}

/**
 * The question that gates scoring for a swimmer: until it is answered "Yes" the
 * swimmer's other questions stay locked (a "No" means the tryout wasn't finished,
 * so there is nothing else to evaluate).
 */
const GATE_QUESTION_LABEL = "finished the tryout?";

function isGateQuestion(question: ScoringQuestion): boolean {
  return question.label.trim().toLowerCase() === GATE_QUESTION_LABEL;
}

// ─── Score controls ────────────────────────────────────────────────────────────

function ScoreControl({
  question,
  value,
  onChange,
  size = "default",
  disabled = false,
  onLockedClick,
}: {
  question: ScoringQuestion;
  value: ScoreValue;
  onChange: (v: ScoreValue) => void;
  /** Denser layout for the matrix cells. */
  size?: "default" | "compact";
  /** Locks the control, e.g. until the swimmer has finished the tryout. */
  disabled?: boolean;
  /** Invoked instead of `onChange` when locked, to explain why it can't be set. */
  onLockedClick?: () => void;
}) {
  const compact = size === "compact";
  // Matrix cells have fixed widths (table-fixed), so the control fills its cell —
  // capped so it doesn't stretch across a wide desktop column.
  const group = cn(
    "overflow-hidden rounded-lg border",
    compact ? "mx-auto flex w-full max-w-36" : "inline-flex",
  );
  const btn = cn(
    "inline-flex items-center justify-center py-3 text-center font-semibold transition",
    compact ? "min-w-0 flex-1 px-2 text-xs sm:px-3 lg:px-4" : "min-w-16 px-4 text-sm sm:px-5",
  );
  // Locked controls stay clickable (aria-disabled, not `disabled`) so tapping one
  // can surface a toast explaining why it's locked.
  const locked = disabled ? "cursor-not-allowed opacity-40" : "";
  const idle = disabled ? "bg-background" : "bg-background hover:bg-muted";

  const pick = (next: ScoreValue) => {
    if (disabled) {
      onLockedClick?.();
      return;
    }
    onChange(next);
  };

  // Full labels on larger screens; single letters below lg so 6+ columns fit.
  const label = (full: string, short: string) => (
    <>
      <span className="hidden lg:inline">{full}</span>
      <span className="lg:hidden">{short}</span>
    </>
  );

  if (question.type === "YESNO") {
    const isYes = value === "yes" || value === true;
    const isNo = value === "no" || value === false;
    return (
      <div className={group}>
        <button
          type="button"
          aria-disabled={disabled}
          onClick={() => pick(isYes ? null : "yes")}
          className={cn(btn, locked, isYes ? "bg-emerald-500 text-white" : idle)}
        >
          {label("Yes", "Y")}
        </button>
        <button
          type="button"
          aria-disabled={disabled}
          onClick={() => pick(isNo ? null : "no")}
          className={cn(btn, locked, "border-l", isNo ? "bg-rose-500 text-white" : idle)}
        >
          {label("No", "N")}
        </button>
      </div>
    );
  }

  if (question.type === "RATING") {
    const current = value != null && value !== "" ? Number(value) : 0;
    return (
      <div className={group}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-disabled={disabled}
            onClick={() => pick(current === n ? null : n)}
            className={cn(
              "border-l text-xs font-semibold transition first:border-l-0",
              locked,
              compact ? "min-w-0 flex-1 py-3" : "w-7 py-1",
              current === n ? "bg-blue-600 text-white" : idle,
            )}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Input
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={() => disabled && onLockedClick?.()}
      readOnly={disabled}
      placeholder="—"
      className={cn(compact ? "h-8 text-xs" : "h-9 text-sm", locked)}
    />
  );
}

// ─── Swimmer heading (matrix row/column header) ─────────────────────────────────

function SwimmerHeading({ swimmer }: { swimmer: Registration }) {
  return (
    <div className="text-sm font-semibold wrap-break-word text-foreground phone-landscape:text-xs">
      {swimmer.swimmer_name}
    </div>
  );
}

// ─── Narrow-screen cards (phone portrait) ───────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  swimmers,
  getScore,
  setScore,
  isLocked,
  isApplicable,
  onLockedClick,
}: {
  question: ScoringQuestion;
  index: number;
  total: number;
  swimmers: Registration[];
  getScore: (regId: string, questionId: string) => ScoreValue;
  setScore: (regId: string, questionId: string, v: ScoreValue) => void;
  isLocked: (swimmer: Registration, question: ScoringQuestion) => boolean;
  /** False when the question isn't configured for the swimmer's segment. */
  isApplicable?: (swimmer: Registration, questionId: string) => boolean;
  /** Called when a locked control is tapped, to explain why it can't be set. */
  onLockedClick: (swimmer: Registration) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-violet-50 px-4 py-3">
        {/* <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          Question {index + 1} of {total}
        </div> */}
        <div className="mt-0.5 text-sm font-semibold text-foreground">{question.label}</div>
      </div>
      <ul className="divide-y">
        {swimmers.map((swimmer, i) => {
          const applicable = isApplicable ? isApplicable(swimmer, question._id) : true;
          return (
            <li key={swimmer.id} className="flex items-center gap-3 px-4 py-3">
              {swimmers.length > 1 && (
                <>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">{swimmer.swimmer_name}</span>
                </>
              )}
              {applicable ? (
                <ScoreControl
                  question={question}
                  value={getScore(swimmer.id, question._id)}
                  onChange={(v) => setScore(swimmer.id, question._id, v)}
                  disabled={isLocked(swimmer, question)}
                  onLockedClick={() => onLockedClick(swimmer)}
                />
              ) : (
                <span className="text-xs text-muted-foreground/40">—</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Score matrix (tablet + desktop) ───────────────────────────────────────────

function ScoreMatrix({
  swimmers,
  questions,
  getScore,
  setScore,
  isMissing,
  isLocked,
  isApplicable,
  onLockedClick,
}: {
  swimmers: Registration[];
  questions: ScoringQuestion[];
  getScore: (regId: string, questionId: string) => ScoreValue;
  setScore: (regId: string, questionId: string, v: ScoreValue) => void;
  isMissing: (regId: string, questionId: string) => boolean;
  isLocked: (swimmer: Registration, question: ScoringQuestion) => boolean;
  /** False when the question isn't configured for the swimmer's segment. */
  isApplicable?: (swimmer: Registration, questionId: string) => boolean;
  /** Called when a locked control is tapped, to explain why it can't be set. */
  onLockedClick: (swimmer: Registration) => void;
}) {
  return (
    <div className="max-h-[calc(100vh-8rem)] overflow-auto overscroll-x-contain rounded-xl border border-border phone:max-h-[calc(100vh-9rem)]">
      {/* table-fixed + w-full: the table never exceeds its container, so all question
          columns fit — labels wrap and controls shrink to the cell. No min-width, so
          narrow landscape tablets don't get a horizontal scrollbar. The swimmer column
          is wide enough for a ~20-character name on a single line (300px on xl+), and
          narrows to 120px on small landscape phones (e.g. iPhone SE) so the question
          columns keep enough room. */}
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 w-44 phone-landscape:w-[120px] border-b border-r border-border bg-muted px-3 py-3 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground xl:w-75 xl:px-4">
              Swimmer
            </th>
            {questions.map((question) => (
              <th
                key={question._id}
                className="sticky top-0 z-20 border-b border-l border-border bg-violet-50 px-2 py-3 text-center align-middle lg:px-3"
              >
                {/* Below md the question columns are ~83px, so at 12px the single words
                    (Backstroke 75px, Breaststroke 87px, Recommended 100px) are wider than
                    the cell and overflow-wrap breaks them mid-word. 10px keeps every word
                    whole except "Recommended" — at 9px it would still be too wide. From md
                    up the columns are wide enough for 12px. */}
                <div className="text-xs font-semibold wrap-break-word text-foreground max-[48rem]:text-[10px] max-[48rem]:leading-4 lg:text-sm">
                  {question.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {swimmers.map((swimmer) => (
            <tr key={swimmer.id} className="hover:bg-muted/20">
              <th className="sticky left-0 z-10 border-b border-r border-border bg-background px-3 py-3 text-left align-middle xl:px-4">
                <SwimmerHeading swimmer={swimmer} />
              </th>
              {questions.map((question) => {
                const applicable = isApplicable ? isApplicable(swimmer, question._id) : true;
                return (
                  <td
                    key={question._id}
                    className={cn(
                      "border-b border-l border-border px-2 py-3 align-middle lg:px-3",
                      isMissing(swimmer.id, question._id) && "bg-rose-50",
                    )}
                  >
                    {applicable ? (
                      <ScoreControl
                        question={question}
                        value={getScore(swimmer.id, question._id)}
                        onChange={(v) => setScore(swimmer.id, question._id, v)}
                        size="compact"
                        disabled={isLocked(swimmer, question)}
                        onLockedClick={() => onLockedClick(swimmer)}
                      />
                    ) : (
                      <span className="block text-center text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BulkScoreTab({ tryoutId, registrations, onBack }: Props) {
  const saveScoreMutation = useSaveScore(tryoutId, { silent: true });
  const { data: segmentQuestions = [], isLoading: questionsLoading } =
    useSegmentQuestionsQuery(tryoutId);

  const [scores, setScores] = useState<ScoreMap>({});
  const [notesByReg, setNotesByReg] = useState<NotesMap>(() =>
    Object.fromEntries(registrations.map((r) => [r.id, r.notes ?? ""])),
  );
  const [savingAll, setSavingAll] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

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

  // Segment → configured questions, keyed by the same segment id stored on registrations.
  const questionsBySegment = useMemo(() => {
    const map = new Map<string, ScoringQuestion[]>();
    for (const entry of segmentQuestions) map.set(entry.segmentId, entry.questions);
    return map;
  }, [segmentQuestions]);

  const questionsFor = useCallback(
    (reg: Registration) => questionsBySegment.get(reg.segment_id ?? "") ?? [],
    [questionsBySegment],
  );

  // Swimmers grouped by age group so each group renders against its own questions.
  const groups = useMemo<ScoreGroup[]>(() => {
    const bySegment = new Map<string, Registration[]>();
    for (const r of registrations) {
      const key = r.segment_id ?? "unknown";
      const list = bySegment.get(key) ?? [];
      list.push(r);
      bySegment.set(key, list);
    }
    return Array.from(bySegment.entries()).map(([segmentId, swimmers]) => ({
      segmentId,
      name: swimmers[0]?.segment_name || segmentId,
      swimmers,
      questions: questionsBySegment.get(segmentId) ?? [],
    }));
  }, [registrations, questionsBySegment]);

  // Union of every selected swimmer's questions so all swimmers render in a
  // single table. Segments normally share the same question set; where they
  // differ, a swimmer's cell is left blank for questions their segment lacks.
  const allQuestions = useMemo<ScoringQuestion[]>(() => {
    const seen = new Map<string, ScoringQuestion>();
    for (const group of groups) {
      for (const question of group.questions) {
        if (!seen.has(question._id)) seen.set(question._id, question);
      }
    }
    return Array.from(seen.values());
  }, [groups]);

  const hasQuestion = useCallback(
    (swimmer: Registration, questionId: string) =>
      questionsFor(swimmer).some((q) => q._id === questionId),
    [questionsFor],
  );

  // Get the display value: local edits take priority, then committed scores
  const getScore = useCallback(
    (regId: string, questionId: string): ScoreValue => {
      if (scores[regId]?.[questionId] !== undefined) return scores[regId][questionId];
      if (committedScores[regId]?.[questionId] !== undefined)
        return committedScores[regId][questionId];
      return null;
    },
    [scores, committedScores],
  );

  const setScore = useCallback(
    (regId: string, questionId: string, value: ScoreValue) => {
      const swimmer = registrations.find((r) => r.id === regId);
      const gate = swimmer ? (questionsFor(swimmer).find(isGateQuestion) ?? null) : null;
      // Answering the gate question "No" ends the evaluation, so reset everything
      // else recorded for the swimmer. Cleared values are set to `null` (not
      // removed) so the save sends them and the server clears the stored scores.
      const resetRest =
        !!swimmer && !!gate && gate._id === questionId && (value === "no" || value === false);

      setScores((prev) => {
        const current = { ...prev[regId], [questionId]: value };
        if (resetRest && swimmer) {
          for (const q of questionsFor(swimmer)) {
            if (q._id !== questionId) current[q._id] = null;
          }
        }
        return { ...prev, [regId]: current };
      });
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(regId);
        return next;
      });

      if (resetRest && swimmer) {
        toast.info("Other answers cleared", {
          id: "bulk-gate-reset",
          description: `${swimmer.swimmer_name} didn't finish the tryout, so the remaining questions were reset.`,
        });
      }
    },
    [registrations, questionsFor],
  );

  /** Explains why a locked control can't be set (swimmer hasn't finished the tryout). */
  const notifyLocked = useCallback((swimmer: Registration) => {
    toast.error("This score is locked", {
      id: "bulk-score-locked",
      description: `${swimmer.swimmer_name} hasn't finished the tryout. Set "Finished the tryout?" to Yes to unlock the remaining questions.`,
    });
  }, []);

  // The "Finished the tryout?" question gates a swimmer's other questions: they
  // stay locked until it is answered "Yes". A "No" ends the evaluation, so the
  // remaining questions are neither editable nor required.
  const gateQuestionFor = useCallback(
    (swimmer: Registration) => questionsFor(swimmer).find(isGateQuestion) ?? null,
    [questionsFor],
  );

  const isFinished = useCallback(
    (swimmer: Registration): boolean => {
      const gate = gateQuestionFor(swimmer);
      if (!gate) return true;
      const value = getScore(swimmer.id, gate._id);
      return value === "yes" || value === true;
    },
    [gateQuestionFor, getScore],
  );

  const isQuestionLocked = useCallback(
    (swimmer: Registration, question: ScoringQuestion): boolean => {
      const gate = gateQuestionFor(swimmer);
      if (!gate || gate._id === question._id) return false;
      return !isFinished(swimmer);
    },
    [gateQuestionFor, isFinished],
  );

  // Questions a swimmer must answer to save: all of them once the tryout is
  // finished, otherwise just the gate question.
  const requiredQuestions = useCallback(
    (swimmer: Registration): ScoringQuestion[] => {
      const questions = questionsFor(swimmer);
      const gate = questions.find(isGateQuestion);
      if (!gate || isFinished(swimmer)) return questions;
      return [gate];
    },
    [questionsFor, isFinished],
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

  const getMissingQuestions = useCallback(
    (swimmer: Registration): string[] => {
      const all = { ...committedScores[swimmer.id], ...scores[swimmer.id] };
      return requiredQuestions(swimmer)
        .filter((q) => !isAnswered(all[q._id]))
        .map((q) => q.label);
    },
    [committedScores, scores, requiredQuestions],
  );

  const isMissing = useCallback(
    (regId: string, questionId: string) => {
      if (!highlightMissing) return false;
      const swimmer = registrations.find((r) => r.id === regId);
      const question = swimmer
        ? questionsFor(swimmer).find((q) => q._id === questionId)
        : undefined;
      if (!swimmer || !question) return false;
      // Locked questions aren't required, so never flag them as missing.
      if (isQuestionLocked(swimmer, question)) return false;
      return !isAnswered(getScore(regId, questionId));
    },
    [highlightMissing, registrations, questionsFor, isQuestionLocked, getScore],
  );

  async function saveAll() {
    // Validate: every swimmer must have all of their required questions scored
    const incomplete = registrations
      .map((s) => {
        const missing = getMissingQuestions(s);
        const total = requiredQuestions(s).length;
        return missing.length > 0 ? { name: s.swimmer_name, missing, total } : null;
      })
      .filter(Boolean) as { name: string; missing: string[]; total: number }[];

    if (incomplete.length > 0) {
      const messages = incomplete.map(
        (item) => `${item.name}: ${item.missing.length} of ${item.total} questions missing`,
      );
      toast.error(`All questions must be scored before saving`, {
        id: "bulk-missing-scores",
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

    // Send each swimmer's *complete* criteria set (not just the edits) so the
    // server can replace `detailedScores`. That drops answers to questions that
    // no longer exist and keeps the roster/leaderboard counts accurate.
    const detailedById: Record<string, Record<string, ScoreValue>> = {};
    for (const regId of ids) {
      const swimmer = registrations.find((r) => r.id === regId);
      if (!swimmer) continue;
      const full: Record<string, ScoreValue> = {};
      for (const q of questionsFor(swimmer)) full[q._id] = getScore(regId, q._id);
      detailedById[regId] = full;
    }

    Promise.all(
      ids.map(async (regId) => {
        await saveScoreMutation.mutateAsync({
          regId,
          edits: {
            ...(detailedById[regId] ? { detailed_scores: detailedById[regId] } : {}),
            notes: notesByReg[regId] ?? "",
          } as Partial<Registration>,
        });
      }),
    )
      .then(() => {
        // The server now stores exactly what we sent, so make that the new baseline.
        setCommittedScores((prev) => {
          const next = { ...prev };
          for (const id of ids) {
            if (detailedById[id]) next[id] = detailedById[id];
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

        toast.success("Scores saved successfully", { id: "bulk-save-success" });
        // redirect to main tryout page
        onBack();
      })
      .catch((err) => {
        setSavingAll(false);
        toast.error("Failed to save scores", {
          id: "bulk-save-failed",
          description: err instanceof Error ? err.message : "Please try again",
        });
      });
  }

  function fillRandomScores() {
    const next: ScoreMap = {};
    for (const swimmer of registrations) {
      next[swimmer.id] = {};
      for (const question of questionsFor(swimmer)) {
        if (question.type === "YESNO") {
          next[swimmer.id][question._id] = Math.random() < 0.7 ? "yes" : "no";
        } else if (question.type === "RATING") {
          next[swimmer.id][question._id] = Math.floor(Math.random() * 5) + 1;
        } else {
          next[swimmer.id][question._id] = "Looks good";
        }
      }
    }
    setScores(next);
    setSavedIds(new Set());
    toast.success("Random scores filled for all swimmers", { id: "bulk-random-fill" });
  }

  const swimmers = registrations;

  if (swimmers.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400">
        No swimmers selected. Go back to the roster and select swimmers to score.
      </div>
    );
  }

  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const singleGroup = groups.length === 1 ? groups[0] : null;
  const questionCount = allQuestions.length;

  return (
    <>
      {/* ── Fixed action bar ───────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 phone:h-12 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur phone:px-3 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          aria-label="Back to roster"
          className="inline-flex h-9 w-9 phone:h-8 phone:w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 phone-landscape:hidden">
          <div className="truncate text-base phone:text-sm font-semibold leading-tight">
            Tryout scoring{singleGroup ? ` · ${singleGroup.name}` : ""}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {swimmers.length} swimmer{swimmers.length === 1 ? "" : "s"} · {questionCount} question
            {questionCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground lg:block">
            {dirtyCount > 0 ? (
              <span className="font-medium text-amber-600">{dirtyCount} unsaved</span>
            ) : savedIds.size > 0 ? (
              <span className="font-medium text-green-600">All saved</span>
            ) : (
              <span>
                Scoring {swimmers.length} swimmer{swimmers.length > 1 ? "s" : ""} in parallel
              </span>
            )}
          </span>
          {import.meta.env.VITE_ENV === "dev" && (
            <Button
              variant="outline"
              onClick={fillRandomScores}
              className="hidden sm:inline-flex phone:h-8 phone:px-3 phone:text-xs"
            >
              <Dices className="mr-1 h-4 w-4" />
              Random fill
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onBack}
            className="phone-landscape:hidden phone:h-8 phone:px-3 phone:text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={saveAll}
            disabled={savingAll || !hasEdits}
            className="bg-blue-600 hover:bg-blue-500 phone:h-8 phone:px-3 phone:text-xs"
          >
            {savingAll ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* ── Single table for every selected swimmer ────────────────────────── */}
      <div className="space-y-8 px-4 pt-20 pb-8 phone:pt-16 sm:px-6 lg:px-8">
        {allQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            No scoring questions are configured for these swimmers. Add questions to their age
            groups in the Questions tab, then come back to score.
          </div>
        ) : (
          <>
            {/* Phone portrait — one card per question */}
            <div className="space-y-4 sm:hidden">
              {allQuestions.map((question, index) => (
                <QuestionCard
                  key={question._id}
                  question={question}
                  index={index}
                  total={allQuestions.length}
                  swimmers={swimmers}
                  getScore={getScore}
                  setScore={setScore}
                  isLocked={isQuestionLocked}
                  isApplicable={hasQuestion}
                  onLockedClick={notifyLocked}
                />
              ))}
            </div>

            {/* Tablet / desktop — all swimmers × questions in one matrix */}
            <div className="hidden sm:block">
              <ScoreMatrix
                swimmers={swimmers}
                questions={allQuestions}
                getScore={getScore}
                setScore={setScore}
                isMissing={isMissing}
                isLocked={isQuestionLocked}
                isApplicable={hasQuestion}
                onLockedClick={notifyLocked}
              />
            </div>
          </>
        )}

        {/* ── Coach notes (collapsible; open by default on tablet+) ────────── */}
        <section className="overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setNotesExpanded(!notesExpanded)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/40"
          >
            <span className="text-sm font-semibold">
              Coach notes <span className="font-normal text-muted-foreground">· optional</span>
            </span>
            <span className="text-sm font-medium text-primary">
              {notesExpanded ? "Hide" : "Show"}
            </span>
          </button>
          {notesExpanded && (
            <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-1">
              {swimmers.map((swimmer) => (
                <div key={swimmer.id} className="xl:flex xl:items-start xl:gap-3">
                  <div className="mb-1.5 text-sm font-medium xl:mb-0 xl:w-75 xl:shrink-0 xl:pt-2">
                    {swimmer.swimmer_name}
                  </div>
                  <Textarea
                    rows={3}
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
                    className="xl:flex-1"
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
