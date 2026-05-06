import { Check, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

const FEATURES_MONTHLY = [
  "Todas as funcionalidades incluídas",
  "Funil de vendas completo",
  "Receita oftalmológica",
  "Dashboard com métricas reais",
  "Ranking de vendas modo TV",
  "Histórico de receitas",
  "Alertas de retorno automático",
  "Suporte por WhatsApp",
];

const FEATURES_ANNUAL = [
  "Tudo do plano mensal",
  "Economia de R$ 600 por ano",
  "Equivale a R$ 1.764/ano",
  "2 meses grátis",
];

export default function Planos() {
  const { isTrialExpired } = useSubscription();

  return (
    <div className="min-h-full p-6 md:p-10 bg-background">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Escolha seu plano</h1>
          <p className="text-muted-foreground mt-2">
            Continue usando o CRM Ótica Dominante sem interrupções.
          </p>
          {isTrialExpired && (
            <div className="mt-4 mx-auto max-w-2xl rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
              Seu período de teste de 14 dias encerrou. Assine para continuar usando o CRM Ótica Dominante.
            </div>
          )}
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <PlanCard
            title="Mensal"
            price="R$ 197"
            suffix="/mês"
            features={FEATURES_MONTHLY}
            cta="Assinar plano mensal"
          />
          <PlanCard
            title="Anual"
            price="R$ 147"
            suffix="/mês"
            features={FEATURES_ANNUAL}
            cta="Assinar plano anual"
            highlight
          />
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  suffix,
  features,
  cta,
  highlight,
}: {
  title: string;
  price: string;
  suffix: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-8 relative flex flex-col",
        highlight && "border-primary border-2 shadow-lg"
      )}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
          <Crown className="h-3 w-3" /> Mais popular
        </div>
      )}
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-muted-foreground">{suffix}</span>
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="mt-8 w-full" variant={highlight ? "default" : "outline"}>
        <a href="#">{cta}</a>
      </Button>
    </Card>
  );
}
