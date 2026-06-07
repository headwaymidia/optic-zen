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

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Funil = lazy(() => import("@/pages/Funil"));
const WhatsAppPage = lazy(() => import("@/pages/WhatsApp"));
const Contatos = lazy(() => import("@/pages/Contatos"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const ConfiguracoesLoja = lazy(() => import("@/pages/ConfiguracoesLoja"));
const WhatsAppConfig = lazy(() => import("@/pages/WhatsAppConfig"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));
const Agenda = lazy(() => import("@/pages/Agenda"));
const Ranking = lazy(() => import("@/pages/Ranking"));
const Planos = lazy(() => import("@/pages/Planos"));
const Parceiro = lazy(() => import("@/pages/Parceiro"));
const Ajuda = lazy(() => import("@/pages/Ajuda"));
const Logs = lazy(() => import("@/pages/Logs"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Auth-only pages: lazy (logged users never revisit them)
const AuthPage = lazy(() => import("./pages/Auth"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const AceitarConvitePage = lazy(() => import("./pages/AceitarConvite"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const AdminPage = lazy(() => import("./pages/Admin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
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
                  <Route path="/" element={<Suspense fallback={<AuthFallback />}><Dashboard /></Suspense>} />
                  <Route path="/whatsapp" element={<Suspense fallback={<AuthFallback />}><WhatsAppPage /></Suspense>} />
                  <Route path="/funil" element={<Suspense fallback={<AuthFallback />}><Funil /></Suspense>} />
                  <Route path="/tarefas" element={<Suspense fallback={<AuthFallback />}><Tarefas /></Suspense>} />
                  <Route path="/agenda" element={<Suspense fallback={<AuthFallback />}><Agenda /></Suspense>} />
                  <Route path="/contatos" element={<Suspense fallback={<AuthFallback />}><Contatos /></Suspense>} />
                  <Route path="/configuracoes" element={<Suspense fallback={<AuthFallback />}><Configuracoes /></Suspense>} />
                  <Route path="/configuracoes-loja" element={<Suspense fallback={<AuthFallback />}><ConfiguracoesLoja /></Suspense>} />
                  <Route path="/whatsapp-config" element={<Suspense fallback={<AuthFallback />}><WhatsAppConfig /></Suspense>} />
                  <Route path="/planos" element={<Suspense fallback={<AuthFallback />}><Planos /></Suspense>} />
                  <Route path="/parceiro" element={<Suspense fallback={<AuthFallback />}><Parceiro /></Suspense>} />
                  <Route path="/ajuda" element={<Suspense fallback={<AuthFallback />}><Ajuda /></Suspense>} />
                  <Route path="/logs" element={<Suspense fallback={<AuthFallback />}><Logs /></Suspense>} />
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
