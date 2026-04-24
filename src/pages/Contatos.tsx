import { useMemo, useState } from "react";
import { Lead } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LeadDialog } from "@/components/LeadDialog";
import { Plus, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export default function Contatos() {
  const { leads, loading, refetch } = useLeads();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          (l.phone ?? "").includes(search)
      ),
    [leads, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openWhatsApp(phone: string | null) {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
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

      <Input
        placeholder="Buscar por nome ou telefone..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-sm"
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum contato encontrado</TableCell></TableRow>
            ) : (
              paginated.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => { setEditingLead(l); setDialogOpen(true); }}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.phone || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                  <TableCell>{l.priority || "—"}</TableCell>
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

