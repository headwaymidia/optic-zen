import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useStores } from "@/hooks/useStores";

export interface StoreMember {
  id: string; // user_id (uuid)
  full_name: string;
  avatar_url?: string | null;
  role: string;
  email?: string | null;
}

/**
 * Lista membros reais da loja (store_members + profiles).
 * Se `storeId` não for passado, usa a loja atual.
 */
export function useStoreMembers(storeId?: string | null) {
  const { currentStoreId } = useStores();
  const sid = storeId ?? currentStoreId;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["store-members", sid],
    enabled: !!sid,
    staleTime: 1000 * 60 * 5, // 5 minutos
    queryFn: async (): Promise<StoreMember[]> => {
      const { data: rows, error } = await supabase
        .from("store_members")
        .select("user_id, role")
        .eq("store_id", sid!);
      if (error || !rows || rows.length === 0) return [];
      const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      const pMap = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r: any) => {
        const p = pMap.get(r.user_id);
        const nm = (p?.full_name ?? "").trim();
        return {
          id: r.user_id,
          full_name: nm || p?.email || "Membro",
          email: p?.email ?? null,
          avatar_url: p?.avatar_url ?? null,
          role: r.role,
        };
      });
    },
  });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    members.forEach((x) => m.set(x.id, x.full_name));
    return m;
  }, [members]);

  return { members, loading: !!sid && isLoading, nameById };
}
