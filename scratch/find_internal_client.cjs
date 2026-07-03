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

async function findClient() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@roiexpert.com',
    password: 'ROIexpert@2024'
  });

  if (authError) {
    // If admin login failed, let's try selecting clients anyway (maybe RLS is open for authenticated users, but wait, who are we logged in as?)
    console.error("Login failed:", authError);
    return;
  }
  
  console.log("Logged in! Searching clients...");
  const { data: allClients, error: err } = await supabase.from('clients').select('id, name, company, email');
  if (err) {
    console.error("Error fetching clients:", err);
    return;
  }
  
  console.log(`Found ${allClients.length} clients:`);
  allClients.forEach(c => {
    console.log(`- ID: ${c.id} | Name: ${c.name} | Company: ${c.company} | Email: ${c.email}`);
  });
}

findClient();
