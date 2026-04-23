import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Lead, LeadStatus, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  refetch: () => Promise<void>;
  updateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  countByStatus: (status: LeadStatus) => number;
  total: number;
}

const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!profile?.company_id) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao carregar leads", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((data ?? []) as Lead[]);
  }, [profile?.company_id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime subscription scoped to this company
  useEffect(() => {
    if (!profile?.company_id) return;
    const channel = supabase
      .channel(`leads-${profile.company_id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `company_id=eq.${profile.company_id}` },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.company_id, refetch]);

  const updateStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) {
      toast({ title: "Erro ao mover lead", description: error.message, variant: "destructive" });
      refetch();
    }
  }, [refetch]);

  const countByStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status).length,
    [leads]
  );

  return (
    <LeadsContext.Provider value={{ leads, loading, refetch, updateStatus, countByStatus, total: leads.length }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
