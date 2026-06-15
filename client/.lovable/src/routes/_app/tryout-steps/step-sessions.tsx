import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
  Control,
  UseFieldArrayReturn,
} from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, Users } from "lucide-react";
import { TryoutFormValues, SLOT_DURATIONS, calcSlots, buildLabel } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  control: Control<TryoutFormValues>;
  watch: UseFormWatch<TryoutFormValues>;
  setValue: UseFormSetValue<TryoutFormValues>;
  errors: FieldErrors<TryoutFormValues>;
  sessionsField: UseFieldArrayReturn<TryoutFormValues, "sessions">;
}

export function StepSessions({
  register,
  control,
  watch,
  setValue,
  errors,
  sessionsField,
}: Props) {
  const watchedSessions = watch("sessions");
  const slotDuration = watch("slotDuration");
  const swimmersPerSlot = watch("swimmersPerSlot");

  const totalCapacity = (watchedSessions ?? []).reduce((acc, s) => {
    const { slots } = calcSlots(s.startTime, s.endTime, slotDuration);
    return acc + slots * swimmersPerSlot;
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-foreground">Time Windows</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define one or more sessions. Slots are calculated automatically.
        </p>
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        {sessionsField.fields.map((field, idx) => {
          const sv = watchedSessions?.[idx];
          const sessionErrors = errors.sessions?.[idx];
          const { slots } = sv
            ? calcSlots(sv.startTime, sv.endTime, slotDuration)
            : { slots: 0 };
          const capacity = slots * swimmersPerSlot;

          return (
            <div key={field.id} className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Session {idx + 1}
                  </span>
                  {sv?.label && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      · {sv.label}
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
                <FieldGroup label="Date" required error={sessionErrors?.date?.message}>
                  <Input
                    type="date"
                    {...register(`sessions.${idx}.date`, {
                      onChange: (e) =>
                        setValue(
                          `sessions.${idx}.label`,
                          buildLabel(e.target.value, sv?.startTime ?? "", sv?.endTime ?? ""),
                        ),
                    })}
                    className={sessionErrors?.date ? "border-destructive" : ""}
                  />
                </FieldGroup>

                <FieldGroup label="Start Time" required error={sessionErrors?.startTime?.message}>
                  <Input
                    type="time"
                    {...register(`sessions.${idx}.startTime`, {
                      onChange: (e) =>
                        setValue(
                          `sessions.${idx}.label`,
                          buildLabel(sv?.date ?? "", e.target.value, sv?.endTime ?? ""),
                        ),
                    })}
                    className={sessionErrors?.startTime ? "border-destructive" : ""}
                  />
                </FieldGroup>

                <FieldGroup label="End Time" required error={sessionErrors?.endTime?.message}>
                  <Input
                    type="time"
                    {...register(`sessions.${idx}.endTime`, {
                      onChange: (e) =>
                        setValue(
                          `sessions.${idx}.label`,
                          buildLabel(sv?.date ?? "", sv?.startTime ?? "", e.target.value),
                        ),
                    })}
                    className={sessionErrors?.endTime ? "border-destructive" : ""}
                  />
                </FieldGroup>
              </div>

              {sv?.startTime && sv?.endTime && sv.endTime > sv.startTime && (
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            sessionsField.append({ date: "", startTime: "", endTime: "", label: "" })
          }
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add session
        </Button>
      </div>

      {/* Slot settings */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Slot Settings</p>
        <div className="grid gap-4 sm:grid-cols-2">
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

          <FieldGroup label="Swimmers per slot">
            <Controller
              control={control}
              name="swimmersPerSlot"
              render={({ field }) => (
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} swimmers
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
            <span className="text-muted-foreground">Total capacity across all sessions: </span>
            <span className="font-semibold text-foreground">{totalCapacity} swimmers</span>
          </div>
        )}
      </div>
    </div>
  );
}
