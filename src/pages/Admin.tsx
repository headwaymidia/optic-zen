import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { PhoneLink } from "@/components/PhoneLink";

const ADMIN_EMAIL = "headwaymidia@gmail.com";

interface AdminStoreRow {
  store_id: string;
  store_name: string;
  owner_email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  created_at: string;
  subscription_status: string | null;
  plan: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function statusBadge(status: string | null) {
  if (status === "active")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativa</Badge>;
  if (status === "blocked")
    return <Badge variant="destructive">Bloqueada</Badge>;
  if (status === "trial")
    return <Badge className="bg-amber-500 hover:bg-amber-500">Trial</Badge>;
  if (status === "expired")
    return <Badge variant="secondary">Expirada</Badge>;
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}

function planLabel(plan: string | null, cycle: string | null) {
  const c = cycle === "annual" ? "Anual" : cycle === "monthly" ? "Mensal" : cycle;
  return [plan, c].filter(Boolean).join(" · ") || "—";
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-stores", {
      body: { action: "list" },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Erro ao carregar",
        description: (data as any)?.error ?? error?.message ?? "Tente novamente",
        variant: "destructive",
      });
      return;
    }
    const raw = (data as any)?.data ?? (data as any)?.stores ?? [];
    const normalized: AdminStoreRow[] = (raw as any[]).map((r) => ({
      store_id: r.store_id ?? r.id,
      store_name: r.store_name ?? r.name ?? "—",
      owner_email: r.owner_email ?? r.email ?? null,
      owner_name: r.owner_name ?? r.full_name ?? null,
      owner_phone: r.owner_phone ?? r.whatsapp ?? null,
      created_at: r.created_at,
      subscription_status: r.subscription_status ?? r.status ?? null,
      plan: r.plan ?? r.plan_type ?? null,
      billing_cycle: r.billing_cycle ?? null,
      trial_ends_at: r.trial_ends_at ?? null,
      current_period_end: r.current_period_end ?? null,
    }));
    setRows(normalized);
  }

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function runAction(
    storeId: string,
    action: "activate" | "block" | "extend_trial",
    label: string,
  ) {
    setActingId(storeId + action);
    const { data, error } = await supabase.functions.invoke("admin-stores", {
      body: { action, store_id: storeId },
    });
    setActingId(null);
    if (error || (data as any)?.error) {
      toast({
        title: "Falha",
        description: (data as any)?.error ?? error?.message ?? "Tente novamente",
        variant: "destructive",
      });
      return;
    }
    toast({ title: label, description: "Operação concluída" });
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.store_name?.toLowerCase().includes(q) ||
        r.owner_email?.toLowerCase().includes(q) ||
        r.owner_name?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (authLoading) {
    return (
      <div className="p-6">
        <DataSkeleton variant="card" count={3} />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Painel do Administrador</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de lojas e assinaturas — acesso restrito.
          </p>
        </div>
        <Input
          placeholder="Buscar loja, dono ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-80"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lojas cadastradas {rows.length > 0 && `(${rows.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <DataSkeleton variant="row" count={6} />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma loja encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Dono</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Trial expira</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.store_id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {r.store_name}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate">{r.owner_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.owner_email ?? "—"}
                        </div>
                        {r.owner_phone && (
                          <div className="text-xs text-muted-foreground truncate">
                            <PhoneLink
                              phone={r.owner_phone}
                              className="text-muted-foreground"
                              iconClassName="h-3 w-3"
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                      <TableCell>{statusBadge(r.subscription_status)}</TableCell>
                      <TableCell>{planLabel(r.plan, r.billing_cycle)}</TableCell>
                      <TableCell>{formatDate(r.trial_ends_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            disabled={actingId === r.store_id + "activate"}
                            onClick={() =>
                              runAction(r.store_id, "activate", "Loja ativada")
                            }
                          >
                            Ativar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actingId === r.store_id + "block"}
                            onClick={() =>
                              runAction(r.store_id, "block", "Loja bloqueada")
                            }
                          >
                            Bloquear
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actingId === r.store_id + "extend_trial"}
                            onClick={() =>
                              runAction(
                                r.store_id,
                                "extend_trial",
                                "Trial estendido em 30 dias",
                              )
                            }
                          >
                            +30 dias
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
