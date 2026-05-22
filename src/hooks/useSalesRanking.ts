import { useEffect, useMemo, useState } from "react";
import { Lead, supabase } from "@/integrations/supabase/client";

export interface RankItem {
  id: string;
  name: string;
  revenue: number;
  count: number;
}

export function useSalesRanking(leads: Lead[], limit = 3): RankItem[] {
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = Array.from(
      new Set(
        leads
          .filter((l) => l.status === "Compareceu e Comprou" && l.responsible_id)
          .map((l) => String(l.responsible_id))
      )
    );
    if (ids.length === 0) {
      setNameMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_sellers")
        .select("id, name")
        .in("id", ids);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach((s: any) => { map[s.id] = s.name; });
      setNameMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [leads]);

  return useMemo<RankItem[]>(() => {
    const counts = new Map<string, { count: number; revenue: number }>();
    leads
      .filter((l) => l.status === "Compareceu e Comprou" && l.responsible_id)
      .forEach((l) => {
        const key = l.responsible_id as string;
        const cur = counts.get(key) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(l.sale_value ?? 0);
        counts.set(key, cur);
      });
    return Array.from(counts.entries())
      .map(([id, v]) => ({ id, name: nameMap[id] ?? "Vendedora", ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
      .slice(0, limit);
  }, [leads, nameMap, limit]);
}
