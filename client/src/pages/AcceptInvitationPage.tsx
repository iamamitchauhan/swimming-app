import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAcceptInvitation } from "@/hooks/use-invitations";
import { useApiError } from "@/hooks/use-api-error";

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [done, setDone] = useState(false);

  const acceptMutation = useAcceptInvitation();
  const { toastError } = useApiError();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <XCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Invalid invitation link</h2>
          <p className="text-sm text-muted-foreground">No token found in the URL.</p>
          <Button asChild variant="outline"><Link to="/login">Go to login</Link></Button>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    acceptMutation.mutate(
      { token, firstName: firstName.trim(), lastName: lastName.trim() },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => navigate("/dashboard"), 1500);
        },
        onError: (err) => toastError(err),
      },
    );
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <h2 className="text-xl font-bold">Account activated!</h2>
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center"><BrandLogo size="lg" /></div>
        <div className="bg-card rounded-2xl border border-border p-8 space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Accept invitation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete your profile to activate your account.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Cooper"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={acceptMutation.isPending}>
              {acceptMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
              ) : "Activate account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
