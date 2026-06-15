import { Badge } from "@/components/ui/badge";
import type { RegistrationStatus } from "@/lib/types";

const map: Record<RegistrationStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-status-pending/15 text-status-pending border-status-pending/30",
  },
  approved: {
    label: "Approved",
    className: "bg-status-approved/15 text-status-approved border-status-approved/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-status-rejected/15 text-status-rejected border-status-rejected/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30",
  },
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  const v = map[status];
  return (
    <Badge variant="outline" className={`${v.className} font-semibold`}>
      {v.label}
    </Badge>
  );
}