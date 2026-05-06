import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { StoresProvider } from "@/hooks/useStores";
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
import { LeadsProvider } from "@/hooks/useLeads";

const queryClient = new QueryClient();

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
                  <Route path="/contatos" element={<Contatos />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/configuracoes-loja" element={<ConfiguracoesLoja />} />
                  <Route path="/planos" element={<Planos />} />
                </Route>
                <Route
                  path="/ranking"
                  element={
                    <LeadsProvider>
                      <Ranking />
                    </LeadsProvider>
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
