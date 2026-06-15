import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Tryout } from "./types";
import { TryoutHero } from "./TryoutHero";
import { TryoutHighlights } from "./TryoutHighlights";
import { TryoutSegments } from "./TryoutSegments";
import { TryoutSessions } from "./TryoutSessions";
import { TryoutStats } from "./TryoutStats";
import { TryoutTimeline } from "./TryoutTimeline";
import { TryoutInstructions } from "./TryoutInstructions";
import { TryoutFAQ } from "./TryoutFAQ";
import { TryoutCTA } from "./TryoutCTA";

export interface SwimmerTryoutDetailsPageProps {
  tryout?: Tryout | null;
  loading?: boolean;
  error?: string | null;
  onRegister?: (tryout: Tryout) => void;
  onRetry?: () => void;
}

export function SwimmerTryoutDetailsPage({
  tryout,
  loading,
  error,
  onRegister,
  onRetry,
}: SwimmerTryoutDetailsPageProps) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!tryout) return <EmptyState />;

  const disabled = tryout.status !== "open";
  const handleRegister = () => onRegister?.(tryout);

  return (
    <main className="min-h-screen bg-background pb-28 md:pb-12">
      <div className="mx-auto w-full max-w-5xl space-y-12 px-4 py-6 sm:px-6 sm:py-10">
        <TryoutHero tryout={tryout} onRegister={handleRegister} />

        <section aria-labelledby="about-heading">
          <h2 id="about-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            About This Tryout
          </h2>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
            {tryout.description}
          </p>
        </section>

        <TryoutHighlights highlights={tryout.highlights} />
        <TryoutSegments segments={tryout.segments} />
        <TryoutSessions sessions={tryout.sessions} disabled={disabled} />
        <TryoutStats
          slotDuration={tryout.slotDuration}
          swimmersPerSlot={tryout.swimmersPerSlot}
        />
        <TryoutTimeline steps={tryout.steps} />
        <TryoutInstructions instructions={tryout.additionalInstructions} />
        <TryoutFAQ faqs={tryout.faqs} />

        <TryoutCTA
          ctaLabel={tryout.ctaLabel}
          disabled={disabled}
          onRegister={handleRegister}
        />
      </div>

      <TryoutCTA
        ctaLabel={tryout.ctaLabel}
        disabled={disabled}
        onRegister={handleRegister}
        variant="sticky"
      />
    </main>
  );
}

function LoadingState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        <Skeleton className="h-80 w-full rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">We couldn't load this tryout</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {onRetry && (
          <Button className="mt-6" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">No tryout found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This tryout may have been removed or is not yet available.
        </p>
      </div>
    </main>
  );
}

export default SwimmerTryoutDetailsPage;
