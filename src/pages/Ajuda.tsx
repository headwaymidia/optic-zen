import { MessageCircle, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const WHATSAPP_URL = "https://wa.me/5522974017994";

const faqs = [
  {
    q: "Como adiciono um novo lead?",
    a: "Clique em '+ Novo Lead' no menu lateral. Preencha nome e telefone e clique em salvar. O lead aparecerá automaticamente no Funil de vendas na coluna 'Novo Lead'.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "Você tem 14 dias gratuitos com acesso completo a todas as funcionalidades. Após esse período, escolha um plano para continuar. Nenhum dado é perdido.",
  },
  {
    q: "Como convido minha equipe?",
    a: "Vá em Configurações → Equipe → Convidar funcionário. Cole o link gerado e envie para o colaborador. Ele criará a conta e já terá acesso à sua loja.",
  },
  {
    q: "Como funciona o alerta de retorno do cliente?",
    a: "Quando uma receita é salva, o sistema calcula automaticamente a data do próximo retorno (1 ano depois). 30 dias antes, o lead volta para o funil em 'Repescagem' e aparece no Dashboard em 'Retornos este mês'.",
  },
  {
    q: "Posso usar em mais de uma loja?",
    a: "Sim. No menu lateral clique no seletor de filial e adicione uma nova loja. Cada loja tem seus dados isolados e sua própria equipe.",
  },
  {
    q: "Como cancelo minha assinatura?",
    a: "Entre em contato com nosso suporte pelo WhatsApp. O cancelamento é feito em menos de 5 minutos e você mantém acesso até o fim do período pago.",
  },
  {
    q: "Meus dados são seguros?",
    a: "Sim. O CRM usa Supabase com criptografia e isolamento total por loja via Row Level Security. Nenhuma loja acessa dados de outra.",
  },
];

export default function Ajuda() {
  const openWhats = () => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <LifeBuoy className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Central de Ajuda</h1>
        </div>
        <p className="text-muted-foreground">Tire suas dúvidas ou fale com nosso suporte.</p>
      </header>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Precisa de ajuda agora?</p>
          <p className="text-sm text-muted-foreground">Nossa equipe responde em poucos minutos.</p>
        </div>
        <Button
          onClick={openWhats}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com suporte no WhatsApp
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="rounded-xl border bg-card px-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-foreground">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="rounded-xl border bg-muted/30 p-6 text-center space-y-3">
        <p className="text-foreground font-medium">Não encontrou o que procurava?</p>
        <Button onClick={openWhats} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <MessageCircle className="h-4 w-4" />
          Falar com suporte
        </Button>
      </footer>
    </div>
  );
}
