import { useState } from "react";
import { Check, Zap, CreditCard, QrCode, Calendar, Loader2, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useStores } from "@/hooks/useStores";
import { cn } from "@/lib/utils";

const FEATURES = [
  "CRM completo com funil Kanban",
  "Atendimentos via WhatsApp integrado",
  "Até 3 vendedores por loja",
  "Método OD com roteiros de atendimento",
  "Templates de mensagens rápidas",
  "Dashboard com métricas em tempo real",
  "Agenda e gestão de exames",
  "Suporte via WhatsApp",
];

const PLANS = [
  {
    id: "monthly",
    label: "Mensal",
    icon: Calendar,
    price: "R$250",
    period: "/mês",
    description: "Sem fidelidade. Cancele quando quiser.",
    highlight: false,
    badge: null,
  },
  {
    id: "annual_pix",
    label: "Anual — PIX",
    icon: QrCode,
    price: "R$197",
    period: "/mês",
    total: "R$2.364 à vista",
    description: "Pague via PIX e economize R$636 no ano.",
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "annual_credit",
    label: "Anual — 12x",
    icon: CreditCard,
    price: "R$197",
    period: "/mês",
    total: "12x R$197 no cartão",
    description: "Parcelado sem juros no cartão de crédito.",
    highlight: false,
    badge: "Sem juros",
  },
];

export default function Planos() {
  const { subscription, trialDaysLeft, isTrialExpired } = useSubscription();
  const { currentStoreId } = useStores();
  const [loading, setLoading] = useState<string | null>(null);

  const isActive = subscription?.status === "active";

  async function handleCheckout(planId: string) {
    if (!currentStoreId) return;
    setLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const { data, error } = await supabase.functions.invoke("asaas-checkout", {
        body: { plan_type: planId, store_id: currentStoreId },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      // Redirecionar para o link de pagamento do Asaas
      window.open(data.payment_url, "_blank");
    } catch (err: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  let statusLabel = "—";
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  if (isActive) { statusLabel = "Ativo"; statusVariant = "default"; }
  else if (isTrialExpired) { statusLabel = "Trial expirado"; statusVariant = "destructive"; }
  else if (subscription?.status === "trial") { statusLabel = `Trial — ${trialDaysLeft}d restantes`; statusVariant = "secondary"; }
  else if (subscription?.status === "blocked") { statusLabel = "Bloqueado"; statusVariant = "destructive"; }

  return (
    <div className="min-h-full p-4 md:p-8 bg-background">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            Plano Tração
          </h1>
          <p className="text-muted-foreground text-sm">
            CRM completo para óticas que querem escalar atendimentos e vendas.
          </p>
        </div>

        {/* Status atual */}
        {subscription && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Status da assinatura</p>
                {isActive && subscription.current_period_end && (
                  <p className="text-xs text-muted-foreground">
                    Renova em {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              O que está incluído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col",
                  plan.highlight && "border-emerald-500 shadow-md shadow-emerald-500/10"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={cn(
                      "text-[10px] px-2",
                      plan.highlight ? "bg-emerald-500 hover:bg-emerald-500" : "bg-blue-500 hover:bg-blue-500"
                    )}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{plan.label}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground mb-0.5">{plan.period}</span>
                    </div>
                    {plan.total && (
                      <p className="text-xs text-emerald-600 font-medium">{plan.total}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <Button
                    className={cn(
                      "w-full mt-auto",
                      plan.highlight
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                        : ""
                    )}
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={isLoading || isActive}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</>
                    ) : isActive ? (
                      "Plano ativo"
                    ) : (
                      "Assinar agora"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ao assinar você concorda com os termos de uso. Pagamentos processados com segurança pelo Asaas.
        </p>
      </div>
    </div>
  );
}
