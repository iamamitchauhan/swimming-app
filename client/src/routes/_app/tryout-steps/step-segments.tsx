import {
  UseFormRegister,
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
import { Plus, Trash2, Users2 } from "lucide-react";
import { TryoutFormValues, LEVELS } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  control: Control<TryoutFormValues>;
  errors: FieldErrors<TryoutFormValues>;
  segmentsField: UseFieldArrayReturn<TryoutFormValues, "segments">;
}

export function StepSegments({ register, control, errors, segmentsField }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Evaluation Segments</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define age groups and skill levels being evaluated.
        </p>
      </div>

      {segmentsField.fields.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <Users2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">No segments yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {segmentsField.fields.map((field, idx) => {
            const segErr = errors.segments?.[idx];
            return (
              <div
                key={field.id}
                className="rounded-xl border border-border p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Segment {idx + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => segmentsField.remove(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldGroup
                      label="Segment Name"
                      required
                      error={segErr?.name?.message}
                    >
                      <Input
                        placeholder="e.g. U12 Competitive"
                        {...register(`segments.${idx}.name`)}
                        className={segErr?.name ? "border-destructive" : ""}
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup label="Min Age" required error={segErr?.minAge?.message}>
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      placeholder="6"
                      {...register(`segments.${idx}.minAge`)}
                      className={segErr?.minAge ? "border-destructive" : ""}
                    />
                  </FieldGroup>

                  <FieldGroup label="Max Age" required error={segErr?.maxAge?.message}>
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      placeholder="12"
                      {...register(`segments.${idx}.maxAge`)}
                      className={segErr?.maxAge ? "border-destructive" : ""}
                    />
                  </FieldGroup>

                  <div className="sm:col-span-2">
                    <FieldGroup label="Skill Level">
                      <Controller
                        control={control}
                        name={`segments.${idx}.level`}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Any level" />
                            </SelectTrigger>
                            <SelectContent>
                              {LEVELS.map((l) => (
                                <SelectItem key={l} value={l}>
                                  {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          segmentsField.append({ name: "", minAge: "" as unknown as number, maxAge: "" as unknown as number, level: "" })
        }
      >
        <Plus className="h-4 w-4 mr-1.5" /> Add segment
      </Button>
    </div>
  );
}
