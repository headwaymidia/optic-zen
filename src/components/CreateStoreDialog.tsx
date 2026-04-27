import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStores } from "@/hooks/useStores";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStoreDialog({ open, onOpenChange }: Props) {
  const { addStore } = useStores();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const created = addStore({ name: trimmed });
    setSubmitting(false);
    setName("");
    onOpenChange(false);
    toast({
      title: "Filial criada",
      description: `Você está agora gerenciando "${created.name}".`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar nova loja</DialogTitle>
          <DialogDescription>
            Crie uma nova filial para gerenciar leads, vendas e equipe separadamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="store-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nome da loja
            </Label>
            <Input
              id="store-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Filial Aeroporto"
              className="h-11 rounded-lg"
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              Criar filial
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
