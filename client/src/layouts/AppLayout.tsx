import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMe } from "@/hooks/use-auth";
import { useAuthStore } from "@/lib/auth.store";
import { useOnboardingStatus } from "@/hooks/use-onboarding";
import { ClubUnderReview } from "@/components/club-under-review";

export default function AppLayout() {
  const { user } = useAuthStore();
  useMe();

  const isAdmin = user?.role === "admin";
  const { data: onboarding } = useOnboardingStatus({ enabled: isAdmin });

  if (isAdmin && onboarding?.club?.status === "pending_review") {
    return <ClubUnderReview clubName={onboarding.club.name} />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
