import { Lead } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useStoreMembers } from "@/hooks/useStoreMembers";

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildFicha(lead: Lead, sellerName: string): string {
  const p = lead.prescription ?? {};
  const vendedora = sellerName || "—";

  const lines: string[] = [];
  lines.push(`Nome: ${lead.name || "—"}`);
  lines.push(`Telefone: ${lead.phone || "—"}`);
  if (lead.cpf) lines.push(`CPF: ${lead.cpf}`);
  if (lead.data_nascimento) lines.push(`Nascimento: ${lead.data_nascimento}`);
  if (lead.bairro) lines.push(`Bairro: ${lead.bairro}`);
  lines.push(`Origem: ${lead.lead_source || "—"}`);
  lines.push(`Vendedora: ${vendedora}`);
  lines.push(`Valor da Venda: ${formatCurrency(lead.sale_value)}`);

  const rxFields: [string, string | null | undefined][] = [
    ["Esférico OD", p.esferico_od],
    ["Cilíndrico OD", p.cilindrico_od],
    ["Eixo OD", p.eixo_od],
    ["Esférico OE", p.esferico_oe],
    ["Cilíndrico OE", p.cilindrico_oe],
    ["Eixo OE", p.eixo_oe],
    ["Adição", p.adicao],
    ["DNP", p.dnp],
  ];
  const filledRx = rxFields.filter(([, v]) => v && v.toString().trim());

  if (filledRx.length > 0) {
    lines.push("");
    lines.push("-- DADOS DA RECEITA --");
    for (const [label, value] of filledRx) {
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join("\n");
}

export function ERPTransferCard({ lead }: { lead: Lead }) {
  const { nameById } = useStoreMembers();
  if (lead.status !== "Compareceu e Comprou") return null;

  const sellerName = lead.responsible_id ? (nameById.get(lead.responsible_id) ?? "") : "";
  const ficha = buildFicha(lead, sellerName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ficha);
      toast({
        title: "Ficha copiada!",
        description: "Cole no sistema da loja.",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Copie manualmente o conteúdo da ficha.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-3 my-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Ficha para ERP
      </div>
      <pre className="whitespace-pre-wrap break-words rounded bg-background/60 p-2 text-xs leading-relaxed text-foreground border border-slate-200/70 dark:border-slate-700/70">
{ficha}
      </pre>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="mt-2 w-full"
      >
        <Copy className="h-3.5 w-3.5" />
        Copiar Ficha Completa
      </Button>
    </div>
  );
}
