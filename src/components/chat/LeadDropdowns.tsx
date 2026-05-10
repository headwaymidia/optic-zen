import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { humanizeError } from "@/lib/error-handler";
import { useLeads } from "@/hooks/useLeads";
import { useStores } from "@/hooks/useStores";
import { INTEREST_TAGS, LEAD_SOURCES, Lead, supabase } from "@/lib/supabase";

interface Props {
  lead: Lead;
}

export function LeadDropdowns({ lead }: Props) {
  const { refetch } = useLeads();
  const { currentStoreId } = useStores();
  const [salespeople, setSalespeople] = useState<{ id: string; name: string }[]>([]);
  const [leadFields, setLeadFields] = useState({
    lead_source: lead.lead_source as string | null,
    interest_tag: lead.interest_tag as string | null,
    responsible_id: lead.responsible_id,
  });

  useEffect(() => {
    setLeadFields({
      lead_source: lead.lead_source as string | null,
      interest_tag: lead.interest_tag as string | null,
      responsible_id: lead.responsible_id,
    });
  }, [lead.id, lead.lead_source, lead.interest_tag, lead.responsible_id]);

  useEffect(() => {
    if (!currentStoreId) {
      setSalespeople([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: members, error } = await supabase
        .from("store_members")
        .select("user_id, role")
        .eq("store_id", currentStoreId);

      if (cancelled) return;
      if (error) {
        toast({ title: "Erro ao carregar vendedoras", description: humanizeError(error), variant: "destructive" });
        setSalespeople([]);
        return;
      }

      const userIds = Array.from(new Set((members ?? []).map((m: any) => m.user_id).filter(Boolean)));
      if (userIds.length === 0) {
        setSalespeople([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (cancelled) return;
      const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      setSalespeople(
        userIds.map((id) => {
          const profile: any = profileById.get(id);
          const name = String(profile?.full_name ?? profile?.email ?? id).trim();
          return { id, name: name || id };
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStoreId]);

  const saveLeadDropdownField = async (
    field: "lead_source" | "interest_tag" | "responsible_id",
    value: string | null
  ) => {
    if (!currentStoreId) return;
    const previous = leadFields;
    const patch = { [field]: value } as Pick<Lead, typeof field>;

    setLeadFields((prev) => ({ ...prev, [field]: value }));

    const { data, error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", lead.id)
      .eq("store_id", currentStoreId)
      .select("lead_source, interest_tag, responsible_id")
      .single();

    if (error) {
      setLeadFields(previous);
      toast({ title: "Erro ao atualizar lead", description: humanizeError(error), variant: "destructive" });
      await refetch();
      return;
    }

    setLeadFields({
      lead_source: (data?.lead_source as string | null) ?? null,
      interest_tag: (data?.interest_tag as string | null) ?? null,
      responsible_id: (data?.responsible_id as string | null) ?? null,
    });
    await refetch();
  };

  const baseTrigger = "h-7 flex-1 text-[11px] transition-colors duration-200";
  const okTrigger =
    "border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-50 focus:ring-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200";
  const pendingTrigger =
    "border-red-500 text-red-600 bg-red-50 hover:bg-red-50 focus:ring-red-500 dark:bg-red-950/30 dark:text-red-300";
  const sourceOk = !!leadFields.lead_source;
  const interestOk = !!leadFields.interest_tag;
  const assignedOk = !!leadFields.responsible_id;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={leadFields.lead_source || "__none__"}
        onValueChange={(v) =>
          saveLeadDropdownField("lead_source", v === "__none__" ? null : v)
        }
      >
        <SelectTrigger className={cn(baseTrigger, sourceOk ? okTrigger : pendingTrigger)}>
          <SelectValue placeholder="Origem do Lead" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">— Sem origem —</SelectItem>
          {LEAD_SOURCES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={leadFields.interest_tag || "__none__"}
        onValueChange={(v) =>
          saveLeadDropdownField("interest_tag", v === "__none__" ? null : v)
        }
      >
        <SelectTrigger className={cn(baseTrigger, interestOk ? okTrigger : pendingTrigger)}>
          <SelectValue placeholder="Tipo de Atendimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">— Sem tag —</SelectItem>
          {INTEREST_TAGS.map((t) => (
            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={leadFields.responsible_id || "__none__"}
        onValueChange={(v) =>
          saveLeadDropdownField("responsible_id", v === "__none__" ? null : v)
        }
      >
        <SelectTrigger className={cn(baseTrigger, assignedOk ? okTrigger : pendingTrigger)}>
          <SelectValue placeholder="Vendedora" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__" className="text-xs">— Sem vendedora —</SelectItem>
          {salespeople.map((seller) => (
            <SelectItem key={seller.id} value={seller.id} className="text-xs">{seller.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
