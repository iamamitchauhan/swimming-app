import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { childrenQuery, parentQuery, qk } from "@/lib/queries";
import { createChild, deleteChild } from "@/lib/api/children";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const blank = { firstName: "", lastName: "", dob: "", gender: "male" as "male" | "female" | "other", membershipId: "", clubName: "" };

export default function ChildrenPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: children = [] } = useQuery(childrenQuery());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);

  const create = useMutation({
    mutationFn: () => createChild(form),
    onSuccess: async () => { toast.success("Child added"); await qc.invalidateQueries({ queryKey: qk.children }); setForm(blank); setOpen(false); },
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteChild(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.children }),
  });

  if (!parent) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">My Children</h1>
          <p className="mt-1 text-muted-foreground">Manage swimmers you can register for tryouts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="btn-cta"><Plus className="h-4 w-4" /> Add child</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add a child</DialogTitle></DialogHeader>
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
              <Field label="First name"><Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
              <Field label="Last name"><Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
              <Field label="Date of birth"><Input type="date" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as typeof form.gender })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="USA Swimming ID"><Input value={form.membershipId} onChange={(e) => setForm({ ...form, membershipId: e.target.value })} /></Field>
              <Field label="Club"><Input value={form.clubName} onChange={(e) => setForm({ ...form, clubName: e.target.value })} /></Field>
              <DialogFooter className="sm:col-span-2"><Button type="submit" className="btn-cta">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {children.length === 0 ? (
        <Card className="mt-8 p-10 text-center text-muted-foreground">No children yet — add one to register for tryouts.</Card>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-4 p-5">
              <div>
                <h3 className="font-display text-lg font-bold">{c.firstName} {c.lastName}</h3>
                <p className="text-sm text-muted-foreground">DOB {formatDate(c.dob)} · {c.gender}</p>
                {c.clubName && <p className="text-xs text-muted-foreground">Club: {c.clubName}</p>}
              </div>
              <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => del.mutate(c.id)} aria-label="Remove child"><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
