import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { childrenQuery, qk } from "@/lib/queries";
import { createChild } from "@/lib/api/children";
import { createRegistration } from "@/lib/api/registrations";
import type { Slot, Tryout } from "@/lib/types";

interface Props {
  tryout: Tryout;
  slot: Slot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const blankChild = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "male" as "male" | "female" | "other",
  membershipId: "",
  clubName: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export function RegistrationModal({ tryout, slot, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { data: children = [] } = useQuery(childrenQuery());
  const [mode, setMode] = useState<"existing" | "new">(
    children.length > 0 ? "existing" : "new",
  );
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? "");
  const [newChild, setNewChild] = useState(blankChild);
  const [confirmed, setConfirmed] = useState(false);

  const submitMut = useMutation({
    mutationFn: async () => {
      let childId = selectedChildId;
      let childName = "";
      if (mode === "new") {
        const created = await createChild(newChild);
        childId = created.id;
        childName = `${created.firstName} ${created.lastName}`;
        await qc.invalidateQueries({ queryKey: qk.children });
      } else {
        const c = children.find((x) => x.id === childId);
        if (!c) throw new Error("Please select a child.");
        childName = `${c.firstName} ${c.lastName}`;
      }
      return createRegistration({
        tryoutId: tryout.id,
        slotId: slot.id,
        childId,
        childName,
      });
    },
    onSuccess: async () => {
      toast.success("Registration submitted!");
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
      onOpenChange(false);
      setNewChild(blankChild);
      setConfirmed(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    confirmed &&
    !submitMut.isPending &&
    (mode === "existing"
      ? !!selectedChildId
      : !!newChild.firstName && !!newChild.lastName && !!newChild.dob);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Register for {tryout.name}</DialogTitle>
          <DialogDescription>
            {slot.label} · {slot.time} · {tryout.city}, {tryout.state}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "existing" ? "default" : "outline"}
            size="sm"
            disabled={children.length === 0}
            onClick={() => setMode("existing")}
          >
            Existing child
          </Button>
          <Button
            type="button"
            variant={mode === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("new")}
          >
            Add new child
          </Button>
        </div>

        {mode === "existing" ? (
          <div className="space-y-2">
            <Label>Select child</Label>
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" required>
              <Input
                value={newChild.firstName}
                onChange={(e) => setNewChild({ ...newChild, firstName: e.target.value })}
              />
            </Field>
            <Field label="Last name" required>
              <Input
                value={newChild.lastName}
                onChange={(e) => setNewChild({ ...newChild, lastName: e.target.value })}
              />
            </Field>
            <Field label="Date of birth" required>
              <Input
                type="date"
                value={newChild.dob}
                onChange={(e) => setNewChild({ ...newChild, dob: e.target.value })}
              />
            </Field>
            <Field label="Gender" required>
              <Select
                value={newChild.gender}
                onValueChange={(v) =>
                  setNewChild({ ...newChild, gender: v as typeof newChild.gender })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="USA Swimming ID (optional)">
              <Input
                value={newChild.membershipId}
                onChange={(e) =>
                  setNewChild({ ...newChild, membershipId: e.target.value })
                }
              />
            </Field>
            <Field label="Club name (optional)">
              <Input
                value={newChild.clubName}
                onChange={(e) => setNewChild({ ...newChild, clubName: e.target.value })}
              />
            </Field>
            <Field label="Emergency contact">
              <Input
                value={newChild.emergencyContactName}
                onChange={(e) =>
                  setNewChild({ ...newChild, emergencyContactName: e.target.value })
                }
              />
            </Field>
            <Field label="Emergency phone">
              <Input
                value={newChild.emergencyContactPhone}
                onChange={(e) =>
                  setNewChild({ ...newChild, emergencyContactPhone: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(!!v)}
            className="mt-0.5"
          />
          <span>I confirm the information provided is accurate.</span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="btn-cta"
            disabled={!canSubmit}
            onClick={() => submitMut.mutate()}
          >
            {submitMut.isPending ? "Submitting…" : "Submit Registration"}
          </Button>
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
      <Label>
        {label}
        {required && <span className="ml-0.5 text-cta">*</span>}
      </Label>
      {children}
    </div>
  );
}