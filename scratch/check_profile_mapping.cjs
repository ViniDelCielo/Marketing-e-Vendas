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

async function checkProfileMapping() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, role, employee_id, client_uuid').limit(5);
  if (error) {
    console.error("Profiles query error:", error);
  } else {
    console.log("Profiles Mapping:", profiles);
  }
}

checkProfileMapping();
