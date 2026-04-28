import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import logoOticaDominante from "@/assets/logo-otica-dominante.png";

type AuthMode = "LOGIN" | "REGISTER" | "RECOVERY";

export default function AuthPage() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name: name.trim() || undefined },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
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
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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
            <div className="flex justify-center mb-8">
              <img
                src={logoOticaDominante}
                alt="Ótica Dominante — Powered by Headway Mídia"
                className="h-20 w-auto object-contain"
              />
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                      Senha
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMode("RECOVERY")}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
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
          <div className="flex items-center">
            <img
              src={logoOticaDominante}
              alt="Ótica Dominante — Powered by Headway Mídia"
              className="h-20 w-auto object-contain brightness-0 invert"
            />
          </div>

          <div className="space-y-5 max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CRM Premium para Óticas e Clínicas
            </div>
            <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.05]">
              A inteligência comercial por trás do seu balcão.
            </h2>
            <p className="text-base xl:text-lg text-slate-300 leading-relaxed">
              O único CRM do mercado desenvolvido para blindar seu faturamento, organizar a equipe e transformar leads em clientes de alto ticket.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Funil visual de vendas focado em conversão
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Atendimento de WhatsApp e CRM integrados
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckDot /> Painel de performance para donos e gerentes
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
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
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
        "w-full h-11 rounded-lg text-sm font-semibold shadow-sm",
        "bg-primary hover:bg-primary/90 text-primary-foreground"
      )}
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
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 border border-emerald-400/30">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </span>
  );
}
