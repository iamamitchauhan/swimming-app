import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMe } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { ClubUnderReview } from "@/components/club-under-review";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout() {
  const { user } = useAuthStore();
  useMe();

  const isAdmin = user?.role === "admin";
  const { data: onboarding } = useOnboardingStatus({ enabled: isAdmin });
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

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
