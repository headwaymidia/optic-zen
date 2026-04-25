import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatPanel } from "@/components/ChatPanel";
import { Search, MessageSquarePlus, MessagesSquare, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CadenceCenter } from "@/components/CadenceCenter";

const INTEREST_TAG_STYLES: Record<string, string> = {
  Exame: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  Multifocal: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  Solar: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  "Lentes de Contato": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  Armação: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  Infantil: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200",
};

const SOURCE_EMOJI: Record<string, string> = {
  Instagram: "📸",
  "Google Ads": "🔎",
  WhatsApp: "💬",
  Indicação: "🤝",
  Facebook: "👍",
  "Loja Física": "🏬",
  Outro: "🔗",
};

const MOCK_PREVIEWS = [
  "Pode me passar o endereço?",
  "Boa tarde, gostaria de marcar um exame",
  "Vocês atendem amanhã?",
  "Quanto custa a armação?",
  "Obrigado!",
  "Vou confirmar e te aviso",
  "Recebi, muito obrigada 🙏",
];
const MOCK_HOURS = ["10:45", "09:12", "11:03", "08:30", "14:21", "15:48", "16:02"];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function WhatsAppPage() {
  const { leads, loading } = useLeads();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [view, setView] = useState<"conversas" | "cadencia">("conversas");

  // Deep-link: open chat for leadId from query string (e.g. coming from Tarefas)
  useEffect(() => {
    const leadIdFromUrl = searchParams.get("leadId");
    if (leadIdFromUrl && leads.some((l) => l.id === leadIdFromUrl)) {
      setSelectedId(leadIdFromUrl);
      // Clean the URL so refresh doesn't keep re-selecting
      searchParams.delete("leadId");
      setSearchParams(searchParams, { replace: true });
    }
  }, [leads, searchParams, setSearchParams]);

  const filtered = useMemo(
    () => leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [leads, search]
  );

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <aside
        className={cn(
          "w-full md:w-[30%] md:min-w-[280px] md:max-w-[400px] border-r flex flex-col bg-card",
          selected && "hidden md:flex"
        )}
      >
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-semibold">Atendimentos</h1>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contato..."
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { setNewChatSearch(""); setNewChatOpen(true); }}
                  aria-label="Nova Conversa"
                  className="shrink-0"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nova Conversa</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-muted-foreground">Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nenhum contato</p>
          )}
          {filtered.map((lead, i) => {
            const preview = MOCK_PREVIEWS[i % MOCK_PREVIEWS.length];
            const hour = MOCK_HOURS[i % MOCK_HOURS.length];
            const unread = i % 3 === 0;
            const active = selectedId === lead.id;
            return (
              <button
                key={lead.id}
                onClick={() => setSelectedId(lead.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors text-left",
                  active && "bg-muted"
                )}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {initials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{hour}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{preview}</p>
                    {unread && (
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" aria-label="Não lido" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className={cn("flex-1 flex flex-col min-w-0", !selected && "hidden md:flex")}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione um contato para iniciar a conversa
          </div>
        ) : (
          <ChatPanel lead={selected} onBack={() => setSelectedId(null)} />
        )}
      </section>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {leads
              .filter((l) => {
                const q = newChatSearch.toLowerCase().trim();
                if (!q) return true;
                return (
                  l.name.toLowerCase().includes(q) ||
                  (l.phone ?? "").toLowerCase().includes(q)
                );
              })
              .map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => {
                    setSelectedId(lead.id);
                    setNewChatOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {initials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{lead.name}</p>
                      {lead.status && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-normal text-muted-foreground border-muted px-1.5 py-0 rounded-full"
                        >
                          {lead.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      {lead.lead_source && (
                        <span aria-hidden title={`Origem: ${lead.lead_source}`}>
                          {SOURCE_EMOJI[lead.lead_source as string] ?? "🔗"}
                        </span>
                      )}
                      <span className="truncate">{lead.phone ?? "Sem telefone"}</span>
                    </p>
                    {lead.interest_tag && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                            INTEREST_TAG_STYLES[lead.interest_tag as string] ??
                              "bg-slate-100 text-slate-700"
                          )}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {lead.interest_tag}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            {leads.filter((l) => {
              const q = newChatSearch.toLowerCase().trim();
              if (!q) return true;
              return l.name.toLowerCase().includes(q) || (l.phone ?? "").toLowerCase().includes(q);
            }).length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum contato encontrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

