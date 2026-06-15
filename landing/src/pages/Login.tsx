import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { login } from "@/lib/api/auth";
import { qk } from "@/lib/queries";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const mut = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async (parent) => {
      qc.setQueryData(qk.parent, parent);
      toast.success(`Welcome back, ${parent.firstName}!`);
      navigate("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-hero-gradient text-white shadow-lift">
        <Waves className="h-7 w-7" />
      </div>
      <Card className="w-full p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your registrations.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button type="submit" className="btn-cta w-full" disabled={mut.isPending}>
            {mut.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
