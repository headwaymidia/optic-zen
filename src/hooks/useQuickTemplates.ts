import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuickTemplate {
  id: string;
  store_id: string;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATES = [
  {
    title: "Boas-vindas",
    body: "Olá, {nome}! 👋 Tudo bem? Vi que você entrou em contato conosco. Posso te ajudar a encontrar o óculos perfeito para você!",
    sort_order: 0,
  },
  {
    title: "Agendar exame",
    body: "Oi, {nome}! Que tal marcarmos seu exame de vista? Temos horários disponíveis esta semana. Qual período fica melhor pra você — manhã ou tarde?",
    sort_order: 1,
  },
  {
    title: "Pedir receita",
    body: "Olá, {nome}! Para fazer um orçamento preciso para você, poderia me enviar uma foto da sua receita? 📋",
    sort_order: 2,
  },
  {
    title: "Confirmar exame",
    body: "Oi, {nome}! Passando para confirmar seu exame de vista agendado conosco. Está tudo certo? 😊",
    sort_order: 3,
  },
  {
    title: "Orçamento especial",
    body: "Olá, {nome}! Tenho uma condição especial para você hoje, aprovada pelo gerente. Podemos conversar? 🎯",
    sort_order: 4,
  },
];

export function useQuickTemplates(storeId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["quick-templates", storeId];

  const { data: templates = [], isLoading } = useQuery({
    queryKey,
    enabled: !!storeId,
    queryFn: async (): Promise<QuickTemplate[]> => {
      const { data, error } = await supabase
        .from("quick_templates")
        .select("*")
        .eq("store_id", storeId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuickTemplate[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Semeia templates padrão se a loja não tiver nenhum
  const seedDefaults = useCallback(async () => {
    if (!storeId) return;
    const { count } = await supabase
      .from("quick_templates")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if ((count ?? 0) > 0) return;
    await supabase.from("quick_templates").insert(
      DEFAULT_TEMPLATES.map((t) => ({ ...t, store_id: storeId }))
    );
    invalidate();
  }, [storeId, invalidate]);

  const addTemplate = useCallback(
    async (title: string, body: string) => {
      if (!storeId) return;
      const maxOrder = templates.length > 0
        ? Math.max(...templates.map((t) => t.sort_order)) + 1
        : 0;
      const { error } = await supabase
        .from("quick_templates")
        .insert({ store_id: storeId, title: title.trim(), body: body.trim(), sort_order: maxOrder });
      if (!error) invalidate();
      return error;
    },
    [storeId, templates, invalidate]
  );

  const updateTemplate = useCallback(
    async (id: string, patch: Partial<Pick<QuickTemplate, "title" | "body" | "sort_order">>) => {
      const { error } = await supabase
        .from("quick_templates")
        .update(patch)
        .eq("id", id);
      if (!error) invalidate();
      return error;
    },
    [invalidate]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("quick_templates")
        .delete()
        .eq("id", id);
      if (!error) invalidate();
      return error;
    },
    [invalidate]
  );

  // Substitui variáveis {nome}, {loja} no corpo da mensagem
  const applyTemplate = useCallback(
    (body: string, vars: Record<string, string>) => {
      return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
    },
    []
  );

  return {
    templates,
    loading: isLoading,
    seedDefaults,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
  };
}
