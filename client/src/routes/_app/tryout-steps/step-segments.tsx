import { UseFormRegister, FieldErrors, Control, UseFieldArrayReturn } from "react-hook-form";
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
  console.info("errors =>", errors);

  return (
    <div className="space-y-6">
      {segmentsField.fields.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <Users2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">No segments yet. Add one to get started.</p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                segmentsField.append({
                  name: "",
                  minAge: "5" as unknown as number,
                  maxAge: "10" as unknown as number,
                  level: LEVELS[0],
                })
              }
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add segment
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                segmentsField.append({
                  name: "",
                  minAge: "5" as unknown as number,
                  maxAge: "10" as unknown as number,
                  level: LEVELS[0],
                })
              }
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add segment
            </Button>
          </div>
          {segmentsField.fields.map((field, idx) => {
            const segErr = errors.segments?.[idx];
            return (
              <div key={field.id} className="rounded-xl border border-border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Segment {idx + 1}</span>
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

                <div className="grid gap-4 sm:grid-cols-4">
                  <FieldGroup label="Segment Name" required error={segErr?.name?.message}>
                    <Input
                      placeholder="e.g. U12 Competitive"
                      {...register(`segments.${idx}.name`)}
                      className={segErr?.name ? "border-destructive" : ""}
                    />
                  </FieldGroup>

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
            );
          })}
        </div>
      )}

      {Array.isArray(errors.segments) && errors.segments.length === 0 && (
        <p className="text-xs text-destructive mb-2">At least one segment is required</p>
      )}
    </div>
  );
}
