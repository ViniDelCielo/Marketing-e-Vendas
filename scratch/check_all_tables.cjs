const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'profiles',
  'employees',
  'clients',
  'department_tasks',
  'commercial_leads',
  'client_services',
  'whatsapp_approvals',
  'client_approvals',
  'workflow_history'
];

async function checkAll() {
  console.log('Checking database tables:');
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`- ${table}: Error (${error.message})`);
      } else {
        console.log(`- ${table}: Success (${count} rows)`);
      }
    } catch (e) {
      console.log(`- ${table}: Exception (${e.message})`);
    }
  }
}

checkAll();
