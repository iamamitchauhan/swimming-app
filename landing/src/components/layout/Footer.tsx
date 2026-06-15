import { Waves } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-primary" />
          <span className="font-display font-semibold text-foreground">SwimTryouts</span>
          <span>· Helping young swimmers find their lane.</span>
        </div>
        <p>© {new Date().getFullYear()} SwimTryouts. Demo data only.</p>
      </div>
    </footer>
  );
}