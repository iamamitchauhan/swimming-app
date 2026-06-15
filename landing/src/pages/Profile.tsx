import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parentQuery, qk } from "@/lib/queries";
import { updateProfile } from "@/lib/api/auth";
import { toast } from "sonner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "" });

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);
  useEffect(() => {
    if (parent) setForm({ firstName: parent.firstName, lastName: parent.lastName, email: parent.email, phone: parent.phone ?? "", address: parent.address ?? "" });
  }, [parent]);

  const save = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: async (next) => { qc.setQueryData(qk.parent, next); toast.success("Profile updated"); },
  });
  const changePw = useMutation({
    mutationFn: async () => { await new Promise((r) => setTimeout(r, 300)); },
    onSuccess: () => toast.success("Password updated (mock)"),
  });

  if (!parent) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Profile settings</h1>
      <p className="mt-1 text-muted-foreground">Manage your contact information and account security.</p>
      <Card className="mt-8 p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-status-approved"><CheckCircle2 className="h-4 w-4" /> Email verified</div>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="First name"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Last name"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Button type="submit" className="btn-cta" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button></div>
        </form>
      </Card>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Security</h2>
        <p className="text-sm text-muted-foreground">Change your account password.</p>
        <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); changePw.mutate(); }}>
          <Field label="Current password"><Input type="password" required /></Field>
          <Field label="New password"><Input type="password" required minLength={6} /></Field>
          <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={changePw.isPending}>Update password</Button></div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
