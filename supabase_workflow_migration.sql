-- 1. Tabela para Histórico do Workflow Global
CREATE TABLE IF NOT EXISTS public.workflow_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    workflow_id UUID, -- Opcional, para agrupar as tarefas que fazem parte do mesmo fluxo
    department TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e Politicas
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for authenticated users' AND tablename = 'workflow_history') THEN
        CREATE POLICY "Enable read for authenticated users" ON public.workflow_history FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users' AND tablename = 'workflow_history') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.workflow_history FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- 2. Modificações na tabela `department_tasks` (adicionar colunas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_tasks' AND column_name='workflow_id') THEN
        ALTER TABLE public.department_tasks ADD COLUMN workflow_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_tasks' AND column_name='parent_task_id') THEN
        ALTER TABLE public.department_tasks ADD COLUMN parent_task_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_tasks' AND column_name='sla_deadline') THEN
        ALTER TABLE public.department_tasks ADD COLUMN sla_deadline TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_tasks' AND column_name='assigned_to') THEN
        ALTER TABLE public.department_tasks ADD COLUMN assigned_to TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='department_tasks' AND column_name='stage') THEN
        ALTER TABLE public.department_tasks ADD COLUMN stage TEXT DEFAULT 'a_fazer';
    END IF;
END $$;

-- 3. Tabela para Aprovação de Cliente (Timer de 24h)
CREATE TABLE IF NOT EXISTS public.client_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL,
    task_id UUID, 
    type TEXT NOT NULL, -- Ex: 'captacao_schedule', 'post_approval'
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.client_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read for all' AND tablename = 'client_approvals') THEN
        CREATE POLICY "Enable read for all" ON public.client_approvals FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users' AND tablename = 'client_approvals') THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.client_approvals FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for all' AND tablename = 'client_approvals') THEN
        CREATE POLICY "Enable update for all" ON public.client_approvals FOR UPDATE USING (true);
    END IF;
END $$;

-- 4. Tabela para Múltiplas Configurações de WhatsApp e Chatbots do Comercial
CREATE TABLE IF NOT EXISTS public.commercial_whatsapp_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    whatsapp_number TEXT,
    provider TEXT DEFAULT 'evolution',
    api_url TEXT,
    api_key TEXT,
    instance_name TEXT,
    status TEXT DEFAULT 'disconnected',
    bot_enabled BOOLEAN DEFAULT false,
    bot_greeting TEXT,
    bot_departments JSONB DEFAULT '[]'::jsonb,
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.commercial_whatsapp_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable all for authenticated users' AND tablename = 'commercial_whatsapp_configs') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.commercial_whatsapp_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger para propagar feedbacks do cliente/Social Media de volta para a Edição
CREATE OR REPLACE FUNCTION public.propagate_client_feedback()
RETURNS TRIGGER AS $$
DECLARE
  orig_id TEXT;
  hist JSONB;
BEGIN
  IF NEW.department = 'Social Media' AND NEW.status IN ('Ajuste do Cliente', 'Refazer') THEN
    orig_id := NEW.metadata->>'original_task_id';
    IF orig_id IS NOT NULL THEN
      -- Adiciona um log no histórico da Edição
      SELECT metadata->'history' INTO hist FROM public.department_tasks WHERE id = orig_id::uuid;
      IF hist IS NULL THEN
        hist := '[]'::jsonb;
      END IF;
      hist := hist || jsonb_build_array(jsonb_build_object(
        'action', 'Retornado para ajuste (Reprovado pelo Cliente)',
        'by', 'Cliente (WhatsApp)',
        'date', timezone('utc'::text, now())
      ));

      UPDATE public.department_tasks 
      SET status = 'Refazer',
          feedback = COALESCE(NEW.feedback, 'Solicitado ajuste pelo Cliente / Social Media'),
          metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{history}', hist)
      WHERE id = orig_id::uuid AND status != 'Refazer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_propagate_client_feedback ON public.department_tasks;
CREATE TRIGGER trigger_propagate_client_feedback
AFTER UPDATE OF status ON public.department_tasks
FOR EACH ROW
EXECUTE FUNCTION public.propagate_client_feedback();
