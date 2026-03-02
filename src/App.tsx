// App root component
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Goals from "./pages/Goals";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Encourage from "./pages/Encourage";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import GroupFeed from "./pages/GroupFeed";
import NotFound from "./pages/NotFound";
import Support from "./pages/Support";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { PushNotificationPrompt } from "./components/PushNotificationPrompt";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/encourage" element={<ProtectedRoute><Encourage /></ProtectedRoute>} />
      <Route path="/chat/:friendId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/group/:groupId" element={<ProtectedRoute><GroupFeed /></ProtectedRoute>} />
      <Route path="/support" element={<Support />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function SentryTestButton() {
  if (import.meta.env.MODE !== "development") return null;
  return (
    <button
      onClick={() => { throw new Error("Sentry test error"); }}
      style={{ position: "fixed", bottom: 8, left: 8, zIndex: 9999, fontSize: 10, opacity: 0.6, padding: "4px 8px", background: "#f87171", color: "#fff", borderRadius: 4, border: "none", cursor: "pointer" }}
    >
      Test Sentry
    </button>
  );
}

const App = () => (
  <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center"><div><h1 className="text-xl font-semibold mb-2">Something went wrong</h1><p className="text-muted-foreground">Please refresh the page or try again later.</p></div></div>}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
            <PushNotificationPrompt />
            <SentryTestButton />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Sentry.ErrorBoundary>
);

export default App;
