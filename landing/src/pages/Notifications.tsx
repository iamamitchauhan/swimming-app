import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { notificationsQuery, parentQuery, qk } from "@/lib/queries";
import { markAllNotificationsRead } from "@/lib/api/registrations";
import { formatDate } from "@/lib/format";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: parent, isLoading } = useQuery(parentQuery());
  const { data: notes = [] } = useQuery({ ...notificationsQuery(), enabled: !!parent });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });

  useEffect(() => { if (!isLoading && !parent) navigate("/login"); }, [isLoading, parent, navigate]);
  useEffect(() => { if (notes.some((n) => !n.read)) markRead.mutate(); /* eslint-disable-next-line */ }, [notes.length]);

  if (!parent) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Notifications</h1>
      <p className="mt-1 text-muted-foreground">Updates on your registrations.</p>
      {notes.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 p-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </Card>
      ) : (
        <div className="mt-8 space-y-2">
          {notes.map((n) => (
            <Card key={n.id} className="flex items-start gap-3 p-4">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary"><Bell className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{n.title}</h3>
                  <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
