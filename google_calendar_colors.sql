-- Adicionar a coluna color_id na tabela google_events para armazenar a cor do Google Calendar
ALTER TABLE public.google_events ADD COLUMN IF NOT EXISTS color_id varchar;
