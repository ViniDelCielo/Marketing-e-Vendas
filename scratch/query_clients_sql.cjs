const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@roiexpert.com',
    password: 'ROIexpert@2024'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }
  console.log('Login successful! Fetching clients...');

  const { data: clients, error: err } = await supabase
    .from('clients')
    .select('id, name, email, document, status, metadata');

  if (err) {
    console.error('Error fetching clients:', err.message);
    return;
  }

  console.log(`Fetched ${clients.length} clients:`);
  console.log(JSON.stringify(clients, null, 2));
}
run();
