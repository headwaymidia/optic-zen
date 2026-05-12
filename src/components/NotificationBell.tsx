import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, UserPlus, CalendarClock, Snowflake, PackageCheck, RotateCcw, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  user_id: string;
  store_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  lead_id: string | null;
  created_at: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_lead: UserPlus,
  exam_today: CalendarClock,
  lead_cooling: Snowflake,
  lab_ready: PackageCheck,
  return_due: RotateCcw,
};

const ICON_COLORS: Record<string, string> = {
  new_lead: "text-emerald-600",
  exam_today: "text-blue-600",
  lead_cooling: "text-sky-500",
  lab_ready: "text-violet-600",
  return_due: "text-amber-600",
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const queryKey = ["notifications", userId] as const;
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const unreadCount = items.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!userId || unreadCount === 0) return;
    queryClient.setQueryData<Notification[]>(queryKey, (old = []) =>
      old.map((n) => ({ ...n, read: true }))
    );
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleClick(n: Notification) {
    setOpen(false);
    if (!n.read) {
      queryClient.setQueryData<Notification[]>(queryKey, (old = []) =>
        old.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      queryClient.invalidateQueries({ queryKey });
    }
    if (n.lead_id) {
      navigate(`/whatsapp?leadId=${n.lead_id}`);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-sm font-semibold">Notificações</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full text-left px-3 py-3 flex gap-3 hover:bg-muted/60 transition-colors",
                        n.read && "opacity-60"
                      )}
                    >
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0",
                          ICON_COLORS[n.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        {items.length >= 20 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                navigate("/tarefas");
              }}
            >
              Ver todas
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
