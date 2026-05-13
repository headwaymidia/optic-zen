import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase, setRememberSession } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { Eye, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { maskPhone } from "@/lib/masks";

type AuthMode = "LOGIN" | "REGISTER" | "RECOVERY";

export default function AuthPage() {
  const { session, loading } = useAuth();
  const { stores, loading: storesLoading, refetch } = useStores();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  // Persiste o token de convite para sobreviver ao redirect de confirmação de email.
  useEffect(() => {
    if (redirectTo && redirectTo.startsWith("/aceitar-convite/")) {
      const token = redirectTo.replace("/aceitar-convite/", "").trim();
      if (token) {
        try {
          localStorage.setItem("od.pendingInviteToken", token);
        } catch {
          /* ignore */
        }
      }
    }
  }, [redirectTo]);
  const initialMode: AuthMode =
    searchParams.get("mode") === "signup" ? "REGISTER" : "LOGIN";
  const prefilledEmail = searchParams.get("email") ?? "";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (loading || (session && storesLoading)) return null;
  if (session) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    return <Navigate to={stores.length > 0 ? "/" : "/onboarding"} replace />;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Define o tipo de persistência (local vs sessão) ANTES do signIn
    setRememberSession(rememberMe);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: humanizeError(error), variant: "destructive" });
      return;
    }

    await refetch();
    const { data, error: storesError } = await supabase
      .from("store_members")
      .select("store:stores(id)")
      .limit(1);

    if (storesError) {
      toast({ title: "Erro ao verificar loja", description: humanizeError(storesError), variant: "destructive" });
      return;
    }

    if (redirectTo) {
      navigate(redirectTo, { replace: true });
      return;
    }
    navigate((data?.length ?? 0) > 0 ? "/" : "/onboarding", { replace: true });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      toast({
        title: "Telefone inválido",
        description: "Informe um celular no formato (DD) 9XXXX-XXXX.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const isInvite = Boolean(redirectTo && redirectTo.startsWith("/aceitar-convite/"));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo
          ? `${window.location.origin}${redirectTo}`
          : `${window.location.origin}/`,
        data: {
          name: name.trim() || undefined,
          phone: phoneDigits,
          invited: isInvite || undefined,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({
      title: "Conta criada!",
      description: "Verifique seu email para confirmar o cadastro.",
    });
    setMode("LOGIN");
  }

  async function handleRecovery(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({
      title: "Link enviado!",
      description: "Confira seu email para redefinir sua senha.",
    });
    setMode("LOGIN");
  }

  const titles: Record<AuthMode, { title: string; subtitle: string }> = {
    LOGIN: {
      title: "Acesse seu painel",
      subtitle: "Entre para gerenciar seus leads e atendimentos.",
    },
    REGISTER: {
      title: "Crie sua conta",
      subtitle: "Comece agora a escalar o faturamento da sua ótica.",
    },
    RECOVERY: {
      title: "Recuperar senha",
      subtitle: "Digite seu email e enviaremos um link para redefinir sua senha.",
    },
  };

  const { title, subtitle } = titles[mode];

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* LEFT: Form */}
      <div className="flex flex-col h-full overflow-y-auto bg-white">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
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

            {/* Title */}
            <div className="space-y-1.5">
              {mode === "RECOVERY" && (
                <button
                  type="button"
                  onClick={() => setMode("LOGIN")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>

            {/* Forms */}
            {mode === "LOGIN" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  placeholder="voce@otica.com"
                  required
                />
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-0 focus-visible:border-zinc-300"
                  />
                </div>
                <div className="flex items-center justify-between -mt-1">
                  <label
                    htmlFor="remember-me"
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                      className="h-4 w-4 rounded border-zinc-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-white"
                    />
                    <span className="text-xs font-medium text-slate-600">
                      Lembrar minha sessão
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("RECOVERY")}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <SubmitButton submitting={submitting} label="Entrar na Plataforma" />
                <FooterSwitch
                  text="Ainda não tem uma conta?"
                  cta="Crie agora."
                  onClick={() => setMode("REGISTER")}
                />
              </form>
            )}

            {mode === "REGISTER" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <FormField
                  id="name"
                  label="Nome"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  required
                />
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  placeholder="voce@otica.com"
                  required
                />
                <FormField
                  id="phone"
                  label="Celular"
                  type="tel"
                  value={phone}
                  onChange={(v) => setPhone(maskPhone(v))}
                  autoComplete="tel"
                  placeholder="(11) 98765-4321"
                  inputMode="numeric"
                  maxLength={16}
                  required
                />
                <FormField
                  id="password"
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <SubmitButton submitting={submitting} label="Criar Minha Conta" />
                <FooterSwitch
                  text="Já tem uma conta?"
                  cta="Faça login."
                  onClick={() => setMode("LOGIN")}
                />
              </form>
            )}

            {mode === "RECOVERY" && (
              <form onSubmit={handleRecovery} className="space-y-4">
                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  placeholder="voce@otica.com"
                  required
                />
                <SubmitButton submitting={submitting} label="Enviar link de recuperação" />
                <FooterSwitch
                  text=""
                  cta="Voltar para o login"
                  onClick={() => setMode("LOGIN")}
                />
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 pb-6 px-6">
          © {new Date().getFullYear()} Ótica Dominante · Powered by Headway Mídia
        </p>
      </div>

      {/* RIGHT: Brand panel (desktop only) */}
      <div className="hidden md:flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        {/* Decorative glow */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.04),transparent_60%)]" />

        <div className="relative flex flex-col justify-between w-full p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <Eye className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold text-white">Ótica Dominante</p>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Powered by Headway Mídia
              </p>
            </div>
          </div>

          <div className="space-y-5 max-w-md">
            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05]">
              O motor de vendas da sua ótica.
            </h2>
            <p className="text-base xl:text-lg text-slate-300 leading-relaxed">
              Centralize leads, organize sua equipe e transforme cada atendimento em uma venda fechada com inteligência total.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Funil visual com Kanban arrastar-e-soltar
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Atendimento integrado e prontuário digital
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Gestão de pedidos e laboratório
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email" | "url" | "search" | "decimal" | "none";
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-slate-700">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-0 focus-visible:border-zinc-300"
      />
    </div>
  );
}

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <Button
      type="submit"
      disabled={submitting}
      className={cn(
        "w-full h-11 text-sm font-semibold shadow-sm text-white",
        "bg-emerald-500 hover:bg-emerald-600 transition-colors"
      )}
      style={{ borderRadius: 8 }}
    >
      {submitting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Aguarde...
        </>
      ) : (
        label
      )}
    </Button>
  );
}

function FooterSwitch({
  text,
  cta,
  onClick,
}: {
  text: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <p className="text-center text-sm text-slate-500 pt-2">
      {text}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-semibold text-zinc-500 hover:text-zinc-900 hover:underline transition-colors"
      >
        {cta}
      </button>
    </p>
  );
}

function CheckDot() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 border border-emerald-400/40">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </span>
  );
}
