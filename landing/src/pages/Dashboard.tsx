import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, ListChecks, XCircle, Ban, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parentQuery, registrationsQuery } from "@/lib/queries";
import { RegistrationStatusBadge } from "@/components/registrations/StatusBadge";
import { formatDate } from "@/lib/format";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: regs = [] } = useQuery(registrationsQuery());

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);
  if (!parent) return null;

  const counts = {
    total: regs.length,
    approved: regs.filter((r) => r.status === "approved").length,
    pending: regs.filter((r) => r.status === "pending").length,
    rejected: regs.filter((r) => r.status === "rejected").length,
    cancelled: regs.filter((r) => r.status === "cancelled").length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-ocean">Parent Dashboard</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Welcome back, {parent?.firstName ?? "Parent"}</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={<ListChecks />} label="Total" value={counts.total} tint="primary" />
        <StatCard icon={<CheckCircle2 />} label="Approved" value={counts.approved} tint="approved" />
        <StatCard icon={<Clock />} label="Pending" value={counts.pending} tint="pending" />
        <StatCard icon={<XCircle />} label="Rejected" value={counts.rejected} tint="rejected" />
        <StatCard icon={<Ban />} label="Cancelled" value={counts.cancelled} tint="cancelled" />
      </div>
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Recent registrations</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/registrations">View all <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        {regs.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">No registrations yet.</p>
            <Button asChild className="btn-cta mt-4"><Link to="/tryouts">Browse tryouts</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {regs.slice(0, 4).map((r) => (
              <Card key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.tryoutName}</div>
                  <div className="text-sm text-muted-foreground">{r.childName} · {r.slotLabel} ({r.slotTime}) · {formatDate(r.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <RegistrationStatusBadge status={r.status} />
                  <Button asChild variant="outline" size="sm"><Link to={`/registrations/${r.id}`}>View</Link></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: number; tint: "primary" | "approved" | "pending" | "rejected" | "cancelled" }) {
  const tintMap: Record<string, string> = {
    primary: "bg-accent text-primary",
    approved: "bg-status-approved/15 text-status-approved",
    pending: "bg-status-pending/15 text-status-pending",
    rejected: "bg-status-rejected/15 text-status-rejected",
    cancelled: "bg-status-cancelled/15 text-status-cancelled",
  };
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tintMap[tint]} [&_svg]:h-5 [&_svg]:w-5`}>{icon}</span>
      <div className="min-w-0"><div className="font-display text-2xl font-bold">{value}</div><div className="text-xs font-medium text-muted-foreground">{label}</div></div>
    </Card>
  );
}
