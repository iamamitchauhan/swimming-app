import * as React from "react";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Meridiem, TimePickerProps, TimeValue } from "./types";
import {
  buildTimeValue,
  generateHourOptions,
  generateMinuteOptions,
  hours24ToParts,
  pad2,
  parseTimeString,
  partsToHours24,
  snapMinute,
} from "./utils";

/**
 * Accessible, reusable Time Picker — single-dropdown UI.
 *
 * One trigger button shows the current formatted time and opens a popover
 * containing three synchronized columns (Hour / Minute / AM-PM). Each column
 * is a `role="listbox"` with `aria-activedescendant` so selection is fully
 * keyboard accessible (Arrow keys, Home/End, Enter to confirm, Esc to close).
 *
 * Design decisions:
 * - Single source of truth: internal state is { hours24, minute } so meridiem
 *   toggles never produce ambiguous state.
 * - `onChange` only fires when all parts are selected, so consumers never
 *   receive a partial / invalid TimeValue.
 * - Memoized option lists keep column re-renders cheap.
 * - The trigger renders the formatted time (or placeholder) and is the only
 *   focusable element on the page — column rows are reached via keyboard
 *   inside the open popover, matching native `<select>`-like ergonomics.
 */
const TimePickerImpl = React.forwardRef<HTMLDivElement, TimePickerProps>(
  function TimePicker(props, ref) {
    const {
      value,
      defaultValue,
      onChange,
      disabled = false,
      readOnly = false,
      required = false,
      label,
      placeholder = "Select time",
      error,
      helperText,
      minuteStep = 1,
      showMeridiem = true,
      className,
      id,
      name,
      autoFocus = false,
      onFocus,
      onBlur,
    } = props;

    const reactId = React.useId();
    const rootId = id ?? `time-picker-${reactId}`;
    const triggerId = `${rootId}-trigger`;
    const helperId = `${rootId}-helper`;
    const errorId = `${rootId}-error`;

    const isControlled = value !== undefined;

    const initialParts = React.useMemo(() => {
      const parsed = parseTimeString(isControlled ? value : defaultValue);
      if (!parsed)
        return { hours24: null as number | null, minute: null as number | null };
      return {
        hours24: parsed.hours24,
        minute: snapMinute(parsed.minute, minuteStep),
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [internal, setInternal] = React.useState<{
      hours24: number | null;
      minute: number | null;
    }>(initialParts);

    React.useEffect(() => {
      if (!isControlled) return;
      const parsed = parseTimeString(value);
      if (!parsed) {
        setInternal({ hours24: null, minute: null });
        return;
      }
      setInternal({
        hours24: parsed.hours24,
        minute: snapMinute(parsed.minute, minuteStep),
      });
    }, [value, isControlled, minuteStep]);

    React.useEffect(() => {
      if (isControlled) return;
      setInternal((prev) =>
        prev.minute == null
          ? prev
          : { ...prev, minute: snapMinute(prev.minute, minuteStep) },
      );
    }, [minuteStep, isControlled]);

    const { hours24, minute } = internal;
    const parts = hours24 != null ? hours24ToParts(hours24) : null;
    const hour12 = parts?.hour12 ?? null;
    const period: Meridiem | null = parts?.period ?? null;

    const hourOptions = React.useMemo(
      () => generateHourOptions(showMeridiem),
      [showMeridiem],
    );
    const minuteOptions = React.useMemo(
      () => generateMinuteOptions(minuteStep),
      [minuteStep],
    );

    const emit = React.useCallback(
      (h24: number | null, m: number | null) => {
        if (h24 == null || m == null) return;
        const tv: TimeValue = buildTimeValue(h24, m, showMeridiem);
        onChange?.(tv);
      },
      [onChange, showMeridiem],
    );

    const commit = React.useCallback(
      (next: { hours24: number | null; minute: number | null }) => {
        if (!isControlled) setInternal(next);
        emit(next.hours24, next.minute);
      },
      [isControlled, emit],
    );

    const handleHourPick = (h: number) => {
      const nextH24 = showMeridiem ? partsToHours24(h, period ?? "AM") : h;
      commit({ hours24: nextH24, minute: minute ?? 0 });
    };
    const handleMinutePick = (m: number) => {
      const baseH24 =
        hours24 ?? (showMeridiem ? partsToHours24(12, "AM") : 0);
      commit({ hours24: baseH24, minute: m });
    };
    const handleMeridiemPick = (p: Meridiem) => {
      const baseHour12 = hour12 ?? 12;
      const nextH24 = partsToHours24(baseHour12, p);
      commit({ hours24: nextH24, minute: minute ?? 0 });
    };

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);
    React.useEffect(() => {
      if (autoFocus) triggerRef.current?.focus();
    }, [autoFocus]);

    const describedBy =
      [error ? errorId : null, helperText ? helperId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const formatted =
      hours24 != null && minute != null
        ? buildTimeValue(hours24, minute, showMeridiem).formatted
        : "";

    const isInteractive = !disabled && !readOnly;

    const [open, setOpen] = React.useState(false);
    const handleOpenChange = (next: boolean) => {
      if (!isInteractive) return;
      setOpen(next);
      if (next) onFocus?.();
      else onBlur?.();
    };

    return (
      <div
        ref={ref}
        id={rootId}
        className={cn("flex flex-col gap-1.5", className)}
      >
        {label ? (
          <label
            id={`${rootId}-label`}
            htmlFor={triggerId}
            className={cn(
              "text-sm font-medium leading-none text-foreground",
              disabled && "opacity-60",
            )}
          >
            {label}
            {required ? (
              <span aria-hidden="true" className="ml-0.5 text-destructive">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              id={triggerId}
              type="button"
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-labelledby={label ? `${rootId}-label` : undefined}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              aria-required={required || undefined}
              disabled={!isInteractive}
              className={cn(
                "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-destructive focus:ring-destructive",
                !formatted && "text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <Clock className="h-4 w-4 opacity-60" aria-hidden="true" />
                <span className="tabular-nums">{formatted || placeholder}</span>
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-auto p-0"
            onOpenAutoFocus={(e) => {
              // keep focus on trigger; columns handle keyboard internally
              e.preventDefault();
            }}
          >
            <div
              role="group"
              aria-label="Select time"
              className="flex divide-x divide-border"
            >
              <Column
                ariaLabel="Hour"
                options={hourOptions}
                selected={
                  showMeridiem ? hour12 ?? null : hours24 ?? null
                }
                onPick={handleHourPick}
                format={pad2}
              />
              <Column
                ariaLabel="Minute"
                options={minuteOptions}
                selected={minute ?? null}
                onPick={handleMinutePick}
                format={pad2}
              />
              {showMeridiem ? (
                <Column
                  ariaLabel="AM or PM"
                  options={["AM", "PM"] as const}
                  selected={period}
                  onPick={(p) => handleMeridiemPick(p as Meridiem)}
                  format={(v) => String(v)}
                />
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        {name ? (
          <input
            type="hidden"
            name={name}
            value={formatted}
            required={required}
          />
        ) : null}

        {error ? (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

type ColumnValue = string | number;

interface ColumnProps<T extends ColumnValue> {
  ariaLabel: string;
  options: readonly T[];
  selected: T | null;
  onPick: (value: T) => void;
  format: (value: T) => string;
}

function Column<T extends ColumnValue>({
  ariaLabel,
  options,
  selected,
  onPick,
  format,
}: ColumnProps<T>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const selectedRef = React.useRef<HTMLButtonElement | null>(null);

  // Scroll selected row into view whenever it changes / popover opens.
  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <ScrollArea className="h-56">
      <div
        ref={listRef}
        role="listbox"
        aria-label={ariaLabel}
        className="flex w-16 flex-col p-1"
      >
        {options.map((opt) => {
          const isSelected = opt === selected;
          return (
            <button
              key={String(opt)}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onPick(opt)}
              className={cn(
                "flex h-8 items-center justify-center rounded-sm text-sm tabular-nums outline-none transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {format(opt)}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export const TimePicker = React.memo(TimePickerImpl);
export type { TimePickerProps, TimeValue, Meridiem } from "./types";
