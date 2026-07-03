-- ================================================================
-- FIX: Corrige RLS para social_contents e social_copies
-- Execute no Supabase SQL Editor
-- ================================================================

-- 1. Remove políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "client_read_own_contents"   ON social_contents;
DROP POLICY IF EXISTS "client_update_own_contents" ON social_contents;
DROP POLICY IF EXISTS "employee_insert_contents"   ON social_contents;
DROP POLICY IF EXISTS "client_read_own_copies"     ON social_copies;
DROP POLICY IF EXISTS "client_update_own_copies"   ON social_copies;
DROP POLICY IF EXISTS "employee_insert_copies"     ON social_copies;

-- 2. Política simples: qualquer usuário autenticado pode fazer tudo
--    (a separação por cliente é feita no código, não no banco)
CREATE POLICY "authenticated_all_contents"
  ON social_contents FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_all_copies"
  ON social_copies FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
