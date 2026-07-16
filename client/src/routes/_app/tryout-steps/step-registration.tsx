import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  AlignLeft,
  List,
  Type,
  Eye,
  BookOpen,
  GripVertical,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuestionLibrary } from "@/hooks/use-question-library";
import {
  QuestionCategory,
  SelectedQuestion,
  LibraryQuestion,
} from "@/lib/api/question-library.api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SwimTimeField } from "@/components/registrations/SwimTimeField";
import DefaultFormUI from "./DefaultFormUI";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  selectedQuestions: SelectedQuestion[];
  onChange: (questions: SelectedQuestion[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function questionTypeIcon(type: string) {
  switch (type) {
    case "text":
      return <Type className="h-3.5 w-3.5" />;
    case "textarea":
      return <AlignLeft className="h-3.5 w-3.5" />;
    case "radio":
      return <List className="h-3.5 w-3.5" />;
    case "checkbox":
      return <CheckSquare className="h-3.5 w-3.5" />;
    default:
      return <Type className="h-3.5 w-3.5" />;
  }
}

function questionTypeBadgeColor(type: string): string {
  switch (type) {
    case "text":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "textarea":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "radio":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "checkbox":
      return "bg-green-50 text-green-700 border-green-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function buildKey(categoryId: string, questionIndex: number) {
  return `${categoryId}::${questionIndex}`;
}

// ─── Preview field renderer ───────────────────────────────────────────────────

function PreviewField({ q }: { q: SelectedQuestion }) {
  console.info("q =>", q);

  const isSwimTime = q.meta?.inputType === "swim-time";
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {q.label}
        {q.required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {q.type === "text" && isSwimTime && (
        <SwimTimeField
          unitOptions={(q.meta?.unitOptions as string[]) ?? ["SCY", "SCM", "LCM"]}
          disabled
        />
      )}
      {q.type === "text" && !isSwimTime && (
        <input
          disabled
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground cursor-not-allowed"
          placeholder={q.placeholder || "Type your answer…"}
        />
      )}
      {q.type === "textarea" && (
        <textarea
          disabled
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground cursor-not-allowed resize-none"
          placeholder={q.placeholder || "Type your answer…"}
        />
      )}
      {q.type === "radio" && (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
          {(q.options ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-not-allowed opacity-70">
              <div className="h-4 w-4 rounded-full border-2 border-input bg-background shrink-0" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
          {(!q.options || q.options.length === 0) && (
            <span className="text-xs text-muted-foreground/60 italic">No options defined</span>
          )}
        </div>
      )}
      {q.type === "checkbox" && (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
          {(q.options ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-not-allowed opacity-70">
              <div className="h-4 w-4 rounded-sm border-2 border-input bg-background shrink-0" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
          {(!q.options || q.options.length === 0) && (
            <span className="text-xs text-muted-foreground/60 italic">No options defined</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Library question row ─────────────────────────────────────────────────────

function LibraryQuestionRow({
  question,
  isAdded,
  onAdd,
  onRemove,
}: {
  question: LibraryQuestion;
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors",
        isAdded
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/30",
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border",
              questionTypeBadgeColor(question.type),
            )}
          >
            {questionTypeIcon(question.type)}
            {question.type}
          </span>
          {question.required && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-destructive/8 text-destructive border-destructive/20">
              <Star className="h-2.5 w-2.5" />
              Required
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{question.label}</p>
        {question.placeholder && (
          <p className="text-xs text-muted-foreground/70 italic truncate">
            Placeholder: {question.placeholder}
          </p>
        )}
        {question.options && question.options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.options.map((opt) => (
              <>
                <Badge key={opt} variant="outline" className="bg-muted text-[10px] w-auto">
                  {opt}
                </Badge>
              </>
            ))}
          </div>
        )}
      </div>
      <Button
        type="button"
        size="icon"
        variant={isAdded ? "secondary" : "outline"}
        className={cn(
          "h-7 w-7 shrink-0 mt-0.5",
          isAdded && "text-destructive hover:text-destructive",
        )}
        onClick={isAdded ? onRemove : onAdd}
        title={isAdded ? "Remove from form" : "Add to form"}
      >
        {isAdded ? <Trash2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

// ─── Category accordion ───────────────────────────────────────────────────────

function CategoryGroup({
  category,
  addedKeys,
  onAdd,
  onRemove,
}: {
  category: QuestionCategory;
  addedKeys: Set<string>;
  onAdd: (cat: QuestionCategory, qIndex: number) => void;
  onRemove: (catId: string, qIndex: number) => void;
}) {
  const addedCount = category.questions.filter((_, i) =>
    addedKeys.has(buildKey(category._id, i)),
  ).length;
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{category.category}</span>
          {addedCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {addedCount}/{category.questions.length}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {category.questions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              No questions in this group.
            </p>
          ) : (
            category.questions.map((q, i) => (
              <LibraryQuestionRow
                key={i}
                question={q}
                isAdded={addedKeys.has(buildKey(category._id, i))}
                onAdd={() => onAdd(category, i)}
                onRemove={() => onRemove(category._id, i)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StepRegistration({ selectedQuestions, onChange }: Props) {
  const { data: categories, isLoading, isError } = useQuestionLibrary();

  const dragIndex = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    dragIndex.current = idx;
    setDraggingIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === idx) return;
    setOverIdx(idx);
  }

  function handleDrop(idx: number) {
    if (dragIndex.current === null || dragIndex.current === idx) return;
    const next = [...selectedQuestions];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    dragIndex.current = null;
    setDraggingIdx(null);
    setOverIdx(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDraggingIdx(null);
    setOverIdx(null);
  }

  const addedKeys = useMemo<Set<string>>(() => {
    return new Set(selectedQuestions.map((q) => buildKey(q.categoryId, q.questionIndex)));
  }, [selectedQuestions]);

  function handleAdd(cat: QuestionCategory, qIndex: number) {
    const key = buildKey(cat._id, qIndex);
    if (addedKeys.has(key)) return;
    const q = cat.questions[qIndex];
    const next: SelectedQuestion = {
      categoryId: cat._id,
      category: cat.category,
      questionIndex: qIndex,
      type: q.type,
      label: q.label,
      required: q.required,
      placeholder: q.placeholder,
      options: q.options,
      meta: q.meta,
    };
    onChange([...selectedQuestions, next]);
  }

  function handleRemove(catId: string, qIndex: number) {
    onChange(
      selectedQuestions.filter((q) => !(q.categoryId === catId && q.questionIndex === qIndex)),
    );
  }

  function handleRemoveSelected(idx: number) {
    const next = [...selectedQuestions];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-352px)] overflow-visible lg:overflow-hidden">
      {/* ── Left: Question Library ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-visible lg:overflow-hidden">
        <div className="shrink-0 pb-4">
          <h3 className="text-sm font-semibold text-foreground">Question Library</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click <Plus className="h-3 w-3 inline-block" /> to add a question to the registration
            form.
          </p>
        </div>

        {isLoading && (
          <div className="flex-1 flex items-center gap-2 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading question library…</span>
          </div>
        )}

        {isError && (
          <div className="shrink-0 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Failed to load question library. Please refresh and try again.</span>
          </div>
        )}

        {!isLoading && !isError && categories && (
          <div className="flex-1 overflow-visible lg:overflow-auto min-h-0 space-y-3 pr-1">
            {categories.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <BookOpen className="h-7 w-7 opacity-40" />
                <p className="text-sm">No question categories found.</p>
              </div>
            ) : (
              categories.map((cat) => (
                <CategoryGroup
                  key={cat._id}
                  category={cat}
                  addedKeys={addedKeys}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block w-px bg-border shrink-0" />

      {/* ── Right: Form Preview ────────────────────────────────────────────── */}
      <div className="w-full lg:w-[550px] shrink-0 flex flex-col overflow-visible lg:overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 pb-4">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Form Preview</h3>
          {selectedQuestions.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-auto">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-visible lg:overflow-auto min-h-0 space-y-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Registration Form
            </p>
            <DefaultFormUI />
          </div>

          {selectedQuestions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Eye className="h-7 w-7 opacity-40" />
              <p className="text-sm text-center px-4">
                Add questions from the library to see a preview here.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                Additional information
              </p>
              <div className="space-y-2">
                {selectedQuestions.map((q, idx) => (
                  <div
                    key={buildKey(q.categoryId, q.questionIndex)}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "relative group flex items-start gap-2 rounded-lg border p-3 bg-card transition-all",
                      draggingIdx === idx
                        ? "opacity-40 border-dashed border-primary/40"
                        : overIdx === idx
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-border/80",
                    )}
                  >
                    <div
                      className="shrink-0 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <PreviewField q={q} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelected(idx)}
                      className="shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border mt-4 space-y-2">
                <button
                  disabled
                  className="w-full h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-50 cursor-not-allowed"
                >
                  Submit Registration
                </button>
              </div>
            </div>
          )}

          {selectedQuestions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-1">
              <p className="text-xs font-medium text-foreground">Selected questions</p>
              <div className="space-y-1.5">
                {selectedQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded border text-[9px] font-semibold uppercase",
                        questionTypeBadgeColor(q.type),
                      )}
                    >
                      {questionTypeIcon(q.type)}
                    </span>
                    <span className="truncate flex-1">{q.label}</span>
                    {q.required && <span className="text-destructive shrink-0 text-[10px]">*</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveSelected(idx)}
                      className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
