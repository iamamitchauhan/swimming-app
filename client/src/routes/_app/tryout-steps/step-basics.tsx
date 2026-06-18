import { UseFormRegister, UseFormWatch, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TryoutFormValues } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  watch: UseFormWatch<TryoutFormValues>;
  errors: FieldErrors<TryoutFormValues>;
}

export function StepBasics({ register, watch, errors }: Props) {
  const descriptionValue = watch("description") ?? "";

  return (
    <div className="space-y-6">
      <div className="grid gap-5">
        <FieldGroup label="Tryout Name" required error={errors.name?.message}>
          <Input
            placeholder="e.g. Spring Tryouts 2026"
            {...register("name")}
            className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          />
        </FieldGroup>

        <FieldGroup label="Location" required error={errors.location?.message}>
          <Input placeholder="e.g. Pacific Wave Aquatic Center" {...register("location")} />
        </FieldGroup>

        <FieldGroup label="Description">
          <div className="relative">
            <Textarea
              placeholder="Describe this tryout event — what to expect, who should attend, special notes…"
              rows={4}
              maxLength={1000}
              {...register("description")}
            />
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {descriptionValue.length}/1000
            </div>
          </div>
        </FieldGroup>
      </div>
    </div>
  );
}
