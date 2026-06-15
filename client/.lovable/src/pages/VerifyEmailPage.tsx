import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useVerifyEmail } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { isLoading, isSuccess, isError, error } = useVerifyEmail(token);

  useEffect(() => {
    if (isSuccess && user) {
      const { role, clubId, onboardingStep } = user;
      const needsOnboarding = role === "admin" && !clubId && onboardingStep < 3;
      const destination = needsOnboarding ? "/onboarding" : "/dashboard";
      const t = setTimeout(() => navigate(destination), 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, user, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center"><BrandLogo size="lg" /></div>
        <div className="bg-card rounded-2xl border border-border p-8 space-y-4">
          {isLoading && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h2 className="text-lg font-semibold">Verifying your email…</h2>
              <p className="text-sm text-muted-foreground">Hang tight, this takes a moment.</p>
            </>
          )}
          {isSuccess && (
            <>
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <h2 className="text-lg font-semibold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">Signing you in…</p>
            </>
          )}
          {isError && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Verification failed</h2>
              <p className="text-sm text-muted-foreground">
                {(error as Error)?.message ?? "The link may have expired or already been used."}
              </p>
              <Button asChild className="w-full mt-2">
                <Link to="/register">Register again</Link>
              </Button>
            </>
          )}
          {!token && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Invalid link</h2>
              <p className="text-sm text-muted-foreground">No verification token found in the URL.</p>
              <Button asChild variant="outline" className="w-full mt-2">
                <Link to="/login">Go to login</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
