import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INTEREST_TAGS, LEAD_SOURCES, LEAD_STATUSES, Lead, LeadPriority, LeadStatus, SALESPEOPLE, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Copy, Sparkles, MapPin, IdCard, Cake, Eye } from "lucide-react";
import { maskCPF } from "@/lib/masks";

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
  const [saleValue, setSaleValue] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [interestTag, setInterestTag] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [bairro, setBairro] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataUltimoExame, setDataUltimoExame] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(lead?.name ?? "");
      setPhone(lead?.phone ?? "");
      setStatus((lead?.status as LeadStatus) ?? defaultStatus ?? "Novo Lead");
      setPriority((lead?.priority as LeadPriority) ?? "Média");
      setNotes(lead?.notes ?? "");
      setSaleValue(lead?.sale_value != null ? String(lead.sale_value) : "");
      setLeadSource((lead?.lead_source as string) ?? "");
      setInterestTag((lead?.interest_tag as string) ?? "");
      setAssignedTo(lead?.assigned_to ?? "");
      setBairro((lead as any)?.bairro ?? "");
      setCpf((lead as any)?.cpf ?? "");
      setDataNascimento((lead as any)?.data_nascimento ?? "");
      setDataUltimoExame((lead as any)?.data_ultimo_exame ?? "");
    }
  }, [open, lead, defaultStatus]);

  const showSaleValue = status === "Compareceu e Comprou";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.company_id || !user) {
      toast({ title: "Erro", description: "Perfil não encontrado.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name,
      phone: phone || null,
      status,
      priority,
      notes: notes || null,
      company_id: profile.company_id,
      responsible_id: lead?.responsible_id ?? user.id,
      sale_value: showSaleValue && saleValue ? Number(saleValue) : null,
      lead_source: leadSource || null,
      interest_tag: interestTag || null,
      assigned_to: assignedTo || null,
      bairro: bairro.trim() || null,
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento || null,
      data_ultimo_exame: dataUltimoExame || null,
      last_interaction: new Date().toISOString(),
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

  function copyApproachScript() {
    const leadName = name || "[Nome do Lead]";
    const text = `Perfeito ${leadName}, esse é justamente o gargalo que mais trava as óticas hoje. Podemos agendar uma reunião onde vamos mostrar como funciona nosso Método Ótica Dominante e fazer uma análise da sua ótica?`;
    navigator.clipboard.writeText(text).then(
      () => toast({ title: "Script copiado!", description: "Cole no WhatsApp do lead." }),
      () => toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" })
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="scripts" className="gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Scripts Dominantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Origem do Lead</Label>
                  <Select value={leadSource || "__none__"} onValueChange={(v) => setLeadSource(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhuma —</SelectItem>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tag de Interesse</Label>
                  <Select value={interestTag || "__none__"} onValueChange={(v) => setInterestTag(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhuma —</SelectItem>
                      {INTEREST_TAGS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vendedora Responsável</Label>
                <Select value={assignedTo || "__none__"} onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {SALESPEOPLE.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSaleValue && (
                <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                  <Label htmlFor="sale_value" className="text-emerald-700 dark:text-emerald-300 font-medium">
                    💰 Valor da Venda (R$)
                  </Label>
                  <Input
                    id="sale_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Será somado no Faturamento Gerado (ROI).
                  </p>
                </div>
              )}

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
          </TabsContent>

          <TabsContent value="scripts" className="space-y-3 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Abordagem Inicial</h4>
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "Perfeito {name || "[Nome do Lead]"}, esse é justamente o gargalo que mais trava as óticas hoje.
                Podemos agendar uma reunião onde vamos mostrar como funciona nosso Método Ótica Dominante e fazer
                uma análise da sua ótica?"
              </p>
              <Button type="button" onClick={copyApproachScript} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                Copiar Abordagem Inicial
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Cole no WhatsApp e dispare conversões. Método Ótica Dominante.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
