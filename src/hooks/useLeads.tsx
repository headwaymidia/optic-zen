import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Lead, LeadStatus, supabase } from "@/lib/supabase";
import { useStores } from "@/hooks/useStores";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  refetch: () => Promise<void>;
  updateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
  countByStatus: (status: LeadStatus) => number;
  total: number;
}

const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { currentStoreId } = useStores();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!currentStoreId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("store_id", currentStoreId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((data ?? []) as unknown as Lead[]);
  }, [currentStoreId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime subscription scoped to this store
  useEffect(() => {
    if (!currentStoreId) return;
    const channel = supabase
      .channel(`leads-${currentStoreId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `store_id=eq.${currentStoreId}` },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentStoreId, refetch]);

  const updateStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) {
      toast({ title: "Erro ao mover lead", description: error.message, variant: "destructive" });
      refetch();
    }
  }, [refetch]);

  const updateLead = useCallback(async (leadId: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)));
    const { prescription: _p, delivery_prediction: _d, ...dbPatch } = patch as any;
    const { error } = await supabase.from("leads").update(dbPatch).eq("id", leadId);
    if (error) {
      toast({ title: "Erro ao atualizar lead", description: error.message, variant: "destructive" });
      refetch();
    }
  }, [refetch]);

  const countByStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status).length,
    [leads]
  );

  return (
    <LeadsContext.Provider value={{ leads, loading, refetch, updateStatus, updateLead, countByStatus, total: leads.length }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
