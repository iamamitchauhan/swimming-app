import { useState, useEffect } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LogOut } from "lucide-react";
import { useCurrentUser, useUpdateMe } from "@/hooks/use-users";
import { useLogout } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { toast } from "sonner";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Club Admin",
  coach: "Coach",
};

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const updateMe = useUpdateMe();
  const logout = useLogout();
  const { toastError } = useApiError();

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
    <PageShell
      title="Profile"
      actions={
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <><LogOut className="h-4 w-4 mr-1.5" /> Sign out</>
          )}
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border p-6 mb-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-primary to-aqua text-primary-foreground flex items-center justify-center font-bold text-xl">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold tracking-tight">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.email}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Badge variant="secondary">{ROLE_LABEL[user?.role ?? ""] ?? user?.role}</Badge>
          </div>

          <Tabs defaultValue="personal">
            <TabsList>
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="mt-4">
              <form
                onSubmit={saveProfile}
                className="bg-card rounded-xl border border-border p-6 grid sm:grid-cols-2 gap-4 max-w-3xl"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setDirty(true); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setDirty(true); }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Input value={ROLE_LABEL[user?.role ?? ""] ?? user?.role ?? ""} disabled />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFirstName(user?.firstName ?? "");
                      setLastName(user?.lastName ?? "");
                      setDirty(false);
                    }}
                    disabled={!dirty}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!dirty || updateMe.isPending}>
                    {updateMe.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                    ) : "Save changes"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </>
      )}
    </PageShell>
  );
}