-- =================================================================
-- Tabela: push_subscriptions
-- Armazena as subscriptions de Web Push de cada usuário logado
-- =================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Índice para buscas por usuário
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscription_updated_at();

-- RLS: cada usuário só manipula as próprias subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_own_select" ON push_subscriptions;
CREATE POLICY "push_own_select" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_own_insert" ON push_subscriptions;
CREATE POLICY "push_own_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_own_update" ON push_subscriptions;
CREATE POLICY "push_own_update" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_own_delete" ON push_subscriptions;
CREATE POLICY "push_own_delete" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Service role pode ler todas para disparar pushes
DROP POLICY IF EXISTS "push_service_select" ON push_subscriptions;
CREATE POLICY "push_service_select" ON push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');
