import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";

/**
 * Retorna um Map de { seller_id → nome } para a loja atual,
 * buscando de store_sellers (não precisa ter conta no sistema).
 */
export function useSellerNames() {
  const { currentStoreId } = useStores();
  const [nameById, setNameById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!currentStoreId) {
      setNameById(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_sellers")
        .select("id, name")
        .eq("store_id", currentStoreId)
        .eq("active", true);
      if (cancelled) return;
      const map = new Map<string, string>();
      (data ?? []).forEach((s: any) => map.set(s.id, s.name));
      setNameById(map);
    })();
    return () => { cancelled = true; };
  }, [currentStoreId]);

  return nameById;
}
