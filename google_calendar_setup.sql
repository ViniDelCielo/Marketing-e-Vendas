DROP TABLE IF EXISTS public.google_events;
DROP TABLE IF EXISTS public.employee_integrations;

-- 1. Tabela para salvar os tokens do Google Calendar de cada funcionário
CREATE TABLE public.employee_integrations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id uuid,
  provider varchar NOT NULL, -- ex: 'google_calendar'
  access_token text,
  refresh_token text,
  email varchar,
  connected_at timestamptz DEFAULT now(),
  last_sync timestamptz,
  UNIQUE(employee_id, provider)
);

-- 2. Tabela separada para salvar os eventos importados do Google (Opção A)
CREATE TABLE public.google_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id uuid,
  google_event_id varchar NOT NULL UNIQUE,
  title varchar NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location varchar,
  html_link varchar,
  status varchar DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Permissões RLS
ALTER TABLE public.employee_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own integrations" ON public.employee_integrations
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can manage their own integrations" ON public.employee_integrations
  FOR ALL USING (auth.uid() = employee_id);

CREATE POLICY "Users can view their own google events" ON public.google_events
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can manage their own google events" ON public.google_events
  FOR ALL USING (auth.uid() = employee_id);
