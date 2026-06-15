import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegistrationStatusBadge } from "@/components/registrations/StatusBadge";
import { childrenQuery, parentQuery, registrationQuery, tryoutQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { CheckCircle2, Circle } from "lucide-react";

export default function RegistrationDetailPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: reg, isLoading: regLoading } = useQuery(registrationQuery(id));
  const { data: tryout } = useQuery({ ...tryoutQuery(reg?.tryoutId ?? ""), enabled: !!reg });
  const { data: children = [] } = useQuery(childrenQuery());
  const child = children.find((c) => c.id === reg?.childId);

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);

  if (!parent) return null;
  if (!regLoading && !reg) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Registration not found</h1>
        <Button asChild className="mt-4"><Link to="/registrations">Back to registrations</Link></Button>
      </div>
    );
  }
  if (!reg) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/registrations" className="text-sm font-medium text-muted-foreground hover:text-foreground">← All registrations</Link>
          <h1 className="mt-2 font-display text-3xl font-bold">{reg.tryoutName}</h1>
        </div>
        <RegistrationStatusBadge status={reg.status} />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">Child information</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Name" value={reg.childName} />
            <Row label="Membership ID" value={child?.membershipId || "—"} />
            <Row label="Club" value={child?.clubName || "—"} />
            <Row label="DOB" value={child?.dob ? formatDate(child.dob) : "—"} />
          </dl>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold">Tryout information</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Tryout" value={reg.tryoutName} />
            <Row label="Slot" value={`${reg.slotLabel} · ${reg.slotTime}`} />
            <Row label="Date" value={tryout ? formatDate(tryout.date) : "—"} />
            <Row label="Location" value={tryout ? `${tryout.location}, ${tryout.city}` : "—"} />
          </dl>
        </Card>
      </div>
      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold">Status timeline</h2>
        <ol className="mt-5 space-y-5">
          {reg.timeline.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-status-approved/15 text-status-approved">
                {i === reg.timeline.length - 1 ? <Circle className="h-3 w-3 fill-current" /> : <CheckCircle2 className="h-4 w-4" />}
              </span>
              <div><div className="font-semibold">{s.status}</div><div className="text-xs text-muted-foreground">{formatDate(s.at)}</div></div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-border/50 py-1.5 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
