import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUSES, Lead, LeadStatus, supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Clock, Calendar, ShoppingBag } from "lucide-react";

const HIGHLIGHTS: { status: LeadStatus | "Total"; label: string; icon: any; color: string }[] = [
  { status: "Total", label: "Total de leads", icon: Users, color: "text-primary" },
  { status: "Novo Lead", label: "Novo Lead", icon: UserPlus, color: "text-blue-600" },
  { status: "Aguardando Resposta", label: "Aguardando Resposta", icon: Clock, color: "text-amber-600" },
  { status: "Agendou Exame", label: "Agendou Exame", icon: Calendar, color: "text-purple-600" },
  { status: "Compareceu e Comprou", label: "Compareceu e Comprou", icon: ShoppingBag, color: "text-emerald-600" },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("company_id", profile.company_id);
      setLeads((data ?? []) as Lead[]);
      setLoading(false);
    })();
  }, [profile?.company_id]);

  const counts = (s: LeadStatus | "Total") =>
    s === "Total" ? leads.length : leads.filter((l) => l.status === s).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos seus leads.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {HIGHLIGHTS.map((h) => (
          <Card key={h.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{h.label}</CardTitle>
              <h.icon className={`h-4 w-4 ${h.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "—" : counts(h.status)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por etapa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {LEAD_STATUSES.map((s) => {
            const count = counts(s);
            const total = leads.length || 1;
            const pct = (count / total) * 100;
            return (
              <div key={s} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
