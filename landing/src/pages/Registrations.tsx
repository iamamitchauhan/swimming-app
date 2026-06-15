import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RegistrationStatusBadge } from "@/components/registrations/StatusBadge";
import { parentQuery, registrationsQuery, qk } from "@/lib/queries";
import { cancelRegistration } from "@/lib/api/registrations";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export default function RegistrationsPage() {
  const navigate = useNavigate();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: regs = [] } = useQuery(registrationsQuery());
  const qc = useQueryClient();

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelRegistration(id),
    onSuccess: async () => {
      toast.success("Registration cancelled");
      await qc.invalidateQueries({ queryKey: qk.registrations });
      await qc.invalidateQueries({ queryKey: qk.notifications });
    },
  });

  if (!parent) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">My Registrations</h1>
      <p className="mt-1 text-muted-foreground">Track every registration in one place.</p>
      {regs.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-muted-foreground">You haven't registered for any tryouts yet.</p>
          <Button asChild className="btn-cta mt-4"><Link to="/tryouts">Browse tryouts</Link></Button>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3">Child</th><th className="px-4 py-3">Tryout</th><th className="px-4 py-3">Slot</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.childName}</td>
                    <td className="px-4 py-3">{r.tryoutName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.slotLabel} · {r.slotTime}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3"><RegistrationStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button asChild size="sm" variant="outline"><Link to={`/registrations/${r.id}`}>View</Link></Button>
                        {r.status === "pending" && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => cancelMut.mutate(r.id)} disabled={cancelMut.isPending}>Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
