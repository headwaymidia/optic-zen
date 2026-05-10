import { Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatPhoneBR(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function PhoneLink({
  phone,
  className,
  iconClassName,
  showIcon = true,
  format = true,
  stopPropagation = true,
}: {
  phone: string | null | undefined;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
  format?: boolean;
  stopPropagation?: boolean;
}) {
  if (!phone) return null;
  const display = format ? formatPhoneBR(phone) : phone;

  async function handleClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    if (isMobile()) {
      window.location.href = `tel:${phone}`;
      return;
    }
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(phone!);
      toast({ title: "Número copiado!", description: display });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  }

  return (
    <a
      href={`tel:${phone}`}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1 hover:underline text-foreground",
        className
      )}
    >
      {showIcon && (
        <Phone className={cn("h-3.5 w-3.5 text-emerald-600 shrink-0", iconClassName)} />
      )}
      <span>{display}</span>
    </a>
  );
}
