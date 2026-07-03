const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const sql = `
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND table_schema = 'public';
  `;
  
  let { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
    console.log('exec_sql error:', error.message);
    let res2 = await supabase.rpc('execute_sql', { sql_string: sql });
    if (res2.error) {
      console.log('execute_sql error:', res2.error.message);
    } else {
      console.log('Columns using execute_sql:', res2.data);
    }
  } else {
    console.log('Columns using exec_sql:', data);
  }
}

inspect();
