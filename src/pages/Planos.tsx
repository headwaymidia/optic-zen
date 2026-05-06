import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";

const SIGNUP_URL = "https://oticadominante.com.br";

export default function Planos() {
  const { subscription, trialDaysLeft, isTrialExpired } = useSubscription();

  let statusLabel = "—";
  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (subscription?.status === "active") {
    statusLabel = "Ativo";
    variant = "default";
  } else if (isTrialExpired || subscription?.status === "expired") {
    statusLabel = "Expirado";
    variant = "destructive";
  } else if (subscription?.status === "trial") {
    statusLabel = "Em teste";
    variant = "secondary";
  } else if (subscription?.status === "cancelled") {
    statusLabel = "Cancelado";
    variant = "outline";
  }

  return (
    <div className="min-h-full p-6 md:p-10 bg-background">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Meu plano</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o status da sua assinatura.
          </p>
        </header>

        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status atual</span>
            <Badge variant={variant}>{statusLabel}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plano</span>
            <span className="text-sm font-medium capitalize">{subscription?.plan ?? "—"}</span>
          </div>

          {subscription?.status === "trial" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dias restantes do teste</span>
              <span className="text-sm font-semibold">
                {trialDaysLeft ?? 0} {trialDaysLeft === 1 ? "dia" : "dias"}
              </span>
            </div>
          )}

          {subscription?.current_period_end && subscription.status === "active" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Renova em</span>
              <span className="text-sm font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          <Button asChild size="lg" className="w-full">
            <a href={SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              Assinar agora
            </a>
          </Button>
        </Card>
      </div>
    </div>
  );
}
