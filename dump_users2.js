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

  const resEmployees = await fetch(`${supabaseUrl}/rest/v1/employees?select=id,name`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const employees = await resEmployees.json();

  fs.writeFileSync('db_dump2.json', JSON.stringify({profiles, employees}, null, 2));
  console.log('done');
}
run();
