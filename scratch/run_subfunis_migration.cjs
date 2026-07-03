const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    ALTER TABLE public.crm_pipelines 
    ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;
  `;
  
  console.log('Running migration...');
  let { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
    console.log('exec_sql error:', error.message);
    let res2 = await supabase.rpc('execute_sql', { sql_string: sql });
    if (res2.error) {
      console.log('execute_sql error:', res2.error.message);
    } else {
      console.log('Sucesso com execute_sql!');
    }
  } else {
    console.log('Sucesso com exec_sql!');
  }
}

run();
