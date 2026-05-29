import { useMemo } from "react";
import { Lead } from "@/integrations/supabase/client";
import { BellRing, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UpcomingReturnsCard({ leads }: { leads: Lead[] }) {
  const navigate = useNavigate();

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 30);
    return leads
      .filter((l) => {
        if (!l.next_return_date) return false;
        const d = new Date(l.next_return_date + "T00:00:00");
        return d >= today && d <= limit;
      })
      .sort(
        (a, b) =>
          new Date(a.next_return_date!).getTime() -
          new Date(b.next_return_date!).getTime()
      );
  }, [leads]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">
              Retornos este mês
            </h3>
            <p className="text-[11px] text-zinc-500">
              Próximos 30 dias
            </p>
          </div>
        </div>
        <span className="text-2xl font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
          {upcoming.length}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-4 text-center">
          Nenhum cliente com retorno previsto nos próximos 30 dias.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
          {upcoming.map((l) => {
            const d = new Date(l.next_return_date! + "T00:00:00");
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const days = Math.round((d.getTime() - today.getTime()) / 86400000);
            const isUrgent = days < 14;
            return (
              <li key={l.id}>
                <button
                  onClick={() => navigate(`/whatsapp?leadId=${l.id}`)}
                  className="w-full flex items-center justify-between gap-3 py-2 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-md transition text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1D1D1F] dark:text-white truncate">
                      {l.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {d.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}{" "}
                      · em {days} {days === 1 ? "dia" : "dias"}
                    </p>
                  </div>
                  <span
                    className={
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full " +
                      (isUrgent
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200")
                    }
                  >
                    {isUrgent ? "Urgente" : "Em breve"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
