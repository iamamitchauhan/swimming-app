import { Timer, Users2 } from "lucide-react";

interface Props {
  slotDuration: number;
  swimmersPerSlot: number;
}

export function TryoutStats({ slotDuration, swimmersPerSlot }: Props) {
  const stats = [
    { icon: Timer, label: "Slot Duration", value: `${slotDuration} minutes` },
    { icon: Users2, label: "Swimmers Per Slot", value: `${swimmersPerSlot} swimmers` },
  ];

  return (
    <section aria-labelledby="info-heading">
      <h2 id="info-heading" className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
        Tryout Information
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="truncate text-lg font-semibold">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
