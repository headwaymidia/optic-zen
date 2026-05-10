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

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Funil = lazy(() => import("./pages/Funil"));
const WhatsAppPage = lazy(() => import("./pages/WhatsApp"));
const Contatos = lazy(() => import("./pages/Contatos"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const ConfiguracoesLoja = lazy(() => import("./pages/ConfiguracoesLoja"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const AuthPage = lazy(() => import("./pages/Auth"));
const OnboardingPage = lazy(() => import("./pages/Onboarding"));
const AceitarConvitePage = lazy(() => import("./pages/AceitarConvite"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Planos = lazy(() => import("./pages/Planos"));
const Parceiro = lazy(() => import("./pages/Parceiro"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const Agenda = lazy(() => import("./pages/Agenda"));

const RouteFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minuto
      retry: 1,
    },
  },
});

function FullscreenAuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { stores, loading: storesLoading } = useStores();
  if (loading || storesLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  if (stores.length === 0) return <Navigate to="/onboarding" replace />;
  return <LeadsProvider>{children}</LeadsProvider>;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <StoresProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/aceitar-convite/:token" element={<AceitarConvitePage />} />
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/whatsapp" element={<WhatsAppPage />} />
                    <Route path="/funil" element={<Funil />} />
                    <Route path="/tarefas" element={<Tarefas />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/contatos" element={<Contatos />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/configuracoes-loja" element={<ConfiguracoesLoja />} />
                    <Route path="/planos" element={<Planos />} />
                    <Route path="/parceiro" element={<Parceiro />} />
                    <Route path="/ajuda" element={<Ajuda />} />
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
              </Suspense>
            </StoresProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
