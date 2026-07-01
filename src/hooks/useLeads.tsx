import { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { Lead, LeadStatus, supabase } from "@/integrations/supabase/client";
import { createReconnectingChannel } from "@/lib/realtime-channel";
import { useStores } from "@/hooks/useStores";

// Dispara evento para Meta Conversions API de forma silenciosa
async function fireMetaEvent(storeId: string, eventName: string, lead?: { phone?: string | null; name?: string | null; value?: number; ctwaClid?: string | null; eventId?: string }) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-conversions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        store_id: storeId,
        event_name: eventName,
        lead_phone: lead?.phone,
        lead_name: lead?.name,
        value: lead?.value,
        currency: "BRL",
        ctwa_clid: lead?.ctwaClid ?? null,
        // event_id deterministico (quando fornecido) para o Meta DEDUPLICAR.
        // Sem isso, 2 cliques = 2 Purchases = conversao contada em dobro.
        event_id: lead?.eventId ?? `${storeId}-${eventName}-${Date.now()}`,
      }),
    });
  } catch {
    // Falha silenciosa — não impacta o CRM
  }
}
import { toast } from "@/components/ui/use-toast";
import { humanizeError } from "@/lib/error-handler";

const PAGE_SIZE = 50;
const MAX_AUTO_PAGES = 200; // safety cap for loadAll (10k leads)

type LeadsPages = InfiniteData<Lead[]>;

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

function mapPages(
  data: LeadsPages | undefined,
  fn: (leads: Lead[]) => Lead[],
): LeadsPages | undefined {
  if (!data) return data;
  return { ...data, pages: data.pages.map(fn) };
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { currentStoreId } = useStores();
  const queryClient = useQueryClient();
  const queryKey = ["leads", currentStoreId] as const;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: rqRefetch,
  } = useInfiniteQuery<Lead[], Error, LeadsPages, typeof queryKey, number>({
    queryKey,
    enabled: !!currentStoreId,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam;
      const to = pageParam + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("store_id", currentStoreId!)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .range(from, to);
      if (error) {
        toast({ title: "Erro ao carregar leads", description: humanizeError(error), variant: "destructive" });
        throw error;
      }
      return (data ?? []) as unknown as Lead[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
  });

  // Flatten + sort (newest activity first). Dedup defensively by id.
  const flat: Lead[] = (() => {
    const all = (data?.pages ?? []).flat();
    const seen = new Set<string>();
    const out: Lead[] = [];
    for (const l of all) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        out.push(l);
      }
    }
    return sortByLastMessage(out);
  })();

  const hasMore = !!hasNextPage;
  const isFetchingMore = isFetchingNextPage || (isFetching && !isLoading);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // loadAll: fetch pages sequentially until exhausted (capped).
  const loadingAllRef = useRef(false);
  const loadAll = useCallback(async () => {
    if (loadingAllRef.current) return;
    loadingAllRef.current = true;
    try {
      let i = 0;
      while (i < MAX_AUTO_PAGES) {
        const res = await fetchNextPage();
        const pages = (res.data as LeadsPages | undefined)?.pages ?? [];
        const last = pages[pages.length - 1];
        if (!last || last.length < PAGE_SIZE) break;
        i++;
      }
    } finally {
      loadingAllRef.current = false;
    }
  }, [fetchNextPage]);

  const refetch = useCallback(async () => {
    await rqRefetch();
  }, [rqRefetch]);

  // Realtime: leads table changes -> patch pages in place.
  useEffect(() => {
    if (!currentStoreId) return;
    const handle = createReconnectingChannel({
      name: `leads-${currentStoreId}`,
      onResubscribe: () => queryClient.invalidateQueries({ queryKey }),
      setup: (ch) => ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `store_id=eq.${currentStoreId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Lead | undefined;
          if (!row?.id) return;
          queryClient.setQueryData<LeadsPages>(queryKey, (old) => {
            if (!old) return old;
            if (payload.eventType === "DELETE") {
              return mapPages(old, (page) => page.filter((l) => l.id !== row.id))!;
            }
            // UPDATE or INSERT: patch existing across any page; if not present, append to last page.
            let found = false;
            const next = mapPages(old, (page) =>
              page.map((l) => {
                if (l.id === row.id) {
                  found = true;
                  return { ...l, ...row };
                }
                return l;
              })
            )!;
            if (!found && payload.eventType === "INSERT") {
              const pages = [...next.pages];
              const idx = pages.length - 1;
              if (idx >= 0) pages[idx] = [...pages[idx], row];
              else pages.push([row]);
              return { ...next, pages };
            }
            return next;
          });
        }
      ),
    });
    return () => { handle.remove(); };
  }, [currentStoreId, queryClient]);

  // Realtime: novas mensagens de WhatsApp -> atualiza preview/ordem.
  useEffect(() => {
    if (!currentStoreId) return;
    const handle = createReconnectingChannel({
      name: `wa-msgs-leads-${currentStoreId}`,
      onResubscribe: () => queryClient.invalidateQueries({ queryKey }),
      setup: (ch) => ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `store_id=eq.${currentStoreId}`,
        },
        (payload) => {
          const row = payload.new as { lead_id?: string | null; timestamp?: string | null; created_at?: string | null; body?: string | null; media_type?: string | null } | undefined;
          if (payload.eventType === "INSERT" && row?.lead_id) {
            const lastMessageAt = row.timestamp ?? row.created_at ?? new Date().toISOString();
            queryClient.setQueryData<LeadsPages>(queryKey, (old) =>
              mapPages(old, (page) =>
                page.map((lead) =>
                  lead.id === row.lead_id
                    ? { ...lead, last_message_at: lastMessageAt, last_message_preview: getMessagePreview(row) }
                    : lead
                )
              )
            );
            return;
          }
          queryClient.invalidateQueries({ queryKey });
        }
      ),
    });
    return () => { handle.remove(); };
  }, [currentStoreId, queryClient]);

  // Rede de seguranca: ao voltar o foco/visibilidade da aba, revalida os leads.
  // Cobre o caso do websocket ter sido suspenso enquanto a aba ficou em background
  // (comum: vendedora deixa o CRM aberto atras de outras abas). Assim, ao voltar,
  // ela ve tudo que chegou mesmo que o realtime tenha perdido eventos.
  useEffect(() => {
    if (!currentStoreId) return;
    const revalidate = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey });
      }
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [currentStoreId, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
      if (error) throw error;
    },
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<LeadsPages>(queryKey);
      queryClient.setQueryData<LeadsPages>(queryKey, (old) =>
        mapPages(old, (page) => page.map((l) => (l.id === leadId ? { ...l, status } : l)))
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast({ title: "Erro ao mover lead", description: humanizeError(error), variant: "destructive" });
    },
    onSuccess: (_data, { leadId, status }) => {
      // Disparar evento Meta conforme o novo status
      if (!currentStoreId) return;
      const lead = queryClient.getQueryData<any>(queryKey);
      const leadData = lead?.pages?.flat()?.find((l: any) => l.id === leadId);
      if (status === "Agendou Exame") {
        fireMetaEvent(currentStoreId, "Schedule", {
          phone: leadData?.phone,
          name: leadData?.name,
          ctwaClid: leadData?.ctwa_clid,
          eventId: `${currentStoreId}-Schedule-${leadId}`,
        });
      } else if (status === "Compareceu e Comprou") {
        fireMetaEvent(currentStoreId, "Purchase", {
          phone: leadData?.phone,
          name: leadData?.name,
          ctwaClid: leadData?.ctwa_clid,
          // value: rastreia o VALOR da compra no Meta (ROAS por valor, nao so contagem).
          value: typeof leadData?.sale_value === "number" ? leadData.sale_value : undefined,
          eventId: `${currentStoreId}-Purchase-${leadId}`,
        });
      }
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
      const prev = queryClient.getQueryData<LeadsPages>(queryKey);
      queryClient.setQueryData<LeadsPages>(queryKey, (old) =>
        mapPages(old, (page) => page.map((l) => (l.id === leadId ? { ...l, ...patch } : l)))
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      toast({ title: "Erro ao atualizar lead", description: humanizeError(error), variant: "destructive" });
    },
    onSuccess: (_data, { leadId, patch }) => {
      // Dispara Meta quando a venda e confirmada via updateLead (caminho do StageGate/Kanban).
      // event_id deterministico => Meta DEDUPLICA se updateStatus tambem disparar Purchase.
      if (!currentStoreId) return;
      const lead = queryClient.getQueryData<any>(queryKey);
      const leadData = lead?.pages?.flat()?.find((l: any) => l.id === leadId);
      if (patch.status === "Compareceu e Comprou") {
        fireMetaEvent(currentStoreId, "Purchase", {
          phone: leadData?.phone,
          name: leadData?.name,
          ctwaClid: leadData?.ctwa_clid,
          value: typeof patch.sale_value === "number" ? patch.sale_value
            : (typeof leadData?.sale_value === "number" ? leadData.sale_value : undefined),
          eventId: `${currentStoreId}-Purchase-${leadId}`,
        });
      } else if (patch.status === "Agendou Exame") {
        fireMetaEvent(currentStoreId, "Schedule", {
          phone: leadData?.phone,
          name: leadData?.name,
          ctwaClid: leadData?.ctwa_clid,
          eventId: `${currentStoreId}-Schedule-${leadId}`,
        });
      }
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
    (status: LeadStatus) => flat.filter((l) => l.status === status).length,
    [flat]
  );

  const loading = !!currentStoreId && isLoading;

  return (
    <LeadsContext.Provider value={{ leads: flat, loading, refetch, updateStatus, updateLead, countByStatus, total: flat.length, hasMore, loadMore, loadAll, isFetchingMore }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
