const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN metadata::text LIKE '%asaas_id%' OR metadata::text LIKE '%asaasId%' THEN 1 ELSE 0 END) as asaas_clients,
      SUM(CASE WHEN metadata::text NOT LIKE '%asaas_id%' AND metadata::text NOT LIKE '%asaasId%' OR metadata IS NULL THEN 1 ELSE 0 END) as agency_clients
    FROM clients;
  `;
  
  console.log('Querying client statistics via SQL...');
  let { data, error } = await supabase.rpc('exec_sql', { sql: sql });
  if (error) {
     console.log('exec_sql error:', error.message);
     let res2 = await supabase.rpc('execute_sql', { sql_string: sql });
     if (res2.error) {
       console.log('execute_sql error:', res2.error.message);
     } else {
       console.log('Result (execute_sql):', res2.data);
     }
  } else {
    console.log('Result (exec_sql):', data);
  }
}
run();
