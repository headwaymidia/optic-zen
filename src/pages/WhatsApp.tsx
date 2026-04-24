import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/useLeads";
import { Lead } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Paperclip, Search, Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

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

function priorityVariant(p: string | null) {
  if (p === "Alta") return "destructive";
  if (p === "Média") return "default";
  return "secondary";
}

export default function WhatsAppPage() {
  const { leads, loading } = useLeads();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [leads, search]
  );

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      {/* Lista de Contatos */}
      <aside
        className={cn(
          "w-full md:w-[30%] md:min-w-[280px] md:max-w-[400px] border-r flex flex-col bg-card",
          selected && "hidden md:flex"
        )}
      >
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-semibold">Atendimentos</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="pl-9 bg-muted/50 border-0"
            />
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

      {/* Janela de Chat */}
      <section
        className={cn(
          "flex-1 flex flex-col min-w-0",
          !selected && "hidden md:flex"
        )}
      >
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecione um contato para iniciar a conversa
          </div>
        ) : (
          <ChatWindow lead={selected} onBack={() => setSelectedId(null)} onViewFunnel={() => navigate("/funil")} />
        )}
      </section>
    </div>
  );
}

function ChatWindow({ lead, onBack, onViewFunnel }: { lead: Lead; onBack: () => void; onViewFunnel: () => void }) {
  const messages = [
    { from: "lead", text: `Olá, gostaria de agendar um exame de vista.`, time: "10:30" },
    { from: "us", text: `Olá ${lead.name.split(" ")[0]}! Claro, temos horários disponíveis amanhã. 😊`, time: "10:32" },
    { from: "lead", text: "Tem horário pela manhã?", time: "10:34" },
    { from: "us", text: "Sim! Posso agendar às 9h ou 10h30. Qual prefere?", time: "10:35" },
    { from: "lead", text: "10h30 está ótimo. Pode me passar o endereço?", time: "10:45" },
  ];

  return (
    <>
      <header className="h-16 border-b bg-card px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials(lead.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{lead.name}</p>
            {lead.priority && (
              <Badge variant={priorityVariant(lead.priority) as any} className="text-[10px] h-5">
                {lead.priority}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{lead.phone ?? "—"} · {lead.status}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onViewFunnel}>
          Ver no Funil
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/40 px-4 py-6 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "us" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm text-sm",
                m.from === "us"
                  ? "bg-green-100 text-foreground rounded-br-sm dark:bg-green-900/40"
                  : "bg-card text-foreground rounded-bl-sm"
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t bg-card p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" type="button">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" type="button">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Input
          placeholder="Digite sua mensagem..."
          className="flex-1 bg-muted/50 border-0"
        />
        <Button size="icon" className="bg-green-600 hover:bg-green-700 text-white">
          <Send className="h-4 w-4" />
        </Button>
      </footer>
    </>
  );
}
