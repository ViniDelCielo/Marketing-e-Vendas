const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    SELECT json_build_object(
      'profiles', (SELECT json_agg(p) FROM (SELECT id, role, email, dept, employee_id, client_uuid FROM public.profiles) p),
      'clients', (SELECT json_agg(c) FROM (SELECT id, name, metadata FROM public.clients) c),
      'notifications_count', (SELECT count(*) FROM public.notifications),
      'recent_notifications', (SELECT json_agg(n) FROM (SELECT id, user_id, title, description, type, is_read, created_at FROM public.notifications ORDER BY created_at DESC LIMIT 10) n),
      'recent_chat_messages', (SELECT json_agg(m) FROM (SELECT id, client_id, department, sender_id, sender_name, sender_type, content, is_internal, created_at FROM public.chat_messages ORDER BY created_at DESC LIMIT 10) m)
    ) as result;
  `;
  let { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
     console.log('exec_sql error:', error.message);
     let res2 = await supabase.rpc('execute_sql', { sql_string: sql });
     if (res2.error) {
       console.log('execute_sql error:', res2.error.message);
     } else {
       console.log('Result from execute_sql:', JSON.stringify(res2.data, null, 2));
     }
  } else {
    console.log('Result:', JSON.stringify(data, null, 2));
  }
}
run();
