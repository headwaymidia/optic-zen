import { useEffect, useState } from "react";
import { Lead, Prescription } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, Save, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
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

export function PrescriptionForm({ lead }: { lead: Lead }) {
  const { updateLead } = useLeads();
  const [data, setData] = useState<Prescription>({ ...EMPTY, ...(lead.prescription ?? {}) });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Sync when switching leads
  useEffect(() => {
    setData({ ...EMPTY, ...(lead.prescription ?? {}) });
    setSavedAt(null);
  }, [lead.id]);

  const set = (k: keyof Prescription, v: string) =>
    setData((d) => ({ ...d, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateLead(lead.id, { prescription: data });
      setSavedAt(Date.now());
      toast({ title: "Receita salva", description: "Prontuário atualizado." });
    } finally {
      setSaving(false);
    }
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header estilo bloco médico */}
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Prescrição
        </div>
        <span className="text-[10px] text-muted-foreground">Dioptrias</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Cabeçalho de colunas */}
        <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          <span></span>
          <span className="text-center">Esférico</span>
          <span className="text-center">Cilíndrico</span>
          <span className="text-center">Eixo</span>
        </div>

        {/* OD */}
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

        {/* OE */}
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

        {/* Adição + DNP */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Adição
            </Label>
            <Input
              value={data.adicao ?? ""}
              onChange={(e) => set("adicao", e.target.value)}
              placeholder="+1.50"
              className="h-8 text-sm font-mono text-center"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              DNP (mm)
            </Label>
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
            <>
              <Check className="h-4 w-4" /> Salvo
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Receita"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function EyeRow({
  label,
  subtitle,
  esf,
  cil,
  eixo,
  onEsf,
  onCil,
  onEixo,
}: {
  label: string;
  subtitle: string;
  esf: string;
  cil: string;
  eixo: string;
  onEsf: (v: string) => void;
  onCil: (v: string) => void;
  onEixo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[40px_1fr_1fr_1fr] gap-2 items-center">
      <div
        className="flex flex-col items-center justify-center h-9 rounded-md bg-primary/10 text-primary"
        title={subtitle}
      >
        <span className="text-xs font-bold leading-none">{label}</span>
      </div>
      <Input
        value={esf}
        onChange={(e) => onEsf(e.target.value)}
        placeholder="-1.25"
        className="h-9 text-sm font-mono text-center"
      />
      <Input
        value={cil}
        onChange={(e) => onCil(e.target.value)}
        placeholder="-0.50"
        className="h-9 text-sm font-mono text-center"
      />
      <Input
        value={eixo}
        onChange={(e) => onEixo(e.target.value)}
        placeholder="180°"
        className="h-9 text-sm font-mono text-center"
      />
    </div>
  );
}
