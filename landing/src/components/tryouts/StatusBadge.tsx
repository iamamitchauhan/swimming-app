import { Badge } from "@/components/ui/badge";
import type { TryoutStatus } from "@/lib/types";

const map: Record<TryoutStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-status-open/15 text-status-open border-status-open/30" },
  almost_full: {
    label: "Almost Full",
    className: "bg-status-warn/15 text-status-warn border-status-warn/30",
  },
  closed: {
    label: "Closed",
    className: "bg-status-closed/15 text-status-closed border-status-closed/30",
  },
};

export function TryoutStatusBadge({ status }: { status: TryoutStatus }) {
  const v = map[status];
  return (
    <Badge variant="outline" className={`${v.className} font-semibold`}>
      {v.label}
    </Badge>
  );
}