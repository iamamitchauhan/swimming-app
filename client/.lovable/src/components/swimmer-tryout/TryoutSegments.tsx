import { Users } from "lucide-react";
import type { TryoutSegment } from "./types";

interface Props {
  segments: TryoutSegment[];
}

export function TryoutSegments({ segments }: Props) {
  return (
    <section aria-labelledby="segments-heading">
      <h2 id="segments-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Who Can Participate?
      </h2>
      {segments.length === 0 ? (
        <p className="text-muted-foreground">No eligibility groups have been listed yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((s, i) => (
            <article
              key={`${s.name}-${i}`}
              className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">{s.name}</h3>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Age</dt>
                  <dd className="font-medium">
                    {s.minAge}–{s.maxAge}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Level</dt>
                  <dd className="font-medium capitalize">{s.level}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
