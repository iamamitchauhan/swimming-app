import type { TryoutStep } from "./types";

interface Props {
  steps: TryoutStep[];
}

export function TryoutTimeline({ steps }: Props) {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="how-heading">
      <h2 id="how-heading" className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        How It Works
      </h2>
      <div className="pl-5">
        <ol className="relative space-y-6 border-l-2 border-border pl-[18px]">
        {steps.map((step, i) => (
          <li key={i} className="relative pl-2">
            <span
              aria-hidden
              className="absolute left-[-2.4rem] grid size-10 place-items-center rounded-full border-2 border-background bg-primary text-sm font-bold text-primary-foreground shadow"
            >
              {i + 1}
            </span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}
