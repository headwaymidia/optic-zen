import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
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
      <SidebarProvider
        style={
          {
            "--sidebar-width": "16rem",
            "--sidebar-width-icon": "5rem",
          } as React.CSSProperties
        }
      >
        <div className="min-h-screen flex w-full bg-background select-none pt-safe pl-safe pr-safe overflow-x-hidden">
          {/* Sidebar: hidden on mobile, visible from md+. BottomNav assume o mobile. */}
          <div className="hidden md:block">
            <AppSidebar />
          </div>
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
            <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 min-w-0">
                {/* SidebarTrigger só faz sentido no desktop */}
                <SidebarTrigger className="hidden md:inline-flex hover:bg-muted" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profile?.name || profile?.email || "Usuário"}
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto pb-20 md:pb-0">
              {!profile?.company_id ? (
                <div className="p-8 text-center text-muted-foreground">
                  Seu perfil não está vinculado a uma empresa. Contate o administrador.
                </div>
              ) : (
                <Outlet />
              )}
            </main>
          </div>
          {/* Bottom Navigation — mobile only */}
          <BottomNav />
        </div>
      </SidebarProvider>
    </LeadsProvider>
  );
}
