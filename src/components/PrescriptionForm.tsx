import { useEffect, useState, useCallback } from "react";
import { Lead, Prescription, supabase } from "@/lib/supabase";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  Save,
  Check,
  History,
  RotateCcw,
  Loader2,
  Stethoscope,
  FileText,
} from "lucide-react";
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

const TIPOS_LENTE = [
  "Monofocal",
  "Multifocal/Progressiva",
  "Bifocal",
  "Lente de contato",
  "Oclusor",
];

const BASES_PRISMA = ["Nasal", "Temporal", "Superior", "Inferior"];

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
  od_dnp: number | string | null;
  oe_dnp: number | string | null;
  od_altura: number | string | null;
  oe_altura: number | string | null;
  od_prisma: number | string | null;
  od_base: string | null;
  oe_prisma: number | string | null;
  oe_base: string | null;
  av_od: string | null;
  av_oe: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  data_receita: string | null;
  tipo_lente: string | null;
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
  const [showPrisma, setShowPrisma] = useState(false);
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
    const merged = { ...EMPTY, ...(lead.prescription ?? {}) };
    setData(merged);
    setShowPrisma(Boolean(merged.od_prisma || merged.oe_prisma));
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
        od_esferico: strOrNull(data.esferico_od),
        od_cilindrico: strOrNull(data.cilindrico_od),
        od_eixo: strOrNull(data.eixo_od),
        oe_esferico: strOrNull(data.esferico_oe),
        oe_cilindrico: strOrNull(data.cilindrico_oe),
        oe_eixo: strOrNull(data.eixo_oe),
        adicao: strOrNull(data.adicao),
        dnp: strOrNull(data.dnp),
        od_dnp: toNumOrNull(data.od_dnp),
        oe_dnp: toNumOrNull(data.oe_dnp),
        od_altura: toNumOrNull(data.od_altura),
        oe_altura: toNumOrNull(data.oe_altura),
        od_prisma: showPrisma ? toNumOrNull(data.od_prisma) : null,
        od_base: showPrisma ? strOrNull(data.od_base) : null,
        oe_prisma: showPrisma ? toNumOrNull(data.oe_prisma) : null,
        oe_base: showPrisma ? strOrNull(data.oe_base) : null,
        av_od: strOrNull(data.av_od),
        av_oe: strOrNull(data.av_oe),
        medico_nome: strOrNull(data.medico_nome),
        medico_crm: strOrNull(data.medico_crm),
        data_receita: strOrNull(data.data_receita),
        tipo_lente: strOrNull(data.tipo_lente),
        observacoes_medico: strOrNull(data.observacoes_medico),
        created_by: userId,
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
    const merged: Prescription = {
      esferico_od: row.od_esferico ?? "",
      cilindrico_od: row.od_cilindrico ?? "",
      eixo_od: row.od_eixo ?? "",
      esferico_oe: row.oe_esferico ?? "",
      cilindrico_oe: row.oe_cilindrico ?? "",
      eixo_oe: row.oe_eixo ?? "",
      adicao: row.adicao ?? "",
      dnp: row.dnp ?? "",
      od_dnp: row.od_dnp != null ? String(row.od_dnp) : "",
      oe_dnp: row.oe_dnp != null ? String(row.oe_dnp) : "",
      od_altura: row.od_altura != null ? String(row.od_altura) : "",
      oe_altura: row.oe_altura != null ? String(row.oe_altura) : "",
      od_prisma: row.od_prisma != null ? String(row.od_prisma) : "",
      od_base: row.od_base ?? "",
      oe_prisma: row.oe_prisma != null ? String(row.oe_prisma) : "",
      oe_base: row.oe_base ?? "",
      av_od: row.av_od ?? "",
      av_oe: row.av_oe ?? "",
      medico_nome: row.medico_nome ?? "",
      medico_crm: row.medico_crm ?? "",
      data_receita: row.data_receita ?? "",
      tipo_lente: row.tipo_lente ?? "",
      observacoes_medico: row.observacoes_medico ?? "",
    };
    setData(merged);
    setShowPrisma(Boolean(merged.od_prisma || merged.oe_prisma));
    toast({ title: "Receita carregada", description: "Os valores foram copiados para o formulário." });
  }

  const justSaved = savedAt && Date.now() - savedAt < 2500;

  // Cores para diferenciação visual OD/OE
  const odTint = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50";
  const oeTint = "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Ficha Clínica — Receita Oftalmológica
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* CABEÇALHO */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            Cabeçalho
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Data da receita</Label>
              <Input
                type="date"
                value={data.data_receita ?? ""}
                onChange={(e) => set("data_receita", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Médico responsável</Label>
              <Input
                value={data.medico_nome ?? ""}
                onChange={(e) => set("medico_nome", e.target.value)}
                placeholder="Dr(a). Nome"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">CRM</Label>
              <Input
                value={data.medico_crm ?? ""}
                onChange={(e) => set("medico_crm", e.target.value)}
                placeholder="CRM/UF 00000"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* TABELA DE PRESCRIÇÃO */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Prescrição (Dioptrias)
            </div>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <Switch checked={showPrisma} onCheckedChange={setShowPrisma} />
              <span>Adicionar prisma</span>
            </label>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span></span>
            <span className="text-center">OD (Direito)</span>
            <span className="text-center">OE (Esquerdo)</span>
          </div>

          <RxRow
            label="Esférico"
            placeholder="-1.25"
            odVal={data.esferico_od ?? ""}
            oeVal={data.esferico_oe ?? ""}
            onOd={(v) => set("esferico_od", v)}
            onOe={(v) => set("esferico_oe", v)}
            odTint={odTint}
            oeTint={oeTint}
          />
          <RxRow
            label="Cilíndrico"
            placeholder="-0.50"
            odVal={data.cilindrico_od ?? ""}
            oeVal={data.cilindrico_oe ?? ""}
            onOd={(v) => set("cilindrico_od", v)}
            onOe={(v) => set("cilindrico_oe", v)}
            odTint={odTint}
            oeTint={oeTint}
          />
          <RxRow
            label="Eixo"
            placeholder="180°"
            odVal={data.eixo_od ?? ""}
            oeVal={data.eixo_oe ?? ""}
            onOd={(v) => set("eixo_od", v)}
            onOe={(v) => set("eixo_oe", v)}
            odTint={odTint}
            oeTint={oeTint}
          />
          <RxRow
            label="DNP (mm)"
            placeholder="31"
            odVal={data.od_dnp ?? ""}
            oeVal={data.oe_dnp ?? ""}
            onOd={(v) => set("od_dnp", v)}
            onOe={(v) => set("oe_dnp", v)}
            odTint={odTint}
            oeTint={oeTint}
          />
          <RxRow
            label="Altura (mm)"
            placeholder="18"
            odVal={data.od_altura ?? ""}
            oeVal={data.oe_altura ?? ""}
            onOd={(v) => set("od_altura", v)}
            onOe={(v) => set("oe_altura", v)}
            odTint={odTint}
            oeTint={oeTint}
          />

          {showPrisma && (
            <>
              <RxRow
                label="Prisma"
                placeholder="2.0"
                odVal={data.od_prisma ?? ""}
                oeVal={data.oe_prisma ?? ""}
                onOd={(v) => set("od_prisma", v)}
                onOe={(v) => set("oe_prisma", v)}
                odTint={odTint}
                oeTint={oeTint}
              />
              <div className="grid grid-cols-[60px_1fr_1fr] gap-2 items-center">
                <span className="text-[11px] font-medium text-muted-foreground text-right pr-1">Base</span>
                <Select value={data.od_base ?? ""} onValueChange={(v) => set("od_base", v)}>
                  <SelectTrigger className={cn("h-9 text-xs", odTint)}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASES_PRISMA.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={data.oe_base ?? ""} onValueChange={(v) => set("oe_base", v)}>
                  <SelectTrigger className={cn("h-9 text-xs", oeTint)}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {BASES_PRISMA.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Adição (binocular) */}
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2 items-center pt-1">
            <span className="text-[11px] font-medium text-muted-foreground text-right pr-1">Adição</span>
            <Input
              value={data.adicao ?? ""}
              onChange={(e) => set("adicao", e.target.value)}
              placeholder="+1.50 (binocular)"
              className="h-9 text-sm font-mono text-center col-span-2"
            />
          </div>
        </div>

        <div className="border-t" />

        {/* ACUIDADE VISUAL */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Acuidade Visual
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">AV OD</Label>
              <Input
                value={data.av_od ?? ""}
                onChange={(e) => set("av_od", e.target.value)}
                placeholder="20/20"
                className={cn("h-8 text-sm font-mono text-center", odTint)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">AV OE</Label>
              <Input
                value={data.av_oe ?? ""}
                onChange={(e) => set("av_oe", e.target.value)}
                placeholder="20/20"
                className={cn("h-8 text-sm font-mono text-center", oeTint)}
              />
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* INDICAÇÃO CLÍNICA */}
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Indicação Clínica
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Tipo de lente</Label>
              <Select value={data.tipo_lente ?? ""} onValueChange={(v) => set("tipo_lente", v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o tipo de lente" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_LENTE.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-muted-foreground">Observações do médico</Label>
              <Textarea
                value={data.observacoes_medico ?? ""}
                onChange={(e) => set("observacoes_medico", e.target.value)}
                placeholder="Anotações clínicas, recomendações, restrições..."
                rows={2}
                className="text-sm resize-y min-h-[60px]"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className={cn(
            "w-full h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white",
            justSaved && "bg-emerald-700"
          )}
        >
          {justSaved ? (
            <><Check className="h-4 w-4" /> Salvo</>
          ) : saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="h-4 w-4" /> Salvar Receita</>
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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-foreground">{formatDate(row.created_at)}</span>
                        {row.medico_nome && (
                          <span className="text-[10px] text-muted-foreground">
                            Dr(a). {row.medico_nome}{row.medico_crm ? ` · ${row.medico_crm}` : ""}
                          </span>
                        )}
                      </div>
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
                    <div className="text-[11px] font-mono space-y-0.5">
                      <div>
                        <span className="text-muted-foreground">OD:</span>{" "}
                        {fmt(row.od_esferico)} / {fmt(row.od_cilindrico)} x {fmt(row.od_eixo)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">OE:</span>{" "}
                        {fmt(row.oe_esferico)} / {fmt(row.oe_cilindrico)} x {fmt(row.oe_eixo)}
                      </div>
                      {(row.adicao || row.tipo_lente) && (
                        <div className="text-muted-foreground">
                          {row.adicao && <>Add: {fmt(row.adicao)}</>}
                          {row.adicao && row.tipo_lente && " · "}
                          {row.tipo_lente && <>{row.tipo_lente}</>}
                        </div>
                      )}
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
    <div className="grid grid-cols-[60px_1fr_1fr] gap-2 items-center">
      <span className="text-[11px] font-medium text-muted-foreground text-right pr-1">{label}</span>
      <Input
        value={odVal}
        onChange={(e) => onOd(e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 text-sm font-mono text-center border", odTint)}
      />
      <Input
        value={oeVal}
        onChange={(e) => onOe(e.target.value)}
        placeholder={placeholder}
        className={cn("h-9 text-sm font-mono text-center border", oeTint)}
      />
    </div>
  );
}
