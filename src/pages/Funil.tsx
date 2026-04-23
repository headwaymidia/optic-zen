import { KanbanBoard } from "@/components/KanbanBoard";

export default function Funil() {
  return (
    <div className="p-4 sm:p-6 space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funil de vendas</h1>
        <p className="text-sm text-muted-foreground">Arraste os cards entre as colunas para atualizar o status.</p>
      </div>
      <div className="flex-1 min-h-0 -mx-4 sm:-mx-6">
        <KanbanBoard />
      </div>
    </div>
  );
}
