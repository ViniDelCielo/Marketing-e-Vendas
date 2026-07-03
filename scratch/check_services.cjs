const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1];
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('client_services').select('service_id').limit(100);
  if (error) {
    console.error(error);
  } else {
    const unique = [...new Set(data.map(d => d.service_id))];
    console.log(unique);
  }
}
check();
