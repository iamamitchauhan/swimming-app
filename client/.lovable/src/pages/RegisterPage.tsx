import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Clock, Loader2, Waves } from "lucide-react";
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
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-linear-to-br from-primary via-primary to-aqua text-primary-foreground">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 800 800" preserveAspectRatio="none">
            {Array.from({ length: 10 }).map((_, i) => (
              <path
                key={i}
                d={`M0 ${100 + i * 70} Q 200 ${50 + i * 70} 400 ${100 + i * 70} T 800 ${100 + i * 70}`}
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
            ))}
          </svg>
        </div>
        <div className="relative">
          <BrandLogo size="lg" />
        </div>
        <div className="relative space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Manage your swim club with confidence</h2>
          <p className="text-primary-foreground/80 text-lg leading-relaxed">
            From tryouts to evaluations — everything your club needs in one place.
          </p>
        </div>
        <div className="relative flex items-center gap-3">
          <Waves className="h-5 w-5 opacity-60" />
          <p className="text-sm text-primary-foreground/60">AquaTryouts · Trusted by 180+ clubs</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8 lg:hidden">
            <BrandLogo size="lg" />
          </div>

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
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Join AquaTryouts to manage your swimming club.
                </p>
              </div>
              <form onSubmit={submit} className="space-y-4">
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
                      className={emailError ? "border-destructive" : ""}
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
                      className={emailError ? "border-destructive" : ""}
                    />
                  </div>
                </div>
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
