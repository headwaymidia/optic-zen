import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * @deprecated Mantido apenas para compatibilidade com imports antigos.
 * O onboarding agora é decidido pelo estado real no Supabase
 * (usuário tem ao menos 1 loja em `stores` via `useStores`).
 */
export const ONBOARDING_KEY = "od.onboarding.completed.v1";

/** @deprecated Use `useStores().stores.length > 0`. */
export function isOnboardingCompleted() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export default function OnboardingPage() {
  const { session, loading: authLoading } = useAuth();
  const { stores, loading: storesLoading, addStore } = useStores();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || storesLoading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  // Já possui ao menos uma loja → pula onboarding.
  if (stores.length > 0) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);

    const created = await addStore({ name: trimmed });
    setSubmitting(false);

    if (!created) return;

    // Mantém o flag legado (sem prejuízo) — fonte de verdade é o Supabase.
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* ignore */
    }

    toast({
      title: "Loja criada com sucesso!",
      description: `"${created.name}" está pronta. Bem-vindo ao seu motor de vendas.`,
    });

    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Brand header (mesmo do Auth) */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Eye className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold text-slate-900">Ótica Dominante</p>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Powered by Headway Mídia
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
              Bem-vindo ao seu novo motor de vendas.
            </h1>
            <p className="text-base text-zinc-500 leading-relaxed max-w-sm mx-auto">
              Para começar a organizar seus atendimentos, qual o nome da sua matriz ou primeira filial?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="store-name"
                className="text-xs font-semibold text-zinc-700 uppercase tracking-wider"
              >
                Nome da loja
              </Label>
              <Input
                id="store-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Loja Centro ou Nome da Franquia"
                required
                className="h-14 rounded-xl border border-zinc-200 bg-white text-base text-zinc-900 placeholder:text-zinc-400 px-4 shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full h-14 rounded-xl text-base font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm gap-2 group transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Criando sua loja...
                </>
              ) : (
                <>
                  Criar minha primeira loja
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-400 pt-2">
            Você poderá adicionar mais filiais depois nas Configurações.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mt-12">
        © {new Date().getFullYear()} Ótica Dominante · Powered by Headway Mídia
      </p>
    </div>
  );
}
