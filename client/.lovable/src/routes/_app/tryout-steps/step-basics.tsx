import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TryoutFormValues } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  errors: FieldErrors<TryoutFormValues>;
}

export function StepBasics({ register, errors }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Basic Information</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Core details shown on the public event page.
        </p>
      </div>

      <div className="grid gap-5">
        <FieldGroup label="Tryout Name" required error={errors.name?.message}>
          <Input
            placeholder="e.g. Spring Tryouts 2026"
            {...register("name")}
            className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
          />
        </FieldGroup>

        <FieldGroup label="Location" error={errors.location?.message}>
          <Input
            placeholder="e.g. Pacific Wave Aquatic Center"
            {...register("location")}
          />
        </FieldGroup>

        <FieldGroup label="Description">
          <Textarea
            placeholder="Describe this tryout event — what to expect, who should attend, special notes…"
            rows={4}
            {...register("description")}
          />
        </FieldGroup>
      </div>
    </div>
  );
}
