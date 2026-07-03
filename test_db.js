import fs from 'fs';

const dotEnvStr = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for(const line of dotEnvStr.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

async function run() {
  const resProfiles = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,name,employee_id`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const profiles = await resProfiles.json();

  console.log(profiles);
}
run();
