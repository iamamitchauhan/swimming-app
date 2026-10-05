import { useMemo, useState } from "react";
import { Search, Upload, X } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";
import type { Segment } from "@/lib/api/tryouts.api";
import { QuestionTypeIndicator } from "./QuestionTypeIndicator";

interface QuestionsTableProps {
  questions: ScoringQuestion[];
  segments: Segment[];
  assignment: Map<string, Set<string>>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onRemoveQuestion: (id: string) => void;
  onRemoveSegment: (questionId: string, segmentId: string) => void;
  onAddToGroups: () => void;
  onRemoveSelected: () => void;
  onUploadMore: () => void;
  onManageBank: () => void;
  isSaving: boolean;
}

/** The populated Segments questions tab: bank questions with their age-group assignments. */
export function QuestionsTable({
  questions,
  segments,
  assignment,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onRemoveQuestion,
  onRemoveSegment,
  onAddToGroups,
  onRemoveSelected,
  onUploadMore,
  onManageBank,
  isSaving,
}: QuestionsTableProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const question of questions) if (question.category) set.add(question.category);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const visibleQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((question) => {
      if (category !== "all" && (question.category ?? "") !== category) return false;
      if (!term) return true;
      return (
        question.label.toLowerCase().includes(term) ||
        (question.category ?? "").toLowerCase().includes(term)
      );
    });
  }, [questions, search, category]);

  const isFiltered = search.trim().length > 0 || category !== "all";
  const allSelected =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => selectedIds.has(q._id));
  const someSelected = visibleQuestions.some((q) => selectedIds.has(q._id)) && !allSelected;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Uploaded questions</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {isFiltered
                ? `${visibleQuestions.length} of ${questions.length} shown`
                : `${questions.length} ready`}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUploadMore} disabled={isSaving}>
            <Upload className="h-4 w-4" /> Upload more
          </Button>
          <Button variant="ghost" size="sm" onClick={onManageBank}>
            Manage bank
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-primary/10 px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" onClick={onAddToGroups} disabled={isSaving}>
              Add to segments
            </Button>
          </div>
          <Button variant="destructive" size="sm" onClick={onRemoveSelected} disabled={isSaving}>
            Remove {selectedIds.size}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search questions…"
            className="pl-9"
            aria-label="Search questions"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => onToggleAll(visibleQuestions.map((q) => q._id))}
                  aria-label="Select all questions"
                />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="w-24 whitespace-nowrap">Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Added to segments</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleQuestions.map((question) => {
              const segmentIds = assignment.get(question._id) ?? new Set<string>();
              const assignedSegments = segments.filter((segment) =>
                segmentIds.has(segment.id ?? segment.name),
              );
              const isSelected = selectedIds.has(question._id);

              return (
                <TableRow
                  key={question._id}
                  data-state={isSelected ? "selected" : undefined}
                  className="hover:bg-gray-50 transition"
                >
                  <TableCell className="w-10 px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(question._id)}
                      aria-label={`Select ${question.label}`}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 font-medium">{question.label}</TableCell>
                  <TableCell className="px-4 py-3">
                    <QuestionTypeIndicator type={question.type} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {question.category ?? "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {assignedSegments.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignedSegments.map((segment) => {
                          const key = segment.id ?? segment.name;
                          return (
                            <span
                              key={key}
                              className={cn(
                                badgeVariants({ variant: "outline" }),
                                "gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-normal text-primary",
                              )}
                            >
                              {segment.name}
                              <button
                                type="button"
                                onClick={() => onRemoveSegment(question._id, key)}
                                disabled={isSaving}
                                title={`Remove from ${segment.name}`}
                                aria-label={`Remove ${question.label} from ${segment.name}`}
                                className="-mr-1.5 inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-primary/60 transition-colors hover:bg-destructive/15 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {segmentIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemoveQuestion(question._id)}
                        disabled={isSaving}
                        aria-label={`Remove ${question.label} from this tryout`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleQuestions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 px-4 text-center text-muted-foreground">
                  No questions match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
