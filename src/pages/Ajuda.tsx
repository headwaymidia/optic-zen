import { MessageCircle, LifeBuoy, Play, MessageSquare, LayoutGrid, CheckSquare, Calendar, BarChart2, Trophy, Settings, Wifi, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const WHATSAPP_URL = "https://wa.me/5522974017994";

const MODULES = [
  { icon: MessageSquare, color: "bg-emerald-500", title: "Atendimentos", route: "/whatsapp", desc: "Central de mensagens do WhatsApp", steps: ["As mensagens chegam automaticamente quando o WhatsApp está conectado", "Clique em um contato para abrir a conversa e responder", "Use os scripts prontos do Método OD clicando no ícone ⚡ no chat", "Filtre por status ou vendedora no topo da lista", "A busca encontra contatos por nome ou número de telefone"] },
  { icon: LayoutGrid, color: "bg-blue-500", title: "Funil de Vendas", route: "/funil", desc: "Kanban visual de todos os leads", steps: ["Cada coluna representa uma etapa do processo de venda", "Arraste o card pelo ícone ⠿ no canto superior direito para mover entre colunas", "Clique no card para abrir a conversa do cliente", "Use as abas Follow-up 1, 2, 3 para ver leads que precisam de contato", "'Esfriando' aparece quando o lead ficou sem resposta por mais de 2 horas"] },
  { icon: CheckSquare, color: "bg-purple-500", title: "Tarefas", route: "/tarefas", desc: "Leads que precisam de atenção agora", steps: ["Leads quentes: clientes que mandaram mensagem e não foram respondidos", "Oportunidades: leads em Repescagem com retorno agendado para hoje", "Clique em 'Atender' para ir direto para a conversa", "Use 'Adiar' para remarcar o contato para amanhã ou próxima semana", "Follow-up: leads que precisam de acompanhamento pela cadência"] },
  { icon: Calendar, color: "bg-orange-500", title: "Agenda", route: "/agenda", desc: "Exames e retornos agendados", steps: ["Visualize todos os exames agendados no calendário mensal", "Clique em um dia para ver os exames daquele dia", "Clique no evento para remarcar ou cancelar o exame", "Retornos previstos também aparecem na agenda", "Use o sino 🔔 no card do cliente para enviar lembrete automático"] },
  { icon: BarChart2, color: "bg-cyan-500", title: "Dashboard", route: "/", desc: "Métricas e performance da loja", steps: ["Filtre por período: Hoje, 7 dias, 30 dias ou personalizado", "Total de leads: todos que tiveram atividade no período", "Faturamento: soma das vendas registradas no período", "Velocidade de atendimento: tempo médio entre lead chegar e ser respondido", "Retornos este mês: clientes com retorno previsto nos próximos 30 dias"] },
  { icon: Trophy, color: "bg-yellow-500", title: "Ranking", route: "/ranking", desc: "Performance de cada vendedora", steps: ["Veja o ranking de vendas de toda a equipe", "Filtre por período para comparar semanas ou meses", "Clique em uma vendedora para ver os detalhes das vendas dela", "O modo TV mostra o ranking em tela cheia para motivar a equipe"] },
  { icon: Wifi, color: "bg-green-500", title: "WhatsApp", route: "/whatsapp", desc: "Conexão e configuração do WhatsApp", steps: ["Clique em 'Conectar WhatsApp' para gerar o QR Code", "Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo", "Aponte a câmera para o QR Code na tela", "O status muda para 'Conectado' — as mensagens chegam automaticamente", "Se desconectar, repita o processo de escanear o QR Code"] },
  { icon: Users, color: "bg-pink-500", title: "Equipe", route: "/configuracoes", desc: "Gerenciar vendedoras e membros", steps: ["Vá em Configurações → Membros → Convidar Usuário", "Informe o e-mail e cargo (Dono, Gerente ou Vendedor)", "Clique em Gerar Convite e envie o link para a pessoa", "Ela cria a conta e já terá acesso à loja", "Vendedoras sem conta podem ser adicionadas em Vendedoras da Filial"] },
  { icon: Settings, color: "bg-slate-500", title: "Configurações", route: "/configuracoes", desc: "Dados da loja e personalização", steps: ["Defina o horário de funcionamento da loja", "Configure o Pixel do Meta para rastrear conversões dos anúncios", "Gerencie membros: convide, altere cargos ou remova acessos", "Adicione vendedoras sem conta para o dropdown de responsável", "Veja os logs de atividade do WhatsApp para diagnosticar problemas"] },
];

const PRIMEIRO_PASSOS = [
  { step: "1", title: "Crie sua conta", desc: "Faça o cadastro com e-mail e senha. O período de teste de 14 dias começa automaticamente." },
  { step: "2", title: "Configure sua loja", desc: "Informe o nome da loja, cidade e tamanho da equipe no onboarding." },
  { step: "3", title: "Conecte o WhatsApp", desc: "Vá em WhatsApp no menu lateral e escaneie o QR Code com seu celular." },
  { step: "4", title: "Convide sua equipe", desc: "Em Configurações → Membros, gere links de convite para as vendedoras." },
  { step: "5", title: "Ative as notificações", desc: "Quando o navegador pedir permissão, clique em 'Permitir' para receber alertas." },
  { step: "6", title: "Comece a atender", desc: "As mensagens chegam automaticamente em Atendimentos. Responda usando os scripts do Método OD." },
];

const faqs = [
  { q: "Como adiciono um novo lead?", a: "Clique em '+ Novo Lead' no menu lateral. Preencha nome e telefone e salve. O lead aparecerá no Funil na coluna 'Novo Lead'." },
  { q: "Como funciona o período de teste?", a: "Você tem 14 dias gratuitos com acesso completo. Após esse período, escolha um plano para continuar. Nenhum dado é perdido." },
  { q: "Como convido minha equipe?", a: "Vá em Configurações → Membros → Convidar Usuário. Cole o link gerado e envie para o colaborador." },
  { q: "Como funciona o alerta de retorno?", a: "Quando uma receita é salva, o sistema calcula o próximo retorno (1 ano depois). 30 dias antes, o lead volta para Repescagem." },
  { q: "Posso usar em mais de uma loja?", a: "Sim. No menu lateral clique no seletor de filial e crie uma nova loja. Cada loja tem dados isolados e equipe própria." },
  { q: "O que é 'Esfriando' no Funil?", a: "Aparece quando o lead ficou mais de 2 horas sem resposta. É um alerta para retomar o contato antes de perder a venda." },
  { q: "Como funciona o Follow-up?", a: "Leads em 'Em Atendimento' sem resposta aparecem nas abas Follow-up do Funil, indicando que precisam de contato." },
  { q: "Meus dados são seguros?", a: "Sim. O CRM usa criptografia e isolamento total por loja. Nenhuma loja acessa dados de outra." },
  { q: "Como cancelo minha assinatura?", a: "Entre em contato com nosso suporte pelo WhatsApp. O cancelamento é feito em menos de 5 minutos." },
];

export default function Ajuda() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <LifeBuoy className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Central de Ajuda</h1>
        </div>
        <p className="text-muted-foreground">Aprenda a usar o CRM e tire suas dúvidas.</p>
      </header>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">Precisa de ajuda agora?</p>
          <p className="text-sm text-muted-foreground">Nossa equipe responde em poucos minutos.</p>
        </div>
        <Button onClick={() => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
          <MessageCircle className="h-4 w-4" />
          Falar com suporte
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-emerald-500" />
          Primeiros passos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRIMEIRO_PASSOS.map((item) => (
            <div key={item.step} className="rounded-xl border bg-card p-4 flex gap-3 items-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">{item.step}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Como usar cada tela</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <button key={mod.title} onClick={() => setActiveModule(activeModule === mod.title ? null : mod.title)}
              className={cn("rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md", activeModule === mod.title && "ring-2 ring-emerald-500")}>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-white", mod.color)}>
                  <mod.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{mod.desc}</p>
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", activeModule === mod.title && "rotate-90")} />
              </div>
              {activeModule === mod.title && (
                <div className="mt-3 space-y-2 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                  {mod.steps.map((step, i) => (
                    <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <Button size="sm" className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8" onClick={() => navigate(mod.route)}>
                    Ir para {mod.title}
                  </Button>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="rounded-xl border bg-card px-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-foreground text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="rounded-xl border bg-muted/30 p-6 text-center space-y-3">
        <p className="text-foreground font-medium">Não encontrou o que procurava?</p>
        <Button onClick={() => window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <MessageCircle className="h-4 w-4" />
          Falar com suporte
        </Button>
      </footer>
    </div>
  );
}
