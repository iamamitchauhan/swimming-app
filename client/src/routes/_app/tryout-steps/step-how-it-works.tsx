import {
  UseFormRegister,
  UseFieldArrayReturn,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { TryoutFormValues } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  stepsField: UseFieldArrayReturn<TryoutFormValues, "steps">;
}

export function StepHowItWorks({ register, stepsField }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-foreground">How It Works</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Steps shown to swimmers on the public event page. Only steps with a title are saved.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {stepsField.fields.map((field, idx) => (
          <div key={field.id} className="flex gap-3 items-start">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-1">
              {idx + 1}
            </div>
            <div className="flex-1 grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Step title"
                {...register(`steps.${idx}.title`)}
              />
              <Input
                placeholder="Short description (optional)"
                {...register(`steps.${idx}.description`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0 mt-1"
              onClick={() => stepsField.remove(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`w-full ${stepsField.fields.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => {
            if(stepsField.fields.length < 3) {
              stepsField.append({ title: "", description: "" })
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add step
        </Button>
      </div>

      {/* Additional instructions */}
      {/* <div className="pt-4 border-t border-border">
        <FieldGroup
          label="Additional Instructions"
          hint="Shown below the steps — what to bring, parking info, dress code, etc."
        >
          <Textarea
            placeholder="Any extra info swimmers should know before attending…"
            rows={4}
            {...register("additionalInstructions")}
          />
        </FieldGroup>
      </div> */}
    </div>
  );
}
