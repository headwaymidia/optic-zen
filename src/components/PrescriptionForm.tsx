import { useEffect, useState, useCallback } from "react";
import { Lead, Prescription, supabase } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, Save, Check, History, RotateCcw, Loader2 } from "lucide-react";
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
  dnp: string | null;
}

function fmt(v: string | null | undefined) {
  return v && v.trim() !== "" ? v : "—";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { error: insErr } = await (supabase as any).from("prescriptions").insert({
        lead_id: lead.id,
        store_id: lead.store_id,
        od_esferico: data.esferico_od ?? null,
        od_cilindrico: data.cilindrico_od ?? null,
        od_eixo: data.eixo_od ?? null,
        oe_esferico: data.esferico_oe ?? null,
        oe_cilindrico: data.cilindrico_oe ?? null,
        oe_eixo: data.eixo_oe ?? null,
        adicao: data.adicao ?? null,
        dnp: data.dnp ?? null,
        created_by: userId,
      });
      if (insErr) throw insErr;

      await updateLead(lead.id, { prescription: data });
      setSavedAt(Date.now());
      toast({ title: "Receita salva", description: "Nova receita adicionada ao histórico." });
      await loadHistory();
    } catch (e: any) {
      toast({ title: "Erro ao salvar receita", description: humanizeError(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function applyFromHistory(row: PrescriptionRow) {
    setData({
      esferico_od: row.od_esferico ?? "",
      cilindrico_od: row.od_cilindrico ?? "",
      eixo_od: row.od_eixo ?? "",
      esferico_oe: row.oe_esferico ?? "",
      cilindrico_oe: row.oe_cilindrico ?? "",
      eixo_oe: row.oe_eixo ?? "",
      adicao: row.adicao ?? "",
      dnp: row.dnp ?? "",
    });
    toast({ title: "Receita carregada", description: "Os valores foram copiados para o formulário. Clique em salvar para registrar." });
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Prescrição
        </div>
        <span className="text-[10px] text-muted-foreground">Dioptrias</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <span></span>
          <span className="text-center">Esférico</span>
          <span className="text-center">Cilíndrico</span>
          <span className="text-center">Eixo</span>
        </div>

        <EyeRow
          label="OD"
          subtitle="Direito"
          esf={data.esferico_od ?? ""}
          cil={data.cilindrico_od ?? ""}
          eixo={data.eixo_od ?? ""}
          onEsf={(v) => set("esferico_od", v)}
          onCil={(v) => set("cilindrico_od", v)}
          onEixo={(v) => set("eixo_od", v)}
        />

        <EyeRow
          label="OE"
          subtitle="Esquerdo"
          esf={data.esferico_oe ?? ""}
          cil={data.cilindrico_oe ?? ""}
          eixo={data.eixo_oe ?? ""}
          onEsf={(v) => set("esferico_oe", v)}
          onCil={(v) => set("cilindrico_oe", v)}
          onEixo={(v) => set("eixo_oe", v)}
        />

        <div className="grid grid-cols-2 gap-2 pt-1 border-t">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Adição</Label>
            <Input
              value={data.adicao ?? ""}
              onChange={(e) => set("adicao", e.target.value)}
              placeholder="+1.50"
              className="h-8 text-sm font-mono text-center"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">DNP (mm)</Label>
            <Input
              value={data.dnp ?? ""}
              onChange={(e) => set("dnp", e.target.value)}
              placeholder="62"
              className="h-8 text-sm font-mono text-center"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className={cn(
            "w-full h-9 gap-2",
            justSaved && "bg-emerald-600 hover:bg-emerald-600 text-white"
          )}
        >
          {justSaved ? (
            <><Check className="h-4 w-4" /> Salvo</>
          ) : (
            <><Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Receita"}</>
          )}
        </Button>

        {/* Histórico */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
            <History className="h-3.5 w-3.5" />
            Histórico de Receitas
            {history.length > 0 && (
              <span className="ml-auto text-[10px] normal-case font-normal">{history.length} registro{history.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma receita anterior salva.</p>
          ) : (
            <ol className="relative border-l border-border ml-1 space-y-3">
              {history.map((row) => (
                <li key={row.id} className="ml-3">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                  <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-foreground">{formatDate(row.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => applyFromHistory(row)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Usar esta receita
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground">OD:</span>{" "}
                        {fmt(row.od_esferico)} / {fmt(row.od_cilindrico)} / {fmt(row.od_eixo)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">OE:</span>{" "}
                        {fmt(row.oe_esferico)} / {fmt(row.oe_cilindrico)} / {fmt(row.oe_eixo)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Adição:</span> {fmt(row.adicao)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">DNP:</span> {fmt(row.dnp)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function EyeRow({
  label, subtitle, esf, cil, eixo, onEsf, onCil, onEixo,
}: {
  label: string; subtitle: string;
  esf: string; cil: string; eixo: string;
  onEsf: (v: string) => void; onCil: (v: string) => void; onEixo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 items-center">
      <div className="flex flex-col items-center justify-center h-9 rounded-md bg-primary/10 text-primary" title={subtitle}>
        <span className="text-xs font-bold leading-none">{label}</span>
      </div>
      <Input value={esf} onChange={(e) => onEsf(e.target.value)} placeholder="-1.25" className="h-9 text-sm font-mono text-center" />
      <Input value={cil} onChange={(e) => onCil(e.target.value)} placeholder="-0.50" className="h-9 text-sm font-mono text-center" />
      <Input value={eixo} onChange={(e) => onEixo(e.target.value)} placeholder="180°" className="h-9 text-sm font-mono text-center" />
    </div>
  );
}
