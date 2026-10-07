import { AppHeader } from "./app-header";

export function PageShell({
  title,
  crumbs,
  actions,
  children,
}: {
  title: string;
  crumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader title={title} crumbs={crumbs} />
      <div className="px-4 lg:px-8 py-6 lg:py-8">
        {actions && <div className={`flex justify-end ${actions ? "mb-4" : ""}`}>{actions}</div>}
        {children}
      </div>
    </>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "aqua" | "success" | "warning";
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    aqua: "bg-aqua/15 text-aqua-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
  } as const;
  return (
    <div className="bg-card rounded-xl border border-border p-5 phone-portrait:p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground font-medium phone-portrait:text-xs">
          {label}
        </span>
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center phone-portrait:h-7 phone-portrait:w-7 ${accentMap[accent]}`}
        >
          <Icon className="h-4.5 w-4.5 phone-portrait:h-4 phone-portrait:w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight phone-portrait:mt-1.5 phone-portrait:text-xl">
        {value}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1 phone-portrait:mt-0.5">{hint}</p>}
    </div>
  );
}
