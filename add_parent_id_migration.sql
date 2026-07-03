-- ============================================================
-- MIGRATION: Adicionar coluna parent_id em crm_pipelines
-- Necessário para o funcionamento de Sub-Funis (Kanbans empilhados)
-- ============================================================

-- Adiciona coluna parent_id (referência ao pipeline pai)
-- Se já existir, o comando não faz nada (seguro re-rodar)
ALTER TABLE public.crm_pipelines
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;

-- Índice para melhorar performance das queries de sub-funis
CREATE INDEX IF NOT EXISTS idx_crm_pipelines_parent_id ON public.crm_pipelines(parent_id);

-- Confirma
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_pipelines'
ORDER BY ordinal_position;
