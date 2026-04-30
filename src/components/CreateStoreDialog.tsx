import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ResponsiveDialog";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const created = await addStore({ name: trimmed });
    setSubmitting(false);
    if (!created) return;
    setName("");
    onOpenChange(false);
    toast({
      title: "Filial criada",
      description: `Você está agora gerenciando "${created.name}".`,
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Adicionar nova loja</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Crie uma nova filial para gerenciar leads, vendas e equipe separadamente.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="store-name"
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
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
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()} className="h-11">
            Criar filial
          </Button>
        </ResponsiveDialogFooter>
      </form>
    </ResponsiveDialog>
  );
}
