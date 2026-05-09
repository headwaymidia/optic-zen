## Objetivo

Mostrar a origem do lead (ex: "Instagram", "Facebook") por escrito dentro do card no Funil de Vendas, junto com a tag de interesse ("Exame").

## Mudança

Arquivo: `src/components/KanbanBoard.tsx`

No bloco onde já aparece a tag de interesse (`lead.interest_tag`, próximo da linha 230), adicionar uma nova "pílula" ao lado mostrando `lead.lead_source` quando existir, com:

- Emoji da origem (Instagram, Facebook, WhatsApp, etc — já existe o mapa `SOURCE_EMOJI`)
- Nome da origem escrito (ex: "Instagram")
- Visual coerente com a tag "Exame" (pílula arredondada, fonte pequena, semibold), mas com cor neutra/diferente para distinguir das tags de interesse

O ícone-emoji que hoje fica no topo direito do card (linhas 205-212) será removido, já que a informação passa a ficar visível por escrito mais abaixo — evita duplicação.

## Resultado visual

No card do lead, abaixo do telefone, aparecerá:

`[🟢 Exame]  [📷 Instagram]`

Ao invés de só `[🟢 Exame]` com um emojizinho discreto no canto superior.

Nenhuma alteração em banco, tipos ou lógica — apenas apresentação.