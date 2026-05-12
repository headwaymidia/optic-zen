import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, KanbanSquare, ListChecks, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom Navigation Bar (mobile-only).
 * Padrão iOS/Android: fixa na base, 4 ícones, ativo destacado com a cor primária.
 * Visível apenas em telas < md. Desktop continua usando a Sidebar.
 */
const ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Funil", url: "/funil", icon: KanbanSquare },
  { title: "Tarefas", url: "/tarefas", icon: ListChecks },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-50",
        // Glass / blur estilo iOS
        "bg-background/85 backdrop-blur-xl",
        "border-t border-border",
        // Safe area iOS
        "pb-safe"
      )}
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="grid grid-cols-4">
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
                  // Touch target ≥ 44px (HIG)
                  "min-h-[56px] py-1.5 px-1",
                  "transition-colors active:scale-[0.96]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
      </ul>
    </nav>
  );
}
