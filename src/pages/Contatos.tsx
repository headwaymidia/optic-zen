import { useMemo, useState } from "react";
import { Lead, LEAD_SOURCES, INTEREST_TAGS } from "@/lib/supabase";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { useLeads } from "@/hooks/useLeads";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDialog } from "@/components/LeadDialog";
import { PhoneLink } from "@/components/PhoneLink";
import { Plus, MessageCircle, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { DataSkeleton } from "@/components/ui/DataSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 10;
const ALL = "__all__";

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} ${hr === 1 ? "hora" : "horas"}`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `há ${day} ${day === 1 ? "dia" : "dias"}`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `há ${mo} ${mo === 1 ? "mês" : "meses"}`;
  const yr = Math.floor(mo / 12);
  return `há ${yr} ${yr === 1 ? "ano" : "anos"}`;
}

export default function Contatos() {
  const { leads, loading, refetch } = useLeads();
  const { members, nameById } = useStoreMembers();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>(ALL);
  const [tagFilter, setTagFilter] = useState<string>(ALL);
  const [salesFilter, setSalesFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        const term = search.toLowerCase();
        if (term && !(l.name.toLowerCase().includes(term) || (l.phone ?? "").includes(search))) return false;
        if (sourceFilter !== ALL && (l.lead_source ?? "") !== sourceFilter) return false;
        if (tagFilter !== ALL && (l.interest_tag ?? "") !== tagFilter) return false;
        if (salesFilter !== ALL && (l.responsible_id ?? "") !== salesFilter) return false;
        return true;
      }),
    [leads, search, sourceFilter, tagFilter, salesFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openWhatsApp(phone: string | null) {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Lista completa de leads da sua ótica.</p>
        </div>
        <Button onClick={() => { setEditingLead(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo lead
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <Select value={sourceFilter} onValueChange={resetPage(setSourceFilter)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as origens</SelectItem>
            {LEAD_SOURCES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={resetPage(setTagFilter)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as tags</SelectItem>
            {INTEREST_TAGS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={salesFilter} onValueChange={resetPage(setSalesFilter)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Vendedora" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as vendedoras</SelectItem>
            {members.map((m) => (<SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Vendedora</TableHead>
              <TableHead>Última atividade</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && leads.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell colSpan={10} className="py-2">
                    <DataSkeleton variant="row" className="[&>div]:h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-2">
                  <EmptyState
                    icon={Users}
                    title="Nenhum contato cadastrado ainda."
                    description="Comece adicionando seu primeiro lead."
                    actionLabel="Novo Lead"
                    onAction={() => { setEditingLead(null); setDialogOpen(true); }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => { setEditingLead(l); setDialogOpen(true); }}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                  <TableCell>{l.priority || "—"}</TableCell>
                  <TableCell>{(l.lead_source as string) || "—"}</TableCell>
                  <TableCell>{(l.interest_tag as string) || "—"}</TableCell>
                  <TableCell>{l.responsible_id ? (nameById.get(l.responsible_id) ?? "—") : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatRelative(l.updated_at)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {l.phone && (
                      <Button size="sm" variant="ghost" onClick={() => openWhatsApp(l.phone)}>
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filtered.length === 0 ? "0 contatos" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editingLead}
        onSaved={refetch}
      />
    </div>
  );
}
