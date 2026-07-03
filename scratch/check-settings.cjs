const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  console.log('Querying system_settings...');
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) {
    console.error('Error fetching system_settings:', error);
  } else {
    console.log('System Settings in Database:');
    data.forEach(row => {
      console.log(`- ${row.key}:`, JSON.stringify(row.value, null, 2));
    });
  }
}

checkSettings();
