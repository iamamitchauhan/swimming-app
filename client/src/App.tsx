import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

import AppLayout from "./layouts/AppLayout";
import { tokenStorage } from "./lib/api/client";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const AcceptInvitationPage = lazy(() => import("./pages/AcceptInvitationPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

const DashboardPage = lazy(() => import("./pages/app/DashboardPage"));
const ClubsPage = lazy(() => import("./pages/app/ClubsPage"));
const UsersPage = lazy(() => import("./pages/app/UsersPage"));
const TryoutsPage = lazy(() => import("./pages/app/TryoutsPage"));
const TryoutDetailPage = lazy(() => import("./pages/app/TryoutDetailPage"));
const ChildrenPage = lazy(() => import("./pages/app/ChildrenPage"));
const RegistrationsPage = lazy(() => import("./pages/app/RegistrationsPage"));
const ProfilePage = lazy(() => import("./pages/app/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/app/SettingsPage"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!tokenStorage.get()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/invitation/accept" element={<AcceptInvitationPage />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />

        {/* Protected app routes */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/tryouts" element={<TryoutsPage />} />
          <Route path="/tryouts/:id" element={<TryoutDetailPage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
              <div className="max-w-md text-center">
                <h1 className="text-7xl font-bold text-foreground">404</h1>
                <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <a
                  href="/"
                  className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Go home
                </a>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
