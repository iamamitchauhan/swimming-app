import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { qk, registrationQuestionsQuery } from "@/lib/queries";
import { createRegistration, type RegistrationQuestion } from "@/lib/api/registrations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotInfo {
  date: string;
  time: string;
  label: string;
}

interface Props {
  tryoutId: string;
  slotId: string | null;
  sessionId: string | null;
  selectedSlotInfo?: SlotInfo | null;
  segments: any[];
}

// ─── Fixed-field Zod schema ───────────────────────────────────────────────────

const fixedSchema = z.object({
  swimmerFirstName: z.string().min(1, "First name is required"),
  swimmerLastName: z.string().min(1, "Last name is required"),
  ageOnTryoutDay: z.coerce
    .number({ invalid_type_error: "Age is required" })
    .int()
    .min(1, "Age must be at least 1")
    .max(30, "Age must be 30 or under"),
  segment: z.string().min(1, "Please select a segment"),
  hasUsaMembership: z.boolean(),
  usaMembershipId: z.string().optional(),
  clubName: z.string().optional(),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email("Valid email is required"),
});

type FixedFields = z.infer<typeof fixedSchema>;

// ─── Dynamic answer state ─────────────────────────────────────────────────────

type DynamicState = Record<string, string | string[]>;

function initialDynamic(questions: RegistrationQuestion[]): DynamicState {
  const s: DynamicState = {};
  for (const q of questions) {
    s[q.label] = q.type === "checkbox" ? [] : "";
  }
  return s;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleCheckbox(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

function buildDynamicZodSchema(questions: RegistrationQuestion[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const q of questions) {
    if (q.type === "checkbox") {
      shape[q.label] = q.required
        ? z.array(z.string()).min(1, "Please select at least one option")
        : z.array(z.string()).optional().default([]);
    } else {
      // text | textarea | radio
      shape[q.label] = q.required
        ? z.string().min(1, "This field is required")
        : z.string().optional().default("");
    }
  }
  return z.object(shape);
}

function validateDynamicAnswers(
  questions: RegistrationQuestion[],
  state: DynamicState,
): Record<string, string> {
  if (questions.length === 0) return {};
  const schema = buildDynamicZodSchema(questions);
  const result = schema.safeParse(state);
  if (result.success) return {};

  const errs: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as string;
    errs[key] = issue.message;
  }
  return errs;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationForm({ tryoutId, slotId, sessionId, selectedSlotInfo, segments = [] }: Props) {
  const qc = useQueryClient();

  // Fetch dynamic questions from API
  const { data: questions = [], isLoading: questionsLoading } = useQuery(
    registrationQuestionsQuery(tryoutId),
  );


  // parent Name

  const guardianName = localStorage.getItem("auth_user") ? `${JSON.parse(localStorage.getItem("auth_user")!).firstName} ${JSON.parse(localStorage.getItem("auth_user")!).lastName}` : "" ;
  const guardianEmail = localStorage.getItem("auth_user") ? `${JSON.parse(localStorage.getItem("auth_user")!).email}` : "" ;
  // Fixed fields form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FixedFields>({
    resolver: zodResolver(fixedSchema),
    defaultValues: {
      swimmerFirstName: "",
      swimmerLastName: "",
      ageOnTryoutDay: undefined,
      segment: "",
      hasUsaMembership: false,
      usaMembershipId: "",
      clubName: "",
      guardianName: guardianName,
      guardianEmail: guardianEmail,
    },
  });

  const hasUsaMembership = watch("hasUsaMembership");
  const ageValue = watch("ageOnTryoutDay");

  // Valid segments based on age (minAge <= age <= maxAge)
  const validSegments = useMemo(() => {
    const age = Number(ageValue);
    if (isNaN(age) || age <= 0) return [];
    return segments.filter((s) => age >= s.minAge && age <= s.maxAge);
  }, [ageValue, segments]);

  // Dynamic question state
  const [dynamicState, setDynamicState] = useState<DynamicState>(() =>
    initialDynamic(questions),
  );
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Re-init dynamic state when questions load
  const [prevQLen, setPrevQLen] = useState(0);
  if (questions.length !== prevQLen) {
    setPrevQLen(questions.length);
    setDynamicState(initialDynamic(questions));
  }

  const submitMut = useMutation({
    mutationFn: async (fixed: FixedFields) => {
      if (!slotId || !sessionId) throw new Error("Please select a slot above before submitting.");

      // Validate dynamic fields through Zod
      const dErrs = validateDynamicAnswers(questions, dynamicState);
      if (Object.keys(dErrs).length > 0) {
        setDynamicErrors(dErrs);
        throw new Error("Please fill in all required fields.");
      }
      setDynamicErrors({});

      const dynamicAnswers = Object.entries(dynamicState)
        .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : String(v).trim() !== ""))
        .map(([label, value]) => ({ label, value }));


      return createRegistration({
        tryoutId,
        sessionId,
        slotId,
        segmentId: fixed.segment,
        swimmerFirstName: fixed.swimmerFirstName,
        swimmerLastName: fixed.swimmerLastName,
        ageOnTryoutDay: Number(fixed.ageOnTryoutDay),
        hasUsaMembership: fixed.hasUsaMembership,
        usaMembershipId: fixed.usaMembershipId,
        clubName: fixed.clubName,
        guardianName: fixed.guardianName,
        guardianEmail: fixed.guardianEmail,
        dynamicAnswers,
      });
    },
    onSuccess: async () => {
      toast.success("Registration submitted!");
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
      reset();
      setDynamicState(initialDynamic(questions));
      setDynamicErrors({});
      setSubmitted(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(fixed: FixedFields) {
    setSubmitted(true);
    const dErrs = validateDynamicAnswers(questions, dynamicState);
    setDynamicErrors(dErrs);
    if (Object.keys(dErrs).length > 0) return;
    submitMut.mutate(fixed);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">

      {/* ── Slot status ──────────────────────────────────────────────────────── */}
      {slotId && selectedSlotInfo ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold">Slot selected</span>
          </div>
          <div className="mt-1 pl-4 text-xs text-emerald-700 dark:text-emerald-400">
            {selectedSlotInfo.date} · {selectedSlotInfo.time} · {selectedSlotInfo.label}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          No slot selected — pick a slot from the Registration Windows above, or we'll auto-assign the earliest open one.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

        {/* ── Fixed: Swimmer name ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Swimmer first name" required error={errors.swimmerFirstName?.message}>
            <Input placeholder="First name" {...register("swimmerFirstName")} />
          </Field>
          <Field label="Swimmer last name" required error={errors.swimmerLastName?.message}>
            <Input placeholder="Last name" {...register("swimmerLastName")} />
          </Field>
        </div>

        {/* ── Fixed: DOB ─────────────────────────────────────────────────────── */}
        {/* <Field label="Swimmer date of birth" required error={errors.swimmerDob?.message}>
          <Input type="date" {...register("swimmerDob")} />
        </Field> */}

        {/* ── Fixed: Age + Segment ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age on tryout day" required error={errors.ageOnTryoutDay?.message}>
            <Input
              type="number"
              min={1}
              max={30}
              placeholder="e.g. 10"
              {...register("ageOnTryoutDay")}
            />
          </Field>
          <Field label="Registration segment" required error={errors.segment?.message}>
            <Select
              value={watch("segment")}
              onValueChange={(v) => setValue("segment", v, { shouldValidate: true })}
              disabled={validSegments.length === 0}
            >
              <SelectTrigger className={validSegments.length === 0 ? "text-muted-foreground" : ""}>
                <SelectValue
                  placeholder={ageValue ? "Select Segment" : "Enter age first"}
                />
              </SelectTrigger>
              <SelectContent>
                {validSegments.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* ── Fixed: USA Swimming membership ─────────────────────────────────── */}
        {/* <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              id="usa-membership"
              checked={hasUsaMembership}
              onCheckedChange={(v) => setValue("hasUsaMembership", !!v)}
            />
            <span className="text-sm font-medium">Has USA Swimming membership</span>
          </label>
          {hasUsaMembership && (
            <div className="mt-3 grid grid-cols-2 gap-3 pl-6">
              <Field label="Membership ID" required error={errors.usaMembershipId?.message}>
                <Input placeholder="e.g. 123456789" {...register("usaMembershipId")} />
              </Field>
              <Field label="Club name" error={errors.clubName?.message}>
                <Input placeholder="Swim club name" {...register("clubName")} />
              </Field>
            </div>
          )}
        </div> */}

        {/* ── Fixed: Guardian ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Guardian name" required error={errors.guardianName?.message}>
            <Input placeholder="Full name" {...register("guardianName")} />
          </Field>
          <Field label="Guardian email" required error={errors.guardianEmail?.message}>
            <Input type="email" placeholder="name@domain.com" {...register("guardianEmail")} />
          </Field>
        </div>

        {/* ── Dynamic questions ────────────────────────────────────────────────── */}
        {questionsLoading ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading additional questions…
          </div>
        ) : questions.length > 0 ? (
          <div className="space-y-5 pt-2 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
              Additional information
            </p>
            {questions.map((q) => (
              <DynamicField
                key={q.label}
                question={q}
                value={dynamicState[q.label] ?? (q.type === "checkbox" ? [] : "")}
                error={submitted ? dynamicErrors[q.label] : undefined}
                onChange={(val) =>
                  setDynamicState((prev) => ({ ...prev, [q.label]: val }))
                }
              />
            ))}
          </div>
        ) : null}

        {/* ── Submit ──────────────────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          <Button
            type="submit"
            className="w-full"
            disabled={submitMut.isPending}
          >
            {submitMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitMut.isPending ? "Submitting…" : "Submit Registration"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            15-minute evaluation · Instant confirmation · Email reminder before tryout
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

function DynamicField({
  question,
  value,
  error,
  onChange,
}: {
  question: RegistrationQuestion;
  value: string | string[];
  error?: string;
  onChange: (val: string | string[]) => void;
}) {
  const fieldId = `dyn-${question.label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Field label={question.label} required={question.required} error={error}>
      {question.type === "text" && (
        <Input
          id={fieldId}
          placeholder={question.placeholder ?? ""}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {question.type === "textarea" && (
        <Textarea
          id={fieldId}
          placeholder={question.placeholder ?? ""}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      )}
      {question.type === "radio" && (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
          <RadioGroup
            value={value as string}
            onValueChange={(v) => onChange(v)}
          >
            {(question.options ?? []).map((opt) => (
              <div key={opt} className="flex items-center gap-2.5">
                <RadioGroupItem value={opt} id={`${fieldId}-${opt}`} />
                <Label htmlFor={`${fieldId}-${opt}`} className="text-sm font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}
      {question.type === "checkbox" && (
        <div className="rounded-lg border border-border bg-background p-3 space-y-2">
          {(question.options ?? []).map((opt) => {
            const checked = Array.isArray(value) && value.includes(opt);
            return (
              <label key={opt} htmlFor={`${fieldId}-${opt}`} className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  id={`${fieldId}-${opt}`}
                  checked={checked}
                  onCheckedChange={() => {
                    const arr = Array.isArray(value) ? value : [];
                    onChange(toggleCheckbox(arr, opt));
                  }}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </Field>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  );
}
