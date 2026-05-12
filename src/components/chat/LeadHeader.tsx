import { ArrowLeft, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneLink } from "@/components/PhoneLink";
import { Lead, LEAD_STATUSES, LeadStatus } from "@/lib/supabase";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function priorityVariant(p: string | null) {
  if (p === "Alta") return "destructive";
  if (p === "Média") return "default";
  return "secondary";
}

interface Props {
  lead: Lead;
  onBack?: () => void;
  onClose?: () => void;
  onStatusChange: (next: LeadStatus) => void;
}

export function LeadHeader({ lead, onBack, onClose, onStatusChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      {onBack && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials(lead.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{lead.name}</p>
          {lead.priority && (
            <Badge variant={priorityVariant(lead.priority) as any} className="text-[10px] h-4 px-1.5">
              {lead.priority}
            </Badge>
          )}
        </div>
        {lead.phone ? (
          <PhoneLink phone={lead.phone} className="text-[11px] text-muted-foreground" iconClassName="h-3 w-3" />
        ) : (
          <p className="text-[11px] text-muted-foreground truncate">—</p>
        )}
      </div>
      <Select value={lead.status} onValueChange={(v) => onStatusChange(v as LeadStatus)}>
        <SelectTrigger className="h-8 w-[110px] sm:w-[150px] text-xs shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onClose && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Fechar chat">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
