import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tryout } from "./types";

interface Props {
  tryout: Tryout;
  onRegister?: () => void;
}

const statusStyles: Record<Tryout["status"], string> = {
  open: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  closed: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground border-border",
};

export function TryoutHero({ tryout, onRegister }: Props) {
  const disabled = tryout.status !== "open";
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { rootMargin: "0px 0px -100% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border shadow-sm">
        {/* Banner image fills entire section background */}
        <div className="absolute inset-0">
          {tryout.bannerUrl ? (
            <img
              src={tryout.bannerUrl}
              alt={`${tryout.name} banner`}
              className="absolute inset-0 size-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-muted" />
          )}
          {/* Soft overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/30 to-background/10" />
        </div>

        {/* Glass content card */}
        <div className="relative px-6 pb-6 pt-48 sm:px-8 sm:pb-8 sm:pt-56 md:pt-64">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "uppercase tracking-wider text-xs font-bold px-3 py-1 backdrop-blur-md bg-background/50",
                statusStyles[tryout.status],
              )}
            >
              {tryout.status}
            </Badge>
            {tryout.theme && (
              <Badge variant="secondary" className="capitalize backdrop-blur-md bg-background/50">
                {tryout.theme}
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
            {tryout.name}
          </h1>

          {tryout.location && (
            <div className="mt-3 flex items-center gap-2 text-white/90 drop-shadow">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{tryout.location}</span>
            </div>
          )}

          <div className="mt-5">
            <Button size="lg" disabled={disabled} onClick={onRegister} className="shadow-lg">
              {disabled ? "Registration closed" : tryout.ctaLabel || "Sign up today"}
            </Button>
          </div>
        </div>
        <div ref={sentinelRef} aria-hidden className="absolute bottom-0 h-px w-full" />
      </section>

      {/* Compact sticky bar */}
      <div
        aria-hidden={!compact}
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b bg-background/85 backdrop-blur-xl transition-all duration-300 shadow-md",
          compact
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="truncate text-base font-bold">{tryout.name}</div>
            {tryout.location && (
              <div className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{tryout.location}</span>
              </div>
            )}
          </div>
          <Button size="default" disabled={disabled} onClick={onRegister} className="shrink-0">
            {disabled ? "Closed" : tryout.ctaLabel || "Sign up"}
          </Button>
        </div>
      </div>
    </>
  );
}
