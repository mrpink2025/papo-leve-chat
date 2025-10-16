// Signed by Mr_Pink — Nosso Papo (nossopapo.net)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Code splitting com React.lazy para reduzir bundle inicial
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const Install = lazy(() => import("./pages/Install"));
const Share = lazy(() => import("./pages/Share"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Contacts = lazy(() => import("./pages/Contacts"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useRegisterSW } from "virtual:pwa-register/react";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { NotificationPermissionGuard } from "./components/NotificationPermissionGuard";
import { GlobalIncomingCallOverlay } from "./components/GlobalIncomingCallOverlay";
import { Loader2 } from "lucide-react";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Configuração otimizada do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
      gcTime: 10 * 60 * 1000, // 10 minutos - tempo no cache (antes era cacheTime)
      retry: 1, // Tentar apenas 1 vez em caso de erro
      refetchOnWindowFocus: false, // Não refetch ao focar janela
      refetchOnReconnect: true, // Refetch ao reconectar
    },
  },
});

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useTheme();
  return <>{children}</>;
};

const PWAProvider = ({ children }: { children: React.ReactNode }) => {
  useOnlineStatus();
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("[PWA] Service Worker Registered:", r);
    },
    onRegisterError(error) {
      console.error("[PWA] SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace />;
  }

  return (
    <>
      {children}
      <NotificationPermissionGuard />
      <GlobalIncomingCallOverlay />
    </>
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <PWAProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallBanner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Rotas públicas */}
                <Route 
                  path="/" 
                  element={
                    <PublicRoute>
                      <Landing />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/entrar" 
                  element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/criar-conta" 
                  element={
                    <PublicRoute>
                      <Auth />
                    </PublicRoute>
                  } 
                />
                <Route path="/install" element={<Install />} />
                <Route path="/share" element={<Share />} />

                {/* Rotas protegidas */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/chat/:id"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/configuracoes"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/configuracoes/notificacoes"
                  element={
                    <ProtectedRoute>
                      <NotificationSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/contatos"
                  element={
                    <ProtectedRoute>
                      <Contacts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app/configuracoes/privacidade"
                  element={
                    <ProtectedRoute>
                      <PrivacySettings />
                    </ProtectedRoute>
                  }
                />

                {/* Redirecionar rotas antigas para manter compatibilidade */}
                <Route 
                  path="/chat/:id" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } 
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </PWAProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
