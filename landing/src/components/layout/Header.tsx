import { Link, NavLink, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, User, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { notificationsQuery, parentQuery, qk } from "@/lib/queries";
import { logout } from "@/lib/api/auth";

export function Header() {
  const { data: parent } = useQuery(parentQuery());
  const { data: notes = [] } = useQuery({ ...notificationsQuery(), enabled: !!parent });
  const unread = notes.filter((n) => !n.read).length;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const logoutMut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      qc.setQueryData(qk.parent, null);
      await qc.invalidateQueries();
      navigate("/");
    },
  });

  const initials = parent && `${parent.firstName[0] ?? ""}${parent.lastName[0] ?? ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-hero-gradient text-white shadow-soft"><Waves className="h-5 w-5" /></span>
          <span className="font-display text-lg font-bold tracking-tight">SwimTryouts</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <HeaderLink to="/" end>Home</HeaderLink>
          <HeaderLink to="/tryouts">Tryouts</HeaderLink>
          {parent ? (
            <>
              <HeaderLink to="/dashboard">Dashboard</HeaderLink>
              <HeaderLink to="/registrations">My Registrations</HeaderLink>
            </>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {parent ? (
            <>
              {/* <Button asChild variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Link to="/notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-cta text-[10px] font-bold text-cta-foreground">{unread}</span>}
                </Link>
              </Button> */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-muted">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback></Avatar>
                    <span className="hidden text-sm font-medium sm:inline">{parent.firstName}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-semibold">{parent.firstName} {parent.lastName}</div>
                    <div className="truncate text-xs text-muted-foreground">{parent.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem asChild><Link to="/dashboard">Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/registrations">My Registrations</Link></DropdownMenuItem> */}
                  {/* <DropdownMenuItem asChild><Link to="/children">My Children</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile">Profile Settings</Link></DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logoutMut.mutate()}><LogOut className="mr-2 h-4 w-4" /> Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Login</Link></Button>
              <Button asChild className="btn-cta hidden sm:inline-flex"><Link to="/register">Get Started</Link></Button>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-primary" /> SwimTryouts</SheetTitle></SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                <MobileLink to="/" end>Home</MobileLink>
                <MobileLink to="/tryouts">Tryouts</MobileLink>
                {parent ? (
                  <>
                    <MobileLink to="/dashboard">Dashboard</MobileLink>
                    {/* <MobileLink to="/registrations">My Registrations</MobileLink>
                    <MobileLink to="/children">My Children</MobileLink>
                    <MobileLink to="/profile">Profile Settings</MobileLink>
                    <MobileLink to="/notifications">Notifications {unread > 0 && <Badge className="ml-1">{unread}</Badge>}</MobileLink> */}
                  </>
                ) : (
                  <>
                    <MobileLink to="/login">Login</MobileLink>
                    <MobileLink to="/register">Create account</MobileLink>
                  </>
                )}
              </div>
              {parent && <Button variant="outline" className="mt-6 w-full" onClick={() => logoutMut.mutate()}><User className="mr-2 h-4 w-4" /> Logout</Button>}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground ${isActive ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
      {children}
    </NavLink>
  );
}

function MobileLink({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-muted ${isActive ? "bg-muted text-primary" : "text-foreground"}`}>
      {children}
    </NavLink>
  );
}
