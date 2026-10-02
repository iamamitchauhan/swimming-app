import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Meridiem, TimePickerProps } from "./types";
import { hours24ToParts, pad2, parseTimeString, partsToHours24 } from "./utils";

type TimeParts = { hour12: number; minute: number; meridiem: Meridiem };

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MERIDIEMS: Meridiem[] = ["AM", "PM"];

// Wheel geometry: a fixed-height scroll column whose centre row is the "active"
// slot. Spacers above/below let the first and last items reach the centre.
const ITEM_HEIGHT = 36; // px — matches h-9
const VISIBLE_ROWS = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const SPACER = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

const DEFAULT_TIME: TimeParts = { hour12: 12, minute: 0, meridiem: "AM" };

/**
 * Parse 24-hour "HH:mm"/"HH:mm:ss" or 12-hour "h:mm AM/PM" into 12-hour parts.
 * Delegates to the shared `parseTimeString` (12-hour is matched first, so a
 * trailing meridiem is never silently dropped).
 */
function parseTime(value?: string): TimeParts | null {
  const parsed = parseTimeString(value);
  if (!parsed) return null;
  const { hour12, period } = hours24ToParts(parsed.hours24);
  return { hour12, minute: parsed.minute, meridiem: period };
}

function to24Hour(hour12: number, minute: number, meridiem: Meridiem): string {
  return `${pad2(partsToHours24(hour12, meridiem))}:${pad2(minute)}`;
}

function formatTimeLabel(value?: string): string {
  const parsed = parseTime(value);
  if (!parsed) return "";
  return `${parsed.hour12}:${pad2(parsed.minute)} ${parsed.meridiem}`;
}

function TimeColumn<T extends string | number>({
  label,
  items,
  selected,
  format,
  onSelect,
  className,
}: {
  label: string;
  items: T[];
  selected: T | undefined;
  format: (item: T) => string;
  onSelect: (item: T) => void;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);

  // Scroll-spy: the row nearest the centre line is the active value. No
  // scroll-snap — `scroll-snap-type: y mandatory` fights the mouse wheel and
  // makes the column look "stuck" for one notch.
  function handleScroll() {
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = ref.current;
      if (!el) return;
      const index = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
      const item = items[index];
      if (item !== undefined && item !== selected) onSelect(item);
    });
  }

  function center(index: number) {
    ref.current?.scrollTo({ top: index * ITEM_HEIGHT });
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      onScroll={handleScroll}
      className={cn(
        "relative overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={{ height: CONTAINER_HEIGHT }}
    >
      <div style={{ height: SPACER }} aria-hidden="true" />
      {items.map((item, index) => {
        const isSelected = item === selected;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={isSelected}
            data-selected={isSelected}
            onClick={() => {
              onSelect(item);
              center(index);
            }}
            style={{ height: ITEM_HEIGHT }}
            className={cn(
              "flex w-full shrink-0 cursor-pointer items-center justify-center text-sm tabular-nums transition-colors",
              isSelected
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {format(item)}
          </button>
        );
      })}
      <div style={{ height: SPACER }} aria-hidden="true" />
    </div>
  );
}

/**
 * Wheel-style time picker. The trigger shows the current time and opens a
 * popover with three scrollable columns (Hour / Minute / AM-PM) and a spanning
 * highlight band. Edits are a draft: Save (or clicking outside) commits via
 * `onChange`, Cancel / Escape discards.
 *
 * Value in/out is 24-hour "HH:mm"; the UI displays 12-hour with AM/PM.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  className,
  id,
  disabled,
  minuteStep = 1,
  ariaLabel,
  ...rest
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  // Set when closing without committing (Cancel / Escape) so the dismiss handler
  // knows to discard the draft instead of saving it.
  const skipCommitRef = React.useRef(false);
  const parsed = parseTime(value);

  const [draft, setDraft] = React.useState<TimeParts>(() => parsed ?? DEFAULT_TIME);
  const [wasOpen, setWasOpen] = React.useState(open);

  const minutes = React.useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  // Re-seed the draft from the committed value each time the popover opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(parseTime(value) ?? DEFAULT_TIME);
  }

  // Scroll each column's active row into the centre when the popover opens.
  React.useEffect(() => {
    if (!open) return;
    contentRef.current?.querySelectorAll<HTMLElement>("[data-selected='true']").forEach((el) => {
      const column = el.parentElement;
      if (column) {
        column.scrollTop = el.offsetTop - CONTAINER_HEIGHT / 2 + ITEM_HEIGHT / 2;
      }
    });
  }, [open]);

  const commit = (next: Partial<TimeParts>) => setDraft((prev) => ({ ...prev, ...next }));

  function commitDraft() {
    onChange(to24Hour(draft.hour12, draft.minute, draft.meridiem));
  }

  function handleSave() {
    commitDraft();
    setOpen(false);
  }

  function handleCancel() {
    skipCommitRef.current = true;
    setOpen(false);
  }

  // Closing any way other than Cancel/Escape — INCLUDING clicking outside —
  // commits the draft (behaves like Save).
  function handleOpenChange(next: boolean) {
    if (next) {
      skipCommitRef.current = false;
      setOpen(true);
      return;
    }
    if (!skipCommitRef.current) commitDraft();
    skipCommitRef.current = false;
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            !value && "text-muted-foreground",
            rest["aria-invalid"] && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          aria-label={ariaLabel}
          aria-invalid={rest["aria-invalid"]}
        >
          <Clock className="mr-2 size-4" />
          {parsed ? formatTimeLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        align="start"
        className="w-auto p-0"
        onEscapeKeyDown={() => {
          skipCommitRef.current = true;
        }}
      >
        <p className="px-4 pt-3 text-center text-sm font-semibold">Select time</p>
        <div className="relative flex items-center justify-center gap-1 px-3 py-2">
          {/* Spanning highlight band behind the active row. */}
          <div
            className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-background shadow-sm"
            style={{ height: ITEM_HEIGHT }}
            aria-hidden="true"
          />
          <TimeColumn
            label="Hour"
            items={HOURS}
            selected={draft.hour12}
            format={(h) => pad2(h)}
            onSelect={(hour12) => commit({ hour12 })}
            className="w-12"
          />
          <span className="z-10 text-sm text-muted-foreground" aria-hidden="true">
            :
          </span>
          <TimeColumn
            label="Minute"
            items={minutes}
            selected={draft.minute}
            format={(m) => pad2(m)}
            onSelect={(minute) => commit({ minute })}
            className="w-12"
          />
          <TimeColumn
            label="AM or PM"
            items={MERIDIEMS}
            selected={draft.meridiem}
            format={String}
            onSelect={(meridiem) => commit({ meridiem })}
            className="w-14"
          />
        </div>
        <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
