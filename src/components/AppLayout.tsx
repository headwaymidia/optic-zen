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
            <div className="h-screen flex w-full bg-background pt-safe pl-safe pr-safe overflow-hidden">
              <div className="hidden lg:block">
                <AppSidebar />
              </div>
              <div className="flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 ease-in-out">
                <TrialBanner />
                <header className="h-14 flex items-center justify-between border-b border-border bg-card px-4 gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <SidebarTrigger className="hidden lg:inline-flex hover:bg-muted" />
                    <div className="min-w-0 leading-tight">
                      <>
                          <p className="text-sm font-semibold text-foreground truncate">
                            {profile?.full_name || (profile?.email || user?.email || "Usuário").split("@")[0]}
                          </p>
                          {currentStore?.role && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {translateRole(currentStore.role)}
                            </p>
                          )}
                        </>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <NotificationBell />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 min-h-0 overflow-auto pb-20 lg:pb-0 [body[data-chat-fullscreen]_&]:pb-0">
                  <Outlet />
                </main>
              </div>
              <div className="[body[data-chat-fullscreen]_&]:hidden lg:[body[data-chat-fullscreen]_&]:block">
                <BottomNav />
              </div>
            </div>
          </SidebarProvider>
        </TrialGuard>
      </SubscriptionProvider>
    </LeadsProvider>
  );
}
