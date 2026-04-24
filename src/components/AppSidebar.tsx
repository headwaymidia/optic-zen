import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, Users, Eye, MessageCircle, ListChecks } from "lucide-react";
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-4 border-b">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Eye className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Ótica Dominante CRM</p>
              <p className="text-[11px] text-muted-foreground truncate">Powered by Headway Mídia</p>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto border-t px-3 py-3 text-center">
          {collapsed ? (
            <p className="text-[10px] font-semibold text-muted-foreground">HM</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Headway Mídia</span>
            </p>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
