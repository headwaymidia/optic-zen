import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type StoreRole = "Dono" | "Gerente" | "Vendedor";

export interface Store {
  id: string;
  name: string;
  /** Permissão do usuário atual nesta loja. */
  role: StoreRole;
  /** Iniciais ou emoji curto exibido no avatar. */
  initial?: string;
}

interface StoresContextValue {
  stores: Store[];
  currentStore: Store | null;
  currentStoreId: string | null;
  setCurrentStoreId: (id: string) => void;
  addStore: (input: { name: string; role?: StoreRole }) => Store;
  /**
   * Hook utilitário: dado um array de itens (mock), retorna apenas a fatia
   * "pertencente" à loja atual de forma determinística pelo id do item.
   * Permite simular isolamento de dados sem backend.
   */
  filterByCurrentStore: <T extends { id?: string | number }>(items: T[]) => T[];
}

const StoresContext = createContext<StoresContextValue | undefined>(undefined);

const STORAGE_KEY = "od.stores.v1";
const CURRENT_KEY = "od.stores.current.v1";

const DEFAULT_STORES: Store[] = [
  { id: "store-centro", name: "Ótica Dominante — Centro", role: "Dono", initial: "C" },
  { id: "store-shopping", name: "Filial Shopping", role: "Dono", initial: "S" },
  { id: "store-zonasul", name: "Filial Zona Sul", role: "Gerente", initial: "Z" },
];

function loadStores(): Store[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORES;
    const parsed = JSON.parse(raw) as Store[];
    return parsed.length ? parsed : DEFAULT_STORES;
  } catch {
    return DEFAULT_STORES;
  }
}

function loadCurrentId(fallback: string): string {
  try {
    return localStorage.getItem(CURRENT_KEY) || fallback;
  } catch {
    return fallback;
  }
}

/** Hash determinístico estável (FNV-1a curto) para distribuir itens entre lojas. */
function hashToBucket(id: string | number, buckets: number) {
  const s = String(id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h % Math.max(1, buckets);
}

export function StoresProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>(() => loadStores());
  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(() => {
    const list = loadStores();
    return loadCurrentId(list[0]?.id ?? "");
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
    } catch {
      /* ignore */
    }
  }, [stores]);

  useEffect(() => {
    if (!currentStoreId) return;
    try {
      localStorage.setItem(CURRENT_KEY, currentStoreId);
    } catch {
      /* ignore */
    }
  }, [currentStoreId]);

  const setCurrentStoreId = useCallback((id: string) => {
    setCurrentStoreIdState(id);
  }, []);

  const addStore = useCallback<StoresContextValue["addStore"]>((input) => {
    const id = `store-${Date.now().toString(36)}`;
    const initial = input.name.trim().charAt(0).toUpperCase() || "L";
    const newStore: Store = {
      id,
      name: input.name.trim(),
      role: input.role ?? "Dono",
      initial,
    };
    setStores((prev) => [...prev, newStore]);
    setCurrentStoreIdState(id);
    return newStore;
  }, []);

  const currentStore = useMemo(
    () => stores.find((s) => s.id === currentStoreId) ?? stores[0] ?? null,
    [stores, currentStoreId]
  );

  const storeIndex = useMemo(() => {
    const idx = stores.findIndex((s) => s.id === currentStore?.id);
    return idx >= 0 ? idx : 0;
  }, [stores, currentStore]);

  const filterByCurrentStore = useCallback(
    <T extends { id?: string | number }>(items: T[]): T[] => {
      if (!stores.length) return items;
      // Loja "principal" (índice 0) recebe todos os itens — simula a base original.
      // Filiais recebem uma fatia determinística dos itens.
      if (storeIndex === 0) return items;
      const totalBuckets = stores.length;
      return items.filter((item) => {
        const key = item?.id ?? Math.random().toString(36);
        return hashToBucket(key as string | number, totalBuckets) === storeIndex;
      });
    },
    [stores, storeIndex]
  );

  const value = useMemo<StoresContextValue>(
    () => ({
      stores,
      currentStore,
      currentStoreId: currentStore?.id ?? null,
      setCurrentStoreId,
      addStore,
      filterByCurrentStore,
    }),
    [stores, currentStore, setCurrentStoreId, addStore, filterByCurrentStore]
  );

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

export function useStores() {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error("useStores must be used within StoresProvider");
  return ctx;
}
