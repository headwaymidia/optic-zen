import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { Eye, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detecta a sessão de recovery enviada por email.
  // Supabase envia o usuário para /reset-password e dispara
  // onAuthStateChange("PASSWORD_RECOVERY", session) ou já cria a sessão.
  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    // Fallback: já pode existir sessão quando o componente monta
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        setStatus("ready");
      } else {
        // Sem sessão ainda — espera o evento PASSWORD_RECOVERY por alguns segundos.
        setTimeout(() => {
          if (active) {
            setStatus((s) => (s === "checking" ? "invalid" : s));
          }
        }, 4000);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "Use no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Senhas não conferem",
        description: "Digite a mesma senha nos dois campos.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast({
        title: "Erro ao redefinir senha",
        description: humanizeError(error),
        variant: "destructive",
      });
      return;
    }

    setStatus("done");
    toast({
      title: "Senha redefinida!",
      description: "Você já pode entrar com a nova senha.",
    });

    // Encerra a sessão de recovery e manda para o login.
    await supabase.auth.signOut();
    setTimeout(() => navigate("/auth", { replace: true }), 1200);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-md space-y-8">
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

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {status === "done" ? "Senha redefinida" : "Defina sua nova senha"}
          </h1>
          <p className="text-sm text-slate-500">
            {status === "ready" &&
              "Escolha uma nova senha para acessar sua conta."}
            {status === "checking" && "Validando seu link de recuperação..."}
            {status === "invalid" &&
              "O link expirou ou é inválido. Solicite um novo na tela de login."}
            {status === "done" &&
              "Pronto! Estamos redirecionando para o login..."}
          </p>
        </div>

        {status === "checking" && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {status === "invalid" && (
          <Button
            onClick={() => navigate("/auth", { replace: true })}
            className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white"
            style={{ borderRadius: 8 }}
          >
            Voltar para o login
          </Button>
        )}

        {status === "done" && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Senha atualizada com sucesso.
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-0 focus-visible:border-zinc-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-semibold text-slate-700">
                Confirmar nova senha
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="h-11 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-800 focus-visible:ring-offset-0 focus-visible:border-zinc-300"
              />
            </div>
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
                  Salvando...
                </>
              ) : (
                "Redefinir senha"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Ótica Dominante · Powered by Headway Mídia
        </p>
      </div>
    </div>
  );
}
