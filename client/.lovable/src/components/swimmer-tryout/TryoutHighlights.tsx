import { Check } from "lucide-react";

interface Props {
  highlights: string;
}

export function TryoutHighlights({ highlights }: Props) {
  const items = highlights
    .split(/\r?\n|•|\u2022/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="highlights-heading">
      <h2 id="highlights-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Highlights
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
            >
              <Check className="size-4" />
            </span>
            <span className="min-w-0 text-sm leading-relaxed text-card-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
