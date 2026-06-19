import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectedQuestion } from "@/lib/api/question-library.api";
import { cn } from "@/lib/utils";

// ─── Shared sub-components matching the real RegistrationForm style ────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckCard({
  label,
  required,
  children,
}: {
  label?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-2">
      {label && (
        <p className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </p>
      )}
      {children}
    </div>
  );
}

function FakeCheckRow({ label, type }: { label: string; type: "checkbox" | "radio" }) {
  return (
    <label className="flex items-center gap-2.5 cursor-not-allowed opacity-70">
      <div
        className={cn(
          "h-4 w-4 shrink-0 border-2 border-input bg-background",
          type === "radio" ? "rounded-full" : "rounded-sm",
        )}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  selectedQuestions: SelectedQuestion[];
}

export function RegistrationFormPreview({ selectedQuestions }: Props) {
  return (
    <section id="registration-section" className="mt-10">
      <h2 className="mb-5 text-xl font-bold">Complete Registration</h2>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {/* Slot selection banner (static amber — no slot selected in preview) */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          No slot selected — pick a slot from the Registration Windows above.
        </div>

        {/* ── Fixed: Swimmer name ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Swimmer first name" required>
            <Input placeholder="First name" />
          </Field>
          <Field label="Swimmer last name" required>
            <Input placeholder="Last name" />
          </Field>
        </div>

        {/* ── Fixed: Age + Segment ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age on tryout day" required>
            <Input type="number" min={1} max={30} placeholder="e.g. 10" />
          </Field>
          <Field label="Registration segment" required>
            <Select disabled={true}>
              <SelectTrigger className={"text-muted-foreground"}>
                <SelectValue placeholder={"Enter age first"} />
              </SelectTrigger>
              <SelectContent>
                {[{ name: "Segment A" }, { name: "Segment B" }].map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* ── Fixed: Guardian ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Guardian name" required>
            <Input placeholder="Full name" />
          </Field>
          <Field label="Guardian email" required>
            <Input type="email" placeholder="name@domain.com" />
          </Field>
        </div>

        {/* Dynamic questions from the question library */}
        {selectedQuestions.length > 0 && (
          <div className="space-y-5">
            {selectedQuestions.map((q, idx) => {
              if (q.type === "text") {
                return (
                  <Field key={idx} label={q.label} required={q.required}>
                    <input
                      disabled
                      placeholder={q.placeholder || "Type your answer…"}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </Field>
                );
              }

              if (q.type === "textarea") {
                return (
                  <Field key={idx} label={q.label} required={q.required}>
                    <textarea
                      disabled
                      rows={3}
                      placeholder={q.placeholder || "Type your answer…"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground cursor-not-allowed resize-none"
                    />
                  </Field>
                );
              }

              if (q.type === "radio") {
                return (
                  <CheckCard key={idx} label={q.label} required={q.required}>
                    {(q.options ?? []).length > 0 ? (
                      (q.options ?? []).map((opt, i) => (
                        <FakeCheckRow key={i} label={opt} type="radio" />
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">
                        No options defined
                      </span>
                    )}
                  </CheckCard>
                );
              }

              if (q.type === "checkbox") {
                return (
                  <CheckCard key={idx} label={q.label} required={q.required}>
                    {(q.options ?? []).length > 0 ? (
                      (q.options ?? []).map((opt, i) => (
                        <FakeCheckRow key={i} label={opt} type="checkbox" />
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">
                        No options defined
                      </span>
                    )}
                  </CheckCard>
                );
              }

              return null;
            })}
          </div>
        )}

        {selectedQuestions.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No registration questions have been added yet.
          </p>
        )}

        {/* Submit footer */}
        <div className="space-y-2 pt-1">
          <button
            disabled
            className="w-full h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-50 cursor-not-allowed"
          >
            Submit Registration
          </button>
        </div>
      </div>
    </section>
  );
}
