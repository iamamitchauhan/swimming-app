import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Hash,
  Loader2,
  MapPin,
  Phone,
  Users,
  XCircle,
} from "lucide-react";
import { useAllClubs, usePendingClubs, useApproveClub, useRejectClub } from "@/hooks/use-clubs";
import { useAuthStore } from "@/lib/auth.store";
import { useApiError } from "@/hooks/use-api-error";
import type { Club } from "@/lib/api/clubs.api";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClubsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === "super_admin";

  const allClubs = useAllClubs();
  const pendingClubs = usePendingClubs();

  const clubs = isSuperAdmin ? (allClubs.data ?? []) : (pendingClubs.data ?? []);
  const isLoading = isSuperAdmin ? allClubs.isLoading : pendingClubs.isLoading;
  const isError = isSuperAdmin ? allClubs.isError : pendingClubs.isError;

  return (
    <PageShell title={isSuperAdmin ? "All Clubs" : "Pending Clubs"}>
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <XCircle className="h-8 w-8" />
          <p className="text-sm">Failed to load clubs. Please refresh.</p>
        </div>
      )}
      {!isLoading && !isError && clubs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Building2 className="h-8 w-8" />
          <p className="text-sm">No clubs found.</p>
        </div>
      )}
      {!isLoading && !isError && clubs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clubs.map((c) => (
            <ClubCard key={c._id} club={c} isSuperAdmin={isSuperAdmin} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ClubCard({ club, isSuperAdmin }: { club: Club; isSuperAdmin: boolean }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const approve = useApproveClub();
  const reject = useRejectClub();
  const { toastError } = useApiError();

  const statusColor: Record<Club["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    pending_review: "bg-warning/15 text-warning-foreground border-warning/30",
    approved: "bg-success/10 text-success border-success/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="h-11 w-11 rounded-xl bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <Badge variant="outline" className={statusColor[club.status]}>
            {club.status.replace("_", " ")}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold">{club.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{club.address}</p>
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{club.phone || <em className="opacity-60">No phone</em>}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {new Date(club.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {club.clubSize && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 shrink-0" />
              <span>{club.clubSize} members</span>
            </div>
          )}
          {club.region && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{club.region}</span>
            </div>
          )}
        </div>
        {club.status === "rejected" && club.rejectionReason && (
          <div className="flex flex-col gap-1.5 text-xs text-destructive bg-destructive/8 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span className="font-bold uppercase tracking-wider">Rejected</span>
            </div>
            <div>
              <span className="font-semibold">Reason:</span>{" "}
              <span className="line-clamp-2">{club.rejectionReason}</span>
            </div>
          </div>
        )}

        {isSuperAdmin && club.status === "pending_review" && (
          <div className="flex gap-2 pt-1 border-t border-border mt-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-success border-success/30 hover:bg-success/10"
              disabled={approve.isPending}
              onClick={() => approve.mutate(club._id, { onError: toastError })}
            >
              {approve.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
            </Button>
          </div>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject "{club.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this club is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || reject.isPending}
              onClick={() =>
                reject.mutate(
                  { id: club._id, reason: reason.trim() },
                  {
                    onSuccess: () => setRejectOpen(false),
                    onError: toastError,
                  },
                )
              }
            >
              {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
