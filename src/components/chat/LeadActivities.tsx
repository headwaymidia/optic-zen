import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadActivityTimeline } from "@/components/LeadActivityTimeline";

interface Props {
  leadId: string;
}

export function LeadActivities({ leadId }: Props) {
  const [showAll, setShowAll] = useState(false);
  return (
    <Accordion type="single" collapsible className="border-b bg-card/50">
      <AccordionItem value="activities" className="border-0">
        <AccordionTrigger className="px-3 py-2 text-xs font-medium hover:no-underline hover:bg-muted/50">
          <span className="flex items-center gap-2 flex-1 text-left">
            <History className="h-3.5 w-3.5 text-primary" />
            <span>Histórico de atividades</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3 pt-0">
          <LeadActivityTimeline leadId={leadId} embedded limit={showAll ? 50 : 5} />
          {!showAll && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowAll(true)}
              >
                Ver todas
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
