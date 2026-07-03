require('dotenv').config({ path: '.env.vercel.prod' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log('Querying employees and profiles...');
  const { data: eData, error: eErr } = await supabase.from('employees').select('*').limit(1);
  console.log('Employees:', eData, eErr);
  
  const { data: pData, error: pErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', pData, pErr);
}
main();
