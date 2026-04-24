import { KanbanBoard } from "@/components/KanbanBoard";
import { DashboardSummary } from "@/components/DashboardSummary";
import { useLeads } from "@/hooks/useLeads";

export default function Funil() {
  const { leads, loading } = useLeads();
  return (
    <div className="p-4 sm:p-6 space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funil de vendas</h1>
        <p className="text-sm text-muted-foreground">Resumo em tempo real e funil arrastável.</p>
      </div>
      <DashboardSummary leads={leads} loading={loading} />
      <div className="flex-1 min-h-0 -mx-4 sm:-mx-6">
        <KanbanBoard />
      </div>
    </div>
  );
}

