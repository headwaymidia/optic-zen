import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Loader2, LayoutDashboard, Users, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const ONBOARDING_KEY = "od.onboarding.completed.v1";

export function isOnboardingCompleted() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const ROLE_OPTIONS = ["Proprietário", "Gerente", "Consultor"];
const TEAM_SIZE_OPTIONS = ["1", "2 a 5", "6 a 10", "Mais de 10"];

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function OnboardingPage() {
  const { session, loading: authLoading } = useAuth();
  const { stores, loading: storesLoading, addStore } = useStores();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);

  // Step 1
  const [ownerName, setOwnerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState("");

  // Step 2
  const [storeName, setStoreName] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [teamSize, setTeamSize] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: activeSession } }) => {
      if (!mounted) return;
      if (!activeSession) {
        toast({ title: "Sua conta foi confirmada! Faça login para continuar." });
        setHasActiveSession(false);
        setCheckingSession(false);
        return;
      }
      setHasActiveSession(true);
      // Pre-fill from profile
      const { data } = await supabase
        .from("profiles")
        .select("full_name, whatsapp, role")
        .eq("id", activeSession.user.id)
        .maybeSingle();
      if (mounted && data) {
        if (data.full_name) setOwnerName(data.full_name);
        if ((data as any).whatsapp) setWhatsapp(maskPhone((data as any).whatsapp));
        if ((data as any).role) setRole((data as any).role);
      }
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

  const pendingInviteToken =
    typeof window !== "undefined" ? localStorage.getItem("od.pendingInviteToken") : null;
  const isInvitedUser = Boolean((session?.user?.user_metadata as any)?.invited);

  if (pendingInviteToken) return <Navigate to={`/aceitar-convite/${pendingInviteToken}`} replace />;
  if (isInvitedUser) return <Navigate to="/" replace />;

  if (!storesLoading && stores.length > 0 && !submitting && step !== 3) {
    return <Navigate to="/" replace />;
  }

  const step1Valid = ownerName.trim() && whatsapp.replace(/\D/g, "").length >= 10 && role;
  const step2Valid = storeName.trim() && city.trim() && stateUf && teamSize;

  async function handleCreateStore() {
    if (!step2Valid || submitting) return;
    setSubmitting(true);
    try {
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (!activeSession?.user) {
        toast({ title: "Sua conta foi confirmada! Faça login para continuar." });
        setSubmitting(false);
        navigate("/auth", { replace: true });
        return;
      }

      await supabase.from("profiles").upsert(
        {
          id: activeSession.user.id,
          full_name: ownerName.trim(),
          email: activeSession.user.email,
          whatsapp: whatsapp.replace(/\D/g, ""),
          role,
        },
        { onConflict: "id" }
      );

      const created = await addStore({ name: storeName.trim(), throwOnError: true });
      if (!created) {
        toast({ title: "Erro ao criar loja", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      // Update extra store fields
      await supabase
        .from("stores")
        .update({ city: city.trim(), state: stateUf, team_size: teamSize })
        .eq("id", created.id);

      try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}

      // Disparar email de boas-vindas (não bloquear o fluxo se falhar)
      supabase.functions.invoke("send-welcome-email", {
        body: {
          user_id: activeSession.user.id,
          email: activeSession.user.email,
          name: ownerName.trim(),
        },
      }).catch(() => { /* welcome email é best-effort */ });

      setStep(3);
    } catch (err: any) {
      toast({
        title: "Erro ao criar loja",
        description: humanizeError(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center px-6 py-12 relative">
      {step !== 3 && (
        <button
          type="button"
          onClick={async () => {
            if (step === 2) { setStep(1); return; }
            await supabase.auth.signOut();
            navigate("/auth", { replace: true });
          }}
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 2 ? "Voltar" : "Voltar para login"}
        </button>
      )}

      <div className="w-full max-w-md mt-4">
        {/* Brand */}
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

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Etapa {step} de 3
            </p>
            <p className="text-xs font-medium text-zinc-400">
              {step === 1 && "Sobre você"}
              {step === 2 && "Sua loja"}
              {step === 3 && "Tudo pronto!"}
            </p>
          </div>
          <div className="flex gap-2">
            {[1,2,3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-emerald-500" : "bg-zinc-200"
                )}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (step1Valid) setStep(2); }}
            className="space-y-5"
          >
            <div className="space-y-3 text-center mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                Vamos começar com você
              </h1>
              <p className="text-base text-zinc-500">
                Conte um pouco sobre quem está configurando o CRM.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Seu nome completo
              </Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ex: João da Silva"
                required
                className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                WhatsApp
              </Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(11) 91234-5678"
                required
                className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Qual é o seu papel?
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={!step1Valid}
              className={cn(
                "w-full h-14 rounded-xl text-base font-semibold gap-2 group",
                step1Valid
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-zinc-200 text-zinc-400 hover:bg-zinc-200 cursor-not-allowed disabled:opacity-100"
              )}
            >
              Continuar
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreateStore(); }}
            className="space-y-5"
          >
            <div className="space-y-3 text-center mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                Agora, sobre sua loja
              </h1>
              <p className="text-base text-zinc-500">
                Estes dados ajudam a organizar seus atendimentos.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Nome da loja
              </Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: Ótica Centro"
                required
                className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Cidade
                </Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                  required
                  className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  Estado
                </Label>
                <Select value={stateUf} onValueChange={setStateUf}>
                  <SelectTrigger className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 text-base px-3 shadow-sm">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {BR_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                Quantos vendedores tem sua equipe?
              </Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger className="h-14 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-base px-4 shadow-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={!step2Valid || submitting}
              className={cn(
                "w-full h-14 rounded-xl text-base font-semibold gap-2 group",
                step2Valid && !submitting
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
                  Continuar
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
                Sua loja foi criada com sucesso!
              </h1>
              <p className="text-base text-zinc-500 max-w-sm">
                Seu período de teste de 14 dias começou agora.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                {
                  icon: Target,
                  title: "Adicione seu primeiro lead",
                  desc: "Comece a registrar atendimentos no Funil.",
                  cta: "Ir para o Funil",
                  to: "/funil",
                },
                {
                  icon: Users,
                  title: "Convide sua equipe",
                  desc: "Adicione vendedores e gerentes à loja.",
                  cta: "Ir para Configurações",
                  to: "/configuracoes",
                },
                {
                  icon: LayoutDashboard,
                  title: "Conheça o Dashboard",
                  desc: "Veja métricas em tempo real do seu negócio.",
                  cta: "Ir para o Dashboard",
                  to: "/",
                },
              ].map((card) => (
                <div
                  key={card.to}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex items-center gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{card.title}</p>
                    <p className="text-xs text-zinc-500">{card.desc}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(card.to, { replace: true })}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                  >
                    {card.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-zinc-400 pt-8">
          © {new Date().getFullYear()} Ótica Dominante · Powered by Headway Mídia
        </p>
      </div>
    </div>
  );
}
