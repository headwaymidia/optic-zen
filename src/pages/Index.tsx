import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Eye, LogOut } from "lucide-react";

const Index = () => {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">CRM Ótica</h1>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.name || profile?.email || "Usuário"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {!profile?.company_id ? (
          <div className="p-8 text-center text-muted-foreground">
            Seu perfil não está vinculado a uma empresa. Contate o administrador.
          </div>
        ) : (
          <KanbanBoard />
        )}
      </main>
    </div>
  );
};

export default Index;
