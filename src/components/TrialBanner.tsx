import { ExternalLink, AlertTriangle, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { subscription, trialDaysLeft } = useSubscription();

  if (!subscription) return null;
  if (subscription.status === "active") return null;
  if (subscription.status !== "trial" || trialDaysLeft === null) return null;
  if (trialDaysLeft > 14 || trialDaysLeft <= 0) return null;

  const urgent = trialDaysLeft <= 7;
  const Icon = urgent ? AlertTriangle : Sparkles;

  return (
    <a
      href="https://oticadominante.com.br"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
        urgent
          ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200"
          : "bg-blue-100 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>
        {urgent ? "⚠️ Seu teste termina em " : "Você está no período de teste — "}
        <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"} restantes</strong>
        . Assinar agora →
      </span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}
