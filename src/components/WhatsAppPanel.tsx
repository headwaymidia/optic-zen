import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldOff,
  Smartphone,
  WifiOff,
} from "lucide-react";
import {
  useWhatsAppConnection,
  type WhatsAppConnection,
  type WhatsAppStatus,
} from "@/hooks/useWhatsAppConnection";

interface Props {
  storeId: string;
  role: string; // "Dono" | "Gerente" | "Vendedor"
}

export function WhatsAppPanel({ storeId, role }: Props) {
  const canEdit = role === "Dono" || role === "Gerente";
  const { connection, loading, refetch } = useWhatsAppConnection(storeId);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const pollRef = useRef<number | null>(null);

  const status: WhatsAppStatus = connection?.status ?? "disconnected";
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  async function callEvo(action: "status" | "connect" | "qr" | "disconnect") {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const res = await fetch(
      "https://fxcgvlukzjmwzpzuvzcp.supabase.co/functions/v1/whatsapp-evolution",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: "sb_publishable_BgnFYgwfBCXxZcqO2rQJWA_qDAjT4_R",
        },
        body: JSON.stringify({ action, store_id: storeId }),
      },
    );

    let data: any = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Erro ${res.status} ao chamar whatsapp-evolution`);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  // Polling enquanto conectando: atualiza QR e status a cada 3s
  useEffect(() => {
    if (!isConnecting) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (!isConnecting) setQrCode(null);
      return;
    }

    const tick = async () => {
      try {
        const st = await callEvo("status");
        if (st?.status === "connected") {
          setQrCode(null);
          await refetch();
          toast({ title: "WhatsApp conectado!", description: "Loja vinculada com sucesso." });
          return;
        }
        const q = await callEvo("qr");
        if (q?.qrcode) setQrCode(q.qrcode);
      } catch (e) {
        console.error("poll error", e);
      }
    };

    tick();
    pollRef.current = window.setInterval(tick, 3000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnecting, storeId]);

  // Sync inicial de status com servidor
  useEffect(() => {
    if (!storeId) return;
    callEvo("status").then(() => refetch()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleConnect() {
    if (!canEdit) return;
    setBusy("connect");
    try {
      const res = await callEvo("connect");
      if (res?.qrcode) setQrCode(res.qrcode);
      await refetch();
    } catch (e) {
      toast({
        title: "Erro ao conectar",
        description: humanizeError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!canEdit) return;
    setBusy("disconnect");
    try {
      await callEvo("disconnect");
      setQrCode(null);
      await refetch();
      toast({ title: "WhatsApp desconectado" });
    } catch (e) {
      toast({
        title: "Erro ao desconectar",
        description: humanizeError(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <ConnectionStatusCard connection={connection} loading={loading} />

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <QrCode className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Conectar via QR Code</h3>
              <Badge variant="secondary" className="text-[10px] mt-0.5">
                Evolution API
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100 flex gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Use um número dedicado para a loja. Números pessoais podem ser banidos
            pelo WhatsApp.
          </span>
        </div>

        {/* Estado: conectado */}
        {isConnected && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  WhatsApp conectado
                </p>
                {connection?.phone_number && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-200">
                    Número: {formatPhone(connection.phone_number)}
                  </p>
                )}
              </div>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={busy !== null}
                className="w-full h-9 gap-2"
              >
                {busy === "disconnect" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Desconectar
              </Button>
            )}
          </div>
        )}

        {/* Estado: conectando — exibe QR */}
        {!isConnected && isConnecting && (
          <div className="space-y-3">
            <div className="mx-auto h-64 w-64 rounded-xl border-2 border-dashed border-border bg-white flex items-center justify-center overflow-hidden">
              {qrCode ? (
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-[11px]">Gerando QR Code…</p>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
              <p className="font-medium">Como conectar:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Abra o WhatsApp no celular</li>
                <li>Toque em ⋮ → Aparelhos conectados</li>
                <li>Toque em Conectar um aparelho</li>
                <li>Aponte a câmera para o QR Code</li>
              </ol>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Aguardando leitura do QR Code…</span>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={busy !== null}
                className="w-full h-9 gap-2"
              >
                Cancelar
              </Button>
            )}
          </div>
        )}

        {/* Estado: desconectado */}
        {!isConnected && !isConnecting && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Clique em conectar para gerar o QR Code e vincular o WhatsApp da loja.
            </p>
            <Button
              onClick={handleConnect}
              disabled={busy !== null || !canEdit}
              className="w-full h-9 gap-2"
            >
              {busy === "connect" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Conectar via QR Code
            </Button>
          </div>
        )}
      </div>

      {!canEdit && (
        <p className="text-[11px] text-muted-foreground">
          Apenas o proprietário ou gerente da loja pode gerenciar a conexão com WhatsApp.
        </p>
      )}
    </div>
  );
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return raw;
}

function ConnectionStatusCard({
  connection,
  loading,
}: {
  connection: WhatsAppConnection | null;
  loading: boolean;
}) {
  const status: WhatsAppStatus = connection?.status ?? "disconnected";
  const meta = STATUS_META[status];

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", meta.iconBg)}>
        <meta.Icon className={cn("h-5 w-5", meta.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Status do WhatsApp</p>
        <p className={cn("text-sm font-semibold", meta.textColor)}>
          {loading ? "Carregando…" : meta.label}
        </p>
        {connection?.phone_number && status === "connected" && (
          <p className="text-[11px] text-muted-foreground">{formatPhone(connection.phone_number)}</p>
        )}
      </div>
      {status === "connected" && (
        <Badge className="text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Conectado
        </Badge>
      )}
    </div>
  );
}

const STATUS_META: Record<WhatsAppStatus, {
  label: string;
  Icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
  textColor: string;
}> = {
  connected: {
    label: "Conectado",
    Icon: Smartphone,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  connecting: {
    label: "Aguardando QR Code…",
    Icon: RefreshCw,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-700 dark:text-amber-300 animate-spin",
    textColor: "text-amber-800 dark:text-amber-200",
  },
  disconnected: {
    label: "Desconectado",
    Icon: WifiOff,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    textColor: "text-foreground",
  },
  banned: {
    label: "Banido",
    Icon: ShieldOff,
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-700 dark:text-red-300",
    textColor: "text-red-700 dark:text-red-300",
  },
};
