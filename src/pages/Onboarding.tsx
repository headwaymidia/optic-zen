import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

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
  const [ownerName, setOwnerName] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      if (!mounted) return;
      if (!activeSession) {
        toast({
          title: "Sua conta foi confirmada! Faça login para continuar.",
        });
      }
      setHasActiveSession(Boolean(activeSession));
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (authLoading || checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 text-zinc-500 text-sm">
        Carregando...
      </div>
    );
  }
  if (!session || hasActiveSession === false) return <Navigate to="/auth" replace />;

  // Usuário convidado: não deve criar loja própria.
  // 1) Se ainda há um token pendente salvo (login feito via fluxo de convite), envia para aceitar.
  // 2) Se o user_metadata marca `invited: true`, manda direto para o Dashboard.
  const pendingInviteToken =
    typeof window !== "undefined"
      ? localStorage.getItem("od.pendingInviteToken")
      : null;
  const isInvitedUser = Boolean(
    (session?.user?.user_metadata as any)?.invited
  );

  if (pendingInviteToken) {
    return <Navigate to={`/aceitar-convite/${pendingInviteToken}`} replace />;
  }
  if (isInvitedUser) {
    return <Navigate to="/" replace />;
  }

  // Já possui ao menos uma loja e não está no meio de uma criação → pula onboarding.
  if (!storesLoading && stores.length > 0 && !submitting) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    try {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (!activeSession?.user) {
        toast({
          title: "Sua conta foi confirmada! Faça login para continuar.",
        });
        setSubmitting(false);
        navigate("/auth", { replace: true });
        return;
      }
      console.log("[Onboarding] Sessão ativa:", activeSession.user);

      const created = await addStore({ name: trimmed, throwOnError: true });

      if (!created) {
        toast({
          title: "Erro ao criar loja",
          description: "INSERT em stores não retornou a loja criada.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      try {
        localStorage.setItem(ONBOARDING_KEY, "1");
      } catch {
        /* ignore */
      }

      toast({
        title: "Loja criada com sucesso!",
        description: `"${created.name}" está pronta. Bem-vindo ao seu motor de vendas.`,
      });

      // Navega imediatamente; AppLayout enxergará a loja recém-criada via state local do hook.
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("[Onboarding.handleSubmit] Erro inesperado ao criar loja:", err);
      toast({
        title: "Erro ao criar loja",
        description: err?.message ?? "Erro desconhecido ao inserir em stores.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center px-6 py-12 relative">
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate("/auth", { replace: true });
        }}
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para login
      </button>
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

          <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-5">
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
              className={cn(
                "w-full h-14 rounded-xl text-base font-semibold shadow-sm gap-2 group transition-colors",
                name.trim()
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-zinc-200 text-zinc-400 hover:bg-zinc-200 cursor-not-allowed disabled:opacity-100"
              )}
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
