import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { StoresProvider, useStores } from "@/hooks/useStores";
import AppLayout from "@/components/AppLayout";
import { LeadsProvider } from "@/hooks/useLeads";
import { DataSkeleton } from "@/components/ui/DataSkeleton";

import Dashboard from "@/pages/Dashboard";
import Funil from "@/pages/Funil";
import WhatsAppPage from "@/pages/WhatsApp";
import Contatos from "@/pages/Contatos";
import Configuracoes from "@/pages/Configuracoes";
import ConfiguracoesLoja from "@/pages/ConfiguracoesLoja";
import WhatsAppConfig from "@/pages/WhatsAppConfig";
import Tarefas from "@/pages/Tarefas";
import Agenda from "@/pages/Agenda";
import Ranking from "@/pages/Ranking";
import Planos from "@/pages/Planos";
import Parceiro from "@/pages/Parceiro";
import Ajuda from "@/pages/Ajuda";
import NotFound from "@/pages/NotFound";

// Auth-only pages: lazy (logged users never revisit them)
const AuthPage = lazy(() => import("./pages/Auth"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const AceitarConvitePage = lazy(() => import("./pages/AceitarConvite"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const AdminPage = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function FullscreenAuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { stores, loading: storesLoading } = useStores();
  if (loading || storesLoading) {
    return (
      <div className="min-h-screen w-full p-6 bg-background">
        <DataSkeleton variant="row" count={1} className="mb-6" />
        <DataSkeleton variant="card" count={4} />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (stores.length === 0) return <Navigate to="/onboarding" replace />;
  return <LeadsProvider>{children}</LeadsProvider>;
}

const AuthFallback = () => (
  <div className="min-h-screen w-full p-6 bg-background">
    <DataSkeleton variant="row" count={1} className="mb-6" />
    <DataSkeleton variant="card" count={3} />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <StoresProvider>
              <Routes>
                <Route
                  path="/auth"
                  element={
                    <Suspense fallback={<AuthFallback />}>
                      <AuthPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <Suspense fallback={<AuthFallback />}>
                      <OnboardingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/aceitar-convite/:token"
                  element={
                    <Suspense fallback={<AuthFallback />}>
                      <AceitarConvitePage />
                    </Suspense>
                  }
                />
                <Route
                  path="/reset-password"
                  element={
                    <Suspense fallback={<AuthFallback />}>
                      <ResetPasswordPage />
                    </Suspense>
                  }
                />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/whatsapp" element={<WhatsAppPage />} />
                  <Route path="/funil" element={<Funil />} />
                  <Route path="/tarefas" element={<Tarefas />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/contatos" element={<Contatos />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/configuracoes-loja" element={<ConfiguracoesLoja />} />
                  <Route path="/whatsapp-config" element={<WhatsAppConfig />} />
                  <Route path="/planos" element={<Planos />} />
                  <Route path="/parceiro" element={<Parceiro />} />
                  <Route path="/ajuda" element={<Ajuda />} />
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<AuthFallback />}>
                        <AdminPage />
                      </Suspense>
                    }
                  />
                </Route>
                <Route
                  path="/ranking"
                  element={
                    <FullscreenAuthGate>
                      <Ranking />
                    </FullscreenAuthGate>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </StoresProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
