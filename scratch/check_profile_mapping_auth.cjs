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

async function checkWithAuth() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@roiexpert.com',
    password: 'ROIexpert@2024'
  });

  if (authError) {
    console.error("Login failed:", authError);
    return;
  }

  console.log("Logged in! Checking profiles...");
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, role, employee_id, client_uuid')
    .limit(10);

  if (pError) {
    console.error("Profiles error:", pError);
  } else {
    console.log("Profiles:", profiles);
  }

  console.log("Checking employees...");
  const { data: employees, error: eError } = await supabase
    .from('employees')
    .select('id, name')
    .limit(10);

  if (eError) {
    console.error("Employees error:", eError);
  } else {
    console.log("Employees:", employees);
  }
}

checkWithAuth();
