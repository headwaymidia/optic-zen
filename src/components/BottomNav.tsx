import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  ListChecks,
  MessageCircle,
  Menu as MenuIcon,
  Settings,
  Smartphone,
  Crown,
  HelpCircle,
  Handshake,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { getUserInitials } from "@/lib/profile-helpers";

/**
 * Bottom Navigation Bar (mobile-only).
 * 4 ícones principais + botão Menu que abre um drawer com itens secundários.
 */
const ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Funil", url: "/funil", icon: KanbanSquare },
  { title: "Tarefas", url: "/tarefas", icon: ListChecks },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
];

const SECONDARY = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "WhatsApp", url: "/whatsapp-config", icon: Smartphone, requireRole: ["Dono", "Gerente"] as string[] },
  { title: "Meu plano", url: "/planos", icon: Crown },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
  { title: "Seja um parceiro", url: "/parceiro", icon: Handshake },
];

export function BottomNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { profile, user, signOut } = useAuth();
  const { currentStore } = useStores();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = profile?.email || user?.email || "";
  const initials = getUserInitials(profile?.full_name || displayEmail, displayEmail);

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50",
        "bg-background/85 backdrop-blur-xl",
        "border-t border-border",
        "pb-safe"
      )}
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;
          return (
            <li key={item.url}>
              <NavLink
                to={item.url}
                end
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] py-1.5 px-1",
                  "transition-colors active:scale-[0.96]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.title}
              >
                <Icon
                  className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.4]")}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[10px] leading-none tracking-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.title}
                </span>
              </NavLink>
            </li>
          );
        })}

        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] py-1.5 px-1",
                  "text-muted-foreground hover:text-foreground transition-colors active:scale-[0.96]"
                )}
              >
                <MenuIcon className="h-[22px] w-[22px]" aria-hidden="true" />
                <span className="text-[10px] leading-none tracking-tight font-medium">Menu</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>

              {/* User card */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Avatar className="h-11 w-11 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={displayName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {displayName}
                  </p>
                  {displayEmail && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{displayEmail}</p>
                  )}
                </div>
              </div>

              {/* Secondary nav */}
              <nav className="flex-1 overflow-y-auto p-2">
                {SECONDARY.map((item) => {
                  if (item.requireRole && !item.requireRole.includes(currentStore?.role ?? "")) return null;
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 h-12 px-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  );
                })}
              </nav>

              {/* Footer: logout */}
              <div className="border-t p-2">
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                  }}
                  className="w-full flex items-center gap-3 h-12 px-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
