import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { ScrollToHash } from "./components/layout/ScrollToHash";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail").then((module) => ({ default: module.VerifyEmail })));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewSession = lazy(() => import("./pages/NewSession"));
const InterviewRoom = lazy(() => import("./pages/InterviewRoom"));
const Sessions = lazy(() => import("./pages/Sessions"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Plan = lazy(() => import("./pages/Plan"));
const Qna = lazy(() => import("./pages/Qna"));
const Settings = lazy(() => import("./pages/Settings"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AppLayout = lazy(() => import("./components/layout/AppLayout").then((module) => ({ default: module.AppLayout })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then((module) => ({ default: module.ResetPassword })));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback").then((module) => ({ default: module.OAuthCallback })));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin").then((module) => ({ default: module.AdminLogin })));
const AdminSignup = lazy(() => import("./pages/admin/AdminSignup").then((module) => ({ default: module.AdminSignup })));
const AdminAccess = lazy(() => import("./pages/admin/AdminAccess").then((module) => ({ default: module.AdminAccess })));
const AdminQuestionBank = lazy(() => import("./pages/admin/AdminQuestionBank").then((module) => ({ default: module.AdminQuestionBank })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSessions = lazy(() => import("./pages/admin/AdminSessions"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));


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
        <Suspense fallback={<LoadingSpinner />}>
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
              <Route path="plan" element={<Plan />} />
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
              <Route path="users" element={<AdminUsers />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="revenue" element={<AdminRevenue />} />
              <Route path="access" element={<AdminAccess />} />
            </Route>

            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
