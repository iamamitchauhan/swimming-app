import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DobPickerProps {
  value: string;
  onChange: (iso: string) => void;
  hasError?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function DobPicker({
  value,
  onChange,
  hasError,
  placeholder = "Select date of birth",
  disabled,
}: DobPickerProps) {
  const [open, setOpen] = React.useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start font-normal",
            hasError && "border-destructive",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(new Date(value + "T00:00:00"), "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          captionLayout="dropdown"
          startMonth={new Date(today.getFullYear() - 100, 0)}
          endMonth={today}
          defaultMonth={selectedDate ?? new Date(today.getFullYear() - 10, today.getMonth())}
          disabled={(d) => {
            const day = new Date(d);
            day.setHours(0, 0, 0, 0);
            return day > today;
          }}
          onSelect={(d) => {
            if (!d) return;
            onChange(format(d, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
