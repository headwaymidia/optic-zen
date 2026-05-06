import { useEffect, useMemo, useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { useSalesRanking } from "@/hooks/useSalesRanking";
import { isWithinInterval, parseISO } from "date-fns";
import { getPeriodRange } from "@/components/PeriodFilter";
import { Medal, Trophy } from "lucide-react";
import logoUrl from "@/assets/logo-otica-dominante-white.svg";

const MEDAL_COLORS = [
  { ring: "ring-amber-400", text: "text-amber-300", bg: "from-amber-500/20 to-amber-700/5" },
  { ring: "ring-zinc-300", text: "text-zinc-200", bg: "from-zinc-400/20 to-zinc-600/5" },
  { ring: "ring-orange-500", text: "text-orange-300", bg: "from-orange-500/20 to-orange-700/5" },
];

const POSITION = ["1º Lugar", "2º Lugar", "3º Lugar"];

export default function Ranking() {
  const { leads, refetch } = useLeads();
  const { filterByCurrentStore } = useStores();
  const [tick, setTick] = useState(0);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => {
      refetch();
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(id);
  }, [refetch]);

  const range = useMemo(() => getPeriodRange("month"), []);
  const storeLeads = useMemo(() => filterByCurrentStore(leads), [leads, filterByCurrentStore]);
  const filtered = useMemo(
    () =>
      storeLeads.filter(
        (l) => l.created_at && isWithinInterval(parseISO(l.created_at), { start: range.from, end: range.to })
      ),
    [storeLeads, range]
  );
  const ranking = useSalesRanking(filtered, 3);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex flex-col items-center px-6 py-10">
      <header className="w-full max-w-6xl flex items-center justify-between">
        <img src={logoUrl} alt="Ótica Dominante" className="h-12" />
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Ranking de Vendas</p>
          <p className="text-sm text-zinc-500 capitalize">{range.label}</p>
        </div>
      </header>

      <h1 className="mt-12 text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
        🏆 Top Vendedoras
      </h1>

      <main className="mt-16 w-full max-w-5xl flex-1 flex items-center justify-center">
        {ranking.length === 0 ? (
          <p className="text-2xl text-zinc-500">Nenhuma venda registrada no período.</p>
        ) : (
          <ol className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {[1, 0, 2].map((idx) => {
              const r = ranking[idx];
              if (!r) return <div key={idx} />;
              const m = MEDAL_COLORS[idx];
              const isFirst = idx === 0;
              return (
                <li
                  key={r.id}
                  className={`relative rounded-3xl p-8 bg-gradient-to-b ${m.bg} ring-2 ${m.ring} flex flex-col items-center text-center ${
                    isFirst ? "md:scale-110 md:order-2" : idx === 1 ? "md:order-1" : "md:order-3"
                  }`}
                >
                  <div className={`mb-4 ${m.text}`}>
                    {isFirst ? <Trophy className="h-16 w-16" /> : <Medal className="h-14 w-14" />}
                  </div>
                  <p className={`text-xs uppercase tracking-[0.3em] ${m.text}`}>{POSITION[idx]}</p>
                  <p className="mt-3 text-3xl sm:text-4xl font-bold text-white truncate max-w-full">
                    {r.name}
                  </p>
                  <p className="mt-6 text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight text-white">
                    {fmt(r.revenue)}
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.2em] text-zinc-400">
                    {r.count} venda{r.count > 1 ? "s" : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <footer className="mt-12 text-[11px] uppercase tracking-[0.3em] text-zinc-600">
        Atualização automática a cada 60s · {new Date().toLocaleTimeString("pt-BR")}
        <span className="hidden">{tick}</span>
      </footer>
    </div>
  );
}
