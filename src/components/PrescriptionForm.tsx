import { useEffect, useState, useCallback } from "react";
import { Lead, Prescription, supabase } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Check, History, RotateCcw, Loader2, FileText, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";

const EMPTY: Prescription = {
  esferico_od: "",
  cilindrico_od: "",
  eixo_od: "",
  esferico_oe: "",
  cilindrico_oe: "",
  eixo_oe: "",
  adicao: "",
  dnp: "",
  od_dnp: "",
  oe_dnp: "",
  od_altura: "",
  oe_altura: "",
  od_prisma: "",
  od_base: "",
  oe_prisma: "",
  oe_base: "",
  av_od: "",
  av_oe: "",
  medico_nome: "",
  medico_crm: "",
  data_receita: "",
  tipo_lente: "",
  observacoes_medico: "",
};

interface PrescriptionRow {
  id: string;
  created_at: string;
  od_esferico: string | null;
  od_cilindrico: string | null;
  od_eixo: string | null;
  oe_esferico: string | null;
  oe_cilindrico: string | null;
  oe_eixo: string | null;
  adicao: string | null;
  od_dnp: number | string | null;
  oe_dnp: number | string | null;
  od_altura: number | string | null;
  oe_altura: number | string | null;
  observacoes_medico: string | null;
}

function fmt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.trim() !== "" ? s : "—";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function toNumOrNull(v: string | null | undefined) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function strOrNull(v: string | null | undefined) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function PrescriptionForm({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const [data, setData] = useState<Prescription>({ ...EMPTY, ...(lead.prescription ?? {}) });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<PrescriptionRow[]>([]);

  const loadHistory = useCallback(async () => {
    const { data: rows, error } = await (supabase as any)
      .from("prescriptions")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (!error && rows) setHistory(rows as PrescriptionRow[]);
  }, [lead.id]);

  useEffect(() => {
    setData({ ...EMPTY, ...(lead.prescription ?? {}) });
    setSavedAt(null);
    loadHistory();
  }, [lead.id, loadHistory]);

  const set = (k: keyof Prescription, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      const { error: insErr } = await (supabase as any).from("prescriptions").insert({
        lead_id: lead.id,
        store_id: lead.store_id,
        od_esferico: strOrNull(data.esferico_od),
        od_cilindrico: strOrNull(data.cilindrico_od),
        od_eixo: strOrNull(data.eixo_od),
        oe_esferico: strOrNull(data.esferico_oe),
        oe_cilindrico: strOrNull(data.cilindrico_oe),
        oe_eixo: strOrNull(data.eixo_oe),
        adicao: strOrNull(data.adicao),
        od_dnp: toNumOrNull(data.od_dnp),
        oe_dnp: toNumOrNull(data.oe_dnp),
        od_altura: toNumOrNull(data.od_altura),
        oe_altura: toNumOrNull(data.oe_altura),
        observacoes_medico: strOrNull(data.observacoes_medico),
      });
      if (insErr) throw insErr;

      await updateLead(lead.id, { prescription: data });
      setSavedAt(Date.now());
      toast({ title: "Receita salva!", description: "Nova receita adicionada ao histórico." });
      await loadHistory();
    } catch (e: any) {
      toast({ title: "Erro ao salvar receita", description: humanizeError(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function applyFromHistory(row: PrescriptionRow) {
    setData({
      ...EMPTY,
      esferico_od: row.od_esferico ?? "",
      cilindrico_od: row.od_cilindrico ?? "",
      eixo_od: row.od_eixo ?? "",
      esferico_oe: row.oe_esferico ?? "",
      cilindrico_oe: row.oe_cilindrico ?? "",
      eixo_oe: row.oe_eixo ?? "",
      adicao: row.adicao ?? "",
      od_dnp: row.od_dnp != null ? String(row.od_dnp) : "",
      oe_dnp: row.oe_dnp != null ? String(row.oe_dnp) : "",
      od_altura: row.od_altura != null ? String(row.od_altura) : "",
      oe_altura: row.oe_altura != null ? String(row.oe_altura) : "",
      observacoes_medico: row.observacoes_medico ?? "",
    });
    toast({ title: "Receita carregada", description: "Os valores foram copiados para o formulário." });
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  const odTint = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50";
  const oeTint = "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        Receita Oftalmológica
      </div>

      <div className="p-3 space-y-4">
        {/* Cabeçalhos OD/OE */}
        <div className="grid grid-cols-[70px_1fr_1fr] gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span></span>
          <span className="text-center text-emerald-700 dark:text-emerald-400">OD (Direito)</span>
          <span className="text-center text-sky-700 dark:text-sky-400">OE (Esquerdo)</span>
        </div>

        <RxRow label="Esférico" placeholder="-1.25"
          odVal={data.esferico_od ?? ""} oeVal={data.esferico_oe ?? ""}
          onOd={(v) => set("esferico_od", v)} onOe={(v) => set("esferico_oe", v)}
          odTint={odTint} oeTint={oeTint} />
        <RxRow label="Cilíndrico" placeholder="-0.50"
          odVal={data.cilindrico_od ?? ""} oeVal={data.cilindrico_oe ?? ""}
          onOd={(v) => set("cilindrico_od", v)} onOe={(v) => set("cilindrico_oe", v)}
          odTint={odTint} oeTint={oeTint} />
        <RxRow label="Eixo" placeholder="180°"
          odVal={data.eixo_od ?? ""} oeVal={data.eixo_oe ?? ""}
          onOd={(v) => set("eixo_od", v)} onOe={(v) => set("eixo_oe", v)}
          odTint={odTint} oeTint={oeTint} />
        <RxRow label="DNP (mm)" placeholder="31"
          odVal={data.od_dnp ?? ""} oeVal={data.oe_dnp ?? ""}
          onOd={(v) => set("od_dnp", v)} onOe={(v) => set("oe_dnp", v)}
          odTint={odTint} oeTint={oeTint} />
        <RxRow label="Altura (mm)" placeholder="18"
          odVal={data.od_altura ?? ""} oeVal={data.oe_altura ?? ""}
          onOd={(v) => set("od_altura", v)} onOe={(v) => set("oe_altura", v)}
          odTint={odTint} oeTint={oeTint} />

        {/* Adição binocular */}
        <div className="grid grid-cols-[70px_1fr] gap-2 items-center pt-1">
          <span className="text-xs font-medium text-muted-foreground text-right pr-1">Adição</span>
          <Input
            value={data.adicao ?? ""}
            onChange={(e) => set("adicao", e.target.value)}
            placeholder="+1.50 (binocular)"
            className="h-11 text-base font-mono text-center"
          />
        </div>

        {/* Observações */}
        <div className="space-y-1 pt-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Observações
          </label>
          <Textarea
            value={data.observacoes_medico ?? ""}
            onChange={(e) => set("observacoes_medico", e.target.value)}
            placeholder="Ex: cliente prefere armação leve, usa para computador..."
            rows={2}
            className="text-sm resize-y min-h-[60px]"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full h-12 gap-2 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white",
            justSaved && "bg-emerald-700"
          )}
        >
          {justSaved ? (
            <><Check className="h-5 w-5" /> Salvo</>
          ) : saving ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="h-5 w-5" /> Salvar Receita</>
          )}
        </Button>

        {/* Histórico */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            <History className="h-3.5 w-3.5" />
            Histórico de Receitas
            {history.length > 0 && (
              <span className="ml-auto text-[10px] normal-case font-normal">
                {history.length} registro{history.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma receita anterior salva.</p>
          ) : (
            <ol className="space-y-2">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md border bg-muted/30 p-2 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-foreground">
                      {formatDate(row.created_at)}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      OD {fmt(row.od_esferico)}/{fmt(row.od_cilindrico)} x {fmt(row.od_eixo)}
                      <span className="mx-1">|</span>
                      OE {fmt(row.oe_esferico)}/{fmt(row.oe_cilindrico)} x {fmt(row.oe_eixo)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] gap-1 shrink-0"
                    onClick={() => applyFromHistory(row)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Usar
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function RxRow({
  label,
  placeholder,
  odVal,
  oeVal,
  onOd,
  onOe,
  odTint,
  oeTint,
}: {
  label: string;
  placeholder: string;
  odVal: string;
  oeVal: string;
  onOd: (v: string) => void;
  onOe: (v: string) => void;
  odTint: string;
  oeTint: string;
}) {
  return (
    <div className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center">
      <span className="text-xs font-medium text-muted-foreground text-right pr-1">{label}</span>
      <Input
        value={odVal}
        onChange={(e) => onOd(e.target.value)}
        placeholder={placeholder}
        className={cn("h-11 text-base font-mono text-center border", odTint)}
      />
      <Input
        value={oeVal}
        onChange={(e) => onOe(e.target.value)}
        placeholder={placeholder}
        className={cn("h-11 text-base font-mono text-center border", oeTint)}
      />
    </div>
  );
}
