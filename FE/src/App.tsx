import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { VerifyEmail } from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import NewSession from "./pages/NewSession";
import InterviewRoom from "./pages/InterviewRoom";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Profile from "./pages/Profile";
import Qna from "./pages/Qna";
import Settings from "./pages/Settings";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import { AppLayout } from "./components/layout/AppLayout";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { OAuthCallback } from "./pages/OAuthCallback";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminLogin } from "./pages/admin/AdminLogin";
import { AdminSignup } from "./pages/admin/AdminSignup";
import { AdminAccess } from "./pages/admin/AdminAccess";
import { AdminQuestionBank } from "./pages/admin/AdminQuestionBank";
import { ScrollToHash } from "./components/layout/ScrollToHash";

const queryClient = new QueryClient();

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
}

// ─── Private Route Guard ──────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Admin Route Guard ────────────────────────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!user?.is_admin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

// ─── App Content (needs to be inside Router to use hooks) ────────────────────
function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider defaultTheme="light" storageKey="interview-prep-theme" isAuthenticated={isAuthenticated}>
      <TooltipProvider>
        <ScrollToHash />
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* Interview room (full screen) — protected */}
          <Route
            path="/app/interview/:id"
            element={
              <PrivateRoute>
                <InterviewRoom />
              </PrivateRoute>
            }
          />
          
          {/* App routes with sidebar — protected */}
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="new" element={<NewSession />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="sessions/:id" element={<SessionDetail />} />
            <Route path="qna" element={<Qna />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="upgrade" element={<Upgrade />} />
          </Route>
          
          {/* Admin routes — protected (admin only) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="questions" element={<AdminQuestionBank />} />
            <Route path="access" element={<AdminAccess />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </ThemeProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
