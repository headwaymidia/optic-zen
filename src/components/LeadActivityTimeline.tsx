import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  Sparkles,
  ArrowRightLeft,
  Eye,
  CalendarClock,
  UserCheck,
  Beaker,
  StickyNote,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createReconnectingChannel } from "@/lib/realtime-channel";
import { cn } from "@/lib/utils";
import { DataSkeleton } from "@/components/ui/DataSkeleton";

type ActivityRow = {
  id: string;
  lead_id: string;
  type: string;
  description: string;
  created_at: string;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Sparkles,
  status_changed: ArrowRightLeft,
  prescription: Eye,
  exam_scheduled: CalendarClock,
  assigned: UserCheck,
  lab_status: Beaker,
  note: StickyNote,
};

const COLORS: Record<string, string> = {
  created: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
  status_changed: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  prescription: "text-violet-600 bg-violet-50 dark:bg-violet-950",
  exam_scheduled: "text-amber-600 bg-amber-50 dark:bg-amber-950",
  assigned: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
  lab_status: "text-pink-600 bg-pink-50 dark:bg-pink-950",
  note: "text-slate-600 bg-slate-100 dark:bg-slate-800",
};

export function LeadActivityTimeline({
  leadId,
  embedded = false,
  limit = 10,
}: {
  leadId: string;
  embedded?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("lead_activities")
        .select("id, lead_id, type, description, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (active && data) setItems(data as ActivityRow[]);
      if (active) setLoading(false);
    }
    load();

    const handle = createReconnectingChannel({
      name: `lead_activities:${leadId}`,
      onResubscribe: () => load(),
      setup: (ch) => ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_activities", filter: `lead_id=eq.${leadId}` },
        () => load()
      ),
    });

    return () => {
      active = false;
      handle.remove();
    };
  }, [leadId, limit]);

  const body = loading ? (
    <DataSkeleton variant="row" count={3} />
  ) : items.length === 0 ? (
    <p className="text-[11px] text-muted-foreground">Nenhuma atividade registrada ainda.</p>
  ) : (
    <ol className="relative space-y-2.5 pl-3 before:absolute before:left-[7px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
      {items.map((a) => {
        const Icon = ICONS[a.type] ?? Activity;
        return (
          <li key={a.id} className="relative flex gap-2.5 items-start">
            <span
              className={cn(
                "absolute -left-3 mt-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-card",
                COLORS[a.type] ?? "text-muted-foreground bg-muted"
              )}
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
            <div className="ml-3 min-w-0">
              <p className="text-xs leading-snug">{a.description}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(a.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );

  if (embedded) return body;

  return (
    <div className="border-b bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Histórico de atividades</span>
      </div>
      {body}
    </div>
  );
}
