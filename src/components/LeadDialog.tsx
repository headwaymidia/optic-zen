import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INTEREST_TAGS, LEAD_SOURCES, LEAD_STATUSES, Lead, LeadPriority, LeadStatus, supabase } from "@/lib/supabase";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
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
  const { user } = useAuth();
  const { currentStoreId } = useStores();
  const { members } = useStoreMembers(currentStoreId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus>("Novo Lead");
  const [priority, setPriority] = useState<LeadPriority>("Média");
  const [notes, setNotes] = useState("");
  const [saleValue, setSaleValue] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [interestTag, setInterestTag] = useState<string>("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [bairro, setBairro] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataUltimoExame, setDataUltimoExame] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setResponsibleId(lead?.responsible_id ?? "");
      setBairro((lead as any)?.bairro ?? "");
      setCpf((lead as any)?.cpf ?? "");
      setDataNascimento((lead as any)?.data_nascimento ?? "");
      setDataUltimoExame((lead as any)?.last_exam_date ?? "");
    }
  }, [open, lead, defaultStatus]);

  const showSaleValue = status === "Compareceu e Comprou";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentStoreId || !user) {
      toast({ title: "Erro", description: "Selecione uma loja antes de salvar.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name,
      phone: phone || null,
      status,
      priority,
      notes: notes || null,
      store_id: currentStoreId,
      responsible_id: responsibleId || lead?.responsible_id || user.id,
      sale_value: showSaleValue && saleValue ? Number(saleValue) : null,
      lead_source: leadSource || null,
      interest_tag: interestTag || null,
      bairro: bairro.trim() || null,
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento || null,
      last_exam_date: dataUltimoExame || null,
      last_interaction: new Date().toISOString(),
    };
    const { error } = lead
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: lead ? "Lead atualizado" : "Lead criado" });
    onSaved();
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!lead) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      toast({ title: "Erro", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Lead excluído" });
    setConfirmDelete(false);
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
    <>
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
                <Select value={responsibleId || "__none__"} onValueChange={(v) => setResponsibleId(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sem vendedora —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3 font-medium">
                  Dados complementares
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-bairro" className="text-xs flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" /> Bairro
                    </Label>
                    <Input
                      id="lead-bairro"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: Centro"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-cpf" className="text-xs flex items-center gap-1.5">
                      <IdCard className="h-3 w-3 text-muted-foreground" /> CPF
                    </Label>
                    <Input
                      id="lead-cpf"
                      value={cpf}
                      onChange={(e) => setCpf(maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-nasc" className="text-xs flex items-center gap-1.5">
                      <Cake className="h-3 w-3 text-muted-foreground" /> Data de nascimento
                    </Label>
                    <Input
                      id="lead-nasc"
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-exame" className="text-xs flex items-center gap-1.5">
                      <Eye className="h-3 w-3 text-muted-foreground" /> Último exame
                    </Label>
                    <Input
                      id="lead-exame"
                      type="date"
                      value={dataUltimoExame}
                      onChange={(e) => setDataUltimoExame(e.target.value)}
                    />
                  </div>
                </div>
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
                  <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
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
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover lead?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O lead {lead?.name ? <strong>{lead.name}</strong> : "selecionado"} e todo seu histórico serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
