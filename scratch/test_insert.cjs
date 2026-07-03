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

async function testInsert() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'yano@yapel.net.br',
    password: 'password123'
  });

  if (authError) {
    console.error("Login failed:", authError);
    return;
  }
  const user = authData.user;
  console.log("Logged in successfully. User ID:", user.id);

  // Let's first fetch a client and employee ID to test
  const { data: clients, error: clientErr } = await supabase.from('clients').select('id, name').limit(1);
  if (clientErr) console.error("Client fetch error:", clientErr);
  else console.log("Fetched client:", clients);

  const { data: employees, error: empErr } = await supabase.from('employees').select('id, name').limit(1);
  if (empErr) console.error("Employee fetch error:", empErr);
  else console.log("Fetched employee:", employees);

  if (employees && employees.length > 0) {
    console.log("Testing insertion with employee ID as client_id...");
    const { data: testData, error: insertErr } = await supabase.from('chat_messages').insert({
      client_id: employees[0].id, // employee ID instead of client UUID
      department: 'Suporte',
      sender_id: user.id,
      sender_type: 'employee',
      sender_name: 'Test Bot',
      content: 'Teste de inserção inválida (employee como client)',
      is_internal: true
    }).select();

    if (insertErr) {
      console.log("Result (expected fail):", insertErr);
    } else {
      console.log("Result (unexpected success!):", testData);
      // clean it up
      await supabase.from('chat_messages').delete().eq('id', testData[0].id);
    }
  }

  console.log("Testing insertion with client_id = null...");
  const { data: testDataNull, error: insertNullErr } = await supabase.from('chat_messages').insert({
    client_id: null,
    department: 'Suporte',
    sender_id: user.id,
    sender_type: 'employee',
    sender_name: 'Test Bot',
    content: 'Teste de inserção nula',
    is_internal: true
  }).select();

  if (insertNullErr) {
    console.log("Result for null:", insertNullErr);
  } else {
    console.log("Result for null (success!):", testDataNull);
    // clean it up
    await supabase.from('chat_messages').delete().eq('id', testDataNull[0].id);
  }
}

testInsert();
