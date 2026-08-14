import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Waves, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { registerParent } from "@/lib/api/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [emailSent, setEmailSent] = useState(false);
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "";

  const mut = useMutation({
    mutationFn: () =>
      registerParent({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        redirectUrl: redirect || undefined,
      }),
    onSuccess: () => {
      setEmailSent(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate();
  };
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (emailSent) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
          <MailCheck className="h-7 w-7" />
        </div>
        <Card className="w-full p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a verification link to{" "}
            <span className="font-semibold text-foreground">{form.email}</span>.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Click the link in the email to verify your account and get started. The link expires in
            24 hours.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder or{" "}
            <button
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setEmailSent(false);
                mut.reset();
              }}
            >
              try again
            </button>
            .
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
        <Waves className="h-7 w-7" />
      </div>
      <Card className="w-full p-8">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Takes under two minutes. We'll email you a verification link to confirm your account.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fn">First name</Label>
              <Input
                id="fn"
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ln">Last name</Label>
              <Input
                id="ln"
                required
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em">Email address</Label>
            <Input
              id="em"
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="btn-cta w-full" disabled={mut.isPending}>
            {mut.isPending ? "Sending verification email…" : "Send verification email"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
