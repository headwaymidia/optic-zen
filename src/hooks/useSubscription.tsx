import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useStores } from "@/hooks/useStores";

export interface Subscription {
  id: string;
  store_id: string;
  plan: string;
  billing_cycle: "monthly" | "annual" | string;
  status: "trial" | "active" | "cancelled" | "expired" | string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface Ctx {
  subscription: Subscription | null;
  loading: boolean;
  trialDaysLeft: number | null;
  isTrialExpired: boolean;
  isActive: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<Ctx | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentStoreId } = useStores();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(async () => {
    if (!currentStoreId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("store_id", currentStoreId)
      .maybeSingle();
    setSubscription((data as Subscription | null) ?? null);
    setLoading(false);
  }, [currentStoreId]);

  useEffect(() => {
    fetchSub();
  }, [fetchSub]);

  let trialDaysLeft: number | null = null;
  if (subscription?.status === "trial" && subscription.trial_ends_at) {
    const ms = new Date(subscription.trial_ends_at).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  const isTrialExpired =
    subscription?.status === "trial" &&
    !!subscription.trial_ends_at &&
    new Date(subscription.trial_ends_at).getTime() < Date.now();

  const isActive = subscription?.status === "active";

  return (
    <SubscriptionContext.Provider
      value={{ subscription, loading, trialDaysLeft, isTrialExpired, isActive, refetch: fetchSub }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
