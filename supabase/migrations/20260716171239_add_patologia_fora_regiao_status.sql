-- Adiciona "Patologia" e "Fora de Região" aos status permitidos da tabela leads.
-- Sem isto, o banco rejeitava mover lead para as novas colunas ("Erro ao mover lead").
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
CHECK (status = ANY (ARRAY[
  'Novo Lead'::text, 'Em Atendimento'::text, 'Aguardando Resposta'::text,
  'Agendou Exame'::text, 'Não Compareceu'::text, 'Compareceu e Comprou'::text,
  'Compareceu e Não Comprou'::text, 'Em Negociação'::text, 'Repescagem'::text,
  'Patologia'::text, 'Fora de Região'::text
]));
