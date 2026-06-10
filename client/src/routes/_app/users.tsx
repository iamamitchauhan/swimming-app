import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Search, UserPlus, XCircle } from "lucide-react";
import { useAllUsers, useUsersByClub } from "@/hooks/use-users";
import { useSendInvitation } from "@/hooks/use-invitations";
import { useAuthStore } from "@/lib/auth.store";
import { useApiError } from "@/hooks/use-api-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/lib/api/users.api";
import type { InvitationRole } from "@/lib/api/invitations.api";

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const clubId = user?.clubId ?? "";

  const allUsers = useAllUsers();
  const clubUsers = useUsersByClub(clubId);

  const users: User[] = isSuperAdmin
    ? (allUsers.data ?? [])
    : (clubUsers.data ?? []);
  const isLoading = isSuperAdmin ? allUsers.isLoading : clubUsers.isLoading;
  const isError = isSuperAdmin ? allUsers.isError : clubUsers.isError;

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const statusBadge = (status: string) => {
    if (status === "active") return "bg-success/10 text-success border-success/20";
    if (status === "pending_verification") return "bg-warning/15 text-warning-foreground border-warning/30";
    return "bg-muted text-muted-foreground";
  };

  return (
    <PageShell
      title="Users"
      actions={
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite user
        </Button>
      }
    >
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <XCircle className="h-8 w-8" />
            <p className="text-sm">Failed to load users. Please refresh.</p>
          </div>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((u) => (
                  <TableRow key={u._id ?? u.id ?? u.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                          {`${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || u.email[0].toUpperCase()}
                        </div>
                        <span className="font-medium">
                          {u.firstName || u.lastName
                            ? `${u.firstName} ${u.lastName}`.trim()
                            : "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge(u.status)}>
                        {u.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </PageShell>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("coach");
  const [emailError, setEmailError] = useState<string | null>(null);
  const sendInvite = useSendInvitation();
  const { toastError } = useApiError();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    sendInvite.mutate(
      { email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail("");
          onClose();
        },
        onError: (err) => {
          toastError(err);
          setEmailError((err as Error).message);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Invite a team member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Email address</Label>
            <Input
              id="inv-email"
              type="email"
              placeholder="jane@club.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? "border-destructive" : ""}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InvitationRole)}>
              <SelectTrigger id="inv-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sendInvite.isPending}>
              {sendInvite.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}