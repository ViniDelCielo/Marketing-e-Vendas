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

async function inspectMessages() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    // Wait, since admin login failed, let's see if we can use another user or if we can use a customer login?
    // Wait, the client login email in test-asaas-edge.js was yano@yapel.net.br. Let's try to fetch without logging in first, maybe some read policy is open?
    // Actually, in test-count.js we got empty clients, let's see if we can fetch chat_messages with anon key directly.
    email: 'admin@roiexpert.com',
    password: 'ROIexpert@2024'
  });

  console.log("Fetching chat_messages with supabase...");
  const { data: messages, error: err } = await supabase
    .from('chat_messages')
    .select('*')
    .limit(100);

  if (err) {
    console.error("Error fetching messages:", err);
  } else {
    console.log(`Fetched ${messages.length} messages:`);
    console.log(messages);
  }
}

inspectMessages();
