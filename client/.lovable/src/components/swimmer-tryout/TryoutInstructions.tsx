import { Info } from "lucide-react";

interface Props {
  instructions: string;
}

export function TryoutInstructions({ instructions }: Props) {
  if (!instructions?.trim()) return null;
  return (
    <section aria-labelledby="instructions-heading">
      <h2 id="instructions-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Important Instructions
      </h2>
      <div className="flex gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
        <Info className="size-5 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {instructions}
        </p>
      </div>
    </section>
  );
}
