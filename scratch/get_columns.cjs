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

async function testGetColumns() {
  const { data, error } = await supabase.from('client_approvals').select('*').limit(1);
  if (error) {
    console.log("Error querying client_approvals:", error);
  } else {
    console.log("Query succeeded! client_approvals exists, columns:", data.length > 0 ? Object.keys(data[0]) : "No rows");
  }
}

testGetColumns();
