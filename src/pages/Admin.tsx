import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import { toast } from "@/components/ui/use-toast";
import { PhoneLink } from "@/components/PhoneLink";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, RefreshCw, Wifi, WifiOff,
  MessageCircle, Users, AlertTriangle, TrendingUp, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "headwaymidia@gmail.com";

interface AdminStoreRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  owner_name: string | null;
  created_at: string;
  status: string | null;
  trial_ends_at: string | null;
  plan_type: string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  whatsapp_status: string;
  whatsapp_instance: string | null;
  messages_7d: number;
  leads_7d: number;
  members_count: number;
  last_activity: string | null;
  days_since_activity: number | null;
  is_inactive: boolean;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return "—"; }
}

function daysRemaining(value: string | null): number | null {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatRelative(value: string | null) {
  if (!value) return "Nunca";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  return `${days}d atrás`;
}

function statusBadge(status: string | null) {
  if (status === "active") return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs">Ativa</Badge>;
  if (status === "blocked") return <Badge variant="destructive" className="text-xs">Bloqueada</Badge>;
  if (status === "trial") return <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">Trial</Badge>;
  if (status === "expired") return <Badge variant="secondary" className="text-xs">Expirada</Badge>;
  return <Badge variant="outline" className="text-xs">{status ?? "—"}</Badge>;
}

function whatsappBadge(status: string) {
  const connected = status === "connected" || status === "open";
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", connected ? "text-emerald-600" : "text-red-500")}>
      {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {connected ? "Conectado" : "Desconectado"}
    </div>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "inactive" | "disconnected">("all");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-stores", { body: { action: "list" } });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro ao carregar", description: (data as any)?.error ?? error?.message, variant: "destructive" });
      return;
    }
    const raw = (data as any)?.data ?? [];
    setRows(raw);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  async function runAction(storeId: string, action: "activate" | "activate_monthly" | "activate_yearly" | "block" | "extend_trial", label: string) {
    setActingId(storeId + action);
    const { data, error } = await supabase.functions.invoke("admin-stores", { body: { action, store_id: storeId } });
    setActingId(null);
    if (error || (data as any)?.error) {
      toast({ title: "Falha", description: (data as any)?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: label, description: "Operação concluída" });
    load();
  }

  const filtered = useMemo(() => {
    let result = rows;
    if (filter === "inactive") result = result.filter(r => r.is_inactive);
    if (filter === "disconnected") result = result.filter(r => r.whatsapp_status !== "connected" && r.whatsapp_status !== "open");
    const q = search.trim().toLowerCase();
    if (q) result = result.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.owner_name?.toLowerCase().includes(q)
    );
    return result;
  }, [rows, search, filter]);

  // Sumário
  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.status === "active").length,
    trial: rows.filter(r => r.status === "trial").length,
    inactive: rows.filter(r => r.is_inactive).length,
    disconnected: rows.filter(r => r.whatsapp_status !== "connected" && r.whatsapp_status !== "open").length,
    msgs7d: rows.reduce((a, r) => a + r.messages_7d, 0),
  }), [rows]);

  if (authLoading) return <div className="p-6"><DataSkeleton variant="card" count={3} /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel do Administrador</h1>
          <p className="text-sm text-muted-foreground">Gestão de lojas e acompanhamento operacional.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Buscar loja, dono ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="md:w-72" />
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Cards de sumário */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total lojas", value: stats.total, icon: Users, color: "text-foreground" },
          { label: "Ativas", value: stats.active, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Trial", value: stats.trial, icon: Activity, color: "text-amber-500" },
          { label: "Inativas 7d", value: stats.inactive, icon: AlertTriangle, color: "text-orange-500", filterKey: "inactive" as const },
          { label: "WA desconect.", value: stats.disconnected, icon: WifiOff, color: "text-red-500", filterKey: "disconnected" as const },
          { label: "Msgs 7 dias", value: stats.msgs7d, icon: MessageCircle, color: "text-blue-500" },
        ].map((s) => (
          <Card
            key={s.label}
            className={cn("cursor-default", s.filterKey && "cursor-pointer hover:border-primary transition-colors", filter === s.filterKey && "border-primary bg-primary/5")}
            onClick={() => s.filterKey && setFilter(filter === s.filterKey ? "all" : s.filterKey)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className={cn("h-4 w-4 shrink-0", s.color)} />
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Lojas {filtered.length > 0 && <Badge variant="secondary">{filtered.length}</Badge>}
            {filter !== "all" && (
              <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto" onClick={() => setFilter("all")}>
                Limpar filtro ×
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><DataSkeleton variant="row" count={5} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma loja encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>Loja</TableHead>
                    <TableHead>Dono</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Msgs 7d</TableHead>
                    <TableHead>Leads 7d</TableHead>
                    <TableHead>Última ativ.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renovação / Expira</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <>
                      <TableRow
                        key={r.id}
                        className={cn(
                          "cursor-pointer",
                          r.is_inactive && "bg-orange-50/50 dark:bg-orange-900/10",
                          expandedId === r.id && "bg-muted/50"
                        )}
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        <TableCell className="pr-0">
                          {expandedId === r.id
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px]">
                          <div className="truncate">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDate(r.created_at)}</div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <div className="truncate text-sm">{r.owner_name ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{r.email ?? "—"}</div>
                        </TableCell>
                        <TableCell>{whatsappBadge(r.whatsapp_status)}</TableCell>
                        <TableCell>
                          <span className={cn("font-semibold", r.messages_7d === 0 ? "text-muted-foreground" : "text-blue-600")}>
                            {r.messages_7d}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("font-semibold", r.leads_7d === 0 ? "text-muted-foreground" : "text-emerald-600")}>
                            {r.leads_7d}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-xs", r.is_inactive ? "text-orange-500 font-medium" : "text-muted-foreground")}>
                            {formatRelative(r.last_activity)}
                          </span>
                        </TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs">
                          {r.status === "active" && r.current_period_end ? (
                            <div>
                              <p className="text-emerald-600 font-medium">{formatDate(r.current_period_end)}</p>
                              <p className="text-muted-foreground">{daysRemaining(r.current_period_end)}d restantes</p>
                            </div>
                          ) : r.status === "trial" && r.trial_ends_at ? (
                            <div>
                              <p className="text-amber-500 font-medium">{formatDate(r.trial_ends_at)}</p>
                              <p className="text-muted-foreground">{daysRemaining(r.trial_ends_at)}d restantes</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={actingId === r.id + "activate_monthly"} onClick={() => runAction(r.id, "activate_monthly", "Ativado — Mensal")}>Mensal</Button>
                            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" disabled={actingId === r.id + "activate_yearly"} onClick={() => runAction(r.id, "activate_yearly", "Ativado — Anual")}>Anual</Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={actingId === r.id + "block"} onClick={() => runAction(r.id, "block", "Loja bloqueada")}>Bloquear</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actingId === r.id + "extend_trial"} onClick={() => runAction(r.id, "extend_trial", "Trial +30 dias")}>+30d</Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Linha expandida */}
                      {expandedId === r.id && (
                        <TableRow key={r.id + "-expanded"} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={10} className="py-3 px-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Contato</p>
                                {r.phone && r.phone !== "—" ? (
                                  <PhoneLink phone={r.phone} className="text-sm" iconClassName="h-3.5 w-3.5" />
                                ) : <span className="text-muted-foreground">—</span>}
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Instância Evolution</p>
                                <p className="font-mono text-xs truncate">{r.whatsapp_instance ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Membros na loja</p>
                                <p className="font-semibold">{r.members_count}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Plano</p>
                                <p>{[r.plan_type, r.billing_cycle].filter(Boolean).join(" · ") || "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Status inatividade</p>
                                {r.is_inactive
                                  ? <span className="text-orange-500 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Inativa há {r.days_since_activity ?? "?"} dias</span>
                                  : <span className="text-emerald-600 font-medium">Ativa</span>
                                }
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Store ID</p>
                                <p className="font-mono text-[10px] truncate text-muted-foreground">{r.id}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
