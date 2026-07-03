const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync('.env', 'utf8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const clientUuid = '955edd77-676d-421b-91b4-b2e621ec87d0'; // Pouseu
  const senderId = 'f73b4d18-912a-4243-b1c9-53f8dfcd3506'; // Vinicius

  console.log('--- 1. Testing Chat Message Trigger ---');
  console.log('Inserting a temporary test chat message...');
  const { data: msgData, error: msgError } = await supabase.from('chat_messages').insert({
    client_id: clientUuid,
    department: 'Social Mídia',
    sender_id: senderId,
    sender_name: 'Vinícius Del Cielo (Teste)',
    sender_type: 'employee',
    content: 'Olá Pouseu! Isto é um teste automatizado da agência.',
    is_internal: false
  }).select().single();

  if (msgError) {
    console.error('Chat message insert failed:', msgError.message);
    return;
  }
  console.log('Inserted Message ID:', msgData.id);

  // Wait a short moment for the trigger to run
  await new Promise(r => setTimeout(r, 1500));

  console.log('Checking notifications table for the client...');
  // We can't query notifications directly if we don't have client's session, 
  // but wait! We can run a linked query via Supabase CLI to see all notifications for Pouseu!
  // So we will execute a query via CLI right after this.
  
  // Clean up message
  console.log('Cleaning up chat message...');
  await supabase.from('chat_messages').delete().eq('id', msgData.id);
}

test();
