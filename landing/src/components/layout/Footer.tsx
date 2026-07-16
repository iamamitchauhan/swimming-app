import { Waves } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-muted/40 sm:mt-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:text-left md:py-8 md:text-sm">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">SwimTryouts</span>
          </div>
          <span className="hidden sm:inline">·</span>
          <span>Helping young swimmers find their lane.</span>
        </div>
        <p>© {new Date().getFullYear()} SwimTryouts.</p>
      </div>
    </footer>
  );
}
