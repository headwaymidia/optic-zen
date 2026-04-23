import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.name || profile?.email || "Usuário"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
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
  );
}
