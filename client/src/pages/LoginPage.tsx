import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useLogin, useVerifyOtp } from "@/hooks/use-auth";
import { getPostAuthRoute } from "@/lib/auth-redirect";
import { useApiError } from "@/hooks/use-api-error";
import type { ClubOption } from "@/lib/api/auth.api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [clubs, setClubs] = useState<ClubOption[] | null>(null);

  const { toastError } = useApiError();
  const loginMutation = useLogin();
  const verifyOtpMutation = useVerifyOtp();
  const loading = loginMutation.isPending || verifyOtpMutation.isPending;

  const sendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
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
          const apiErr = err as any;
          setError(apiErr.message || "An error occurred");
          setErrorCode(apiErr.errorCode || apiErr.code || null);
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
          if (data.requiresClubSelection && data.clubs && data.clubs.length > 1) {
            setClubs(data.clubs);
            return;
          }
          setSuccess(true);
          setTimeout(() => navigate(getPostAuthRoute(data.user)), 700);
        },
        onError: (err) => setError((err as Error).message),
      },
    );
  };

  return (
    <div className="flex min-h-viewport w-full items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>

        {success ? (
          <div className="mt-6 space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h1 className="text-lg font-bold">Signed in!</h1>
            <p className="text-sm text-muted-foreground">Redirecting you now…</p>
          </div>
        ) : clubs ? (
          <>
            <button
              onClick={() => {
                setClubs(null);
                setOtp("");
                setError(null);
                setStep("email");
              }}
              className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="mt-5 text-center text-sm text-muted-foreground">Select a club</h1>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              You're a member of multiple clubs. Choose one to continue.
            </p>
            <div className="mt-6 space-y-3">
              {clubs.map((club) => (
                <button
                  key={club.clubId}
                  onClick={() =>
                    navigate(
                      `/select-club?clubId=${club.clubId}&email=${encodeURIComponent(email)}`,
                    )
                  }
                  className="w-full flex items-center justify-between rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent hover:border-primary/50"
                >
                  <div>
                    <p className="font-medium text-foreground">{club.clubName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{club.role}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        ) : step === "email" ? (
          <>
            <h1 className="mt-5 text-center text-sm text-muted-foreground">
              Sign in to your account
            </h1>
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error}
                  className={`h-11 rounded-lg ${error ? "border-destructive" : ""}`}
                  autoFocus
                />
                {error && (
                  <p className="text-xs text-destructive">
                    {error}
                    {errorCode === "NOT_FOUND" && (
                      <>
                        {" "}
                        <Link to="/register" className="underline hover:text-destructive/80">
                          Register now
                        </Link>
                      </>
                    )}
                    {errorCode === "EMAIL_NOT_VERIFIED" && (
                      <>
                        {" "}
                        <Link to="/register" className="underline hover:text-destructive/80">
                          Resend verification
                        </Link>
                      </>
                    )}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full h-11 rounded-lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending code…
                  </>
                ) : (
                  "Continue with email"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Register
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
              }}
              className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="mt-5 text-center text-sm text-muted-foreground">Check your inbox</h1>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>
            <form onSubmit={verify} className="mt-6 space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-11 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 rounded-lg"
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Verify code"
                )}
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
          </>
        )}
      </div>
    </div>
  );
}
