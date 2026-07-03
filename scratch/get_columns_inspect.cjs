const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = ['department_tasks', 'whatsapp_approvals', 'chat_messages'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('non_existent_column_for_testing');
    if (error) {
      console.log(`Table ${t} error message:`, error.message);
    }
  }
}
run();
