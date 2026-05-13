import { useState } from "react";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodKey = "today" | "7d" | "30d" | "90d" | "month" | "prev_month" | "custom";

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  from: Date;
  to: Date;
}

export function getPeriodRange(key: PeriodKey, custom?: { from?: Date; to?: Date }): PeriodRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { key, label: "Hoje", from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { key, label: "Últimos 7 dias", from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { key, label: "Últimos 30 dias", from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "90d":
      return { key, label: "Últimos 90 dias", from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case "month":
      return {
        key,
        label: `${format(now, "MMMM", { locale: ptBR })}`,
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case "prev_month": {
      const pm = subMonths(now, 1);
      return {
        key,
        label: `${format(pm, "MMMM", { locale: ptBR })}`,
        from: startOfMonth(pm),
        to: endOfMonth(pm),
      };
    }
    case "custom":
      return {
        key,
        label: "Personalizado",
        from: custom?.from ? startOfDay(custom.from) : startOfDay(subDays(now, 6)),
        to: custom?.to ? endOfDay(custom.to) : endOfDay(now),
      };
  }
}

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "month", label: "Este mês" },
];

interface Props {
  value: PeriodKey;
  customRange?: { from?: Date; to?: Date };
  onChange: (key: PeriodKey, custom?: { from?: Date; to?: Date }) => void;
}

export function PeriodFilter({ value, customRange, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>(customRange ?? {});

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      style={{ fontFamily: "'Inter','Geist Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "h-8 px-3.5 rounded-full text-[12px] font-medium transition-all",
            value === o.key
              ? "bg-zinc-100 text-[#1D1D1F] dark:bg-white/10 dark:text-white"
              : "bg-transparent text-zinc-500 hover:text-[#1D1D1F] dark:hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 px-3.5 rounded-full text-[12px] font-medium gap-1.5 transition-all inline-flex items-center",
              value === "custom"
                ? "bg-zinc-100 text-[#1D1D1F] dark:bg-white/10 dark:text-white"
                : "bg-transparent text-zinc-500 hover:text-[#1D1D1F] dark:hover:text-white"
            )}
          >
            <CalendarIcon className="h-3 w-3" strokeWidth={1.75} />
            {value === "custom" && customRange?.from && customRange?.to
              ? `${format(customRange.from, "dd/MM")} – ${format(customRange.to, "dd/MM")}`
              : "Personalizado"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: draft.from, to: draft.to }}
            onSelect={(r) => setDraft({ from: r?.from, to: r?.to })}
            numberOfMonths={2}
            locale={ptBR}
          />
          <div className="flex justify-end gap-2 p-3 border-t border-border">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              disabled={!draft.from || !draft.to}
              onClick={() => {
                onChange("custom", draft);
                setOpen(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
