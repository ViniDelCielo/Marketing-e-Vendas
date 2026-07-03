import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: profs } = await supabase.from('profiles').select('id, name, employee_id');
  const { data: emps } = await supabase.from('employees').select('id, name');
  
  fs.writeFileSync('db_dump.json', JSON.stringify({ profs, emps }, null, 2));
  console.log('Done');
}

check();
