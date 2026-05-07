import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  ArrowRight,
  CalendarClock,
  Search,
} from "lucide-react";
import { LeadsProvider, useLeads } from "@/hooks/useLeads";
import { Lead, SALESPEOPLE } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ViewMode = "month" | "week" | "day";

type EventType = "exam" | "lab_ready" | "return_overdue" | "return_soon";

interface AgendaEvent {
  id: string;
  date: Date;
  type: EventType;
  lead: Lead;
  label: string;
  isPast: boolean;
}

const TYPE_STYLES: Record<EventType, { bg: string; dot: string; label: string }> = {
  exam: {
    bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
    label: "Exame agendado",
  },
  lab_ready: {
    bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    label: "Pronto no laboratório",
  },
  return_overdue: {
    bg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
    label: "Retorno vencido",
  },
  return_soon: {
    bg: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border-yellow-500/30",
    dot: "bg-yellow-500",
    label: "Retorno próximo",
  },
};

function buildEvents(leads: Lead[]): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  const now = new Date();
  const in30 = addDays(now, 30);
  for (const l of leads) {
    if (l.exam_date) {
      const d = parseISO(l.exam_date);
      out.push({
        id: `${l.id}-exam`,
        date: d,
        type: "exam",
        lead: l,
        label: l.name,
        isPast: d < now,
      });
    }
    if (l.lab_status === "Pronto no laboratório") {
      const d = parseISO(l.updated_at);
      out.push({
        id: `${l.id}-lab`,
        date: d,
        type: "lab_ready",
        lead: l,
        label: l.name,
        isPast: d < now,
      });
    }
    if (l.next_return_date) {
      const d = parseISO(l.next_return_date);
      if (d < now) {
        out.push({ id: `${l.id}-ret-o`, date: d, type: "return_overdue", lead: l, label: l.name, isPast: true });
      } else if (d <= in30) {
        out.push({ id: `${l.id}-ret-s`, date: d, type: "return_soon", lead: l, label: l.name, isPast: false });
      }
    }
  }
  return out;
}

function AgendaInner() {
  const navigate = useNavigate();
  const { leads, updateLead } = useLeads();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [filterSeller, setFilterSeller] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState<Date | undefined>();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const allEvents = useMemo(() => buildEvents(leads), [leads]);
  const events = useMemo(
    () =>
      filterSeller === "all"
        ? allEvents
        : allEvents.filter((e) => e.lead.assigned_to === filterSeller),
    [allEvents, filterSeller]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const ev of events) {
      const key = format(ev.date, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

  function nav(dir: number) {
    if (view === "month") setCursor(addMonths(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(addDays(cursor, dir));
  }

  const title = format(cursor, view === "day" ? "d 'de' MMMM yyyy" : "MMMM yyyy", { locale: ptBR });

  function openEvent(ev: AgendaEvent) {
    setSelectedEvent(ev);
    setReschedDate(ev.date);
  }

  async function reschedule() {
    if (!selectedEvent || !reschedDate) return;
    await updateLead(selectedEvent.lead.id, { exam_date: reschedDate.toISOString() } as any);
    setReschedOpen(false);
    setSelectedEvent(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => nav(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold capitalize">{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterSeller} onValueChange={setFilterSeller}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Vendedora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as vendedoras</SelectItem>
              {SALESPEOPLE.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="inline-flex rounded-md border border-input p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1 text-sm rounded-sm transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
          <Button onClick={() => setScheduleOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Agendar
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(TYPE_STYLES) as EventType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", TYPE_STYLES[t].dot)} />
            {TYPE_STYLES[t].label}
          </span>
        ))}
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-7 bg-muted/50 text-xs font-medium text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(110px,1fr)]">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              return (
                <div
                  key={key}
                  className={cn(
                    "border-t border-l border-border p-1.5 flex flex-col gap-1 overflow-hidden",
                    !inMonth && "bg-muted/30 text-muted-foreground"
                  )}
                >
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "text-xs h-6 w-6 inline-flex items-center justify-center rounded-full",
                        isToday(day) && "bg-emerald-500 text-white font-semibold"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => openEvent(ev)}
                        className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded border truncate text-left",
                          TYPE_STYLES[ev.type].bg,
                          ev.isPast && "opacity-50"
                        )}
                        title={`${ev.label} — ${TYPE_STYLES[ev.type].label}`}
                      >
                        {ev.type === "exam" && format(ev.date, "HH:mm") + " "}
                        {ev.label}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted/50 text-xs">
            <div />
            {weekDays.map((d) => (
              <div key={d.toISOString()} className="px-2 py-2 text-center">
                <div className="text-muted-foreground">
                  {format(d, "EEE", { locale: ptBR })}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium inline-flex items-center justify-center h-7 w-7 rounded-full mt-0.5",
                    isToday(d) && "bg-emerald-500 text-white"
                  )}
                >
                  {format(d, "d")}
                </div>
              </div>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {hours.map((h) => (
              <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-t border-border">
                <div className="px-2 py-2 text-xs text-muted-foreground text-right">
                  {String(h).padStart(2, "0")}:00
                </div>
                {weekDays.map((d) => {
                  const slotEvents = events.filter(
                    (ev) =>
                      ev.type === "exam" &&
                      isSameDay(ev.date, d) &&
                      ev.date.getHours() === h
                  );
                  return (
                    <button
                      key={d.toISOString() + h}
                      onClick={() => {
                        if (slotEvents[0]) openEvent(slotEvents[0]);
                        else {
                          const dt = new Date(d);
                          dt.setHours(h, 0, 0, 0);
                          setCursor(dt);
                          setScheduleOpen(true);
                        }
                      }}
                      className="min-h-[48px] border-l border-border p-1 hover:bg-muted/40 text-left"
                    >
                      {slotEvents.map((ev) => (
                        <span
                          key={ev.id}
                          className={cn(
                            "block text-[11px] px-1.5 py-0.5 rounded border truncate",
                            TYPE_STYLES[ev.type].bg,
                            ev.isPast && "opacity-50"
                          )}
                        >
                          {ev.label}
                        </span>
                      ))}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {hours.map((h) => {
            const slotEvents = events.filter(
              (ev) => isSameDay(ev.date, cursor) && (ev.type !== "exam" || ev.date.getHours() === h)
            ).filter(ev => ev.type === "exam" ? ev.date.getHours() === h : h === 7);
            return (
              <div key={h} className="flex gap-3 p-3">
                <div className="w-16 text-sm text-muted-foreground">
                  {String(h).padStart(2, "0")}:00
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  {slotEvents.length === 0 && (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                  {slotEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => openEvent(ev)}
                      className={cn(
                        "text-left rounded border px-3 py-2 hover:opacity-90",
                        TYPE_STYLES[ev.type].bg
                      )}
                    >
                      <div className="font-medium">{ev.lead.name}</div>
                      <div className="text-xs opacity-80 flex flex-wrap gap-x-3">
                        {ev.lead.phone && <span>{ev.lead.phone}</span>}
                        <span>{TYPE_STYLES[ev.type].label}</span>
                        {ev.lead.assigned_to && <span>• {ev.lead.assigned_to}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Modal */}
      <Dialog open={!!selectedEvent && !reschedOpen} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.lead.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={TYPE_STYLES[selectedEvent.type].bg}>
                    {TYPE_STYLES[selectedEvent.type].label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {format(selectedEvent.date, "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                {selectedEvent.lead.phone && (
                  <a
                    href={`tel:${selectedEvent.lead.phone}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" /> {selectedEvent.lead.phone}
                  </a>
                )}
                {selectedEvent.lead.assigned_to && (
                  <div className="text-muted-foreground">
                    Vendedora: <span className="text-foreground">{selectedEvent.lead.assigned_to}</span>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setReschedOpen(true)}>
                  <CalendarClock className="h-4 w-4 mr-1" /> Remarcar
                </Button>
                <Button
                  onClick={() => {
                    navigate(`/whatsapp?leadId=${selectedEvent.lead.id}`);
                    setSelectedEvent(null);
                  }}
                >
                  Ir para o atendimento <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule */}
      <Dialog open={reschedOpen} onOpenChange={setReschedOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remarcar exame</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={reschedDate}
            onSelect={setReschedDate}
            className={cn("p-3 pointer-events-auto")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedOpen(false)}>Cancelar</Button>
            <Button onClick={reschedule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        leads={leads}
        onSchedule={async (leadId, date) => {
          await updateLead(leadId, { exam_date: date.toISOString() } as any);
          setScheduleOpen(false);
        }}
      />
    </div>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  leads,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leads: Lead[];
  onSchedule: (leadId: string, date: Date) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads.slice(0, 8);
    return leads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) || (l.phone ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [leads, search]);

  function reset() {
    setSearch("");
    setLeadId(null);
    setDate(undefined);
    setTime("09:00");
  }

  async function submit() {
    if (!leadId || !date) return;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    await onSchedule(leadId, d);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar exame</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Buscar lead</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou telefone"
                className="pl-8"
              />
            </div>
            <div className="mt-2 max-h-40 overflow-auto border border-border rounded-md divide-y divide-border">
              {filtered.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">Nenhum lead encontrado.</div>
              )}
              {filtered.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLeadId(l.id)}
                  className={cn(
                    "w-full text-left p-2 hover:bg-muted text-sm",
                    leadId === l.id && "bg-primary/10"
                  )}
                >
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.phone}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {date ? format(date, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hora</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!leadId || !date}>Agendar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Agenda() {
  return <AgendaInner />;
}
