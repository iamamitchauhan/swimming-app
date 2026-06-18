import { UseFormRegister, UseFieldArrayReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { TryoutFormValues } from "./shared";
import { FieldGroup } from "./field-group";

interface Props {
  register: UseFormRegister<TryoutFormValues>;
  faqsField: UseFieldArrayReturn<TryoutFormValues, "faqs">;
}

export function StepPresentation({ register, faqsField }: Props) {
  return (
    <div className="space-y-2">
      {/* FAQ */}
      <div className="space-y-4">
        {faqsField.fields.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <HelpCircle className="h-7 w-7 opacity-40" />
            <p className="text-sm">No FAQ entries yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqsField.fields.map((field, idx) => (
              <div key={field.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Question {idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => faqsField.remove(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <FieldGroup label="Question">
                  <Input placeholder="What should I bring?" {...register(`faqs.${idx}.question`)} />
                </FieldGroup>
                <FieldGroup label="Answer">
                  <Textarea
                    placeholder="Your answer…"
                    rows={2}
                    {...register(`faqs.${idx}.answer`)}
                  />
                </FieldGroup>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`w-full ${faqsField.fields.length >= 10 ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => {
            if (faqsField.fields.length < 10) {
              faqsField.append({ question: "", answer: "" });
            }
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add FAQ
        </Button>
      </div>
    </div>
  );
}
