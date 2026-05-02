import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type InviteInfo = {
  id: string;
  store_id: string;
  store_name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

export default function AceitarConvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { setCurrentStoreId, refetch } = useStores();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega informações do convite (público, via RPC)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError("Token de convite ausente.");
        setLoading(false);
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc("get_invite_by_token", {
        _token: token,
      });
      if (cancelled) return;
      if (rpcErr) {
        setError(rpcErr.message);
      } else if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("Convite não encontrado ou inválido.");
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        setInvite(row as InviteInfo);
        if (row.status !== "pendente") {
          setError(`Este convite já foi ${row.status}.`);
        } else if (new Date(row.expires_at) < new Date()) {
          setError("Este convite expirou.");
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!token || !invite) return;
    setAccepting(true);
    const { data, error: rpcErr } = await supabase.rpc("accept_store_invite", {
      _token: token,
    });
    if (rpcErr) {
      toast({
        title: "Erro ao aceitar convite",
        description: rpcErr.message,
        variant: "destructive",
      });
      setAccepting(false);
      return;
    }
    const acceptedStoreId = typeof data === "string" ? data : invite.store_id;
    let storeName = invite.store_name;
    if (acceptedStoreId) {
      const { data: storeRow } = await supabase
        .from("stores")
        .select("name")
        .eq("id", acceptedStoreId)
        .maybeSingle();
      if (storeRow?.name) storeName = storeRow.name;
    }
    toast({
      title: "Bem-vindo à equipe!",
      description: storeName
        ? `Você agora tem acesso a "${storeName}".`
        : "Convite aceito com sucesso.",
    });
    await refetch();
    if (acceptedStoreId) setCurrentStoreId(acceptedStoreId);
    navigate("/", { replace: true });
  }

  // Não logado → manda para /auth com redirect de volta
  function goToAuth(mode: "signin" | "signup") {
    const redirect = encodeURIComponent(`/aceitar-convite/${token}`);
    const emailParam = invite ? `&email=${encodeURIComponent(invite.email)}` : "";
    navigate(`/auth?mode=${mode}&redirect=${redirect}${emailParam}`, {
      replace: true,
    });
  }

  const baseClass =
    "min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center px-6 py-12";

  if (loading || authLoading) {
    return (
      <div className={baseClass}>
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando convite…
        </div>
      </div>
    );
  }

  return (
    <div className={baseClass}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Eye className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold text-slate-900">Ótica Dominante</p>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Convite de equipe
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h1 className="text-lg font-semibold">Não foi possível usar este convite</h1>
            </div>
            <p className="text-sm text-zinc-600">{error}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Voltar ao login</Link>
            </Button>
          </div>
        ) : invite ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-zinc-900">
                Você foi convidado!
              </h1>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Para acessar <span className="font-semibold">{invite.store_name}</span>{" "}
                como <span className="font-semibold">{invite.role}</span>, faça login
                ou crie sua conta usando o e-mail{" "}
                <span className="font-mono text-zinc-900">{invite.email}</span>.
              </p>
            </div>

            {session ? (
              <>
                {session.user.email?.toLowerCase() === invite.email.toLowerCase() ? (
                  <Button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Aceitando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Aceitar convite
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Você está logado como{" "}
                      <span className="font-mono">{session.user.email}</span>, mas este
                      convite é para <span className="font-mono">{invite.email}</span>.
                      Saia e entre com a conta correta.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        goToAuth("signin");
                      }}
                    >
                      Sair e usar outra conta
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => goToAuth("signup")}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Criar minha conta
                </Button>
                <Button
                  onClick={() => goToAuth("signin")}
                  variant="outline"
                  className="w-full h-12"
                >
                  Já tenho conta — entrar
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
