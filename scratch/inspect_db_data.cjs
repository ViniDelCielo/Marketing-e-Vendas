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

async function checkData() {
  const { data: clients } = await supabase.from('clients').select('id, name, user_id').limit(3);
  console.log("Clients:", clients);
  const { data: employees } = await supabase.from('employees').select('id, name').limit(3);
  console.log("Employees:", employees);
}

checkData();
