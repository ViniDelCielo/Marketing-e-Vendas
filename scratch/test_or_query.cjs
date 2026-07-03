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

async function testQuery() {
  const userId = '00000000-0000-0000-0000-000000000000'; // dummy UUID
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, client_id, sender_type')
    .or(`sender_type.eq.client,and(client_id.eq.${userId},sender_type.eq.employee)`)
    .limit(1);

  if (error) {
    console.error("Query failed:", error);
  } else {
    console.log("Query succeeded! Data:", data);
  }
}

testQuery();
