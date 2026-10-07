import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut } from "lucide-react";
import { useCurrentUser, useUpdateMe } from "@/hooks/use-users";
import { useLogout } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";
import { ROLE_LABEL } from "@/lib/utils";

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const updateMe = useUpdateMe();
  const logout = useLogout();
  const { toastError } = useApiError();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  const displayName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : (user?.email ?? "");

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMe.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim() },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          setDirty(false);
        },
        onError: toastError,
      },
    );
  };

  return (
    <PageShell title="Profile" actions={<></>}>
      {isLoading ? (
        <div className="max-w-2xl space-y-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-aqua text-xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">{displayName}</h2>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1.5">
                {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
              </Badge>
            </div>
          </div>

          {/* Personal information */}
          <section className="rounded-xl border border-border bg-card">
            <header className="border-b border-border px-6 py-4">
              <h3 className="text-sm font-semibold">Personal information</h3>
            </header>
            <form onSubmit={saveProfile} className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              {/* <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div> */}
              <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!dirty || updateMe.isPending}>
                  {updateMe.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </PageShell>
  );
}
