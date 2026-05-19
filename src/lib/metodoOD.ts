// Roteiros do Método OD extraídos do mapa mental de treinamento
export interface MetodoScript {
  id: string;
  label: string;
  body: string;
}

export interface MetodoEtapa {
  id: string;
  emoji: string;
  title: string;
  scripts: MetodoScript[];
}

export const METODO_OD: MetodoEtapa[] = [
  {
    id: "apresentacao",
    emoji: "👋",
    title: "Apresentação",
    scripts: [
      {
        id: "ap1",
        label: "Com nome do cliente",
        body: "Bom dia {nome}, tudo bem? Aqui é {vendedora} da {loja} e vou fazer seu atendimento! 😊",
      },
      {
        id: "ap2",
        label: "Sem nome (pedir nome)",
        body: "Bom dia, tudo bem? Aqui é {vendedora} da {loja}, qual seu nome?",
      },
    ],
  },
  {
    id: "personalizacao",
    emoji: "🎯",
    title: "Personalização",
    scripts: [
      {
        id: "pe1",
        label: "Preferência de canal",
        body: "{nome}, como você prefere ser atendido(a)? Por mensagem, áudio ou ligação?",
      },
    ],
  },
  {
    id: "coleta",
    emoji: "📋",
    title: "Coleta de Informação",
    scripts: [
      {
        id: "co1",
        label: "Tem receita?",
        body: "{nome}, você já possui a receita?",
      },
      {
        id: "co2",
        label: "Já usa óculos?",
        body: "Perfeito! E você já utiliza óculos, {nome}?",
      },
      {
        id: "co3",
        label: "Preferência de armação",
        body: "Tem alguma preferência por armações? Acetato? Metal? Gosta do seu visual hoje?",
      },
      {
        id: "co4",
        label: "Dores / sintomas",
        body: "{nome}, você tem sentido dores de cabeça ultimamente? Ardência nos olhos? Passa muito tempo em tela — computador, celular, televisão?",
      },
      {
        id: "co5",
        label: "Experiência com óculos anterior",
        body: "E {nome}, qual foi sua experiência com seu último óculos? Conseguiu se adaptar? O que você não gostou neles?",
      },
      {
        id: "co6",
        label: "Mostrar armações",
        body: "Entendi {nome}! Vamos encontrar a armação perfeita pro seu rosto juntos. Posso te mandar algumas fotos de armações que temos aqui e que acho que vão combinar perfeitamente com você?",
      },
      {
        id: "co7",
        label: "Gatilho de escassez (armação)",
        body: "Olha, essa aqui eu só tenho essa na loja — é bem exclusiva! 😉",
      },
    ],
  },
  {
    id: "agendamento",
    emoji: "🗓",
    title: "Agendamento",
    scripts: [
      {
        id: "ag1",
        label: "Pitch de agendamento (exame)",
        body: "{nome}, entendi perfeitamente suas dores. Com os anúncios estamos tendo muita procura e estamos com vagas limitadas para a consulta. Hoje eu só teria 2 horários — às 10h e às 15h. Fica bom pra você?",
      },
      {
        id: "ag2",
        label: "Pitch de agendamento (loja)",
        body: "{nome}, entendi perfeitamente o que você precisa. Para um atendimento personalizado estamos agendando horários para os clientes virem até a loja. Estamos com vagas limitadas — hoje eu teria às 10h e às 15h. Fica bom pra você? Aí escolhemos juntos a armação perfeita pro seu rosto! 😊",
      },
      {
        id: "ag3",
        label: "Confirmação do agendamento",
        body: "Perfeito {nome}! Agendado. Qualquer imprevisto pode me avisar aqui, tá? Como as vagas são limitadas, a falta sem aviso pode tirar a vaga de outra pessoa. Vou te encaminhar a localização do nosso endereço e uma horinha antes te mando uma mensagem confirmando. Qualquer dúvida só me chamar! 😊",
      },
      {
        id: "ag4",
        label: "Cliente não pode no horário",
        body: "Quando ficaria melhor pra você, {nome}?",
      },
    ],
  },
  {
    id: "followup",
    emoji: "🔁",
    title: "Follow-up",
    scripts: [
      {
        id: "fu1",
        label: "Follow-up 1 (mesmo dia, tarde)",
        body: "Boa tarde {nome}, tudo bem? Vi que você entrou em contato — posso te ajudar?",
      },
      {
        id: "fu2",
        label: "Follow-up 2 (24h depois)",
        body: "Bom dia {nome}, tudo bem? Ainda consigo te ajudar a encontrar a solução perfeita! 😊",
      },
      {
        id: "fu3",
        label: "Follow-up 3 (2 dias depois)",
        body: "Fala {nome}, tudo bem? Você nos enviou mensagem com interesse em fazer um óculos — já resolveu? Posso te ajudar?",
      },
      {
        id: "fu4",
        label: "Follow-up 4 (3 dias depois)",
        body: "Imagino que está corrido e que não conseguiu me responder ainda, {nome}. Assim que ficar mais tranquilo, estou aqui para te ajudar a resolver o desconforto que você está sentindo e escolher a armação perfeita pro seu rosto. Fico no aguardo! 😊",
      },
    ],
  },
];
