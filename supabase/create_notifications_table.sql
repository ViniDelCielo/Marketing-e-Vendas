-- =====================================================================
-- 1. CRIAR TABELA DE NOTIFICAÇÕES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL,
  description  text,
  type         text NOT NULL, -- 'chat' | 'task' | 'sla' | 'handoff' | 'client_status'
  related_id   text,          -- ID do recurso associado (ex: chat_messages.id, department_tasks.id)
  is_read      boolean DEFAULT false NOT NULL,
  is_cleared   boolean DEFAULT false NOT NULL,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Índices de performance para busca rápida de notificações ativas do usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_uncleared 
  ON public.notifications(user_id, is_read, is_cleared);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS)
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated_insert_notifications" ON public.notifications;
CREATE POLICY "authenticated_insert_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);


-- =====================================================================
-- 2. TRIGGER PARA NOVAS MENSAGENS DE CHAT
-- =====================================================================
CREATE OR REPLACE FUNCTION public.on_chat_message_inserted()
RETURNS TRIGGER AS $$
DECLARE
  var_recipient_id uuid;
  var_staff_rec RECORD;
  var_cli_user_id uuid;
  var_is_p2p boolean := false;
  var_sender_name text;
BEGIN
  -- Ignorar mensagens internas (não expostas ao cliente)
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  -- Nome do remetente formatado
  var_sender_name := COALESCE(NEW.sender_name, 'Alguém');

  -- Caso 1: Mensagem enviada por um CLIENTE
  IF NEW.sender_type = 'client' THEN
    -- Notifica funcionários do departamento correspondente + admins/owners
    FOR var_staff_rec IN 
      SELECT id FROM public.profiles 
      WHERE (dept = NEW.department OR role IN ('owner', 'admin'))
        AND id != NEW.sender_id
    LOOP
      INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
      VALUES (
        var_staff_rec.id,
        'Mensagem de ' || var_sender_name,
        NEW.department || ': ' || CASE WHEN length(NEW.content) > 60 THEN substring(NEW.content from 1 for 60) || '...' ELSE COALESCE(NEW.content, 'Anexo') END,
        'chat',
        NEW.client_id::text,
        jsonb_build_object(
          'client_id', NEW.client_id,
          'department', NEW.department,
          'url', '/admin-chats?client=' || NEW.client_id::text || '&dept=' || NEW.department
        )
      );
    END LOOP;

  -- Caso 2: Mensagem enviada por um FUNCIONÁRIO/COLABORADOR
  ELSE
    -- 1. Verifica se o destinatário é um colaborador (P2P chat)
    SELECT id INTO var_recipient_id 
    FROM public.profiles 
    WHERE employee_id::text = NEW.client_id::text;

    IF var_recipient_id IS NOT NULL THEN
      var_is_p2p := true;
    END IF;

    -- Se for P2P (para outro colaborador)
    IF var_is_p2p THEN
      IF var_recipient_id != NEW.sender_id THEN
        -- Busca o employee_id do remetente
        DECLARE
          var_sender_emp_id text;
        BEGIN
          SELECT employee_id INTO var_sender_emp_id FROM public.profiles WHERE id = NEW.sender_id;
          
          INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
          VALUES (
            var_recipient_id,
            'Mensagem de ' || var_sender_name,
            'Chat Equipe: ' || CASE WHEN length(NEW.content) > 60 THEN substring(NEW.content from 1 for 60) || '...' ELSE COALESCE(NEW.content, 'Anexo') END,
            'chat',
            NEW.client_id::text,
            jsonb_build_object(
              'p2p', true,
              'sender_employee_id', var_sender_emp_id,
              'url', '/chat-interno?client=' || COALESCE(var_sender_emp_id, '')
            )
          );
        END;
      END IF;
    -- Se for mensagem de colaborador para o cliente
    ELSE
      SELECT id INTO var_cli_user_id 
      FROM public.profiles 
      WHERE client_uuid::text = NEW.client_id::text;

      IF var_cli_user_id IS NOT NULL AND var_cli_user_id != NEW.sender_id THEN
        INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
        VALUES (
          var_cli_user_id,
          'Mensagem da Agência',
          'Chat: ' || CASE WHEN length(NEW.content) > 60 THEN substring(NEW.content from 1 for 60) || '...' ELSE COALESCE(NEW.content, 'Anexo') END,
          'chat',
          NEW.client_id::text,
          jsonb_build_object(
            'client_id', NEW.client_id,
            'url', '/meu-chat?dept=' || NEW.department
          )
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_chat_message_inserted ON public.chat_messages;
CREATE TRIGGER trg_on_chat_message_inserted
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.on_chat_message_inserted();


-- =====================================================================
-- 3. TRIGGER PARA TAREFAS (HANDOFFS, CS E APROVAÇÕES DO CLIENTE)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.on_task_updated_or_inserted()
RETURNS TRIGGER AS $$
DECLARE
  var_staff_rec RECORD;
  var_cli_user_id uuid;
  var_dest_dept text;
  var_client_name text;
BEGIN
  -- Busca o nome do cliente
  SELECT name INTO var_client_name FROM public.clients WHERE id = NEW.client_id;

  -- 1. Handoffs pendentes (quando entra Em Revisão com waiting_handoff e sent_to_department)
  IF NEW.status = 'Em Revisão' 
     AND (NEW.metadata->>'waiting_handoff')::boolean = true 
     AND NEW.metadata->>'sent_to_department' IS NOT NULL 
  THEN
    var_dest_dept := NEW.metadata->>'sent_to_department';
    
    FOR var_staff_rec IN 
      SELECT id FROM public.profiles 
      WHERE (dept = var_dest_dept OR role IN ('owner', 'admin'))
    LOOP
      INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
      VALUES (
        var_staff_rec.id,
        'Novo Material p/ ' || var_dest_dept,
        'Recebido de ' || NEW.department || ' para o cliente ' || COALESCE(var_client_name, 'Desconhecido') || '.',
        'handoff',
        NEW.id::text,
        jsonb_build_object(
          'client_id', NEW.client_id,
          'url', '/' || CASE 
            WHEN var_dest_dept = 'Social Media' THEN 'social-media'
            WHEN var_dest_dept = 'Tráfego Pago' THEN 'trafego'
            WHEN var_dest_dept = 'Edição' THEN 'edicao'
            WHEN var_dest_dept = 'Captação' THEN 'captacao'
            WHEN var_dest_dept = 'Design' THEN 'design'
            ELSE 'dashboard'
          END || '?client=' || NEW.client_id::text || '&task=' || NEW.id::text
        )
      );
    END LOOP;
  END IF;

  -- 2. Tarefas delegadas pelo CS (status 'A Fazer' e assigned_by 'Sucesso do Cliente')
  IF NEW.status = 'A Fazer' 
     AND NEW.metadata->>'assigned_by' = 'Sucesso do Cliente' 
     AND (TG_OP = 'INSERT' OR OLD.metadata->>'assigned_by' IS DISTINCT FROM NEW.metadata->>'assigned_by')
  THEN
    FOR var_staff_rec IN 
      SELECT id FROM public.profiles 
      WHERE (dept = NEW.department OR role IN ('owner', 'admin'))
    LOOP
      INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
      VALUES (
        var_staff_rec.id,
        'Demanda de Sucesso do Cliente',
        'Nova solicitação para ' || NEW.department || ' (' || COALESCE(var_client_name, 'Desconhecido') || ').',
        'task',
        NEW.id::text,
        jsonb_build_object(
          'client_id', NEW.client_id,
          'url', '/' || CASE 
            WHEN NEW.department = 'Social Media' THEN 'social-media'
            WHEN NEW.department = 'Tráfego Pago' THEN 'trafego'
            WHEN NEW.department = 'Edição' THEN 'edicao'
            WHEN NEW.department = 'Captação' THEN 'captacao'
            WHEN NEW.department = 'Design' THEN 'design'
            ELSE 'dashboard'
          END || '?client=' || NEW.client_id::text || '&task=' || NEW.id::text
        )
      );
    END LOOP;
  END IF;

  -- 3. Aprovações e Retrabalhos do Cliente
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) 
     AND NEW.status IN ('Aprovado', 'Refazer', 'Alteração Solicitada')
  THEN
    -- Se for aprovado pelo cliente, notifica a equipe do departamento
    IF NEW.status = 'Aprovado' THEN
      FOR var_staff_rec IN 
        SELECT id FROM public.profiles 
        WHERE (dept = NEW.department OR role IN ('owner', 'admin'))
      LOOP
        INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
        VALUES (
          var_staff_rec.id,
          '✅ Aprovado pelo Cliente',
          'O cliente ' || COALESCE(var_client_name, 'Desconhecido') || ' aprovou "' || COALESCE(NEW.title, 'Tarefa') || '".',
          'task',
          NEW.id::text,
          jsonb_build_object(
            'client_id', NEW.client_id,
            'url', '/' || CASE 
              WHEN NEW.department = 'Social Media' THEN 'social-media'
              WHEN NEW.department = 'Tráfego Pago' THEN 'trafego'
              WHEN NEW.department = 'Edição' THEN 'edicao'
              WHEN NEW.department = 'Captação' THEN 'captacao'
              WHEN NEW.department = 'Design' THEN 'design'
              ELSE 'dashboard'
            END || '?client=' || NEW.client_id::text || '&task=' || NEW.id::text
          )
        );
      END LOOP;
    -- Se for alteração solicitada ou refazer, notifica a equipe
    ELSE
      FOR var_staff_rec IN 
        SELECT id FROM public.profiles 
        WHERE (dept = NEW.department OR role IN ('owner', 'admin'))
      LOOP
        INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
        VALUES (
          var_staff_rec.id,
          '❌ Ajuste Solicitado',
          'O cliente ' || COALESCE(var_client_name, 'Desconhecido') || ' solicitou alteração em "' || COALESCE(NEW.title, 'Tarefa') || '".',
          'task',
          NEW.id::text,
          jsonb_build_object(
            'client_id', NEW.client_id,
            'url', '/' || CASE 
              WHEN NEW.department = 'Social Media' THEN 'social-media'
              WHEN NEW.department = 'Tráfego Pago' THEN 'trafego'
              WHEN NEW.department = 'Edição' THEN 'edicao'
              WHEN NEW.department = 'Captação' THEN 'captacao'
              WHEN NEW.department = 'Design' THEN 'design'
              ELSE 'dashboard'
            END || '?client=' || NEW.client_id::text || '&task=' || NEW.id::text
          )
        );
      END LOOP;
    END IF;
  END IF;

  -- 4. Notificar Cliente sobre Demanda Aguardando Aprovação
  IF NEW.status = 'Agendado' 
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    -- Encontra o id do perfil (auth user) do cliente correspondente
    SELECT id INTO var_cli_user_id 
    FROM public.profiles 
    WHERE client_uuid::text = NEW.client_id::text;

    IF var_cli_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, description, type, related_id, metadata)
      VALUES (
        var_cli_user_id,
        'Aprovação Pendente: ' || NEW.department,
        'Você tem um novo material aguardando sua aprovação: "' || COALESCE(NEW.title, 'Tarefa') || '".',
        'task',
        NEW.id::text,
        jsonb_build_object(
          'client_id', NEW.client_id,
          'url', '/meu-portal?task=' || NEW.id::text
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_task_updated_or_inserted ON public.department_tasks;
CREATE TRIGGER trg_on_task_updated_or_inserted
  AFTER INSERT OR UPDATE ON public.department_tasks
  FOR EACH ROW EXECUTE FUNCTION public.on_task_updated_or_inserted();

-- =====================================================================
-- 4. TRIGGER PARA ENVIAR NOTIFICAÇÃO PUSH AUTOMATICAMENTE
-- =====================================================================
CREATE OR REPLACE FUNCTION public.on_notification_inserted_send_push()
RETURNS TRIGGER AS $$
DECLARE
  var_payload jsonb;
  var_result text;
BEGIN
  var_payload := jsonb_build_object(
    'userId', NEW.user_id,
    'title', NEW.title,
    'body', COALESCE(NEW.description, ''),
    'url', COALESCE(NEW.metadata->>'url', 'https://SEU_DOMINIO.vercel.app')
  );

  -- SUBSTITUA antes de executar no seu projeto:
  -- url: https://SEU_REF.supabase.co/functions/v1/send-push
  -- apikey / Authorization: sua VITE_SUPABASE_ANON_KEY (Settings → API)
  SELECT net.http_post(
    url := 'https://SEU_REF.supabase.co/functions/v1/send-push'::text,
    body := var_payload,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'SUA_ANON_KEY_AQUI',
      'Authorization', 'Bearer SUA_ANON_KEY_AQUI'
    )::jsonb
  ) INTO var_result;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_notification_inserted_send_push ON public.notifications;
CREATE TRIGGER trg_on_notification_inserted_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.on_notification_inserted_send_push();
