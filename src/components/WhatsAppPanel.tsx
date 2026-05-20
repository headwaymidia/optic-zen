import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
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

const META_WEBHOOK_URL =
  "https://fxcgvlukzjmwzpzuvzcp.supabase.co/functions/v1/whatsapp-meta-webhook";
const META_VERIFY_TOKEN = "oticadominante_meta_webhook_2024";

interface Props {
  storeId: string;
  role: string; // "Dono" | "Gerente" | "Vendedor"
}

type LocalWhatsAppStatus = WhatsAppStatus | "checking";

export function WhatsAppPanel({ storeId, role }: Props) {
  const canEdit = role === "Dono" || role === "Gerente";
  const { connection, loading, refetch } = useWhatsAppConnection(storeId);
  const queryClient = useQueryClient();
  // Fonte única de verdade: invalida a query compartilhada (sidebar + painel) e refaz fetch.
  const syncConnection = async () => {
    await queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", storeId] });
    await refetch();
  };

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<"connect" | "disconnect" | null>(null);
  const [lastConnectAt, setLastConnectAt] = useState<number>(0);
  const CONNECT_COOLDOWN_MS = 30000; // 30s entre tentativas de conexão
  const [localStatus, setLocalStatus] = useState<LocalWhatsAppStatus>("checking");
  const [localPhone, setLocalPhone] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Fonte única de verdade para renderização: o JSX nunca lê status direto da query.
  const isChecking = localStatus === "checking";
  const status: WhatsAppStatus | null = isChecking ? null : localStatus;
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const effectiveConnection: WhatsAppConnection | null = !isChecking && status
    ? (connection
        ? { ...connection, status, phone_number: localPhone ?? connection.phone_number }
        : ({
            id: "",
            store_id: storeId,
            provider: "evolution",
            status,
            phone_number: localPhone,
            evolution_instance_name: `loja-${storeId}`,
            evolution_api_url: null,
            evolution_api_key: null,
            meta_phone_number_id: null,
            meta_waba_id: null,
            meta_access_token: null,
            meta_webhook_verify_token: null,
            connected_at: null,
            created_at: "",
            updated_at: "",
          } as WhatsAppConnection)
      )
    : null;

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

  function extractQr(res: any): string | null {
    return (
      res?.base64 ??
      res?.qrcode?.base64 ??
      res?.qrcode ??
      res?.code ??
      null
    );
  }

  function isConnectedResponse(res: any): boolean {
    const state =
      res?.instance?.state ??
      res?.state ??
      res?.instance?.status ??
      res?.status;
    return state === "open" || state === "connected";
  }

  // Polling enquanto conectando — intervalo seguro para não causar ban do WhatsApp.
  const shouldPoll = isConnecting;
  const pollAttemptsRef = React.useRef(0);
  const MAX_POLL_ATTEMPTS = 40; // ~5 minutos com intervalo de 8s
  useEffect(() => {
    if (!shouldPoll || isConnected) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      pollAttemptsRef.current = 0;
      return;
    }

    const tick = async () => {
      pollAttemptsRef.current += 1;

      // Para de tentar após MAX_POLL_ATTEMPTS para evitar ban
      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setLocalStatus("disconnected");
        toast({
          title: "Tempo esgotado",
          description: "Não foi possível conectar. Aguarde alguns minutos e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      try {
        const st = await callEvo("status");
        if (isConnectedResponse(st)) {
          setQrCode(null);
          setLocalPhone(st?.phone_number ?? null);
          setLocalStatus("connected");
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
          pollAttemptsRef.current = 0;
          await syncConnection();
          toast({ title: "WhatsApp conectado!", description: "Loja vinculada com sucesso." });
          return;
        }
        // Se ainda não conectou e não temos QR, busca um
        if (!qrCode) {
          const q = await callEvo("qr");
          const qr = extractQr(q);
          if (qr) setQrCode(qr);
        }
      } catch (e) {
        console.error("poll error", e);
      }
    };

    tick();
    // 8 segundos entre verificações — seguro para o WhatsApp
    pollRef.current = window.setInterval(tick, 8000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPoll, isConnected, storeId]);

  // Sync inicial de status com servidor
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      try {
        const st = await callEvo("status");
        if (import.meta.env.DEV) {
          console.log('[mount] status response:', st);
          console.log('[mount] isConnected:', isConnectedResponse(st));
        }
        if (isConnectedResponse(st)) {
          setQrCode(null);
          setLocalPhone(st?.phone_number ?? null);
          setLocalStatus("connected");
          // A Edge Function (action: 'status') já fez o upsert server-side com service_role.
        } else {
          setQrCode(null);
          setLocalPhone(connection?.phone_number ?? null);
          setLocalStatus(connection?.status ?? "disconnected");
        }
        await syncConnection();
      } catch {
        /* noop */
      } finally {
        setLocalStatus((current) => current === "checking" ? "disconnected" : current);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // Realtime: qualquer CONNECTION_UPDATE no servidor invalida a query compartilhada,
  // mantendo sidebar e painel sincronizados a partir da mesma fonte.
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`wa-conn-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_connections",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", storeId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Espelha o status do servidor (atualizado via Realtime) no estado local quando muda externamente,
  // exceto durante operações em andamento (busy) ou checagem inicial.
  useEffect(() => {
    if (busy || isChecking || !connection) return;
    if (connection.status !== localStatus) {
      setLocalStatus(connection.status);
      setLocalPhone(connection.phone_number ?? null);
      if (connection.status !== "connecting") setQrCode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.status, connection?.phone_number]);

  async function handleConnect() {
    if (!canEdit) return;
    // Cooldown: evita múltiplas tentativas em sequência que causam ban
    const now = Date.now();
    if (now - lastConnectAt < CONNECT_COOLDOWN_MS) {
      const secsLeft = Math.ceil((CONNECT_COOLDOWN_MS - (now - lastConnectAt)) / 1000);
      toast({
        title: "Aguarde antes de tentar novamente",
        description: `Tente novamente em ${secsLeft} segundos para evitar bloqueio do WhatsApp.`,
        variant: "destructive",
      });
      return;
    }
    setLastConnectAt(now);
    setBusy("connect");
    try {
      // 1) Verifica se já está conectado na Evolution API
      try {
        const st = await callEvo("status");
        if (isConnectedResponse(st)) {
          // UI otimista — não esperar pelo refetch
          setQrCode(null);
          setLocalPhone(st?.phone_number ?? null);
          setLocalStatus("connected");
          // A Edge Function (action: 'status') já fez o upsert server-side com service_role.
          await syncConnection();
          toast({ title: "WhatsApp já conectado", description: "Loja vinculada com sucesso." });
          return;
        }
      } catch (e) {
        console.warn("status check before connect failed", e);
      }

      // 2) Override local imediato para iniciar o polling — a Edge Function (action: 'connect')
      // fará o upsert do registro com status 'connecting' usando service_role.
      setLocalStatus("connecting");

      // 3) Gera o QR Code
      const res = await callEvo("connect");
      const qr = extractQr(res);
      if (qr) setQrCode(qr);
      await syncConnection();
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

  async function handleRefreshQr() {
    if (!canEdit) return;
    setBusy("connect");
    try {
      const q = await callEvo("qr");
      const qr = extractQr(q);
      if (qr) setQrCode(qr);
    } catch (e) {
      toast({ title: "Erro ao atualizar QR", description: humanizeError(e), variant: "destructive" });
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
      setLocalPhone(null);
      setLocalStatus("disconnected");
      await syncConnection();
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
      {isChecking ? (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ConnectionStatusCard connection={effectiveConnection} loading={loading} />
      )}

      <Tabs
        defaultValue={connection?.provider === "meta" ? "meta" : "evolution"}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="evolution">Evolution API (QR Code)</TabsTrigger>
          <TabsTrigger value="meta">Meta Cloud API (Oficial)</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="mt-4">
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
                    {effectiveConnection?.phone_number && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-200">
                        Número: {formatPhone(effectiveConnection.phone_number)}
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
            {!isConnected && (isConnecting || qrCode) && (
              <div className="space-y-3">
                <div className="rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700/50 px-3 py-2 text-xs text-orange-900 dark:text-orange-100 flex gap-2">
                  <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Conexão pendente — reconecte via QR Code</p>
                    <p className="opacity-90 mt-0.5">
                      A instância do WhatsApp caiu ou ainda não foi vinculada. Escaneie o QR
                      Code abaixo com o aparelho da loja para reconectar.
                    </p>
                  </div>
                </div>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRefreshQr}
                      disabled={busy !== null}
                      className="flex-1 h-9 gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Atualizar QR Code
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={busy !== null}
                      className="flex-1 h-9 gap-2"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Estado: desconectado */}
            {!isConnected && !isConnecting && !qrCode && !isChecking && (
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
        </TabsContent>

        <TabsContent value="meta" className="mt-4">
          <MetaCloudForm
            storeId={storeId}
            canEdit={canEdit}
            connection={connection}
            onSaved={refetch}
          />
        </TabsContent>
      </Tabs>

      {!canEdit && (
        <p className="text-[11px] text-muted-foreground">
          Apenas o proprietário ou gerente da loja pode gerenciar a conexão com WhatsApp.
        </p>
      )}
    </div>
  );
}

function MetaCloudForm({
  storeId,
  canEdit,
  connection,
  onSaved,
}: {
  storeId: string;
  canEdit: boolean;
  connection: WhatsAppConnection | null;
  onSaved: () => void;
}) {
  const isMeta = connection?.provider === "meta";
  const [phoneNumberId, setPhoneNumberId] = useState(
    isMeta ? connection?.meta_phone_number_id ?? "" : "",
  );
  const [wabaId, setWabaId] = useState(isMeta ? connection?.meta_waba_id ?? "" : "");
  const [accessToken, setAccessToken] = useState(
    isMeta ? connection?.meta_access_token ?? "" : "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connection?.provider === "meta") {
      setPhoneNumberId(connection.meta_phone_number_id ?? "");
      setWabaId(connection.meta_waba_id ?? "");
      setAccessToken(connection.meta_access_token ?? "");
    }
  }, [connection?.id, connection?.provider, connection?.meta_phone_number_id, connection?.meta_waba_id, connection?.meta_access_token]);

  function copy(value: string, label: string) {
    navigator.clipboard.writeText(value).then(
      () => toast({ title: `${label} copiado` }),
      () => toast({ title: "Falha ao copiar", variant: "destructive" }),
    );
  }

  async function handleSave() {
    if (!canEdit) return;
    if (!phoneNumberId.trim() || !wabaId.trim() || !accessToken.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Phone Number ID, WABA ID e Access Token são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_connections")
        .upsert(
          {
            store_id: storeId,
            provider: "meta",
            meta_phone_number_id: phoneNumberId.trim(),
            meta_waba_id: wabaId.trim(),
            meta_access_token: accessToken.trim(),
            meta_webhook_verify_token: META_VERIFY_TOKEN,
            status: "connected",
            connected_at: new Date().toISOString(),
          },
          { onConflict: "store_id" },
        );
      if (error) throw error;
      toast({
        title: "Meta Cloud API configurada",
        description: "Credenciais salvas com sucesso.",
      });
      onSaved();
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: humanizeError(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-blue-700 dark:text-blue-300" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Meta Cloud API</h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            API Oficial do WhatsApp Business
          </Badge>
        </div>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 space-y-2 text-xs">
        <p className="font-medium">Configure no Meta Developers (Webhooks):</p>
        <div className="space-y-1.5">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Webhook URL
            </Label>
            <div className="flex gap-1 mt-1">
              <Input readOnly value={META_WEBHOOK_URL} className="font-mono text-[11px] h-9" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => copy(META_WEBHOOK_URL, "Webhook URL")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Verify Token
            </Label>
            <div className="flex gap-1 mt-1">
              <Input readOnly value={META_VERIFY_TOKEN} className="font-mono text-[11px] h-9" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => copy(META_VERIFY_TOKEN, "Verify Token")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="meta-phone-id" className="text-xs">
            Phone Number ID
          </Label>
          <Input
            id="meta-phone-id"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="Ex.: 123456789012345"
            disabled={!canEdit || saving}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-waba-id" className="text-xs">
            WhatsApp Business Account ID (WABA ID)
          </Label>
          <Input
            id="meta-waba-id"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="Ex.: 987654321098765"
            disabled={!canEdit || saving}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta-token" className="text-xs">
            Access Token (permanente)
          </Label>
          <Input
            id="meta-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAG..."
            disabled={!canEdit || saving}
            className="font-mono text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Use um token de sistema (System User) com permissões whatsapp_business_messaging e whatsapp_business_management.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={!canEdit || saving}
          className="w-full h-9 gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Salvar credenciais Meta
        </Button>
      </div>
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
