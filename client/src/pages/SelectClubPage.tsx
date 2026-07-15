import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSelectClub } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";

export default function SelectClubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get("clubId");
  const selectClubMutation = useSelectClub();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!clubId) {
      navigate("/login", { replace: true });
      return;
    }

    selectClubMutation.mutate(
      { clubId },
      {
        onSuccess: (data) => {
          const { role, onboardingStep } = data.user;
          const needsOnboarding = role === "admin" && !data.user.clubId && onboardingStep < 3;
          setTimeout(
            () => navigate(needsOnboarding ? "/onboarding" : "/dashboard", { replace: true }),
            700,
          );
        },
        onError: () => {
          navigate("/login", { replace: true });
        },
      },
    );
  }, [clubId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>

        {selectClubMutation.isSuccess ? (
          <div className="space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h2 className="text-xl font-bold">Club selected!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you now…</p>
          </div>
        ) : selectClubMutation.isError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              Failed to select club. Please try again.
            </p>
            <Button onClick={() => navigate("/login")} variant="outline">
              Back to login
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Selecting your club…</p>
          </div>
        )}

        {user && (
          <p className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </div>
  );
}
