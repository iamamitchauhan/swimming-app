import { ClockIcon, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";

export function ClubUnderReview({ clubName }: { clubName?: string }) {
  const logout = useLogout();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8">
        <BrandLogo size="md" />
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-warning/15 flex items-center justify-center">
            <ClockIcon className="h-8 w-8 text-warning-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Club Under Review</h1>
          {clubName && <p className="text-sm font-medium text-muted-foreground">{clubName}</p>}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your club application has been submitted and is currently being reviewed by our team.
            You'll receive an email once it's approved — usually within 1–2 business days.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            What happens next?
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Our super admin reviews your club details</li>
            <li>
              • You'll get an approval email to{" "}
              <span className="font-medium text-foreground">your registered address</span>
            </li>
            <li>• Once approved, you'll have full access to your dashboard</li>
          </ul>
        </div>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Need help? Contact{" "}
        <a
          href="mailto:support.swimtryout@mail.feteboard.ai"
          className="underline hover:text-foreground"
        >
          support.swimtryout@mail.feteboard.ai
        </a>
      </p>
    </div>
  );
}
