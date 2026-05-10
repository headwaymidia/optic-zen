import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ResponsiveDialog";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  QrCode,
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
  const { connection, loading, upsert } = useWhatsAppConnection(storeId);

  const [evoUrl, setEvoUrl] = useState("");
  const [evoKey, setEvoKey] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [savingEvo, setSavingEvo] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    if (!connection) return;
    setEvoUrl(connection.evolution_api_url ?? "");
    setEvoKey(connection.evolution_api_key ?? "");
    setEvoInstance(connection.evolution_instance_name ?? "");
    setMetaPhoneId(connection.meta_phone_number_id ?? "");
    setMetaToken(connection.meta_access_token ?? "");
  }, [connection?.id]);

  async function handleConnectEvolution() {
    if (!canEdit) return;
    if (!evoUrl.trim() || !evoKey.trim() || !evoInstance.trim()) {
      toast({ title: "Preencha URL, API Key e Nome da instância", variant: "destructive" });
      return;
    }
    setSavingEvo(true);
    const { error } = await upsert({
      provider: "evolution",
      status: "connecting",
      evolution_api_url: evoUrl.trim(),
      evolution_api_key: evoKey.trim(),
      evolution_instance_name: evoInstance.trim(),
    });
    setSavingEvo(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setQrOpen(true);
  }

  async function handleConnectMeta() {
    if (!canEdit) return;
    if (!metaPhoneId.trim() || !metaToken.trim()) {
      toast({ title: "Preencha Phone Number ID e Access Token", variant: "destructive" });
      return;
    }
    setSavingMeta(true);
    const { error } = await upsert({
      provider: "meta",
      status: "connecting",
      meta_phone_number_id: metaPhoneId.trim(),
      meta_access_token: metaToken.trim(),
    });
    setSavingMeta(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Configurações salvas!" });
  }

  return (
    <div className="space-y-4">
      <ConnectionStatusCard connection={connection} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolution API */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Evolution API</h3>
                <Badge variant="secondary" className="text-[10px] mt-0.5">QR Code</Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Conecte qualquer número via QR Code. Rápido e simples. Recomendado para testes.
          </p>
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Use um número dedicado. Números pessoais ou comerciais principais podem ser banidos.
            </span>
          </div>
          <fieldset disabled={!canEdit} className="space-y-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="evo-url" className="text-xs">URL da API</Label>
              <Input
                id="evo-url"
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="https://api.evolution.exemplo.com"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evo-key" className="text-xs">API Key</Label>
              <Input
                id="evo-key"
                value={evoKey}
                onChange={(e) => setEvoKey(e.target.value)}
                type="password"
                placeholder="••••••••••••"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evo-instance" className="text-xs">Nome da instância</Label>
              <Input
                id="evo-instance"
                value={evoInstance}
                onChange={(e) => setEvoInstance(e.target.value)}
                placeholder="otica-loja-1"
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={handleConnectEvolution}
              disabled={savingEvo || !canEdit}
              className="w-full h-9 gap-2"
            >
              {savingEvo ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Conectar via QR Code
            </Button>
          </fieldset>
        </div>

        {/* Meta Cloud API */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Meta Cloud API</h3>
                <Badge className="text-[10px] mt-0.5 gap-1 bg-emerald-600 hover:bg-emerald-600">
                  <BadgeCheck className="h-3 w-3" />
                  Oficial Meta
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Integração oficial com o WhatsApp Business. Zero risco de banimento. Recomendado para produção.
          </p>
          <fieldset disabled={!canEdit} className="space-y-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="meta-phone" className="text-xs">Phone Number ID</Label>
              <Input
                id="meta-phone"
                value={metaPhoneId}
                onChange={(e) => setMetaPhoneId(e.target.value)}
                placeholder="1234567890"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta-token" className="text-xs">Access Token</Label>
              <Input
                id="meta-token"
                value={metaToken}
                onChange={(e) => setMetaToken(e.target.value)}
                type="password"
                placeholder="••••••••••••"
                className="h-9 text-sm"
              />
            </div>
            <Button
              onClick={handleConnectMeta}
              disabled={savingMeta || !canEdit}
              className="w-full h-9 gap-2"
            >
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Conectar
            </Button>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Como obter minhas credenciais?
              <ExternalLink className="h-3 w-3" />
            </a>
          </fieldset>
        </div>
      </div>

      {!canEdit && (
        <p className="text-[11px] text-muted-foreground">
          Apenas o proprietário ou gerente da loja pode editar a integração com WhatsApp.
        </p>
      )}

      <QrCodeDialog open={qrOpen} onOpenChange={setQrOpen} />
    </div>
  );
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
        {connection?.phone_number && (
          <p className="text-[11px] text-muted-foreground">{connection.phone_number}</p>
        )}
      </div>
      {connection?.provider && (
        <Badge variant="outline" className="text-[10px] uppercase">
          {connection.provider === "evolution" ? "Evolution" : "Meta"}
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
    Icon: CheckCircle2,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-300",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  connecting: {
    label: "Conectando…",
    Icon: Loader2,
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

function QrCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Conectar via QR Code</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Escaneie o código no WhatsApp do seu celular para conectar.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className="py-4 space-y-4">
        <div className="mx-auto h-56 w-56 rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <QrCode className="h-12 w-12 opacity-40" />
          <p className="text-[11px]">QR Code aparecerá aqui</p>
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
      </div>
      <ResponsiveDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
}
