import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Eye,
  MessageCircle,
  ListChecks,
  Plus,
  Settings,
  HelpCircle,
  Handshake,
  LogOut,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
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
    <Sidebar collapsible="icon" className="border-r border-slate-100 bg-white transition-all duration-300 ease-in-out">
      <SidebarContent className="flex flex-col h-full bg-white overflow-x-hidden">
        <div className={cn("flex items-center gap-3 py-5 border-b border-slate-100", collapsed ? "px-2 justify-center" : "px-4")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <Eye className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-slate-900 leading-tight">Ótica Dominante</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mt-0.5">Powered by Headway Mídia</p>
            </div>
          )}
        </div>

        {/* Global +Novo Lead CTA */}
        <div className={cn("pt-3", collapsed ? "px-2 flex justify-center" : "px-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setNewLeadOpen(true)}
                  className="h-10 w-10 p-0 justify-center rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          )}
        </div>

        <SidebarGroup className={cn("py-3 flex-1", collapsed ? "px-1" : "px-2")}>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">Menu</SidebarGroupLabel>
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
                      "h-10 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold transition-all",
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
        <div className="mt-auto border-t border-slate-100 px-2 pt-2 pb-2 space-y-1">
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
                "flex items-center gap-3 h-9 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors",
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
                  "w-full flex items-center gap-3 rounded-lg p-2 hover:bg-slate-100 transition-colors cursor-pointer text-left",
                  collapsed && "justify-center px-0"
                )}
                aria-label="Menu do usuário"
              >
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-slate-900 text-white text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="right">{displayName}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-slate-900 text-white text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate leading-tight">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
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
                  <span className="text-sm font-medium text-slate-900 truncate">{displayName}</span>
                  <span className="text-xs text-slate-500 truncate">{displayEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-slate-700 cursor-pointer">
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
