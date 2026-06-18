import { useState, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Plus, Search, Shield, Trash2, UserPlus, XCircle } from "lucide-react";
import { useAllUsers, useChangeRole, useRemoveFromClub, useUsersByClub } from "@/hooks/use-users";
import { useSendInvitation, useResendInvitation, useCancelInvitation } from "@/hooks/use-invitations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/lib/auth.store";
import { useApiError } from "@/hooks/use-api-error";
import { Skeleton } from "@/components/ui/skeleton";
import type { User, ClubUserItem } from "@/lib/api/users.api";
import type { InvitationRole, Invitation } from "@/lib/api/invitations.api";
import { ROLE_LABEL } from "@/lib/utils";

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const canInvite = isAdmin || isCoach ;
  const clubId = user?.clubId ?? "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const allUsers = useAllUsers(
    isSuperAdmin
      ? { page, limit: PAGE_SIZE, search: debouncedSearch || undefined }
      : undefined,
  );
  const clubUsers = useUsersByClub(clubId);
  const changeRole = useChangeRole(clubId);
  const removeFromClub = useRemoveFromClub(clubId);

  const clubItems: ClubUserItem[] = clubUsers.data ?? [];
  const users: User[] = isSuperAdmin ? (allUsers.data?.users ?? []) : [];
  const totalPages = allUsers.data?.totalPages ?? 1;
  const total = allUsers.data?.total ?? 0;
  const isLoading = isSuperAdmin ? allUsers.isLoading : clubUsers.isLoading;
  const isError = isSuperAdmin ? allUsers.isError : clubUsers.isError;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const sendInvite = useSendInvitation(clubId);
  const resendInvite = useResendInvitation(clubId);
  const cancelInvite = useCancelInvitation(clubId);

  const filteredItems = clubItems.filter((item) => {
    const s = search.toLowerCase();
    const email = item.data.email.toLowerCase();
    const name = 'firstName' in item.data
      ? `${item.data.firstName} ${item.data.lastName}`.toLowerCase()
      : '';
    return email.includes(s) || name.includes(s);
  });

  const displayItems = isSuperAdmin
    ? users.map((u) => ({ type: 'user' as const, data: u }))
    : filteredItems;

    

  const statusBadge = (status: string) => {
    if (status === "active") return "bg-success/10 text-success border-success/20";
    if (status === "pending_verification") return "bg-warning/15 text-warning-foreground border-warning/30";
    return "bg-muted text-muted-foreground";
  };

  const handleRoleSave = (newRole: string) => {
    if (!roleTarget) return;
    changeRole.mutate(
      { userId: roleTarget._id, role: newRole },
      { onSuccess: () => setRoleTarget(null) },
    );
  };

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    removeFromClub.mutate(removeTarget._id, {
      onSuccess: () => setRemoveTarget(null),
    });
  };


  return (
    <PageShell
      title="Users"
      actions={
       <>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite user
          </Button>
        )}
       </>
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
        {!isLoading && !isError && isSuperAdmin && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
            <span>{total} user{total !== 1 ? "s" : ""}</span>
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
                  {(isAdmin || isSuperAdmin) && <TableHead className="w-16">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {displayItems.map((item) => {
                  if (item.type === 'invitation') {
                    const inv = item.data as Invitation;
                    const isExpired = new Date(inv.expiresAt) < new Date();
                    return (
                      <TableRow key={`inv-${inv._id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                              {inv.email[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-muted-foreground">—</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{inv.email}</TableCell>
                        <TableCell>
                          <span className="font-medium text-muted-foreground">{inv.club?.name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{inv.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isExpired ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning-foreground border-warning/30"}>
                            {isExpired ? "Expired" : "Pending Invitation"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!isExpired && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelInvite.mutate(inv._id)}
                                disabled={cancelInvite.isPending}
                                className="h-8 text-xs text-destructive hover:text-destructive"
                              >
                                {cancelInvite.isPending ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Canceling…</>
                                ) : (
                                  <>Cancel</>
                                )}
                              </Button>
                            )}
                            {isExpired && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendInvite.mutate(inv._id)}
                                disabled={resendInvite.isPending}
                                className="h-8 text-xs"
                              >
                                {resendInvite.isPending ? (
                                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Resending…</>
                                ) : (
                                  <>Resend</>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  }
                  const u = item.data as User;
                  const isCurrentUser = u._id === user?._id || u.email === user?.email;
                  return (
                    <TableRow key={`user-${u._id ?? u.id ?? u.email}`}>
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
                        <Badge variant="secondary">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge(u.status ?? "")}>
                          {(u.status ?? "").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      {(isAdmin || isSuperAdmin) && !isCurrentUser  && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setRoleTarget(u)}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            {u.status == "active" && <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setRemoveTarget(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>}
                          </div>
                        </TableCell>
                      )}
                      {isAdmin && isCurrentUser && <TableCell />}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!isLoading && !isError && isSuperAdmin && totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} sendInvite={sendInvite} />

      <ChangeRoleDialog
        user={roleTarget}
        onClose={() => setRoleTarget(null)}
        onSave={handleRoleSave}
        isPending={changeRole.isPending}
      />

      <ConfirmRemoveDialog
        user={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
        isPending={removeFromClub.isPending}
      />
    </PageShell>
  );
}

function InviteDialog({ open, onClose, sendInvite }: { open: boolean; onClose: () => void; sendInvite: ReturnType<typeof useSendInvitation> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("coach");
  const [emailError, setEmailError] = useState<string | null>(null);
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
          console.info('err =>',err);
          
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

function ChangeRoleDialog({
  user,
  onClose,
  onSave,
  isPending,
}: {
  user: User | null;
  onClose: () => void;
  onSave: (role: string) => void;
  isPending: boolean;
}) {
  const ALL_ROLES = ["admin", "coach", "parent"];
  const available = ALL_ROLES.filter((r) => r !== user?.role);
  const [selectedRole, setSelectedRole] = useState<string>(available[0] ?? "");

  useEffect(() => {
    setSelectedRole(available[0] ?? "");
  }, [user?.role]);

  const handleSave = () => {
    if (selectedRole) onSave(selectedRole);
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Change role
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Change role for <span className="font-medium text-foreground">{user?.email}</span>:
          </p>
          <div className="flex items-center justify-center gap-3 py-4">
            <Badge variant="secondary" className="capitalize text-sm px-3 py-1">{user?.role}</Badge>
            <span className="text-muted-foreground">→</span>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {available.map((role) => (
                  <SelectItem key={role} value={role} className="capitalize">
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || !selectedRole}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmRemoveDialog({
  user,
  onClose,
  onConfirm,
  isPending,
}: {
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Remove
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground flex items-start">
            Are you sure you want to remove{" "}
            <b className="font-medium text-foreground ml-1">{user?.email}</b>?
          </p>
          <p className="text-xs text-muted-foreground">
            Their account will be suspended and they will lose access immediately.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing…</> : "Yes, remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}