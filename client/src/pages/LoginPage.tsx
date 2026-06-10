import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, CheckCircle2, Loader2, Waves } from "lucide-react";
import { useLogin, useVerifyOtp } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { toastError } = useApiError();
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();
  const loading = loginMutation.isPending || verifyOtpMutation.isPending;

  const sendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    loginMutation.mutate(
      { email },
      {
        onSuccess: () => setStep("otp"),
        onError: (err) => {
          toastError(err);
          setError((err as Error).message);
        },
      },
    );
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    verifyOtpMutation.mutate(
      { email, otp },
      {
        onSuccess: (data) => {
          setSuccess(true);
          const { role, clubId, onboardingStep } = data.user;
          const needsOnboarding = role === "admin" && !clubId && onboardingStep < 3;
          setTimeout(() => navigate(needsOnboarding ? "/onboarding" : "/dashboard"), 700);
        },
        onError: (err) => setError((err as Error).message),
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

          {success ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <h2 className="text-xl font-bold">Signed in!</h2>
              <p className="text-sm text-muted-foreground">Redirecting you now…</p>
            </div>
          ) : step === "email" ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Sign in to your account</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll send you a one-time code to verify your identity.
                </p>
              </div>
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@club.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error}
                    className={error ? "border-destructive" : ""}
                    autoFocus
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending code…</> : "Continue with email"}
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <form onSubmit={verify} className="space-y-5">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-xs text-destructive text-center">{error}</p>}
                <Button type="submit" className="w-full h-11" disabled={loading || otp.length !== 6}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Verify code"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't get it?{" "}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={() => loginMutation.mutate({ email })}
                  >
                    Resend code
                  </button>
                </p>
              </form>
              <p className="text-center text-xs text-muted-foreground mt-6">
                Enter the 6-digit code sent to your email address.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
