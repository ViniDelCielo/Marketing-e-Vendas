-- Limpar tabelas antigas se existirem para evitar conflito de tipos de chaves (TEXT vs UUID)
DROP TABLE IF EXISTS public.crm_leads CASCADE;
DROP TABLE IF EXISTS public.crm_pipeline_columns CASCADE;
DROP TABLE IF EXISTS public.crm_pipelines CASCADE;

-- 1. Tabela de Pipelines
CREATE TABLE public.crm_pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'kanban',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_pipelines
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access for all' AND tablename = 'crm_pipelines') THEN
        CREATE POLICY "Enable all access for all" ON public.crm_pipelines FOR ALL USING (true);
    END IF;
END $$;

-- 2. Tabela de Colunas/Etapas do Funil
CREATE TABLE public.crm_pipeline_columns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pipeline_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.crm_pipeline_columns ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_pipeline_columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access for all' AND tablename = 'crm_pipeline_columns') THEN
        CREATE POLICY "Enable all access for all" ON public.crm_pipeline_columns FOR ALL USING (true);
    END IF;
END $$;

-- 3. Tabela de Leads
CREATE TABLE public.crm_leads (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    company TEXT,
    source TEXT,
    status TEXT NOT NULL,
    venda NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_leads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all access for all' AND tablename = 'crm_leads') THEN
        CREATE POLICY "Enable all access for all" ON public.crm_leads FOR ALL USING (true);
    END IF;
END $$;

-- Inserir funil padrão se não existir
INSERT INTO public.crm_pipelines (id, name, type, order_index)
VALUES ('funil', 'Funil de Vendas', 'kanban', 0)
ON CONFLICT (id) DO NOTHING;

-- Inserir visualização "Todos os Leads" padrão se não existir
INSERT INTO public.crm_pipelines (id, name, type, order_index)
VALUES ('todos-os-leads', 'Todos os Leads', 'list', 1)
ON CONFLICT (id) DO NOTHING;

-- Inserir colunas padrão do funil se não existirem
INSERT INTO public.crm_pipeline_columns (pipeline_id, name, position)
SELECT 'funil', name_val, pos_val
FROM (
    VALUES 
        ('Nova Consulta', 0),
        ('Qualificado', 1),
        ('Chamada Agendada', 2),
        ('Preparando Proposta', 3),
        ('Proposta Enviada', 4),
        ('Acompanhamento', 5),
        ('Negociação', 6),
        ('Fatura Enviada', 7)
) AS t(name_val, pos_val)
WHERE NOT EXISTS (
    SELECT 1 FROM public.crm_pipeline_columns WHERE pipeline_id = 'funil'
);

-- ==========================================
-- TABELA DE SESSÕES DO WHATSAPP (MOCKUP/DISPAROS)
-- ==========================================
DROP TABLE IF EXISTS public.crm_whatsapp_sessions CASCADE;

CREATE TABLE public.crm_whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aguardando QR Code',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.crm_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas para crm_whatsapp_sessions
CREATE POLICY "Enable all access for all for sessions" ON public.crm_whatsapp_sessions FOR ALL USING (true);

