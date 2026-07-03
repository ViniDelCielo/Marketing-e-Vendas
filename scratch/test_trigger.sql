BEGIN;

-- 1. Insert chat message
INSERT INTO public.chat_messages (client_id, department, sender_id, sender_name, sender_type, content, is_internal)
VALUES (
  '955edd77-676d-421b-91b4-b2e621ec87d0',
  'Social Media',
  'f73b4d18-912a-4243-b1c9-53f8dfcd3506',
  'Vinícius Del Cielo (Teste)',
  'employee',
  'Olá Pouseu! Mensagem de teste para verificar trigger.',
  false
);

-- 2. Check generated notifications for client (user_id = 'ee8d555c-dc26-427f-b751-63d6541877ad')
SELECT id, user_id, title, description, type, created_at FROM public.notifications 
WHERE user_id = 'ee8d555c-dc26-427f-b751-63d6541877ad' 
ORDER BY created_at DESC LIMIT 2;

-- 3. Insert task with status "Aguardando Cliente"
INSERT INTO public.department_tasks (client_id, department, title, description, status, metadata)
VALUES (
  '955edd77-676d-421b-91b4-b2e621ec87d0',
  'Social Media',
  'Arte de Teste para Aprovação',
  'Descrição da arte de teste.',
  'Agendado',
  '{}'::jsonb
);

-- 4. Check generated notifications for client again
SELECT id, user_id, title, description, type, created_at FROM public.notifications 
WHERE user_id = 'ee8d555c-dc26-427f-b751-63d6541877ad' 
ORDER BY created_at DESC LIMIT 2;

-- We rollback so we don't write anything permanent to the DB
ROLLBACK;
