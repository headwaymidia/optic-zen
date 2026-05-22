import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { UserPlus, Trash2, Loader2 } from "lucide-react";

interface Seller {
  id: string;
  name: string;
  active: boolean;
}

interface Props {
  storeId: string;
}

export function StoreSellersManager({ storeId }: Props) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_sellers")
      .select("id, name, active")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true });

    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar vendedoras", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setSellers(data ?? []);
  }

  useEffect(() => {
    if (storeId) load();
  }, [storeId]);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const { error } = await supabase
      .from("store_sellers")
      .insert({ store_id: storeId, name });
    setAdding(false);
    if (error) {
      toast({ title: "Erro ao adicionar vendedora", description: humanizeError(error), variant: "destructive" });
      return;
    }
    setNewName("");
    toast({ title: `${name} adicionada!` });
    load();
  }

  async function handleToggle(seller: Seller) {
    const { error } = await supabase
      .from("store_sellers")
      .update({ active: !seller.active })
      .eq("id", seller.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: humanizeError(error), variant: "destructive" });
      return;
    }
    load();
  }

  async function handleDelete(seller: Seller) {
    if (!confirm(`Remover "${seller.name}" da lista de vendedoras?`)) return;
    const { error } = await supabase
      .from("store_sellers")
      .delete()
      .eq("id", seller.id);
    if (error) {
      toast({ title: "Erro ao remover", description: humanizeError(error), variant: "destructive" });
      return;
    }
    toast({ title: `${seller.name} removida.` });
    load();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <header className="pb-5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Vendedoras da Filial</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Nomes que aparecem no dropdown de responsável dos atendimentos. Não precisam ter conta no sistema.
        </p>
      </header>

      {/* Input de adição */}
      <div className="flex gap-2 mb-5">
        <Input
          placeholder="Nome da vendedora..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-10"
        />
        <Button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white shrink-0 h-10"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Adicionar
        </Button>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
      ) : sellers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma vendedora cadastrada. Adicione acima.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {sellers.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3 px-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <span className={`text-sm font-medium truncate ${!s.active ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {s.name}
                </span>
                {!s.active && (
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                    inativa
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleToggle(s)}
                >
                  {s.active ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(s)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
