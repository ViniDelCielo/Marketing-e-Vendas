-- ATUALIZAÇÃO RLS PARA A AGENDA GLOBAL
-- Executar no SQL Editor do Supabase para permitir acesso ao calendário global.

-- 1. Permite que QUALQUER USUÁRIO leia os eventos do ID Global
CREATE POLICY "Todos podem ver eventos globais" ON public.google_events
  FOR SELECT USING (employee_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 2. Permite que QUALQUER USUÁRIO (ou admins se configurado) gerencie os eventos globais (necessário para que a Edge Function / App atualize via service role ou token)
-- A Edge Function já ignora RLS porque usa o SERVICE_ROLE_KEY, mas por garantia:
CREATE POLICY "Gerenciar eventos globais" ON public.google_events
  FOR ALL USING (employee_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- 3. Permite leitura/escrita da integração global na employee_integrations
CREATE POLICY "Todos podem ler integração global" ON public.employee_integrations
  FOR SELECT USING (employee_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Admins podem atualizar integração global" ON public.employee_integrations
  FOR ALL USING (employee_id = '00000000-0000-0000-0000-000000000000'::uuid);
