import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { toast } from "@/hooks/use-toast";

export function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { profile } = useAuth();
  const { refetch } = useLeads();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setPhone("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!profile?.company_id) {
      toast({ title: "Sem empresa associada", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      company_id: profile.company_id,
      name: name.trim(),
      phone: phone.trim() || null,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente. O lead entrará na coluna "Novo Lead".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
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
