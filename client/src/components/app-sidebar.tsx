import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Waves,
  Settings,
  UserCog,
  Baby,
  CalendarRange,
  User as UserIcon,
  Trophy,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo } from "./brand-logo";
import { useAuthStore } from "@/lib/auth.store";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Club Admin",
  coach: "Coach",
  parent: "Parent",
};

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const MENUS: Record<string, Item[]> = {
  super_admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Users", url: "/users", icon: Users },
    { title: "Clubs", url: "/clubs", icon: Building2 },
    { title: "Tryouts", url: "/tryouts", icon: Waves },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  admin: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Club Management", url: "/clubs", icon: Building2 },
    { title: "Coaches", url: "/users", icon: UserCog },
    { title: "Tryouts", url: "/tryouts", icon: Waves },
    { title: "Profile", url: "/profile", icon: UserIcon },
  ],
  coach: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "My Tryouts", url: "/tryouts", icon: Waves },
    { title: "Profile", url: "/profile", icon: UserIcon },
  ],
  parent: [
    { title: "My Children", url: "/children", icon: Baby },
    { title: "Tryouts", url: "/tryouts", icon: Waves },
    { title: "My Registrations", url: "/registrations", icon: CalendarRange },
    { title: "Profile", url: "/profile", icon: UserIcon },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "parent";
  const { pathname } = useLocation();
  const items = MENUS[role] ?? MENUS["parent"];
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || "?";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "—";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border h-16 px-4 flex items-center justify-center">
        {collapsed ? (
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-aqua flex items-center justify-center">
            <Waves className="h-4 w-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <BrandLogo />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 rounded-lg data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
              Quick links
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-10 rounded-lg">
                    <Link to="/tryouts" className="flex items-center gap-3">
                      <Trophy className="h-[18px] w-[18px]" />
                      <span>Results</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-1">
            <div className="h-9 w-9 rounded-full bg-linear-to-br from-primary to-aqua flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
                {ROLE_LABEL[role] ?? role}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 mx-auto rounded-full bg-linear-to-br from-primary to-aqua flex items-center justify-center text-primary-foreground font-semibold text-xs">
            {initials}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}