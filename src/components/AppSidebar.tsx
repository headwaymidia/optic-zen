import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  MessageCircle,
  ListChecks,
  Plus,
  Settings,
  HelpCircle,
  Handshake,
  LogOut,
  Eye,
  Crown,
  Calendar as CalendarIcon,
  Smartphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NewLeadDialog } from "@/components/NewLeadDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/lib/profile-helpers";
import { useStores } from "@/hooks/useStores";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Atendimentos", url: "/whatsapp", icon: MessageCircle },
  { title: "Funil de vendas", url: "/funil", icon: KanbanSquare },
  { title: "Tarefas", url: "/tarefas", icon: ListChecks },
  { title: "Agenda", url: "/agenda", icon: CalendarIcon },
  { title: "Contatos", url: "/contatos", icon: Users },
];

const secondaryItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "WhatsApp", url: "/whatsapp-config", icon: Smartphone, requireRole: ["Dono", "Gerente"] as string[] },
  { title: "Meu plano", url: "/planos", icon: Crown },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
  { title: "Seja um parceiro", url: "/parceiro", icon: Handshake },
];

function getInitials(nameOrEmail: string) {
  return getUserInitials(nameOrEmail, nameOrEmail);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const { profile, user, signOut } = useAuth();
  const { currentStore } = useStores();

  // Global keyboard shortcut: "N" opens Novo Lead (ignored when typing in inputs)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      e.preventDefault();
      setNewLeadOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = profile?.email || user?.email || "admin@otica.com";
  const initials = getInitials(profile?.full_name || displayEmail);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out">
      <SidebarContent className="flex flex-col h-full bg-sidebar overflow-x-hidden">
        <div
          className={cn("flex items-center border-b border-sidebar-border", collapsed ? "p-3 justify-center" : "py-4 gap-2.5")}
          style={!collapsed ? { width: "100%", paddingLeft: 16, paddingRight: 20 } : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Eye className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight" style={{ overflow: "visible" }}>
              <p
                className="text-sm font-bold text-sidebar-foreground"
                style={{ whiteSpace: "nowrap", overflow: "visible" }}
              >
                Ótica Dominante
              </p>
              <p
                className="font-semibold text-muted-foreground uppercase"
                style={{ fontSize: "9px", letterSpacing: "0.5px", whiteSpace: "nowrap", overflow: "visible" }}
              >
                Powered by Headway Mídia
              </p>
            </div>
          )}
        </div>

        {/* Workspace switcher (Multi-tenant) */}
        <div className={cn("pt-3", collapsed ? "px-2" : "px-3")}>
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* WhatsApp connection status */}
        <WhatsAppStatusBadge collapsed={collapsed} />

        {/* Global +Novo Lead CTA */}
        <div className={cn("pt-2", collapsed ? "px-2 flex justify-center" : "px-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setNewLeadOpen(true)}
                  className="h-10 w-10 p-0 justify-center rounded-xl bg-white text-black hover:bg-white hover:opacity-90 transition-opacity shadow-sm"
                  aria-label="Novo Lead"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Novo Lead</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={() => setNewLeadOpen(true)}
              className="w-full h-10 rounded-xl bg-white hover:bg-white hover:opacity-90 transition-opacity text-black font-semibold gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Lead</span>
              <kbd className="ml-auto text-[10px] font-mono opacity-60 border border-black/10 rounded px-1 py-0.5 leading-none">
                N
              </kbd>
            </Button>
          )}
        </div>

        <SidebarGroup className={cn("py-3 flex-1", collapsed ? "px-1" : "px-2")}>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1">Menu</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                const button = (
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "h-10 rounded-xl text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:text-emerald-400 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold transition-all",
                      collapsed ? "px-0 justify-center w-10 mx-auto" : "px-3"
                    )}
                  >
                    <NavLink to={item.url} end className={cn(collapsed && "justify-center w-full")}>
                      <item.icon className="h-4.5 w-4.5" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      button
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer: secondary nav + user profile */}
        <div className="mt-auto border-t border-sidebar-border px-2 pt-2 pb-2 space-y-1">
          {/* Secondary links */}
          <nav className="flex flex-col gap-0.5">
            {secondaryItems.map((item) => {
              if (item.requireRole && !item.requireRole.includes(currentStore?.role ?? "")) return null;
              const isActive = location.pathname === item.url;
              const content = (
                <>
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </>
              );
              const className = cn(
                "flex items-center gap-3 h-9 px-3 rounded-lg text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:text-emerald-400 transition-colors",
                isActive && "bg-primary/10 text-primary font-medium",
                collapsed && "justify-center px-0"
              );

              const node = (
                <NavLink key={item.title} to={item.url} end className={className} aria-label={item.title}>
                  {content}
                </NavLink>
              );

              return collapsed ? (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>{node}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              ) : (
                node
              );
            })}
          </nav>

          {/* User profile card with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors cursor-pointer text-left",
                  collapsed && "justify-center px-0"
                )}
                aria-label="Menu do usuário"
              >
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 shrink-0">
                        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="right">{displayName}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 shrink-0">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {displayEmail}
                      </p>
                    </div>
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate">{displayEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </Sidebar>
  );
}

function WhatsAppStatusBadge({ collapsed }: { collapsed: boolean }) {
  const { currentStoreId } = useStores();
  const { connection } = useWhatsAppConnection(currentStoreId);

  // Não mostrar badge se nunca configurou
  if (!connection) return null;

  const connected = connection.status === "connected";
  const label = connected ? "WhatsApp conectado" : "WhatsApp desconectado";
  const dotClass = connected ? "bg-emerald-500" : "bg-red-500";

  if (collapsed) {
    return (
      <div className="px-2 pt-2 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink
              to="/configuracoes-loja?tab=whatsapp"
              aria-label={label}
              className="h-7 w-7 rounded-full bg-card border flex items-center justify-center"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} />
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const content = (
    <div
      className={cn(
        "mt-2 mx-3 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
        connected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span className="font-medium truncate">{label}</span>
    </div>
  );

  if (connected) return content;
  return (
    <NavLink to="/configuracoes-loja?tab=whatsapp" className="block">
      {content}
    </NavLink>
  );
}
