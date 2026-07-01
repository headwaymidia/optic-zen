-- CAUSA RAIZ do "mensagens/leads nao atualizam em tempo real" (01/07/2026):
-- a tabela leads PERDEU o REPLICA IDENTITY FULL e a publicacao supabase_realtime
-- em algum momento. Sem isso o banco nao emite eventos de mudanca de leads, entao
-- nenhum realtime do frontend funciona (lead novo nao aparece, badge nao sobe).
-- whatsapp_messages estava ok; leads e notifications tinham caido.

ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='leads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
