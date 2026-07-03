const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert into clients...');
  const { data, error } = await supabase.from('clients').insert({
    name: "Cliente Teste",
    phone: "5511999999999",
    email: "teste@teste.com",
    status: "active"
  }).select();
  
  if (error) {
    console.error('Insert client failed:', error);
  } else {
    console.log('Insert client successful:', data);
  }
}

testInsert();
