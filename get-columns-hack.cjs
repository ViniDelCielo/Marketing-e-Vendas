const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const tables = ['profiles', 'chat_messages', 'department_tasks', 'notifications', 'push_subscriptions'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('non_existent_column_for_testing');
    if (error) {
      console.log(`Table ${table} columns:`, error.message);
    } else {
      console.log(`Table ${table} succeeded without error? (unexpected)`);
    }
  }
}

run();
