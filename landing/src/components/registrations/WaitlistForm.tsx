import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DobPicker } from "@/components/ui/dob-picker";
import { Label } from "@/components/ui/label";
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
import { joinWaitlist } from "@/lib/api/registrations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  tryoutId: string;
  tryoutName: string;
  segments: { name: string; minAge: number; maxAge: number; level: string }[];
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function calcAgeOnDate(dob: string, refDate: string): number {
  if (!dob) return 0;
  const birth = new Date(dob + "T00:00:00");
  const ref = refDate ? new Date(refDate + "T00:00:00") : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

const waitlistSchema = z.object({
  swimmerFirstName: z.string().min(1, "First name is required"),
  swimmerLastName: z.string().min(1, "Last name is required"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (v) => {
        const d = new Date(v + "T00:00:00");
        return !isNaN(d.getTime()) && d < new Date();
      },
      { message: "Please enter a valid date of birth" },
    ),
  segment: z.string().min(1, "Please select a segment"),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email("Valid email is required"),
});

type WaitlistFields = z.infer<typeof waitlistSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export function WaitlistForm({ tryoutId, tryoutName, segments = [] }: Props) {
  const [successOpen, setSuccessOpen] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);

  const guardianName = localStorage.getItem("auth_user")
    ? `${JSON.parse(localStorage.getItem("auth_user")!).firstName} ${JSON.parse(localStorage.getItem("auth_user")!).lastName}`
    : "";
  const guardianEmail = localStorage.getItem("auth_user")
    ? `${JSON.parse(localStorage.getItem("auth_user")!).email}`
    : "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WaitlistFields>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      swimmerFirstName: "",
      swimmerLastName: "",
      dob: "",
      segment: "",
      guardianName,
      guardianEmail,
    },
  });

  const dobValue = watch("dob");
  const ageOnTryoutDay = useMemo(() => calcAgeOnDate(dobValue, ""), [dobValue]);

  const validSegments = useMemo(() => {
    if (!dobValue || ageOnTryoutDay <= 0) return [];
    return segments.filter((s) => ageOnTryoutDay >= s.minAge && ageOnTryoutDay <= s.maxAge);
  }, [ageOnTryoutDay, dobValue, segments]);

  const submitMut = useMutation({
    mutationFn: async (fields: WaitlistFields) => {
      const computedAge = calcAgeOnDate(fields.dob, "");
      return joinWaitlist(tryoutId, {
        swimmerFirstName: fields.swimmerFirstName,
        swimmerLastName: fields.swimmerLastName,
        swimmerDob: fields.dob,
        ageOnTryoutDay: computedAge,
        segmentId: fields.segment,
        guardianName: fields.guardianName,
        guardianEmail: fields.guardianEmail,
      });
    },
    onSuccess: (data) => {
      setWaitlistPosition(data.position);
      setSuccessOpen(true);
      reset();
    },
    onError: (e: Error) => {
      if (e.message.toLowerCase().includes("already")) {
        toast.info("This email is already on the waitlist for this tryout.");
      } else {
        toast.error(e.message);
      }
    },
  });

  function onSubmit(fields: WaitlistFields) {
    submitMut.mutate(fields);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      {/* ── Waitlist notice banner ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
        All tryout slots are currently filled. Join the waitlist, and we’ll notify you as soon as a
        spot becomes available.{" "}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* ── Swimmer name ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Swimmer first name" required error={errors.swimmerFirstName?.message}>
            <Input placeholder="First name" {...register("swimmerFirstName")} />
          </Field>
          <Field label="Swimmer last name" required error={errors.swimmerLastName?.message}>
            <Input placeholder="Last name" {...register("swimmerLastName")} />
          </Field>
        </div>

        {/* ── DOB + Segment ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of birth" required error={errors.dob?.message}>
            <Controller
              name="dob"
              control={control}
              render={({ field }) => (
                <DobPicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  hasError={!!errors.dob}
                />
              )}
            />
            {/* {dobValue && ageOnTryoutDay > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Age on tryout day:{" "}
                <span className="font-semibold text-foreground">{ageOnTryoutDay}</span>
              </p>
            )} */}
          </Field>
          <Field label="Registration segment" required error={errors.segment?.message}>
            <Select
              value={watch("segment")}
              onValueChange={(v) => setValue("segment", v, { shouldValidate: true })}
              disabled={validSegments.length === 0}
            >
              <SelectTrigger className={validSegments.length === 0 ? "text-muted-foreground" : ""}>
                <SelectValue
                  placeholder={dobValue ? "Select Segment" : "Enter date of birth first"}
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

        {/* ── Guardian ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Guardian name" required error={errors.guardianName?.message}>
            <Input placeholder="Full name" {...register("guardianName")} />
          </Field>
          <Field label="Guardian email" required error={errors.guardianEmail?.message}>
            <Input type="email" placeholder="name@domain.com" {...register("guardianEmail")} />
          </Field>
        </div>

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <div className="pt-1">
          <Button type="submit" className="w-full" disabled={submitMut.isPending}>
            {submitMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitMut.isPending ? "Joining…" : "Join Waitlist"}
          </Button>
        </div>
      </form>

      {/* ── Success modal ──────────────────────────────────────────────────── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="[&>button:last-child]:hidden max-w-sm rounded-2xl p-0 overflow-hidden gap-0 sm:rounded-2xl">
          <div className="p-6 pb-5 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-950 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-lg font-bold text-center">
                You’re on the waitlist!
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-center">
                {/* {waitlistPosition && (
                  <span className="block mb-1 font-semibold text-foreground">
                    Position #{waitlistPosition}
                  </span>
                )} */}
                We’ll send you a notification when a tryout spot opens you.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5">
              <Button className="w-full rounded-lg" onClick={() => setSuccessOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Field wrapper (same as RegistrationForm) ─────────────────────────────────

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
