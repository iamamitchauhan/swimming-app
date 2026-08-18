import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/search-input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { UserRole } from "@/lib/auth.store";
import { useAllUsers, useChangeRole, useRemoveFromClub, useUsersByClub } from "@/hooks/use-users";
import {
  useSendInvitation,
  useResendInvitation,
  useCancelInvitation,
} from "@/hooks/use-invitations";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/auth.store";
import { useApiError } from "@/hooks/use-api-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useParentRegistrations, useRegistrationDetail } from "@/hooks/use-admin-registrations";
import type { AdminRegistration } from "@/lib/api/admin-registrations.api";
import type { User, ClubUserItem } from "@/lib/api/users.api";
import type { InvitationRole, Invitation } from "@/lib/api/invitations.api";
import { ROLE_LABEL, calculateDetailedScoreTotal } from "@/lib/utils";

const ALL_ROLES: UserRole[] = ["super_admin", "admin", "coach", "parent"];
const ALL_STATUSES = ["active", "pending_verification", "suspended"] as const;

export default function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const canInvite = isAdmin || isCoach;
  const clubId = user?.clubId ?? "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const allUsers = useAllUsers(
    isSuperAdmin
      ? {
          page,
          limit,
          search: search.trim() || undefined,
          roles: roles.length ? roles : undefined,
          statuses: statuses.length ? statuses : undefined,
        }
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
  // Parent registrations drawer
  const [parentDrawerUser, setParentDrawerUser] = useState<User | null>(null);
  const sendInvite = useSendInvitation(clubId);
  const resendInvite = useResendInvitation(clubId);
  const cancelInvite = useCancelInvitation(clubId);

  const filteredItems = clubItems.filter((item) => {
    const s = search.toLowerCase();
    const email = item.data.email.toLowerCase();
    const name =
      "firstName" in item.data ? `${item.data.firstName} ${item.data.lastName}`.toLowerCase() : "";
    return email.includes(s) || name.includes(s);
  });

  const displayItems = isSuperAdmin
    ? users.map((u) => ({ type: "user" as const, data: u }))
    : filteredItems;

  const statusBadge = (status: string) => {
    if (status === "active") return "bg-success/10 text-success border-success/20";
    if (status === "pending_verification")
      return "bg-warning/15 text-warning-foreground border-warning/30";
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
    <PageShell title="Users">
      <div className="flex justify-between pb-4">
        <div className="flex gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search users…"
            className="w-lg"
            debounceMs={350}
          />
          {isSuperAdmin && (
            <MultiSelectFilter
              label="All roles"
              options={ALL_ROLES}
              optionLabel={(r) => ROLE_LABEL[r] ?? r}
              selected={roles}
              onChange={(next) => {
                setRoles(next as UserRole[]);
                setPage(1);
              }}
            />
          )}
          {isSuperAdmin && (
            <MultiSelectFilter
              label="All statuses"
              options={[...ALL_STATUSES]}
              optionLabel={(s) => s.replace(/_/g, " ")}
              selected={statuses}
              onChange={(next) => {
                setStatuses(next);
                setPage(1);
              }}
            />
          )}
        </div>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-1.5" /> Invite user
          </Button>
        )}
      </div>
      <div className="bg-card rounded-xl border border-border">
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
        {/* {!isLoading && !isError && isSuperAdmin && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {total} user{total !== 1 ? "s" : ""}
            </span>
          </div>
        )} */}
        {!isLoading && !isError && (
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-900 text-xs uppercase tracking-wide">
                <TableRow>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  {isSuperAdmin && <TableHead className="text-white">Club</TableHead>}
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  {(isAdmin || isSuperAdmin) && (
                    <TableHead className="w-16 text-white">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground py-10">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
                {displayItems.map((item) => {
                  if (item.type === "invitation") {
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
                        {isSuperAdmin && <TableCell className="text-muted-foreground">—</TableCell>}
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {inv.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isExpired
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-warning/10 text-warning-foreground border-warning/30"
                            }
                          >
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
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Canceling…
                                  </>
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
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Resending…
                                  </>
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
                  const isParent = u.role === "parent";
                  return (
                    <TableRow key={`user-${u._id ?? u.id ?? u.email}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                            {`${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() ||
                              u.email[0].toUpperCase()}
                          </div>
                          {isParent ? (
                            <button
                              type="button"
                              onClick={() => setParentDrawerUser(u)}
                              className="font-medium text-left hover:underline underline-offset-4 decoration-primary/50 cursor-pointer"
                            >
                              {u.firstName || u.lastName
                                ? `${u.firstName} ${u.lastName}`.trim()
                                : "—"}
                            </button>
                          ) : (
                            <span className="font-medium">
                              {u.firstName || u.lastName
                                ? `${u.firstName} ${u.lastName}`.trim()
                                : "—"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-muted-foreground">
                          {u.club?.name ?? "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize ${statusBadge(u.status ?? "")}`}
                        >
                          {(u.status ?? "").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      {(isAdmin || isSuperAdmin) && !isCurrentUser && (
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
                            {u.status == "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setRemoveTarget(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
        {!isLoading && !isError && isSuperAdmin && total > 0 && (
          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 text-sm text-gray-600 bg-white/95 backdrop-blur border-t border-gray-100 py-3 px-4">
            <span>
              Showing{" "}
              <span className="font-medium">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-medium">{total}</span> results
            </span>
            <div className="flex items-center gap-2">
              {/* Page size selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer">
                    {limit}
                    <span className="text-gray-500">/ page</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {[5, 10, 20, 50, 100].map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => {
                        setLimit(size);
                        setPage(1);
                      }}
                    >
                      {size}
                      {limit === size && (
                        <CheckCircle2 className="h-4 w-4 ml-auto text-green-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        sendInvite={sendInvite}
      />

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

      <ParentRegistrationsSheet
        parent={parentDrawerUser}
        onClose={() => setParentDrawerUser(null)}
      />
    </PageShell>
  );
}

function InviteDialog({
  open,
  onClose,
  sendInvite,
}: {
  open: boolean;
  onClose: () => void;
  sendInvite: ReturnType<typeof useSendInvitation>;
}) {
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
          console.info("err =>", err);

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
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                "Send invitation"
              )}
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
            <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
              {user?.role}
            </Badge>
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
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Save"
            )}
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
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing…
              </>
            ) : (
              "Yes, remove"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Parent registrations drawer ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  registered: "bg-success/10 text-success border-success/20",
  offered: "bg-primary/10 text-primary border-primary/30",
  waitlisted: "bg-warning/15 text-warning-foreground border-warning/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function tryoutName(reg: AdminRegistration): string {
  const t = reg.tryoutId;
  return typeof t === "string" ? "—" : t.name || "—";
}

function tryoutStatus(reg: AdminRegistration): string {
  const t = reg.tryoutId;
  return typeof t === "string" ? "" : t.status || "";
}

function swimmerName(reg: AdminRegistration): string {
  if (typeof reg.swimmerId === "string") {
    return `${reg.swimmerDetails.firstName} ${reg.swimmerDetails.lastName}`.trim();
  }
  return `${reg.swimmerId.firstName} ${reg.swimmerId.lastName}`.trim();
}

function slotLabel(reg: AdminRegistration): string {
  const slot = reg.slotId;
  const session = reg.sessionId;
  const date =
    typeof slot === "object" && slot.sessionDate
      ? slot.sessionDate
      : typeof session === "object" && session.date
        ? session.date
        : "";
  const start =
    typeof slot === "object" && slot.startTime
      ? slot.startTime
      : typeof session === "object" && session.startTime
        ? session.startTime
        : "";
  const end =
    typeof slot === "object" && slot.endTime
      ? slot.endTime
      : typeof session === "object" && session.endTime
        ? session.endTime
        : "";
  const dateStr = date ? new Date(date).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "";
  const timeStr = start && end ? `${start}–${end}` : start;
  return [dateStr, timeStr].filter(Boolean).join(" · ") || "—";
}

function ParentRegistrationsSheet({
  parent,
  onClose,
}: {
  parent: User | null;
  onClose: () => void;
}) {
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);

  // Reset detail selection whenever the drawer target changes
  useEffect(() => {
    setSelectedRegId(null);
  }, [parent?._id]);

  const parentId = parent?._id ?? parent?.id ?? null;
  const list = useParentRegistrations(parentId);
  const detail = useRegistrationDetail(selectedRegId);

  const open = !!parent;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          {selectedRegId ? (
            <button
              type="button"
              onClick={() => setSelectedRegId(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft className="h-4 w-4" /> Back to kids
            </button>
          ) : (
            <SheetDescription className="text-xs uppercase tracking-wide">
              Parent registrations
            </SheetDescription>
          )}
          <SheetTitle className="text-left">
            {selectedRegId
              ? "Registration details"
              : parent
                ? `${parent.firstName} ${parent.lastName}`.trim()
                : ""}
          </SheetTitle>
          {parent && !selectedRegId && (
            <p className="text-sm text-muted-foreground text-left">{parent.email}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {!selectedRegId ? (
            <ParentKidsList
              isLoading={list.isLoading}
              isError={list.isError}
              registrations={list.data ?? []}
              onSelect={setSelectedRegId}
            />
          ) : (
            <RegistrationDetailView
              isLoading={detail.isLoading}
              isError={detail.isError}
              registration={detail.data}
              onBack={() => setSelectedRegId(null)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ParentKidsList({
  isLoading,
  isError,
  registrations,
  onSelect,
}: {
  isLoading: boolean;
  isError: boolean;
  registrations: AdminRegistration[];
  onSelect: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <XCircle className="h-8 w-8" />
        <p className="text-sm">Failed to load registrations. Please try again.</p>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <p className="text-sm">No registrations found for this parent.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {registrations.map((reg) => {
        const name = swimmerName(reg);
        const total = reg.scores?.totalScore ?? calculateDetailedScoreTotal(reg.detailedScores);
        return (
          <li key={reg._id}>
            <button
              type="button"
              onClick={() => onSelect(reg._id)}
              className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors flex items-center gap-3 cursor-pointer"
            >
              <div className="h-9 w-9 rounded-full bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{name}</span>
                  <Badge
                    variant="outline"
                    className={`capitalize text-[10px] px-1.5 py-0 ${STATUS_BADGE[reg.status] ?? ""}`}
                  >
                    {reg.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {tryoutName(reg)} · {slotLabel(reg)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {typeof total === "number" && (
                  <span className="text-xs font-medium text-muted-foreground">Score: {total}</span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RegistrationDetailView({
  isLoading,
  isError,
  registration,
  onBack,
}: {
  isLoading: boolean;
  isError: boolean;
  registration?: AdminRegistration;
  onBack: () => void;
}) {
  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError || !registration) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <XCircle className="h-8 w-8" />
        <p className="text-sm">Failed to load registration details.</p>
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to kids
        </Button>
      </div>
    );
  }

  const total =
    registration.scores?.totalScore ?? calculateDetailedScoreTotal(registration.detailedScores);
  const detailedEntries = Object.entries(registration.detailedScores ?? {});

  return (
    <div className="p-6 space-y-6">
      {/* Swimmer summary */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {swimmerName(registration).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{swimmerName(registration)}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {tryoutName(registration)}
              {tryoutStatus(registration) ? ` · ${tryoutStatus(registration)}` : ""}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`capitalize ml-auto ${STATUS_BADGE[registration.status] ?? ""}`}
          >
            {registration.status}
          </Badge>
        </div>
      </section>

      {/* Tryout / slot info */}
      <DetailSection title="Schedule">
        <DetailRow label="Slot" value={slotLabel(registration)} />
        <DetailRow label="Segment" value={registration.segmentId || "—"} />
        <DetailRow
          label="Registered at"
          value={new Date(registration.registeredAt).toLocaleString()}
        />
        {registration.waitlistPosition != null && (
          <DetailRow label="Waitlist position" value={String(registration.waitlistPosition)} />
        )}
      </DetailSection>

      {/* Swimmer details */}
      <DetailSection title="Swimmer details">
        <DetailRow
          label="Age on tryout day"
          value={String(registration.swimmerDetails.ageOnTryoutDay)}
        />
        <DetailRow label="DOB" value={registration.swimmerDetails.dob || "—"} />
        <DetailRow
          label="USA membership"
          value={registration.swimmerDetails.hasUsaMembership ? "Yes" : "No"}
        />
        {registration.swimmerDetails.hasUsaMembership && (
          <DetailRow
            label="USA membership ID"
            value={registration.swimmerDetails.usaMembershipId || "—"}
          />
        )}
        {registration.swimmerDetails.clubName && (
          <DetailRow label="Club" value={registration.swimmerDetails.clubName} />
        )}
        <DetailRow label="Guardian" value={registration.swimmerDetails.guardianName} />
        <DetailRow label="Guardian email" value={registration.swimmerDetails.guardianEmail} />
        <DetailRow
          label="USA verification"
          value={(registration.usaVerificationStatus ?? "pending").replace(/_/g, " ")}
        />
      </DetailSection>

      {/* Scores */}
      <DetailSection title="Scores">
        {typeof total === "number" ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="text-xs text-muted-foreground">total score</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">No scores recorded yet.</p>
        )}
        {registration.scores && (
          <div className="grid grid-cols-2 gap-2">
            <ScoreChip label="Freestyle" value={registration.scores.freestyle} />
            <ScoreChip label="Backstroke" value={registration.scores.backstroke} />
            <ScoreChip label="Breaststroke" value={registration.scores.breaststroke} />
            <ScoreChip label="Butterfly" value={registration.scores.butterfly} />
          </div>
        )}
      </DetailSection>

      {/* Detailed per-criterion scores */}
      {detailedEntries.length > 0 && (
        <DetailSection title="Detailed scores">
          <div className="grid grid-cols-2 gap-2">
            {detailedEntries.map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground capitalize truncate mr-2">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Coach recommendation & notes */}
      <DetailSection title="Coach notes">
        <DetailRow label="Recommendation" value={registration.coachRecommendation || "—"} />
        <DetailRow label="Notes" value={registration.notes || "—"} />
      </DetailSection>

      {/* Dynamic answers */}
      {registration.dynamicAnswers && registration.dynamicAnswers.length > 0 && (
        <DetailSection title="Registration answers">
          {registration.dynamicAnswers.map((ans, i) => (
            <DetailRow
              key={i}
              label={ans.label}
              value={Array.isArray(ans.value) ? ans.value.join(", ") : String(ans.value)}
            />
          ))}
        </DetailSection>
      )}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}

function ScoreChip({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 text-xs flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value != null ? value : "—"}</span>
    </div>
  );
}

// ─── Multi-select filter dropdown ─────────────────────────────────────────────

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  optionLabel: (value: string) => string;
  selected: string[];
  onChange: (next: string[]) => void;
}

function MultiSelectFilter({ label, options, optionLabel, selected, onChange }: MultiSelectFilterProps) {
  const selectedSet = new Set(selected);
  // `selected = []` is treated as "all selected" visually so that no filter
  // is sent to the backend (which keeps results unfiltered by this dimension).
  const isAllSelected = selected.length === 0;
  const checkedSet = new Set(isAllSelected ? options : selected);

  function toggle(value: string) {
    if (isAllSelected) {
      onChange(options.filter((v) => v !== value));
      return;
    }
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    if (next.size === options.length) {
      onChange([]);
    } else {
      onChange(Array.from(next));
    }
  }

  const triggerLabel = isAllSelected
    ? label
    : selected.length <= 2
      ? selected.map(optionLabel).join(", ")
      : `${selected.slice(0, 2).map(optionLabel).join(", ")} +${selected.length - 2} more`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center gap-2 cursor-pointer w-56 justify-between">
          <span className="truncate capitalize">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onChange([])} className="cursor-pointer">
          {label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={checkedSet.has(opt)}
            onCheckedChange={() => toggle(opt)}
            onSelect={(e) => e.preventDefault()}
            className="cursor-pointer capitalize"
          >
            {optionLabel(opt)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
