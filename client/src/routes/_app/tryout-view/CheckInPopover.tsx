import { useId, useState } from "react";
import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimePicker } from "@/components/time-picker/TimePicker";
import { cn } from "@/lib/utils";

/** Split an ISO timestamp into local `YYYY-MM-DD` and `HH:mm` parts for the inputs. */
function splitLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** "Oct 1, 2026" from an ISO timestamp. "" when invalid. */
function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export interface CheckInPopoverProps {
  /** ISO timestamp of the current check-in; seeds the date/time inputs. */
  checkedInAt: string;
  /** Chip label, e.g. "9:05 AM". */
  timeLabel: string;
  /** Full timestamp shown inside the popover, e.g. "Sep 26, 2026 · 9:05 AM". */
  fullLabel: string;
  /** Staff member who recorded the check-in, when known. */
  checkedInByName?: string | null;
  /** Accessible label for the trigger (usually includes the swimmer name). */
  ariaLabel?: string;
  /** Saves an edited timestamp. Resolves `true` on success (closes the popover). */
  onSave: (checkedInAt: string) => Promise<boolean>;
  /** Clears the check-in. Resolves `true` on success (closes the popover). */
  onUndo: () => Promise<boolean>;
  /** Hides the "Undo check-in" action — used once the swimmer has a score. */
  canUndo?: boolean;
  isPending?: boolean;
  /** Trigger style: "default" (roster table) or "card" (compact header label). */
  variant?: "default" | "card";
}

/**
 * Checked-in chip for the roster: shows the arrival time and opens a popover to
 * edit the date/time or undo the check-in.
 */
export function CheckInPopover({
  checkedInAt,
  timeLabel,
  fullLabel,
  checkedInByName,
  ariaLabel = "Edit check-in",
  onSave,
  onUndo,
  canUndo = true,
  isPending,
  variant = "default",
}: CheckInPopoverProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(() => splitLocalDateTime(checkedInAt));
  const [wasOpen, setWasOpen] = useState(open);

  // Re-seed the inputs from the stored timestamp each time the popover opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setWhen(splitLocalDateTime(checkedInAt));
  }

  const parsed = when.date && when.time ? new Date(`${when.date}T${when.time}`) : null;
  const invalid = !parsed || isNaN(parsed.getTime());

  async function handleSave() {
    if (invalid || !parsed) return;
    if (await onSave(parsed.toISOString())) setOpen(false);
  }

  async function handleUndo() {
    if (await onUndo()) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <PopoverTrigger asChild>
        {variant === "card" ? (
          <button
            type="button"
            aria-label={ariaLabel}
            className="cursor-pointer text-sm font-semibold tabular-nums text-green-600 transition-colors hover:underline"
          >
            In {timeLabel}
          </button>
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            className="group flex cursor-pointer items-start gap-1.5 text-left"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            {/* Time + date share a column so the date aligns under the time text. */}
            <span className="flex flex-col items-start gap-0.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-sm font-medium tabular-nums text-green-600">{timeLabel}</span>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
              </span>
              <span className="text-xs text-muted-foreground">{formatDateLabel(checkedInAt)}</span>
            </span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 space-y-3">
        <div>
          <p className="text-sm font-semibold">Edit check-in</p>
          {checkedInByName && <p className="text-xs text-muted-foreground">by {checkedInByName}</p>}
          <p className="text-xs text-muted-foreground">At {fullLabel}</p>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={`${id}-date`} className="text-xs">
              Date
            </Label>
            <DatePicker
              id={`${id}-date`}
              value={when.date}
              onChange={(date) => setWhen((prev) => ({ ...prev, date }))}
              disabled={isPending}
              placeholder="Pick a date"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-time`} className="text-xs">
              Time
            </Label>
            <TimePicker
              id={`${id}-time`}
              value={when.time}
              onChange={(time) => setWhen((prev) => ({ ...prev, time }))}
              disabled={isPending}
              placeholder="Pick a time"
            />
          </div>
        </div>

        <div className={cn("flex items-center pt-1", canUndo ? "justify-between" : "justify-end")}>
          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={isPending}
              className="cursor-pointer text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Undo check-in
            </button>
          )}
          <Button type="button" size="sm" onClick={handleSave} disabled={isPending || invalid}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
