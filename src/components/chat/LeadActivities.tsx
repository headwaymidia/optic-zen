import { LeadActivityTimeline } from "@/components/LeadActivityTimeline";

interface Props {
  leadId: string;
}

export function LeadActivities({ leadId }: Props) {
  return <LeadActivityTimeline leadId={leadId} />;
}
