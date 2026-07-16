import { useState, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { useStoreMembers } from "@/hooks/useStoreMembers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

const MAX_ROWS = 500;
const BATCH = 50;
const VALID_STATUSES = new Set([
  "Novo Lead", "Em Atendimento", "Aguardando Resposta", "Agendou Exame",
  "Não Compareceu", "Compareceu e Comprou", "Compareceu e Não Comprou",
  "Em Negociação", "Repescagem", "Patologia", "Fora de Região",
]);

type ParsedRow = {
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  lead_source: string | null;
  _rawPhone: string;
  _error?: string;
};

type Report = { imported: number; duplicates: number; errors: number; errorDetails: string[] };

// Simple CSV parser supporting quoted fields and commas/semicolons
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  // detect delimiter: count semicolons vs commas in first line
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delim = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return "55" + digits;
  return digits;
}

function last10(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

export function ImportLeadsDialog({ open, onOpenChange, onImported }: Props) {
  const { currentStoreId } = useStores();
  const { members } = useStoreMembers(currentStoreId ?? undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [responsibleId, setResponsibleId] = useState<string>("");

  function reset() {
    setRows([]); setFileName(""); setProgress(0); setRunning(false); setReport(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleFile(file: File) {
    setReport(null);
    setFileName(file.name);
    const text = await file.text();
    const grid = parseCSV(text);
    if (grid.length < 2) {
      toast({ title: "CSV inválido", description: "Arquivo vazio ou sem cabeçalho.", variant: "destructive" });
      return;
    }
    const header = grid[0].map((h) => h.trim().toLowerCase());
    const idx = {
      name: header.findIndex((h) => h === "nome" || h === "name"),
      phone: header.findIndex((h) => h === "telefone" || h === "phone"),
      email: header.findIndex((h) => h === "email" || h === "e-mail"),
      status: header.findIndex((h) => h === "status"),
      source: header.findIndex((h) => h === "origem" || h === "source" || h === "lead_source"),
    };
    if (idx.name < 0 && idx.phone < 0) {
      toast({ title: "Colunas não encontradas", description: "O CSV precisa ter ao menos 'nome' ou 'telefone'.", variant: "destructive" });
      return;
    }

    const data: ParsedRow[] = [];
    for (let i = 1; i < grid.length && data.length < MAX_ROWS; i++) {
      const r = grid[i];
      const name = (idx.name >= 0 ? r[idx.name] : "")?.trim() || "";
      const rawPhone = (idx.phone >= 0 ? r[idx.phone] : "")?.trim() || "";
      const email = (idx.email >= 0 ? r[idx.email] : "")?.trim() || "";
      const statusRaw = (idx.status >= 0 ? r[idx.status] : "")?.trim() || "";
      const source = (idx.source >= 0 ? r[idx.source] : "")?.trim() || "";

      let error: string | undefined;
      if (!name) error = "Nome ausente";
      const phone = normalizePhone(rawPhone);
      if (!error && rawPhone && !phone) error = "Telefone inválido";

      const status = VALID_STATUSES.has(statusRaw) ? statusRaw : "Novo Lead";

      data.push({
        name: name || "(sem nome)",
        phone,
        email: email || null,
        status,
        lead_source: source || null,
        _rawPhone: rawPhone,
        _error: error,
      });
    }
    setRows(data);
  }

  const preview = useMemo(() => rows.slice(0, 5), [rows]);
  const validCount = rows.filter((r) => !r._error).length;

  async function runImport() {
    if (!currentStoreId) {
      toast({ title: "Selecione uma loja", variant: "destructive" });
      return;
    }
    setRunning(true);
    setProgress(0);

    const rep: Report = { imported: 0, duplicates: 0, errors: 0, errorDetails: [] };
    const valid = rows.filter((r) => !r._error);
    rep.errors += rows.length - valid.length;

    // Fetch existing phones (last 10 digits) for dedup
    const { data: existing, error: exErr } = await supabase
      .from("leads")
      .select("phone")
      .eq("store_id", currentStoreId)
      .not("phone", "is", null)
      .limit(10000);
    if (exErr) {
      toast({ title: "Erro ao verificar duplicados", description: exErr.message, variant: "destructive" });
      setRunning(false);
      return;
    }
    const existingSet = new Set<string>();
    for (const e of existing ?? []) {
      const k = last10(e.phone as string | null);
      if (k) existingSet.add(k);
    }

    // Dedup within file too
    const seenInFile = new Set<string>();
    const toInsert: any[] = [];
    for (const r of valid) {
      const key = last10(r.phone);
      if (key) {
        if (existingSet.has(key) || seenInFile.has(key)) { rep.duplicates++; continue; }
        seenInFile.add(key);
      }
      toInsert.push({
        store_id: currentStoreId,
        name: r.name,
        phone: r.phone,
        status: r.status,
        lead_source: r.lead_source,
        responsible_id: responsibleId || null,
        ...(r.email ? { notes: `Email: ${r.email}` } : {}),
      });
    }

    for (let i = 0; i < toInsert.length; i += BATCH) {
      const slice = toInsert.slice(i, i + BATCH);
      const { error } = await supabase.from("leads").insert(slice);
      if (error) {
        rep.errors += slice.length;
        rep.errorDetails.push(error.message);
      } else {
        rep.imported += slice.length;
      }
      setProgress(Math.round(((i + slice.length) / Math.max(toInsert.length, 1)) * 100));
    }

    setProgress(100);
    setReport(rep);
    setRunning(false);
    onImported?.();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar leads via CSV</DialogTitle>
          <DialogDescription>
            Colunas aceitas: <b>nome/name</b>, <b>telefone/phone</b>, <b>email</b>, <b>status</b>, <b>origem/source</b>. Máximo {MAX_ROWS} linhas por importação.
          </DialogDescription>
        </DialogHeader>

        {!report && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {fileName && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> {fileName} — {rows.length} linha(s), {validCount} válida(s)
                {rows.length >= MAX_ROWS && <span className="text-amber-600">(limite de {MAX_ROWS} aplicado)</span>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Vendedora responsável <span className="text-muted-foreground/60">(opcional)</span></label>
              <Select value={responsibleId} onValueChange={setResponsibleId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="— Sem responsável —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Sem responsável —</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preview.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((r, i) => (
                      <TableRow key={i} className={r._error ? "bg-destructive/10" : ""}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.phone || r._rawPhone || "—"}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{r.lead_source || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {running && (
              <div className="space-y-1">
                <Progress value={progress} />
                <div className="text-xs text-muted-foreground">Importando... {progress}%</div>
              </div>
            )}
          </div>
        )}

        {report && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Importação concluída</span>
            </div>
            <ul className="text-sm space-y-1">
              <li>✅ <b>{report.imported}</b> lead(s) importado(s)</li>
              <li>⚠️ <b>{report.duplicates}</b> duplicado(s) ignorado(s)</li>
              <li>❌ <b>{report.errors}</b> erro(s)</li>
            </ul>
            {report.errorDetails.length > 0 && (
              <div className="text-xs text-muted-foreground border rounded p-2 max-h-32 overflow-auto">
                <div className="flex items-center gap-1 mb-1"><AlertCircle className="h-3 w-3" /> Detalhes:</div>
                {report.errorDetails.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!report ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={running}>Cancelar</Button>
              <Button onClick={runImport} disabled={running || validCount === 0}>
                <Upload className="h-4 w-4 mr-1" />
                {running ? "Importando..." : `Importar ${validCount} lead(s)`}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
