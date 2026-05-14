import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead, LeadStatus, supabase } from "@/integrations/supabase/client";
import { useStores } from "@/hooks/useStores";
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";

const INITIAL_PAGE_SIZE = 50;
const PAGE_INCREMENT = 50;
const LOAD_ALL_LIMIT = 5000;

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  refetch: () => Promise<void>;
  updateStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLead: (leadId: string, patch: Partial<Lead>) => Promise<void>;
  countByStatus: (status: LeadStatus) => number;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  loadAll: () => void;
  isFetchingMore: boolean;
}

const LeadsContext = createContext<LeadsContextValue | undefined>(undefined);

function lastMessageMs(lead: Lead) {
  if (!lead.last_message_at) return Number.NEGATIVE_INFINITY;
  const ms = new Date(lead.last_message_at).getTime();
  return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

function sortByLastMessage(leads: Lead[]) {
  return [...leads].sort((a, b) => lastMessageMs(b) - lastMessageMs(a));
}

function getMessagePreview(row: { body?: string | null; media_type?: string | null }) {
  if (row.media_type === "image") return "📷 Imagem";
  if (row.media_type === "video") return "🎬 Vídeo";
  if (row.media_type === "audio") return "🎵 Áudio";
  if (row.media_type === "document") return "📎 Documento";
  return (row.body ?? "").slice(0, 100);
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { currentStoreId } = useStores();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState<number>(INITIAL_PAGE_SIZE);
  const queryKey = ["leads", currentStoreId, limit] as const;

  useEffect(() => {
    setLimit(INITIAL_PAGE_SIZE);
  }, [currentStoreId]);

  const { data, isLoading, isFetching, refetch: rqRefetch } = useQuery<Lead[]>({
    queryKey,
    enabled: !!currentStoreId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("store_id", currentStoreId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) {
        toast({ title: "Erro ao carregar leads", description: humanizeError(error), variant: "destructive" });
        throw error;
      }
      return sortByLastMessage((data ?? []) as unknown as Lead[]);
    },
    placeholderData: (prev) => prev,
  } as any);

  const leads: Lead[] = data ?? [];
  const hasMore = leads.length >= limit;
  const isFetchingMore = isFetching && !isLoading;

  const loadMore = useCallback(() => {
    setLimit((l) => l + PAGE_INCREMENT);
  }, []);

  const loadAll = useCallback(() => {
    setLimit((l) => (l >= LOAD_ALL_LIMIT ? l : LOAD_ALL_LIMIT));
  }, []);

  const refetch = useCallback(async () => {
    await rqRefetch();
  }, [rqRefetch]);

  // Realtime subscription scoped to this store -> invalidate query
  useEffect(() => {
    if (!currentStoreId) return;
    const channel = supabase
      .channel(`leads-${currentStoreId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `store_id=eq.${currentStoreId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Lead | undefined;
          if (row?.id) {
            queryClient.setQueryData<Lead[]>(queryKey, (old = []) => {
              if (payload.eventType === "DELETE") return sortByLastMessage(old.filter((l) => l.id !== row.id));
              const idx = old.findIndex((l) => l.id === row.id);
              const next = idx >= 0
                ? old.map((l) => (l.id === row.id ? { ...l, ...row } : l))
                : [...old, row];
              return sortByLastMessage(next);
            });
          }
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentStoreId, queryClient]);

  // Realtime: novas mensagens de WhatsApp -> invalida lista de leads (preview/ordem)
  useEffect(() => {
    if (!currentStoreId) return;
    const channel = supabase
      .channel(`wa-msgs-leads-${currentStoreId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `store_id=eq.${currentStoreId}`,
        },
        (payload) => {
          if (import.meta.env.DEV) console.log("[Realtime] whatsapp_messages -> invalidando leads", payload);
          const row = payload.new as { lead_id?: string | null; timestamp?: string | null; created_at?: string | null; body?: string | null; media_type?: string | null } | undefined;
          if (payload.eventType === "INSERT" && row?.lead_id) {
            const lastMessageAt = row.timestamp ?? row.created_at ?? new Date().toISOString();
            queryClient.setQueryData<Lead[]>(queryKey, (old = []) =>
              sortByLastMessage(
                old.map((lead) =>
                  lead.id === row.lead_id
                    ? {
                        ...lead,
                        last_message_at: lastMessageAt,
                        last_message_preview: getMessagePreview(row),
                      }
                    : lead
                )
              )
            );
            return;
          }
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentStoreId, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
      if (error) throw error;
    },
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Lead[]>(queryKey);
      queryClient.setQueryData<Lead[]>(queryKey, (old = []) =>
        old.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast({ title: "Erro ao mover lead", description: humanizeError(error), variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, patch }: { leadId: string; patch: Partial<Lead> }) => {
      const { prescription: _p, delivery_prediction: _d, ...dbPatch } = patch as any;
      const { error } = await supabase.from("leads").update(dbPatch).eq("id", leadId);
      if (error) throw error;
    },
    onMutate: async ({ leadId, patch }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<Lead[]>(queryKey);
      queryClient.setQueryData<Lead[]>(queryKey, (old = []) =>
        old.map((l) => (l.id === leadId ? { ...l, ...patch } : l))
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast({ title: "Erro ao atualizar lead", description: humanizeError(error), variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateStatus = useCallback(
    async (leadId: string, status: LeadStatus) => {
      await updateStatusMutation.mutateAsync({ leadId, status }).catch(() => {});
    },
    [updateStatusMutation]
  );

  const updateLead = useCallback(
    async (leadId: string, patch: Partial<Lead>) => {
      await updateLeadMutation.mutateAsync({ leadId, patch }).catch(() => {});
    },
    [updateLeadMutation]
  );

  const countByStatus = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status).length,
    [leads]
  );

  const loading = !!currentStoreId && isLoading;

  return (
    <LeadsContext.Provider value={{ leads, loading, refetch, updateStatus, updateLead, countByStatus, total: leads.length, hasMore, loadMore, loadAll, isFetchingMore }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
