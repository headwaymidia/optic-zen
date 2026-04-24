import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ChatPanel } from "@/components/ChatPanel";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function Funil() {
  const { leads, loading } = useLeads();
  const [selected, setSelected] = useState<Lead | null>(null);
  const isMobile = useIsMobile();

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0">
      {/* Centro: Kanban + summary */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 flex-1 flex flex-col min-h-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Funil de vendas</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {isMobile ? "Toque em um card para conversar." : "Arraste para mover · Clique para conversar."}
            </p>
          </div>
          <DashboardSummary leads={leads} loading={loading} />
          <div className="flex-1 min-h-0 -mx-4 sm:-mx-6">
            <KanbanBoard
              onSelectLead={setSelected}
              selectedLeadId={selected?.id ?? null}
            />
          </div>
        </div>
      </div>

      {/* Direita: Chat panel — desktop, empurra o funil ao abrir */}
      {!isMobile && (
        <aside
          className={cn(
            "hidden lg:flex shrink-0 border-l border-slate-100 bg-white flex-col min-h-0 overflow-hidden transition-[width] duration-300 ease-in-out shadow-[-4px_0_24px_rgba(0,0,0,0.02)]",
            selected ? "w-[380px] xl:w-[420px]" : "w-[320px] xl:w-[360px]"
          )}
          aria-hidden={!selected}
        >
          {selected ? (
            <div className="flex-1 min-h-0 flex flex-col animate-slide-in-right">
              <ChatPanel lead={selected} onClose={() => setSelected(null)} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-8 text-center">
              <div className="rounded-full bg-slate-100 p-5 mb-4">
                <MessageSquare className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Nenhum atendimento aberto</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
                Selecione um cliente no funil ou na lista para começar o atendimento.
              </p>
            </div>
          )}
        </aside>
      )}

      {/* Mobile: drawer */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent
            side="right"
            className="p-0 w-screen max-w-full sm:max-w-full border-0"
          >
            {selected && <ChatPanel lead={selected} onBack={() => setSelected(null)} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
