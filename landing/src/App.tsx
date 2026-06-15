import { Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/Index";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import VerifyOtpPage from "@/pages/VerifyOtp";
import VerifyEmailPage from "@/pages/VerifyEmail";
import DashboardPage from "@/pages/Dashboard";
import ChildrenPage from "@/pages/Children";
import ProfilePage from "@/pages/Profile";
import NotificationsPage from "@/pages/Notifications";
import TryoutsPage from "@/pages/Tryouts";
import TryoutDetailPage from "@/pages/TryoutDetail";
import RegistrationsPage from "@/pages/Registrations";
import RegistrationDetailPage from "@/pages/RegistrationDetail";
import NotFoundPage from "@/pages/NotFound";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/children" element={<ChildrenPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/tryouts" element={<TryoutsPage />} />
          <Route path="/tryouts/:id" element={<TryoutDetailPage />} />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/registrations/:id" element={<RegistrationDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}