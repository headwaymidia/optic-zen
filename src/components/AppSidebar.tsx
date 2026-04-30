import { useState } from "react";
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
} from "lucide-react";
import logoOticaDominanteDark from "@/assets/logo-otica-dominante-dark.svg";
import logoOticaDominanteWhite from "@/assets/logo-otica-dominante-white.svg";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Atendimentos", url: "/whatsapp", icon: MessageCircle },
  { title: "Funil de vendas", url: "/funil", icon: KanbanSquare },
  { title: "Tarefas", url: "/tarefas", icon: ListChecks },
  { title: "Contatos", url: "/contatos", icon: Users },
];

const secondaryItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle, external: true },
  { title: "Seja um parceiro", url: "/parceiro", icon: Handshake, external: true },
];

function getInitials(nameOrEmail: string) {
  const base = nameOrEmail.trim();
  if (!base) return "U";
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || base[0].toUpperCase();
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const { profile, user, signOut } = useAuth();

  const displayName = profile?.name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = profile?.email || user?.email || "admin@otica.com";
  const initials = getInitials(profile?.name || displayEmail);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out">
      <SidebarContent className="flex flex-col h-full bg-sidebar overflow-x-hidden">
        <div className={cn("flex items-center border-b border-sidebar-border", collapsed ? "p-3 justify-center" : "px-4 py-4 justify-start")}>
          {collapsed ? (
            <>
              <img
                src={logoOticaDominanteDark}
                alt="Ótica Dominante"
                className="h-10 w-auto object-contain block dark:hidden"
              />
              <img
                src={logoOticaDominanteWhite}
                alt="Ótica Dominante"
                className="h-10 w-auto object-contain hidden dark:block"
              />
            </>
          ) : (
            <>
              <img
                src={logoOticaDominanteDark}
                alt="Ótica Dominante — Powered by Headway Mídia"
                className="h-12 w-auto object-contain block dark:hidden"
              />
              <img
                src={logoOticaDominanteWhite}
                alt="Ótica Dominante — Powered by Headway Mídia"
                className="h-12 w-auto object-contain hidden dark:block"
              />
            </>
          )}
        </div>

        {/* Workspace switcher (Multi-tenant) */}
        <div className={cn("pt-3", collapsed ? "px-2" : "px-3")}>
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

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
              Novo Lead
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

              const node = item.external ? (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {}}
                  className={className}
                  aria-label={item.title}
                >
                  {content}
                </button>
              ) : (
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
