import { Lead, LEAD_STATUSES } from "@/integrations/supabase/client";
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function exportMonthlyReport(leads: Lead[], companyName?: string) {
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  const inMonth = leads.filter((l) => l.created_at && isWithinInterval(new Date(l.created_at), { start: from, end: to }));
  const total = inMonth.length;
  const byStatus = LEAD_STATUSES.map((s) => ({ status: s, count: inMonth.filter((l) => l.status === s).length }));
  const sales = inMonth.filter((l) => l.status === "Compareceu e Comprou");
  const revenue = sales.reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);
  const conversionRate = total ? ((sales.length / total) * 100).toFixed(1) : "0";

  const rows = byStatus
    .map(
      (b) => `
        <tr>
          <td>${b.status}</td>
          <td style="text-align:right">${b.count}</td>
          <td style="text-align:right">${total ? ((b.count / total) * 100).toFixed(1) : "0"}%</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Relatório ${monthLabel}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 32px; color: #0f172a; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .kpi .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
  .kpi .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  th { text-align: left; background: #f8fafc; font-weight: 600; }
  .footer { margin-top: 28px; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 16mm; } .no-print { display: none; } button { display: none; } }
  .actions { margin-bottom: 16px; }
  button { background: #2563eb; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
</style>
</head>
<body>
  <div class="actions no-print">
    <button onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>
  <h1>Relatório Mensal — ${companyName ?? "Ótica"}</h1>
  <div class="sub">Período: ${monthLabel} • Gerado em ${format(now, "dd/MM/yyyy HH:mm")}</div>

  <div class="kpis">
    <div class="kpi"><div class="label">Total de leads</div><div class="value">${total}</div></div>
    <div class="kpi"><div class="label">Vendas realizadas</div><div class="value">${sales.length}</div></div>
    <div class="kpi"><div class="label">Faturamento</div><div class="value">${formatBRL(revenue)}</div></div>
  </div>

  <div class="kpis">
    <div class="kpi"><div class="label">Taxa de conversão</div><div class="value">${conversionRate}%</div></div>
    <div class="kpi"><div class="label">Ticket médio</div><div class="value">${formatBRL(sales.length ? revenue / sales.length : 0)}</div></div>
    <div class="kpi"><div class="label">Em repescagem</div><div class="value">${inMonth.filter((l) => l.status === "Repescagem").length}</div></div>
  </div>

  <h3 style="margin:24px 0 8px;font-size:15px;">Distribuição por etapa</h3>
  <table>
    <thead><tr><th>Etapa</th><th style="text-align:right">Leads</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">CRM Ótica Dominante • Powered by Headway Mídia</div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Permita pop-ups para gerar o relatório.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
