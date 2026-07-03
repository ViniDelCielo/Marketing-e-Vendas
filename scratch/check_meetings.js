import { createClient } from '@supabase/supabase-js';
import { loadDotEnv, requireEnv } from '../scripts/load-env.js';

loadDotEnv();

const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('VITE_SUPABASE_ANON_KEY')
);

async function check() {
  const { data, error } = await supabase.from('client_meetings').select('*');
  console.log(error || data);
}

check();
