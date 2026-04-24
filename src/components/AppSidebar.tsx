import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, Users, Eye, MessageCircle, ListChecks, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Atendimentos", url: "/whatsapp", icon: MessageCircle },
  { title: "Funil de vendas", url: "/funil", icon: KanbanSquare },
  { title: "Tarefas", url: "/tarefas", icon: ListChecks },
  { title: "Contatos", url: "/contatos", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-100 bg-white">
      <SidebarContent className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
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
        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => setNewLeadOpen(true)}
                  className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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

        <SidebarGroup className="px-2 py-3">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="h-10 px-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold transition-all"
                  >
                    <NavLink to={item.url} end>
                      <item.icon className="h-4.5 w-4.5" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto border-t border-slate-100 px-4 py-4 text-center">
          {collapsed ? (
            <p className="text-[10px] font-bold tracking-wider text-slate-400">HM</p>
          ) : (
            <p className="text-[11px] font-semibold text-slate-500">
              <span className="text-primary">Headway Mídia</span>
            </p>
          )}
        </div>
      </SidebarContent>
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </Sidebar>
  );
}
