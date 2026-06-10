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
    registerMutation.mutate(
      { email },
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
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_at_top,var(--color-accent)_0%,var(--color-background)_55%)]">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><BrandLogo size="lg" /></div>
        <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] p-8">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Check your inbox</h2>
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
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login">Back to login</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Join AquaTryouts to manage your swimming club.
                </p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@club.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!emailError}
                    className={emailError ? "border-destructive" : ""}
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <Button type="submit" className="w-full h-11" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending verification…</>
                  ) : "Create account"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
