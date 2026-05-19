import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationBell() {
  const { permission, subscribed, loading, isSupported, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported || permission === "denied") return null;

  const label = subscribed
    ? "Notificações ativas — clique para desativar"
    : "Ativar notificações de novas mensagens";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading}
          aria-label={label}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <>
              <Bell className="h-4 w-4 text-emerald-500" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </>
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
