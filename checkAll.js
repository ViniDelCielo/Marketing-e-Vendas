import { createClient } from '@supabase/supabase-js';
import { loadDotEnv, requireEnv } from './scripts/load-env.js';

loadDotEnv();

const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY')
);

async function checkAll() {
  const [tasks, contents, copies, whatsapp, wappMsgs] = await Promise.all([
    supabase.from('department_tasks').select('id, title, status'),
    supabase.from('social_contents').select('id, type, status, url'),
    supabase.from('social_copies').select('id, text, status'),
    supabase.from('whatsapp_approvals').select('id, status'),
    supabase.from('whatsapp_messages').select('id')
  ]);

  console.log('tasks:', tasks.data?.length || 0);
  console.log('social_contents:', contents.data?.length || 0);
  console.log('social_copies:', copies.data?.length || 0);
  console.log('whatsapp_approvals:', whatsapp.data?.length || 0);
  console.log('whatsapp_messages:', wappMsgs.data?.length || 0);

  if (contents.data && contents.data.length > 0) {
    console.log('Sample content:', contents.data[0]);
  }
}

checkAll();
