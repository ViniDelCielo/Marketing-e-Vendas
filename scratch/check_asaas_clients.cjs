const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying all clients using exec_sql (to bypass RLS and see reality)...');
  
  // Since we don't have direct SQL client, let's see if we can use an open table, or if there is another way.
  // Wait, let's try a direct query on clients. Since we are using anon key, maybe it returns empty because of RLS.
  // But let's check if we can query from a table that doesn't have RLS, or if there's any config.
  // Wait! Let's check system_settings first to see if we can read anything.
  const { data: clients, error } = await supabase.from('clients').select('*');
  console.log('Direct query clients length:', clients ? clients.length : null);
  console.log('Direct query error:', error ? error.message : null);
}
run();
