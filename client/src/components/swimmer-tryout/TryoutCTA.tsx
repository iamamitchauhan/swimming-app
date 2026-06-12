import { Button } from "@/components/ui/button";

interface Props {
  ctaLabel: string;
  disabled?: boolean;
  onRegister?: () => void;
  variant?: "block" | "sticky";
}

export function TryoutCTA({ ctaLabel, disabled, onRegister, variant = "block" }: Props) {
  const label = disabled ? "Registration closed" : ctaLabel || "Sign up today";

  if (variant === "sticky") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <Button
          size="lg"
          className="w-full"
          disabled={disabled}
          onClick={onRegister}
        >
          {label}
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-card to-card p-8 text-center shadow-sm sm:p-12"
    >
      <h2 id="cta-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
        Ready to Join?
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Secure your child's spot — slots are limited and fill up fast.
      </p>
      <div className="mt-6">
        <Button size="lg" disabled={disabled} onClick={onRegister}>
          {label}
        </Button>
      </div>
    </section>
  );
}
