import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { StoresProvider, useStores } from "@/hooks/useStores";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Funil from "./pages/Funil";
import WhatsAppPage from "./pages/WhatsApp";
import Contatos from "./pages/Contatos";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesLoja from "./pages/ConfiguracoesLoja";
import Tarefas from "./pages/Tarefas";
import AuthPage from "./pages/Auth.tsx";
import OnboardingPage from "./pages/Onboarding.tsx";
import AceitarConvitePage from "./pages/AceitarConvite.tsx";
import NotFound from "./pages/NotFound.tsx";
import Ranking from "./pages/Ranking.tsx";
import Planos from "./pages/Planos.tsx";
import Parceiro from "./pages/Parceiro.tsx";
import Ajuda from "./pages/Ajuda.tsx";
import Agenda from "./pages/Agenda.tsx";
import { LeadsProvider } from "@/hooks/useLeads";

const queryClient = new QueryClient();

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
            </StoresProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
