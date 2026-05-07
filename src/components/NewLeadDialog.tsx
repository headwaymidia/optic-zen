import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useStores } from "@/hooks/useStores";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "@/hooks/use-toast";
import { maskCPF, maskCEP } from "@/lib/masks";
import { MapPin, IdCard, Cake, Eye } from "lucide-react";

export function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { currentStoreId } = useStores();
  const { refetch } = useLeads();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [dataUltimoExame, setDataUltimoExame] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
    setCep("");
    setRua("");
    setBairro("");
    setCidade("");
    setCpf("");
    setDataNascimento("");
    setDataUltimoExame("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja antes de criar o lead", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      store_id: currentStoreId,
      name: name.trim(),
      phone: phone.trim() || null,
      cep: cep.trim() || null,
      rua: rua.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento || null,
      last_exam_date: dataUltimoExame || null,
      status: "Novo Lead",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead criado!", description: `${name.trim()} foi adicionado em "Novo Lead".` });
    reset();
    onOpenChange(false);
    refetch();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente. O lead entrará na coluna "Novo Lead".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contato */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-lead-name" className="text-xs">Nome *</Label>
              <Input
                id="new-lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Silva"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-lead-phone" className="text-xs">Telefone</Label>
              <Input
                id="new-lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 91234-5678"
                type="tel"
              />
            </div>
          </div>

          {/* Dados complementares */}
          <div className="pt-2 border-t">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3 font-medium">
              Dados complementares
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-cep" className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> CEP
                </Label>
                <Input
                  id="new-lead-cep"
                  value={cep}
                  onChange={(e) => setCep(maskCEP(e.target.value))}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="new-lead-rua" className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> Rua
                </Label>
                <Input
                  id="new-lead-rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Ex: Av. Brasil, 123"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-bairro" className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> Bairro
                </Label>
                <Input
                  id="new-lead-bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-cidade" className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> Cidade
                </Label>
                <Input
                  id="new-lead-cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-cpf" className="text-xs flex items-center gap-1.5">
                  <IdCard className="h-3 w-3 text-muted-foreground" /> CPF
                </Label>
                <Input
                  id="new-lead-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-nasc" className="text-xs flex items-center gap-1.5">
                  <Cake className="h-3 w-3 text-muted-foreground" /> Data de nascimento
                </Label>
                <Input
                  id="new-lead-nasc"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-lead-exame" className="text-xs flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-muted-foreground" /> Último exame
                </Label>
                <Input
                  id="new-lead-exame"
                  type="date"
                  value={dataUltimoExame}
                  onChange={(e) => setDataUltimoExame(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Salvando..." : "Salvar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
