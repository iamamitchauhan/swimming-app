import { cn } from "@/lib/utils";

export interface SegmentedTab {
  value: string;
  label: string;
  badge?: string;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedTabs({ tabs, active, onChange, className }: SegmentedTabsProps) {
  return (
    <div className={cn("bg-primary/5 rounded-lg p-1 flex gap-x-1", className)}>
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
              isActive
                ? "bg-primary text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            {tab.badge && (
              <span className="bg-background/20 text-background text-xs font-bold px-1.5 py-0.5 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
