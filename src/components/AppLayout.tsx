import { Navigate, Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { TrialBanner } from "./TrialBanner";
import { useAuth } from "@/hooks/useAuth";
import { LeadsProvider } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { translateRole } from "@/lib/profile-helpers";

import { TrialExpiredScreen } from "./TrialExpiredScreen";
import { DataSkeleton } from "./ui/DataSkeleton";

function TrialGuard({ children }: { children: React.ReactNode }) {
  const { isTrialExpired, loading } = useSubscription();
  if (loading) return <>{children}</>;
  if (isTrialExpired) return <TrialExpiredScreen />;
  return <>{children}</>;
}

export default function AppLayout() {
  const { session, profile, user, loading } = useAuth();
  const { stores, currentStore, loading: storesLoading } = useStores();

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

  return (
    <LeadsProvider>
      <SubscriptionProvider>
        <TrialGuard>
          <SidebarProvider
            style={
              {
                "--sidebar-width": "280px",
                "--sidebar-width-icon": "5rem",
              } as React.CSSProperties
            }
          >
            <div className="h-screen flex w-full bg-background select-none pt-safe pl-safe pr-safe overflow-hidden">
              <div className="hidden md:block">
                <AppSidebar />
              </div>
              <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 ease-in-out">
                <TrialBanner />
                <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <SidebarTrigger className="hidden md:inline-flex hover:bg-muted" />
                    <div className="min-w-0 leading-tight">
                      {profile?.full_name ? (
                        <>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {profile.full_name}
                          </p>
                          {currentStore?.role && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {translateRole(currentStore.role)}
                            </p>
                          )}
                        </>
                      ) : (
                        <Link to="/configuracoes" className="block">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {profile?.email || user?.email || "Usuário"}
                          </p>
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                            Complete seu perfil
                          </p>
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <NotificationBell />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 min-h-0 overflow-auto pb-20 md:pb-0">
                  <Outlet />
                </main>
              </div>
              <BottomNav />
            </div>
          </SidebarProvider>
        </TrialGuard>
      </SubscriptionProvider>
    </LeadsProvider>
  );
}
