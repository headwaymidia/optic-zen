import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataSkeleton } from "@/components/ui/DataSkeleton";

interface LogRow {
  id: string;
  created_at: string;
  store_id: string | null;
  function_name: string | null;
  level: string;
  event: string | null;
  message: string | null;
}

interface StoreLite {
  id: string;
  name: string;
}

function levelBadge(level: string) {
  const l = (level || "info").toLowerCase();
  if (l === "error")
    return <Badge className="bg-red-600 hover:bg-red-600 text-white">error</Badge>;
  if (l === "warn" || l === "warning")
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">warn</Badge>;
  return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">info</Badge>;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default function Logs() {
  const { stores, currentStore, loading: storesLoading } = useStores();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [storeMap, setStoreMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const allowed = currentStore?.role === "Dono" || currentStore?.role === "Gerente";

  async function load() {
    const { data } = await supabase
      .from("logs" as never)
      .select("id, created_at, store_id, function_name, level, event, message")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(((data as unknown) as LogRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!allowed) return;
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  useEffect(() => {
    const map: Record<string, string> = {};
    stores.forEach((s: StoreLite) => {
      map[s.id] = s.name;
    });
    setStoreMap(map);
  }, [stores]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (levelFilter !== "all" && (r.level || "info").toLowerCase() !== levelFilter)
        return false;
      if (storeFilter !== "all" && r.store_id !== storeFilter) return false;
      return true;
    });
  }, [rows, levelFilter, storeFilter]);

  if (storesLoading) {
    return (
      <div className="p-6">
        <DataSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div className="p-4 md:p-6 space-y-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="text-sm text-muted-foreground">
            Últimos 200 eventos do sistema — atualiza a cada 30s.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lojas</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {filtered.length} registro{filtered.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <DataSkeleton variant="row" count={6} />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum log encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Data/hora</TableHead>
                    <TableHead className="w-[160px]">Loja</TableHead>
                    <TableHead className="w-[180px]">Função</TableHead>
                    <TableHead className="w-[90px]">Nível</TableHead>
                    <TableHead className="w-[160px]">Evento</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[160px]">
                        {r.store_id ? storeMap[r.store_id] ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono truncate max-w-[180px]">
                        {r.function_name ?? "—"}
                      </TableCell>
                      <TableCell>{levelBadge(r.level)}</TableCell>
                      <TableCell className="text-sm truncate max-w-[160px]">
                        {r.event ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.message ?? "—"}
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
