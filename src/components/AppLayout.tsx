import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { LeadsProvider } from "@/hooks/useLeads";
export default function AppLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <LeadsProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-slate-50 select-none pt-safe pb-safe pl-safe pr-safe">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center justify-between border-b border-slate-100 bg-white px-4 gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="hover:bg-slate-50" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {profile?.name || profile?.email || "Usuário"}
                  </p>
                </div>
              </div>
              <div />

            </header>
            <main className="flex-1 overflow-auto">
              {!profile?.company_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  Seu perfil não está vinculado a uma empresa. Contate o administrador.
                </div>
              ) : (
                <Outlet />
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </LeadsProvider>
  );
}
