import { useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { DashboardSummary } from "@/components/DashboardSummary";
import { ChatPanel } from "@/components/ChatPanel";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Funil() {
  const { leads, loading } = useLeads();
  const [selected, setSelected] = useState<Lead | null>(null);
  const isMobile = useIsMobile();

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0">
      {/* Centro: Kanban + summary */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col min-h-0">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Funil de vendas</h1>
            <p className="text-sm text-muted-foreground">
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
            "hidden lg:flex shrink-0 border-l bg-card flex-col min-h-0 overflow-hidden transition-[width] duration-300 ease-in-out",
            selected ? "w-[380px] xl:w-[420px]" : "w-0 border-l-0"
          )}
          aria-hidden={!selected}
        >
          {selected && (
            <div className="flex-1 min-h-0 flex flex-col animate-slide-in-right">
              <ChatPanel lead={selected} onClose={() => setSelected(null)} />
            </div>
          )}
        </aside>
      )}

      {/* Mobile: drawer */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent side="right" className="p-0 w-full sm:max-w-md">
            {selected && <ChatPanel lead={selected} onBack={() => setSelected(null)} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
