import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PartyPopper, Check, Plus, CrossIcon, Crosshair, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { qk, registrationQuestionsQuery } from "@/lib/queries";
import {
  createRegistration,
  deleteWaitlistEntry,
  type RegistrationQuestion,
  type WaitlistEntry,
} from "@/lib/api/registrations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotInfo {
  date: string;
  time: string;
  label: string;
  duration: string;
}

interface Props {
  tryoutId: string;
  slotId: string | null;
  sessionId: string | null;
  selectedSlotInfo?: SlotInfo | null;
  segments: any[];
  waitlistId?: string;
  prefillData?: WaitlistEntry;
  onAddAnotherSwimmer?: () => void;
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

export function RegistrationForm({
  tryoutId,
  slotId,
  sessionId,
  selectedSlotInfo,
  segments = [],
  waitlistId,
  prefillData,
  onAddAnotherSwimmer,
}: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  console.info("selectedSlotInfo =>", selectedSlotInfo);

  // Fetch dynamic questions from API
  const { data: questions = [], isLoading: questionsLoading } = useQuery(
    registrationQuestionsQuery(tryoutId),
  );

  // parent Name

  const guardianName = localStorage.getItem("auth_user")
    ? `${JSON.parse(localStorage.getItem("auth_user")!).firstName} ${JSON.parse(localStorage.getItem("auth_user")!).lastName}`
    : "";
  const guardianEmail = localStorage.getItem("auth_user")
    ? `${JSON.parse(localStorage.getItem("auth_user")!).email}`
    : "";
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
      swimmerFirstName: prefillData?.swimmerFirstName ?? "",
      swimmerLastName: prefillData?.swimmerLastName ?? "",
      ageOnTryoutDay: prefillData?.ageOnTryoutDay ?? undefined,
      segment: prefillData?.segmentId ?? "",
      hasUsaMembership: false,
      usaMembershipId: "",
      clubName: "",
      guardianName: prefillData?.guardianName ?? guardianName,
      guardianEmail: prefillData?.guardianEmail ?? guardianEmail,
    },
  });

  const hasUsaMembership = watch("hasUsaMembership");
  const ageValue = watch("ageOnTryoutDay");

  useEffect(() => {
    if (!prefillData) return;
    reset({
      swimmerFirstName: prefillData.swimmerFirstName ?? "",
      swimmerLastName: prefillData.swimmerLastName ?? "",
      ageOnTryoutDay: prefillData.ageOnTryoutDay ?? undefined,
      segment: prefillData.segmentId ?? "",
      hasUsaMembership: false,
      usaMembershipId: "",
      clubName: "",
      guardianName: prefillData.guardianName ?? guardianName,
      guardianEmail: prefillData.guardianEmail ?? guardianEmail,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillData]);

  // Valid segments based on age (minAge <= age <= maxAge)
  const validSegments = useMemo(() => {
    const age = Number(ageValue);
    if (isNaN(age) || age <= 0) return [];
    return segments.filter((s) => age >= s.minAge && age <= s.maxAge);
  }, [ageValue, segments]);

  // Dynamic question state
  const [dynamicState, setDynamicState] = useState<DynamicState>(() => initialDynamic(questions));
  const [dynamicErrors, setDynamicErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{
    swimmerName: string;
    guardianEmail: string;
    slotInfo: SlotInfo | null;
  } | null>(null);
  console.info("lastSubmission =>", lastSubmission);

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

      // find label which match "USA Swimming ID Number"
      const usaMembershipIdLabel = dynamicAnswers.find(
        (answer) => answer.label === "USA Swimming ID Number",
      );
      const usaMembershipId = usaMembershipIdLabel?.value;

      return createRegistration({
        tryoutId,
        sessionId,
        slotId,
        segmentId: fixed.segment,
        swimmerFirstName: fixed.swimmerFirstName,
        swimmerLastName: fixed.swimmerLastName,
        ageOnTryoutDay: Number(fixed.ageOnTryoutDay),
        hasUsaMembership: !!usaMembershipId,
        usaMembershipId: usaMembershipId ? String(usaMembershipId) : "",
        clubName: fixed.clubName,
        guardianName: fixed.guardianName,
        guardianEmail: fixed.guardianEmail,
        dynamicAnswers,
      });
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
      await qc.invalidateQueries({ queryKey: qk.tryout(tryoutId) });
      if (waitlistId) {
        deleteWaitlistEntry(waitlistId).catch(() => {});
      }
      setLastSubmission({
        swimmerName: `${variables.swimmerFirstName} ${variables.swimmerLastName}`,
        guardianEmail: variables.guardianEmail,
        slotInfo: selectedSlotInfo ?? null,
      });
      setSuccessOpen(true);
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
            {selectedSlotInfo.date} · {selectedSlotInfo.duration}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          No slot selected — pick a slot from the Registration Windows above.
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
                <SelectValue placeholder={ageValue ? "Select Segment" : "Enter age first"} />
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
                onChange={(val) => setDynamicState((prev) => ({ ...prev, [q.label]: val }))}
              />
            ))}
          </div>
        ) : null}

        {/* ── Submit ──────────────────────────────────────────────────────────── */}
        <div className="space-y-2 pt-1">
          <Button type="submit" className="w-full" disabled={submitMut.isPending}>
            {submitMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitMut.isPending ? "Submitting…" : "Submit Registration"}
          </Button>
        </div>
      </form>

      {/* ── Success modal ────────────────────────────────────────────────────── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="[&>button:last-child]:hidden max-w-sm rounded-2xl p-0 overflow-hidden gap-0 sm:rounded-2xl">
          <div className="p-6 pb-4 text-center">
            <div className="flex justify-end">
              <X
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full p-1"
                onClick={() => {
                  navigate("/tryouts");
                }}
              />
            </div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-950 dark:text-amber-400">
              <PartyPopper className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-bold text-center">
                Registration confirmed!
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-center">
                Confirmation will be sent to {lastSubmission?.guardianEmail || guardianEmail}.
              </DialogDescription>
            </DialogHeader>

            {lastSubmission && (
              <div className="mt-4 rounded-lg bg-muted px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{lastSubmission.swimmerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered · {lastSubmission.slotInfo?.duration ?? ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2.5">
              <Button
                variant="outline"
                className="w-full rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950"
                onClick={() => {
                  setSuccessOpen(false);
                  onAddAnotherSwimmer?.();
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add another swimmer (sibling)
              </Button>
              <Button className="w-full rounded-lg" onClick={() => navigate("/registrations")}>
                View my registrations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

function parseSwimTime(value: string, defaultUnit: string) {
  const trimmed = value.trim();
  if (!trimmed) return { minutes: "", seconds: "", ms: "", unit: defaultUnit };
  const parts = trimmed.split(" ");
  const timePart = parts[0] ?? "";
  const unitPart = parts[1] ?? defaultUnit;
  const timeMatch = timePart.match(/^(\d+)?:(\d+)?\.(\d+)?$/);
  if (timeMatch) {
    return {
      minutes: timeMatch[1] ?? "",
      seconds: timeMatch[2] ?? "",
      ms: timeMatch[3] ?? "",
      unit: unitPart,
    };
  }
  return { minutes: "", seconds: "", ms: "", unit: unitPart };
}

function buildSwimTimeValue(minutes: string, seconds: string, ms: string, unit: string) {
  const hasAny = minutes || seconds || ms;
  if (!hasAny) return "";
  const m = minutes || "0";
  const s = seconds || "00";
  const paddedMs = ms || "00";
  return `${m}:${s}.${paddedMs} ${unit}`;
}

function SwimTimeField({
  value,
  unitOptions,
  required,
  error,
  onChange,
}: {
  value: string;
  unitOptions: string[];
  required?: boolean;
  error?: string;
  onChange: (val: string) => void;
}) {
  const defaultUnit = unitOptions[0] ?? "yards";
  const { minutes, seconds, ms, unit } = parseSwimTime(value, defaultUnit);

  function update(next: Partial<{ minutes: string; seconds: string; ms: string; unit: string }>) {
    const newVal = buildSwimTimeValue(
      next.minutes ?? minutes,
      next.seconds ?? seconds,
      next.ms ?? ms,
      next.unit ?? unit,
    );
    onChange(newVal);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM"
            value={minutes}
            onChange={(e) => update({ minutes: e.target.value.replace(/\D/g, "") })}
            className="w-14 h-9 rounded-md border border-input bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-muted-foreground">:</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="SS"
            value={seconds}
            maxLength={2}
            onChange={(e) => update({ seconds: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            className="w-14 h-9 rounded-md border border-input bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-muted-foreground">.</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="ms"
            value={ms}
            maxLength={2}
            onChange={(e) => update({ ms: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={unit}
          onChange={(e) => update({ unit: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

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
  const isSwimTime = question.meta?.inputType === "swim-time";

  return (
    <Field label={question.label} required={question.required} error={error}>
      {question.type === "text" && isSwimTime && (
        <SwimTimeField
          value={value as string}
          unitOptions={(question.meta?.unitOptions as string[]) ?? ["yards", "meters"]}
          required={question.required}
          error={error}
          onChange={(val) => onChange(val)}
        />
      )}
      {question.type === "text" && !isSwimTime && (
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
          <RadioGroup value={value as string} onValueChange={(v) => onChange(v)}>
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
              <label
                key={opt}
                htmlFor={`${fieldId}-${opt}`}
                className="flex items-center gap-2.5 cursor-pointer"
              >
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
