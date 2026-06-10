import { Bell, Settings, ChevronRight, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/auth.store";
import { useLogout } from "@/hooks/use-auth";

interface Crumb { label: string; href?: string }

export function AppHeader({ title, crumbs = [] }: { title: string; crumbs?: Crumb[] }) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || "?";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "—";

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center gap-3 px-4 lg:px-6">
      <SidebarTrigger className="lg:hidden" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">Home</Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" />
              {c.href ? (
                <Link to={c.href} className="hover:text-foreground">{c.label}</Link>
              ) : (
                <span className="text-foreground font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">{title}</h1>
      </div>

      <div className="hidden md:flex relative w-64 lg:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tryouts, swimmers…" className="pl-9 bg-muted/40 border-transparent focus-visible:bg-background h-9" />
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9 relative">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:inline-flex" asChild>
        <Link to="/settings"><Settings className="h-[18px] w-[18px]" /></Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-9 w-9 rounded-full bg-linear-to-br from-primary to-aqua flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-90 transition">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-semibold">{displayName}</div>
            <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logoutMutation.mutate()}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}