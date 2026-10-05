import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScoringQuestion } from "@/lib/api/scoring-questions.api";
import { QuestionTypeIndicator } from "./QuestionTypeIndicator";

interface ManageBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: ScoringQuestion[];
  onDelete: (ids: string[]) => void;
  isDeleting: boolean;
}

/** Secondary affordance: multi-select and delete questions from the club-wide bank. */
export function ManageBankDialog({
  open,
  onOpenChange,
  questions,
  onDelete,
  isDeleting,
}: ManageBankDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedIds(new Set());
    if (!isDeleting) onOpenChange(next);
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Ignore ids that no longer exist (e.g. after a delete refetch).
  const selected = questions
    .filter((question) => selectedIds.has(question._id))
    .map((question) => question._id);
  const allSelected = questions.length > 0 && selected.length === questions.length;
  const someSelected = selected.length > 0 && !allSelected;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(questions.map((q) => q._id)));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage question bank</DialogTitle>
          <DialogDescription>
            Delete questions from the club bank. This removes them from every tryout that uses them.
          </DialogDescription>
        </DialogHeader>

        {questions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">The bank is empty.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all questions"
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-28 whitespace-nowrap">Type</TableHead>
                    <TableHead className="w-52 whitespace-nowrap">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => {
                    const isSelected = selectedIds.has(question._id);
                    return (
                      <TableRow key={question._id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(question._id)}
                            aria-label={`Select ${question.label}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{question.label}</TableCell>
                        <TableCell>
                          <QuestionTypeIndicator type={question.type} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {question.category ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.length > 0
              ? `${selected.length} selected`
              : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(selected)}
              disabled={isDeleting || selected.length === 0}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete{selected.length > 0 ? ` ${selected.length}` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
