import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STATUSES, Lead, LeadPriority, LeadStatus, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead?: Lead | null;
  defaultStatus?: LeadStatus;
  onSaved: () => void;
}

const PRIORITIES: LeadPriority[] = ["Baixa", "Média", "Alta"];

export function LeadDialog({ open, onOpenChange, lead, defaultStatus, onSaved }: Props) {
  const { user, profile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo Lead");
  const [priority, setPriority] = useState<LeadPriority>("Média");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(lead?.name ?? "");
      setPhone(lead?.phone ?? "");
      setStatus((lead?.status as LeadStatus) ?? defaultStatus ?? "Novo Lead");
      setPriority((lead?.priority as LeadPriority) ?? "Média");
      setNotes(lead?.notes ?? "");
    }
  }, [open, lead, defaultStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.company_id || !user) {
      toast({ title: "Erro", description: "Perfil não encontrado.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name,
      phone: phone || null,
      status,
      priority,
      notes: notes || null,
      company_id: profile.company_id,
      responsible_id: lead?.responsible_id ?? user.id,
    };
    const { error } = lead
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: lead ? "Lead atualizado" : "Lead criado" });
    onSaved();
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!lead) return;
    if (!confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead excluído" });
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {lead && (
              <Button type="button" variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
