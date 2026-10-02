import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  /** Date as "YYYY-MM-DD". */
  value?: string;
  /** Called with "YYYY-MM-DD" when a day is picked. */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Accessible label for the trigger (when there is no associated <Label>). */
  ariaLabel?: string;
  "aria-invalid"?: boolean;
  /** Earliest selectable day (inclusive). */
  minDate?: Date;
  /** Latest selectable day (inclusive). */
  maxDate?: Date;
}

/**
 * Popover date picker. Value in/out is a local "YYYY-MM-DD" string; the trigger
 * shows the formatted date and opens a calendar.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  id,
  disabled,
  ariaLabel,
  minDate,
  maxDate,
  ...rest
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? new Date(`${value}T00:00:00`) : undefined;
  const selected = parsed && !isNaN(parsed.getTime()) ? parsed : undefined;

  const startMonth = minDate ?? new Date(new Date().getFullYear() - 2, 0);
  const endMonth = maxDate ?? new Date(new Date().getFullYear() + 2, 11);

  function isDisabled(day: Date) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (d < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(0, 0, 0, 0);
      if (d > max) return true;
    }
    return false;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={rest["aria-invalid"]}
          className={cn(
            "w-full justify-start font-normal",
            !selected && "text-muted-foreground",
            rest["aria-invalid"] && "border-destructive focus-visible:ring-destructive",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          defaultMonth={selected ?? new Date()}
          disabled={isDisabled}
          onSelect={(day) => {
            if (!day) return;
            onChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
