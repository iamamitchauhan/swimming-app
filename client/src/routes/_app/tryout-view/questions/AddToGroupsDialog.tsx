import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Segment } from "@/lib/api/tryouts.api";

interface AddToGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionCount: number;
  segments: Segment[];
  countsBySegment: Record<string, number>;
  onSave: (segmentIds: string[]) => void;
  isSaving: boolean;
}

/** Assigns the selected bank questions to one or more of the tryout's age groups. */
export function AddToGroupsDialog({
  open,
  onOpenChange,
  questionCount,
  segments,
  countsBySegment,
  onSave,
  isSaving,
}: AddToGroupsDialogProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    if (!next) setChecked(new Set());
    if (!isSaving) onOpenChange(next);
  }

  function toggle(segmentId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(segmentId)) next.delete(segmentId);
      else next.add(segmentId);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {questionCount} question{questionCount === 1 ? "" : "s"} to…
          </DialogTitle>
          <DialogDescription>Choose one or more segments.</DialogDescription>
        </DialogHeader>

        {segments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            This tryout has no age groups yet. Add segments in the wizard first.
          </p>
        ) : (
          <ul className="space-y-1 py-2">
            {segments.map((segment) => {
              const key = segment.id ?? segment.name;
              const count = countsBySegment[key] ?? 0;
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50">
                    <span className="flex items-center gap-3">
                      <Checkbox checked={checked.has(key)} onCheckedChange={() => toggle(key)} />
                      <span className="font-medium">{segment.name}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {count} question{count === 1 ? "" : "s"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave([...checked])} disabled={isSaving || checked.size === 0}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
