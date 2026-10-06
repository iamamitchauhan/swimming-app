import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, getSidebarStateFromCookie } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMe } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { ClubUnderReview } from "@/components/club-under-review";
import { useIsCompact } from "@/hooks/use-mobile";

export default function AppLayout() {
  const { user } = useAuthStore();
  useMe();

  const isAdmin = user?.role === "admin";
  const { data: onboarding } = useOnboardingStatus({ enabled: isAdmin });
  // Both values are read synchronously on the first render, so there is no
  // flash of an open sidebar. Compact viewports (phones/tablets) always start
  // closed; on desktop the last choice is restored from the cookie that
  // `SidebarProvider` writes on every toggle.
  const isCompact = useIsCompact();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    isCompact ? false : (getSidebarStateFromCookie() ?? true),
  );

  useEffect(() => {
    if (isCompact) setSidebarOpen(false);
  }, [isCompact]);

  if (isAdmin && onboarding?.club?.status === "pending_review") {
    return <ClubUnderReview clubName={onboarding.club.name} />;
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
