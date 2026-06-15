import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { qk } from "@/lib/queries";
import { createRegistration } from "@/lib/api/registrations";

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

const STROKES = ["Butterfly", "Backstroke", "Breaststroke", "Freestyle", "Knows some strokes", "None"] as const;
const STARTS  = ["Racing Start off the blocks", "Backstroke Start", "Cannot perform starts"] as const;
const TURNS   = ["Freestyle Flip Turn", "Backstroke Flip Turn", "Open Turns", "Cannot perform turns"] as const;

const blank = {
  fullName: "",
  swimmerDob: "",
  ageOnTryoutDay: "",
  segment: "",
  hasUsaMembership: false,
  usaMembershipId: "",
  clubName: "",
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

function findSegmentByAge(segments: any[], age: number): string {
  const match = segments.find((s) => age >= s.minAge && age <= s.maxAge);
  return match?.name ?? "";
}

export function RegistrationForm({ tryoutId, slotId, sessionId, selectedSlotInfo, segments = [] }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(blank);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!slotId || !sessionId) throw new Error("Please select a slot above before submitting.");
      const [firstName, ...rest] = form.fullName.trim().split(" ");
      const lastName = rest.join(" ") || "-";
      const age = parseInt(form.ageOnTryoutDay);
      const today = new Date();
      const birthYear = today.getFullYear() - age;
      const swimmerDob = `${birthYear}-06-15`;
      return createRegistration({
        tryoutId,
        sessionId,
        slotId,
        segmentId: form.segment,
        swimmerFirstName: firstName,
        swimmerLastName: lastName,
        swimmerDob,
        ageOnTryoutDay: age,
        hasUsaMembership: form.hasUsaMembership,
        usaMembershipId: form.usaMembershipId,
        clubName: form.clubName,
        swimTime50Free: form.swimTime50Free,
        swimTime100Free: form.swimTime100Free,
        strokes: form.strokes,
        starts: form.starts,
        turns: form.turns,
        guardianName: form.guardianName,
        guardianEmail: form.guardianEmail,
      });
    },
    onSuccess: async () => {
      toast.success("Registration submitted!");
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
      setForm(blank);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    !submitMut.isPending &&
    !!slotId &&
    !!sessionId &&
    !!form.fullName.trim() &&
    !!form.ageOnTryoutDay &&
    form.strokes.length > 0 &&
    form.starts.length > 0 &&
    form.turns.length > 0 &&
    !!form.guardianName &&
    !!form.guardianEmail;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">

      {/* Slot selection status */}
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

      {/* Swimmer's full name */}
      <Field label="Swimmer's full name" required>
        <Input
          placeholder="First and last name"
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
        />
      </Field>

      {/* Age + Segment */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age on tryout day" required>
          <Input
            type="number"
            min={4}
            max={18}
            placeholder="6 – 18"
            value={form.ageOnTryoutDay}
            onChange={(e) => {
              const age = e.target.value;
              const ageNum = parseInt(age);
              setForm((prev) => ({
                ...prev,
                ageOnTryoutDay: age,
                segment: !isNaN(ageNum) ? findSegmentByAge(segments, ageNum) : "",
              }));
            }}
          />
        </Field>
        <Field label="Registration segment">
          <Input
            readOnly
            value={
              form.segment ||
              (form.ageOnTryoutDay ? "No segment for this age" : "Enter age first")
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
                value={form.clubName}
                onChange={(e) => set("clubName", e.target.value)}
              />
            </Field>
          </div>
        )}
      </CheckCard>

      {/* Swim times */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

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
      <div className="grid grid-cols-2 gap-4">
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

      {/* Submit */}
      <div className="space-y-2 pt-1">
        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={() => submitMut.mutate()}
        >
          {submitMut.isPending ? "Submitting…" : "Submit Registration"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          15-minute evaluation · Instant confirmation · Email reminder before tryout
        </p>

      </div>
    </div>
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
