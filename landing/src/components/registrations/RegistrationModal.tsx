import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DobPicker } from "@/components/ui/dob-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { qk } from "@/lib/queries";
import { createChild } from "@/lib/api/children";
import { createRegistration } from "@/lib/api/registrations";
import type { Slot, Tryout } from "@/lib/types";
import { Label } from "../ui/label";

interface Props {
  tryout: Tryout;
  slot: Slot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STROKES = [
  "Butterfly",
  "Backstroke",
  "Breaststroke",
  "Freestyle",
  "Knows some strokes",
  "None",
] as const;
const STARTS = [
  "Racing Start off the blocks",
  "Backstroke Start",
  "Cannot perform starts",
] as const;
const TURNS = [
  "Freestyle Flip Turn",
  "Backstroke Flip Turn",
  "Open Turns",
  "Cannot perform turns",
] as const;

function calcAgeOnDate(dob: string, refDate: string): number {
  if (!dob) return 0;
  const birth = new Date(dob + "T00:00:00");
  const ref = refDate ? new Date(refDate + "T00:00:00") : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

const blank = {
  fullName: "",
  dob: "",
  segment: "",
  hasUsaMembership: false,
  usaMembershipId: "",
  currentTeams: [] as string[],
  swimTime50Free: "",
  swimTime100Free: "",
  strokes: [] as string[],
  starts: [] as string[],
  turns: [] as string[],
  guardianName: "",
  guardianEmail: "",
};

type FormState = typeof blank;

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export function RegistrationModal({ tryout, slot, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(blank);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const ageOnTryoutDay = calcAgeOnDate(form.dob, "");
  const segmentOptions =
    form.dob && ageOnTryoutDay > 0
      ? (tryout.segments ?? []).filter(
          (s: any) => ageOnTryoutDay >= s.minAge && ageOnTryoutDay <= s.maxAge,
        )
      : [];

  const submitMut = useMutation({
    mutationFn: async () => {
      const [firstName, ...rest] = form.fullName.trim().split(" ");
      const lastName = rest.join(" ") || "-";
      const created = await createChild({
        firstName,
        lastName,
        dob: "",
        gender: "male",
        membershipId: form.usaMembershipId,
        clubName: form.currentTeams.join(", "),
        emergencyContactName: form.guardianName,
        emergencyContactPhone: "",
      });
      await qc.invalidateQueries({ queryKey: qk.children });
      const computedAge = calcAgeOnDate(form.dob, "");
      return createRegistration({
        tryoutId: tryout.id,
        sessionId: slot.sessionId,
        slotId: slot.id,
        swimmerFirstName: firstName,
        swimmerLastName: lastName,
        swimmerDob: form.dob,
        ageOnTryoutDay: computedAge,
        segmentId: form.segment,
        hasUsaMembership: form.hasUsaMembership,
        usaMembershipId: form.usaMembershipId,
        guardianName: form.guardianName,
        guardianEmail: form.guardianEmail,
      });
    },
    onSuccess: async () => {
      toast.success("Registration submitted!");
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
      onOpenChange(false);
      setForm(blank);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    !submitMut.isPending &&
    !!form.fullName.trim() &&
    !!form.dob &&
    !!form.guardianName &&
    !!form.guardianEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Complete registration</DialogTitle>
          <DialogDescription>
            We'll auto-assign the earliest open slot if you don't pick one above.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Swimmer's full name */}
          <Field label="Swimmer's full name" required>
            <Input
              placeholder="First and last name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </Field>

          {/* DOB + Segment */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth" required>
              <DobPicker
                value={form.dob ?? "1992-09-15"}
                onChange={(dob) => {
                  const age = calcAgeOnDate(dob, "");
                  const options = (tryout.segments ?? []).filter(
                    (s: any) => age >= s.minAge && age <= s.maxAge,
                  );
                  setForm((prev) => ({ ...prev, dob, segment: options[0]?.name ?? "" }));
                }}
              />
              {form.dob && ageOnTryoutDay > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Age on tryout day:{" "}
                  <span className="font-semibold text-foreground">{ageOnTryoutDay} years</span>
                </p>
              )}
            </Field>
            <Field label="Registration segment">
              <Input
                readOnly
                value={
                  form.segment ||
                  (form.dob ? "No segment for this age" : "Enter date of birth first")
                }
                className="bg-muted text-muted-foreground cursor-default"
              />
            </Field>
          </div>

          {/* USA Swimming membership */}
          <CheckCard>
            <CheckRow
              id="usa-membership"
              label="USA Swimming membership"
              checked={form.hasUsaMembership}
              onCheckedChange={(v) => set("hasUsaMembership", !!v)}
            />
            {form.hasUsaMembership && (
              <div className="mt-3 grid grid-cols-2 gap-3 pl-6">
                <Field label="Membership ID" required>
                  <Input
                    placeholder="e.g. 123456789"
                    value={form.usaMembershipId}
                    onChange={(e) => set("usaMembershipId", e.target.value)}
                  />
                </Field>
                <Field label="Club name (optional)">
                  <Input
                    placeholder="Swim club name"
                    value={form.currentTeams[0] ?? ""}
                    onChange={(e) => set("currentTeams", e.target.value ? [e.target.value] : [])}
                  />
                </Field>
              </div>
            )}
          </CheckCard>

          {/* Current team */}
          <CheckCard label="If you answered USA Swim Team — which team and group is your child training with?">
            {["Option 1", "Option 2"].map((opt) => (
              <CheckRow
                key={opt}
                id={`team-${opt}`}
                label={opt}
                checked={form.currentTeams.includes(opt)}
                onCheckedChange={() => set("currentTeams", toggleItem(form.currentTeams, opt))}
              />
            ))}
          </CheckCard>

          {/* Swim times */}
          <CheckCard label="Best swim time — 50 Free yds or meters">
            <Input
              placeholder="e.g. 45.23"
              value={form.swimTime50Free}
              onChange={(e) => set("swimTime50Free", e.target.value)}
            />
          </CheckCard>

          <CheckCard label="Best swim time — 100 Free yds or meters">
            <Input
              placeholder="e.g. 1:23.45"
              value={form.swimTime100Free}
              onChange={(e) => set("swimTime100Free", e.target.value)}
            />
          </CheckCard>

          {/* Legal strokes */}
          <CheckCard label="Can perform legal strokes" required>
            {STROKES.map((s) => (
              <CheckRow
                key={s}
                id={`stroke-${s}`}
                label={s}
                checked={form.strokes.includes(s)}
                onCheckedChange={() => set("strokes", toggleItem(form.strokes, s))}
              />
            ))}
          </CheckCard>

          {/* Racing starts */}
          <CheckCard label="Can your athlete perform legal racing starts?" required>
            {STARTS.map((s) => (
              <CheckRow
                key={s}
                id={`start-${s}`}
                label={s}
                checked={form.starts.includes(s)}
                onCheckedChange={() => set("starts", toggleItem(form.starts, s))}
              />
            ))}
          </CheckCard>

          {/* Turns */}
          <CheckCard label="Can your athlete perform legal turns?" required>
            {TURNS.map((t) => (
              <CheckRow
                key={t}
                id={`turn-${t}`}
                label={t}
                checked={form.turns.includes(t)}
                onCheckedChange={() => set("turns", toggleItem(form.turns, t))}
              />
            ))}
          </CheckCard>

          {/* Guardian */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guardian name" required>
              <Input
                placeholder="Full name"
                value={form.guardianName}
                onChange={(e) => set("guardianName", e.target.value)}
              />
            </Field>
            <Field label="Guardian email" required>
              <Input
                type="email"
                placeholder="name@domain.com"
                value={form.guardianEmail}
                onChange={(e) => set("guardianEmail", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={() => submitMut.mutate()}>
              {submitMut.isPending ? "Submitting…" : "Submit Registration"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
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
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
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

function CheckRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
