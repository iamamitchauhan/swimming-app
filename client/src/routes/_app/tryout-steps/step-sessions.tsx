import * as React from "react";
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
  Control,
  UseFieldArrayReturn,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, Users, CalendarIcon } from "lucide-react";
import { TimePicker } from "@/components/time-picker/TimePicker";
import { TryoutFormValues, SLOT_DURATIONS, calcSlots, buildLabel } from "./shared";
import { FieldGroup } from "./field-group";

interface DatePickerFieldProps {
  value: string;
  onChange: (iso: string) => void;
  hasError?: boolean;
  startTime?: string;
  endTime?: string;
  onLabelChange: (iso: string) => void;
  minDate?: Date;
}

function DatePickerField({
  value,
  onChange,
  hasError,
  startTime,
  endTime,
  onLabelChange,
  minDate,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lowerBound = minDate && minDate > today ? minDate : today;
  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={[
            "w-full justify-start font-normal",
            hasError ? "border-destructive" : "",
            !value ? "text-muted-foreground" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value ? format(new Date(value + "T00:00:00"), "MMM d, yyyy") : "Select date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          captionLayout="dropdown"
          startMonth={new Date(today.getFullYear(), today.getMonth())}
          endMonth={new Date(today.getFullYear() + 10, 11)}
          defaultMonth={selectedDate ?? lowerBound}
          disabled={(d) => {
            const day = new Date(d);
            day.setHours(0, 0, 0, 0);
            return day < lowerBound;
          }}
          onSelect={(d) => {
            if (!d) return;
            const iso = format(d, "yyyy-MM-dd");
            onChange(iso);
            onLabelChange(buildLabel(iso, startTime ?? "", endTime ?? ""));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  control: Control<TryoutFormValues>;
  watch: UseFormWatch<TryoutFormValues>;
  setValue: UseFormSetValue<TryoutFormValues>;
  errors: FieldErrors<TryoutFormValues>;
  sessionsField: UseFieldArrayReturn<TryoutFormValues, "sessions">;
}

export function StepSessions({ register, control, watch, setValue, errors, sessionsField }: Props) {
  const watchedSessions = watch("sessions");
  const slotDuration = watch("slotDuration");
  const lanesAvailable = watch("lanesAvailable");
  const swimmersPerLane = watch("swimmersPerLane");
  const swimmersPerSlot = lanesAvailable * swimmersPerLane;

  const { totalSlots, totalCapacity } = (watchedSessions ?? []).reduce(
    (acc, s) => {
      const { slots } = calcSlots(s.startTime, s.endTime, slotDuration);
      return {
        totalSlots: acc.totalSlots + slots,
        totalCapacity: acc.totalCapacity + slots * swimmersPerSlot,
      };
    },
    { totalSlots: 0, totalCapacity: 0 },
  );

  return (
    <div className="space-y-8">
      {/* Slot settings */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Slot Settings</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldGroup label="Minutes per slot">
            <Controller
              control={control}
              name="slotDuration"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_DURATIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldGroup>

          <FieldGroup label="Lanes available">
            <Controller
              control={control}
              name="lanesAvailable"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? "lane" : "lanes"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldGroup>

          <FieldGroup label="Swimmers per lane">
            <Controller
              control={control}
              name="swimmersPerLane"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? "swimmer" : "swimmers"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldGroup>
        </div>

        {totalCapacity > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Generates {totalSlots} slot{totalSlots !== 1 ? "s" : ""} • {lanesAvailable} lanes ×{" "}
              {swimmersPerLane}/lane = {swimmersPerSlot} swimmers per slot • total capacity{" "}
              {totalCapacity}
            </span>
          </div>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              sessionsField.append({ date: "", startTime: "", endTime: "", label: "" })
            }
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add session
          </Button>
        </div>
        {sessionsField.fields.map((field, idx) => {
          const sv = watchedSessions?.[idx];
          const sessionErrors = errors.sessions?.[idx];
          const { slots } = sv ? calcSlots(sv.startTime, sv.endTime, slotDuration) : { slots: 0 };
          const capacity = slots * swimmersPerSlot;
          const displayLabel = sv
            ? buildLabel(sv.date ?? "", sv.startTime ?? "", sv.endTime ?? "")
            : "";

          return (
            <div key={field.id} className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">Session {idx + 1}</span>
                  {displayLabel && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      · {displayLabel}
                    </span>
                  )}
                </div>
                {sessionsField.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => sessionsField.remove(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Date picker */}
                <FieldGroup label="Date" required error={sessionErrors?.date?.message}>
                  <Controller
                    control={control}
                    name={`sessions.${idx}.date`}
                    render={({ field }) => {
                      const prevDate = idx > 0 ? watchedSessions?.[idx - 1]?.date : undefined;
                      const minDate = prevDate ? new Date(prevDate + "T00:00:00") : undefined;
                      return (
                        <DatePickerField
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          hasError={!!sessionErrors?.date}
                          startTime={sv?.startTime}
                          endTime={sv?.endTime}
                          onLabelChange={(label) => setValue(`sessions.${idx}.label`, label)}
                          minDate={minDate}
                        />
                      );
                    }}
                  />
                </FieldGroup>

                {/* Start Time */}
                <FieldGroup label="Start Time" required error={sessionErrors?.startTime?.message}>
                  <Controller
                    control={control}
                    name={`sessions.${idx}.startTime`}
                    render={({ field }) => (
                      <TimePicker
                        value={field.value ?? ""}
                        placeholder="Select time"
                        onChange={(v) => {
                          field.onChange(v.formatted);
                          setValue(
                            `sessions.${idx}.label`,
                            buildLabel(sv?.date ?? "", v.formatted, sv?.endTime ?? ""),
                          );
                        }}
                        className={
                          sessionErrors?.startTime
                            ? "[&_button]:border-destructive [&_button]:focus:ring-destructive"
                            : ""
                        }
                      />
                    )}
                  />
                </FieldGroup>

                {/* End Time */}
                <FieldGroup label="End Time" required error={sessionErrors?.endTime?.message}>
                  <Controller
                    control={control}
                    name={`sessions.${idx}.endTime`}
                    render={({ field }) => (
                      <TimePicker
                        value={field.value ?? ""}
                        placeholder="Select time"
                        onChange={(v) => {
                          field.onChange(v.formatted);
                          setValue(
                            `sessions.${idx}.label`,
                            buildLabel(sv?.date ?? "", sv?.startTime ?? "", v.formatted),
                          );
                        }}
                        className={
                          sessionErrors?.endTime
                            ? "[&_button]:border-destructive [&_button]:focus:ring-destructive"
                            : ""
                        }
                      />
                    )}
                  />
                </FieldGroup>
              </div>

              {slots > 0 && (
                <div className="flex items-center gap-5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {slots} slot{slots !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {capacity} swimmer{capacity !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
