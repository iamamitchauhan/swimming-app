import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Current local time as a `datetime-local` value ("YYYY-MM-DDTHH:mm"). */
function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many swimmers the action applies to (single or bulk). */
  count: number;
  mode: "in" | "out";
  /** Receives the ISO timestamp on check-in; called with no args on un-check. */
  onConfirm: (checkedInAt?: string) => void;
  isPending?: boolean;
}

/**
 * Confirms a check-in (with an editable time, defaulting to now) or an un-check
 * for one or many roster registrations. Controlled.
 */
export function CheckInDialog({
  open,
  onOpenChange,
  count,
  mode,
  onConfirm,
  isPending,
}: CheckInDialogProps) {
  const isCheckIn = mode === "in";
  const [when, setWhen] = useState(nowLocalInput);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset to "now" each time the dialog opens (adjust state during render rather
  // than in an effect — see https://react.dev/learn/you-might-not-need-an-effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setWhen(nowLocalInput());
  }

  const invalid = isCheckIn && (!when || isNaN(new Date(when).getTime()));
  const label = count === 1 ? "swimmer" : "swimmers";

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCheckIn ? "Check in" : "Un-check"} {count} {label}?
          </DialogTitle>
          <DialogDescription>
            {isCheckIn
              ? "Records the arrival time and who checked them in."
              : "Clears the check-in time and the recorded staff member."}
          </DialogDescription>
        </DialogHeader>

        {isCheckIn && (
          <div className="space-y-2">
            <Label htmlFor="checkin-time">Check-in time</Label>
            <Input
              id="checkin-time"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              disabled={isPending}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={isCheckIn ? "default" : "destructive"}
            onClick={() => onConfirm(isCheckIn ? new Date(when).toISOString() : undefined)}
            disabled={isPending || invalid}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isCheckIn ? "Check in" : "Un-check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
