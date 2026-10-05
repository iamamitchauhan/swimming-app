import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Dices, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveScore } from "@/hooks/use-tryout-dashboard";
import { useSegmentQuestionsQuery } from "@/hooks/use-scoring-questions";
import { useIsLandscape, useMediaQuery } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Registration } from "@/lib/api/tryouts.api";
import type { ScoringQuestion, ScoringQuestionType } from "@/lib/api/scoring-questions.api";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ScoreValue = string | number | boolean | null;
type ScoreMap = Record<string, Record<string, ScoreValue>>;
type NotesMap = Record<string, string>;
type Completion = { done: number; total: number; pct: number };

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

const QUESTION_TYPE_LABEL: Record<ScoringQuestionType, string> = {
  YESNO: "Yes / No",
  RATING: "Rate 1–5",
  TEXT: "Text",
};

/** A value counts as "answered" once it is set, non-empty and not a zero rating. */
function isAnswered(value: ScoreValue): boolean {
  return value != null && value !== "" && value !== 0;
}

// ─── Score controls ────────────────────────────────────────────────────────────

function ScoreControl({
  question,
  value,
  onChange,
  size = "default",
}: {
  question: ScoringQuestion;
  value: ScoreValue;
  onChange: (v: ScoreValue) => void;
  /** Denser layout for the matrix cells. */
  size?: "default" | "compact";
}) {
  const btn =
    size === "compact"
      ? "min-w-12 px-4 py-2 text-xs phone-landscape:min-w-6 phone-landscape:px-1.5 phone-landscape:py-0.5"
      : "min-w-16 px-4 py-2 text-sm";

  // Full labels normally; single letters on a phone held sideways so 6+ columns fit.
  const label = (full: string, short: string) => (
    <>
      <span className="phone-landscape:hidden">{full}</span>
      <span className="hidden phone-landscape:inline">{short}</span>
    </>
  );

  if (question.type === "YESNO") {
    const isYes = value === "yes" || value === true;
    const isNo = value === "no" || value === false;
    return (
      <div className="inline-flex overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => onChange(isYes ? null : "yes")}
          className={cn(
            btn,
            "font-semibold transition",
            isYes ? "bg-emerald-500 text-white" : "bg-background hover:bg-muted",
          )}
        >
          {label("Yes", "Y")}
        </button>
        <button
          type="button"
          onClick={() => onChange(isNo ? null : "no")}
          className={cn(
            btn,
            "border-l font-semibold transition",
            isNo ? "bg-rose-500 text-white" : "bg-background hover:bg-muted",
          )}
        >
          {label("No", "N")}
        </button>
      </div>
    );
  }

  if (question.type === "RATING") {
    const current = value != null && value !== "" ? Number(value) : 0;
    return (
      <div className="inline-flex overflow-hidden rounded-lg border">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(current === n ? null : n)}
            className={cn(
              "w-7 border-l py-1 text-xs font-semibold transition first:border-l-0 phone-landscape:w-6 phone-landscape:py-0.5",
              current === n ? "bg-blue-600 text-white" : "bg-background hover:bg-muted",
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
      placeholder="—"
      className={
        size === "compact"
          ? "h-8 min-w-32 text-xs phone-landscape:h-7 phone-landscape:min-w-20"
          : "h-9 text-sm"
      }
    />
  );
}

// ─── Swimmer heading (matrix row/column header) ─────────────────────────────────

function SwimmerHeading({
  swimmer,
  completion,
}: {
  swimmer: Registration;
  completion: Completion;
}) {
  return (
    <div>
      <div className="text-sm font-semibold wrap-break-word text-foreground phone-landscape:text-xs">
        {swimmer.swimmer_name}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 phone-landscape:hidden">
        <Badge
          variant="outline"
          className="border-sky-200 bg-sky-50 text-[10px] font-normal text-sky-700"
        >
          {swimmer.swimmer_age} yrs
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-normal",
            completion.pct === 100
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          {completion.pct}% ({completion.done}/{completion.total})
        </Badge>
      </div>
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
}: {
  question: ScoringQuestion;
  index: number;
  total: number;
  swimmers: Registration[];
  getScore: (regId: string, questionId: string) => ScoreValue;
  setScore: (regId: string, questionId: string, v: ScoreValue) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b bg-violet-50 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          Question {index + 1} of {total}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-foreground">{question.label}</div>
      </div>
      <ul className="divide-y">
        {swimmers.map((swimmer, i) => (
          <li key={swimmer.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {swimmer.swimmer_name}
            </span>
            <ScoreControl
              question={question}
              value={getScore(swimmer.id, question._id)}
              onChange={(v) => setScore(swimmer.id, question._id, v)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Adaptive matrix (tablet + desktop) ────────────────────────────────────────

type AxisCell =
  | { kind: "swimmer"; key: string; swimmer: Registration }
  | { kind: "question"; key: string; question: ScoringQuestion };

const swimmerOf = (cell: AxisCell) => (cell.kind === "swimmer" ? cell.swimmer : null);
const questionOf = (cell: AxisCell) => (cell.kind === "question" ? cell.question : null);

function ScoreMatrix({
  swimmers,
  questions,
  getScore,
  setScore,
  getCompletion,
  isMissing,
  transposed,
}: {
  swimmers: Registration[];
  questions: ScoringQuestion[];
  getScore: (regId: string, questionId: string) => ScoreValue;
  setScore: (regId: string, questionId: string, v: ScoreValue) => void;
  getCompletion: (swimmer: Registration) => Completion;
  isMissing: (regId: string, questionId: string) => boolean;
  /** true → questions as rows, swimmers as columns (portrait/tablet). */
  transposed: boolean;
}) {
  const swimmerCells: AxisCell[] = swimmers.map((s) => ({
    kind: "swimmer",
    key: s.id,
    swimmer: s,
  }));
  const questionCells: AxisCell[] = questions.map((q) => ({
    kind: "question",
    key: q._id,
    question: q,
  }));
  const rows = transposed ? questionCells : swimmerCells;
  const cols = transposed ? swimmerCells : questionCells;

  const renderHeader = (cell: AxisCell) =>
    cell.kind === "swimmer" ? (
      <SwimmerHeading swimmer={cell.swimmer} completion={getCompletion(cell.swimmer)} />
    ) : (
      <div>
        <div className="text-sm font-semibold wrap-break-word text-foreground phone-landscape:text-xs phone-landscape:leading-tight">
          {cell.question.label}
        </div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600 phone-landscape:hidden">
          {QUESTION_TYPE_LABEL[cell.question.type]}
        </div>
      </div>
    );

  return (
    <div className="max-h-[calc(100vh-8rem)] overflow-auto overscroll-x-contain border border-border phone-landscape:max-h-[calc(100vh-7rem)]">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 border-b border-r border-border bg-muted px-4 py-3 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-muted-foreground phone-landscape:px-2 phone-landscape:py-2">
              {transposed ? "Question" : "Swimmer"}
            </th>
            {cols.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-0 z-20 border-b border-l border-border px-4 py-3 text-left align-middle phone-landscape:px-2 phone-landscape:py-2",
                  col.kind === "swimmer"
                    ? "min-w-35.5 bg-muted phone-landscape:min-w-21"
                    : "min-w-37.5 bg-violet-50 phone-landscape:min-w-22 phone-landscape:max-w-25",
                )}
              >
                {renderHeader(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-muted/20">
              <th
                className={cn(
                  "sticky left-0 z-10 border-b border-r border-border px-4 py-3 text-left align-middle phone-landscape:px-2 phone-landscape:py-2",
                  row.kind === "swimmer"
                    ? "min-w-42.75 bg-background phone-landscape:min-w-19 phone-landscape:max-w-45"
                    : "min-w-45 bg-violet-50 phone-landscape:min-w-20",
                )}
              >
                {renderHeader(row)}
              </th>
              {cols.map((col) => {
                const swimmer = (swimmerOf(row) ?? swimmerOf(col))!;
                const question = (questionOf(row) ?? questionOf(col))!;
                return (
                  <td
                    key={col.key}
                    className={cn(
                      "border-b border-l border-border px-3 py-3 text-center align-middle phone-landscape:max-w-25 phone-landscape:px-2 phone-landscape:py-1.5",
                      isMissing(swimmer.id, question._id) && "bg-rose-50",
                    )}
                  >
                    <ScoreControl
                      question={question}
                      value={getScore(swimmer.id, question._id)}
                      onChange={(v) => setScore(swimmer.id, question._id, v)}
                      size="compact"
                    />
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
  const saveScoreMutation = useSaveScore(tryoutId);
  const { data: segmentQuestions = [], isLoading: questionsLoading } =
    useSegmentQuestionsQuery(tryoutId);

  const [scores, setScores] = useState<ScoreMap>({});
  const [notesByReg, setNotesByReg] = useState<NotesMap>(() =>
    Object.fromEntries(registrations.map((r) => [r.id, r.notes ?? ""])),
  );
  const [savingAll, setSavingAll] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [highlightMissing, setHighlightMissing] = useState(false);
  // null → follow the viewport default (open on tablet+, collapsed on phones);
  // a boolean means the user has toggled it explicitly.
  const [notesOpen, setNotesOpen] = useState<boolean | null>(null);
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const notesExpanded = notesOpen ?? isTabletUp;

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

  const setScore = useCallback((regId: string, questionId: string, value: ScoreValue) => {
    setScores((prev) => ({
      ...prev,
      [regId]: { ...prev[regId], [questionId]: value },
    }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(regId);
      return next;
    });
  }, []);

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

  // Score completion per swimmer, against that swimmer's own questions.
  const getCompletion = useCallback(
    (swimmer: Registration): Completion => {
      const questions = questionsFor(swimmer);
      const all = { ...committedScores[swimmer.id], ...scores[swimmer.id] };
      const done = questions.filter((q) => isAnswered(all[q._id])).length;
      const total = questions.length;
      return { done, total, pct: total ? Math.round((done / total) * 100) : 100 };
    },
    [committedScores, scores, questionsFor],
  );

  const getMissingQuestions = useCallback(
    (swimmer: Registration): string[] => {
      const all = { ...committedScores[swimmer.id], ...scores[swimmer.id] };
      return questionsFor(swimmer)
        .filter((q) => !isAnswered(all[q._id]))
        .map((q) => q.label);
    },
    [committedScores, scores, questionsFor],
  );

  const isMissing = useCallback(
    (regId: string, questionId: string) => {
      if (!highlightMissing) return false;
      const swimmer = registrations.find((r) => r.id === regId);
      if (!swimmer || !questionsFor(swimmer).some((q) => q._id === questionId)) return false;
      return !isAnswered(getScore(regId, questionId));
    },
    [highlightMissing, registrations, questionsFor, getScore],
  );

  async function saveAll() {
    // Validate: every swimmer must have all of their questions scored
    const incomplete = registrations
      .map((s) => {
        const missing = getMissingQuestions(s);
        const total = questionsFor(s).length;
        return missing.length > 0 ? { name: s.swimmer_name, missing, total } : null;
      })
      .filter(Boolean) as { name: string; missing: string[]; total: number }[];

    if (incomplete.length > 0) {
      const messages = incomplete.map(
        (item) => `${item.name}: ${item.missing.length} of ${item.total} questions missing`,
      );
      toast.error(`All questions must be scored before saving`, {
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
            // Only include detailed_scores when there are actual score edits,
            // otherwise undefined would clobber existing scores in the
            // optimistic update (and unnecessarily on the server too).
            ...(scores[regId] ? { detailed_scores: scores[regId] } : {}),
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
    toast.success("Random scores filled for all swimmers");
  }

  const swimmers = registrations;
  const isLandscape = useIsLandscape();

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
  const questionCount = singleGroup?.questions.length ?? 0;

  return (
    <>
      {/* ── Fixed action bar ───────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          aria-label="Back to roster"
          className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 phone-landscape:hidden">
          <div className="truncate text-base font-semibold leading-tight">
            Tryout scoring{singleGroup ? ` · ${singleGroup.name}` : ""}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {swimmers.length} swimmer{swimmers.length === 1 ? "" : "s"} ·{" "}
            {singleGroup
              ? `${questionCount} question${questionCount === 1 ? "" : "s"}`
              : `${groups.length} age groups`}
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
            <Button variant="outline" onClick={fillRandomScores} className="hidden sm:inline-flex">
              <Dices className="mr-1 h-4 w-4" />
              Random fill
            </Button>
          )}
          <Button variant="outline" onClick={onBack} className="phone-landscape:hidden">
            Cancel
          </Button>
          <Button
            onClick={saveAll}
            disabled={savingAll || !hasEdits}
            className="bg-blue-600 hover:bg-blue-500"
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

      {/* ── Groups ─────────────────────────────────────────────────────────── */}
      <div className="space-y-8 px-4 pt-20 pb-8 sm:px-6 lg:px-8">
        {groups.map((group) => (
          <section key={group.segmentId}>
            {!singleGroup && (
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 phone-landscape:hidden">
                <h2 className="text-base font-semibold">{group.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {group.swimmers.length} swimmer{group.swimmers.length === 1 ? "" : "s"} ·{" "}
                  {group.questions.length} question{group.questions.length === 1 ? "" : "s"}
                </span>
              </div>
            )}

            {group.questions.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                No scoring questions are configured for {group.name}. Add questions to this age
                group in the Questions tab, then come back to score.
              </div>
            ) : (
              <>
                {/* Phone portrait — one card per question */}
                <div className="space-y-4 sm:hidden">
                  {group.questions.map((question, index) => (
                    <QuestionCard
                      key={question._id}
                      question={question}
                      index={index}
                      total={group.questions.length}
                      swimmers={group.swimmers}
                      getScore={getScore}
                      setScore={setScore}
                    />
                  ))}
                </div>

                {/* Tablet / desktop — matrix flips axes by orientation */}
                <div className="hidden sm:block">
                  <ScoreMatrix
                    swimmers={group.swimmers}
                    questions={group.questions}
                    getScore={getScore}
                    setScore={setScore}
                    getCompletion={getCompletion}
                    isMissing={isMissing}
                    transposed={!isLandscape}
                  />
                </div>
              </>
            )}
          </section>
        ))}

        {/* ── Coach notes (collapsible; open by default on tablet+) ────────── */}
        <section className="overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesExpanded)}
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
            <div className="grid gap-3 border-t p-4 sm:grid-cols-2">
              {swimmers.map((swimmer) => (
                <div key={swimmer.id}>
                  <div className="mb-1.5 truncate text-sm font-medium">{swimmer.swimmer_name}</div>
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
