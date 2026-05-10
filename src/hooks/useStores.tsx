import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export type StoreRole = "Dono" | "Gerente" | "Vendedor";

export interface Store {
  id: string;
  name: string;
  /** Permissão do usuário atual nesta loja. */
  role: StoreRole;
  /** Iniciais ou emoji curto exibido no avatar. */
  initial?: string;
  owner_id?: string;
}

interface StoresContextValue {
  stores: Store[];
  loading: boolean;
  currentStore: Store | null;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string) => void;
  addStore: (input: { name: string; role?: StoreRole; throwOnError?: boolean }) => Promise<Store | null>;
  refetch: () => Promise<void>;
  /**
   * Filtra um array de itens (com `store_id`) pela loja ativa.
   * Itens sem `store_id` são preservados (compatibilidade com mocks/legado).
   */
  filterByCurrentStore: <T>(items: T[]) => T[];
}

const StoresContext = createContext<StoresContextValue | undefined>(undefined);

/** Apenas preferência de UI — qual loja o usuário viu por último. NUNCA é fonte de dados. */
const CURRENT_KEY = "od.stores.current.v2";

function loadCurrentIdPref(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

function saveCurrentIdPref(id: string | null) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    /* ignore */
  }
}

function initialFromName(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "L";
}

export function StoresProvider({ children }: { children: ReactNode }) {
  const { session, user: authContextUser } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(
    () => loadCurrentIdPref()
  );

  const fetchStores = useCallback(async () => {
    if (!authContextUser) {
      setStores([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Busca em paralelo: lojas onde é membro + lojas onde é dono.
    // Isso garante que aparecem mesmo se o vínculo em store_members estiver faltando.
    const [membersRes, ownedRes] = await Promise.all([
      supabase
        .from("store_members")
        .select("role, store:stores(id, name, owner_id)")
        .eq("user_id", authContextUser.id),
      supabase
        .from("stores")
        .select("id, name, owner_id")
        .eq("owner_id", authContextUser.id),
    ]);

    if (membersRes.error && ownedRes.error) {
      toast({
        title: "Erro ao carregar lojas",
        description: humanizeError(membersRes.error),
        variant: "destructive",
      });
      setStores([]);
      setLoading(false);
      return;
    }

    const map = new Map<string, Store>();

    // 1) Lojas via store_members (com role real)
    for (const row of membersRes.data ?? []) {
      const s: any = (row as any).store;
      if (!s) continue;
      map.set(s.id, {
        id: s.id,
        name: s.name,
        owner_id: s.owner_id,
        role: (row as any).role as StoreRole,
        initial: initialFromName(s.name),
      });
    }

    // 2) Lojas onde é owner mas não estão em store_members → entram como Dono
    for (const s of ownedRes.data ?? []) {
      if (map.has(s.id)) continue;
      map.set(s.id, {
        id: s.id,
        name: s.name,
        owner_id: s.owner_id,
        role: "Dono",
        initial: initialFromName(s.name),
      });
    }

    setStores(Array.from(map.values()));
    setLoading(false);
  }, [authContextUser]);

  // Carrega lojas ao logar / trocar de usuário
  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Realtime: refaz busca quando store_members muda para esse usuário
  useEffect(() => {
    if (!authContextUser) return;
    const ch = supabase
      .channel(`store-members-${authContextUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_members",
          filter: `user_id=eq.${authContextUser.id}`,
        },
        () => fetchStores()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stores" },
        () => fetchStores()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [authContextUser, fetchStores]);

  // Garante que currentStoreId é sempre uma loja válida do usuário
  useEffect(() => {
    if (loading) return;
    if (!stores.length) {
      if (currentStoreId !== null) {
        setCurrentStoreIdState(null);
        saveCurrentIdPref(null);
      }
      return;
    }
    const exists = stores.some((s) => s.id === currentStoreId);
    if (!exists) {
      const next = stores[0].id;
      setCurrentStoreIdState(next);
      saveCurrentIdPref(next);
    }
  }, [stores, loading, currentStoreId]);

  // Limpa preferência ao deslogar
  useEffect(() => {
    if (!session) {
      setCurrentStoreIdState(null);
      saveCurrentIdPref(null);
    }
  }, [session]);

  const setCurrentStoreId = useCallback((id: string) => {
    setCurrentStoreIdState(id);
    saveCurrentIdPref(id);
  }, []);

  const addStore = useCallback<StoresContextValue["addStore"]>(
    async (input) => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      const user = activeSession?.user ?? null;

      if (!user) {
        const authError = new Error("Sessão não encontrada.");
        if (input.throwOnError) throw authError;
        toast({ title: "Faça login para criar uma loja", variant: "destructive" });
        return null;
      }
      const name = input.name.trim();
      if (!name) return null;

      const { data: storeRow, error } = await supabase
        .from("stores")
        .insert({ name, owner_id: user.id })
        .select("id, name, owner_id")
        .single();

      if (error || !storeRow) {
        // Log completo do erro para debug (RLS, network, etc.)
        console.error("[useStores.addStore] Falha no INSERT em stores:", {
          error,
          message: error?.message,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          code: (error as any)?.code,
          payload: { name, owner_id: user.id },
        });
        if (input.throwOnError) {
          throw error ?? new Error("INSERT em stores não retornou a loja criada.");
        }
        toast({
          title: "Erro ao criar loja",
          description:
            error?.message ?? "INSERT em stores não retornou a loja criada.",
          variant: "destructive",
        });
        return null;
      }

      // Vincula o criador como Dono (idempotente — trigger handle_new_user só roda no signup)
      const role: StoreRole = input.role ?? "Dono";
      const { error: memberErr } = await supabase
        .from("store_members")
        .upsert(
          { store_id: storeRow.id, user_id: user.id, role },
          { onConflict: "store_id,user_id" }
        );

      if (memberErr) {
        toast({
          title: "Loja criada, mas falhou vincular usuário",
          description: memberErr.message,
          variant: "destructive",
        });
      }

      const created: Store = {
        id: storeRow.id,
        name: storeRow.name,
        owner_id: storeRow.owner_id,
        role,
        initial: initialFromName(storeRow.name),
      };

      setStores((prev) => {
        if (prev.some((s) => s.id === created.id)) return prev;
        return [...prev, created];
      });
      setCurrentStoreId(created.id);

      return created;
    },
    [setCurrentStoreId]
  );

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) ?? stores[0] ?? null,
    [stores, currentStoreId]
  );

  const filterByCurrentStore = useCallback(
    <T extends { store_id?: string | null }>(items: T[]): T[] => {
      if (!currentStore) return [];
      return items.filter(
        (it) => !it.store_id || it.store_id === currentStore.id
      );
    },
    [currentStore]
  );

  const value = useMemo<StoresContextValue>(
    () => ({
      stores,
      loading,
      currentStore,
      currentStoreId: currentStore?.id ?? null,
      setCurrentStoreId,
      addStore,
      refetch: fetchStores,
      filterByCurrentStore,
    }),
    [stores, loading, currentStore, setCurrentStoreId, addStore, fetchStores, filterByCurrentStore]
  );

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

export function useStores() {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error("useStores must be used within StoresProvider");
  return ctx;
}
