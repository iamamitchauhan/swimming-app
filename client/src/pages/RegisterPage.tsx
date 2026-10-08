import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useRegister } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const registerMutation = useRegister();
  const { toastError } = useApiError();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    if (firstName.trim().length < 1) {
      setEmailError("First name is required");
      return;
    }
    if (lastName.trim().length < 1) {
      setEmailError("Last name is required");
      return;
    }
    registerMutation.mutate(
      { email, firstName: firstName.trim(), lastName: lastName.trim() },
      {
        onSuccess: () => setDone(true),
        onError: (err) => {
          toastError(err);
          setEmailError((err as Error).message);
        },
      },
    );
  };

  return (
    <div className="flex min-h-viewport w-full items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>

        {done ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground mt-1">
                A verification link has been sent to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>
            <Alert className="text-left bg-accent/40 border-accent">
              <Clock className="h-4 w-4" />
              <AlertTitle>Verify your email to continue</AlertTitle>
              <AlertDescription>
                Click the link in the email to activate your account, then sign in.
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full h-11 rounded-lg" asChild>
              <Link to="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="mt-5 text-center text-sm text-muted-foreground">Create your account</h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    aria-invalid={!!emailError}
                    className={`h-11 rounded-lg ${emailError ? "border-destructive" : ""}`}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    aria-invalid={!!emailError}
                    className={`h-11 rounded-lg ${emailError ? "border-destructive" : ""}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@club.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailError}
                  className={`h-11 rounded-lg ${emailError ? "border-destructive" : ""}`}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <Button
                type="submit"
                className="w-full h-11 rounded-lg"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending verification…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
