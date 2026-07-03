-- ================================================================
-- Tabelas para o Painel Social Media do Cliente
-- Execute no Supabase SQL Editor
-- ================================================================

-- 1. Conteúdos (artes, vídeos, reels, stories) para aprovação
CREATE TABLE IF NOT EXISTS social_contents (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid REFERENCES clients(id) ON DELETE CASCADE,
  title           text,
  description     text,
  type            text,           -- 'Arte' | 'Vídeo' | 'Reels' | 'Story'
  platform        text,           -- 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | 'LinkedIn'
  url             text,           -- URL do arquivo original (Storage)
  preview_url     text,           -- URL da miniatura/preview
  scheduled_date  date,           -- Data agendada para publicação
  scheduled_time  time,           -- Horário da publicação
  status          text DEFAULT 'pending_approval', -- 'pending_approval' | 'approved' | 'revision' | 'scheduled'
  approved_at     timestamptz,
  approved_by     uuid REFERENCES auth.users(id),
  metadata        jsonb DEFAULT '{}'::jsonb,       -- revision_comment, etc.
  created_at      timestamptz DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id)
);

-- 2. Copies para captação
CREATE TABLE IF NOT EXISTS social_copies (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    uuid REFERENCES clients(id) ON DELETE CASCADE,
  title        text,
  content      text,             -- Texto da copy
  type         text,             -- 'Legenda' | 'CTA' | 'Script' | 'Bio'
  platform     text,             -- 'Instagram' | 'TikTok' | 'Facebook' | etc.
  status       text DEFAULT 'pending_approval', -- 'pending_approval' | 'approved' | 'revision'
  client_notes text,             -- Feedback do cliente
  approved_at  timestamptz,
  approved_by  uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id)
);

-- 3. RLS (Row Level Security) — cliente vê apenas seus dados
ALTER TABLE social_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_copies   ENABLE ROW LEVEL SECURITY;

-- Política: clientes lêem apenas os seus conteúdos
CREATE POLICY "client_read_own_contents"
  ON social_contents FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE metadata->>'user_id' = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

-- Política: clientes podem atualizar status/approved_at dos seus conteúdos
CREATE POLICY "client_update_own_contents"
  ON social_contents FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE metadata->>'user_id' = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

-- Equipe pode inserir conteúdos
CREATE POLICY "employee_insert_contents"
  ON social_contents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

-- Mesmas políticas para social_copies
CREATE POLICY "client_read_own_copies"
  ON social_copies FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE metadata->>'user_id' = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

CREATE POLICY "client_update_own_copies"
  ON social_copies FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE metadata->>'user_id' = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

CREATE POLICY "employee_insert_copies"
  ON social_copies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE u.id = auth.uid() AND p.role IN ('owner', 'admin', 'employee')
    )
  );

-- ================================================================
-- Exemplo de dados de teste (opcional — descomente para testar)
-- ================================================================
-- INSERT INTO social_contents (client_id, title, type, platform, status, scheduled_date, description)
-- VALUES
--   ('<SEU_CLIENT_ID>', 'Post de Lançamento', 'Arte', 'Instagram', 'pending_approval', '2026-06-25', 'Arte para o lançamento da campanha de verão.'),
--   ('<SEU_CLIENT_ID>', 'Reels Tutorial', 'Reels', 'Instagram', 'pending_approval', '2026-06-27', 'Vídeo tutorial do produto principal.');
