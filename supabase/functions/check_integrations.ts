import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function check() {
  const { data, error } = await supabase.from('employee_integrations').select('*');
  console.log('Integrations:', data, error);
}

check();
