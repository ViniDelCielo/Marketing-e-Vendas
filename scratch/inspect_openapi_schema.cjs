const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

async function fetchSchema() {
  const url = `${env.VITE_SUPABASE_URL}/rest/v1/?apikey=${env.VITE_SUPABASE_ANON_KEY}`;
  try {
    const res = await fetch(url);
    const schema = await res.json();
    console.log("PostgREST response:", schema);
  } catch (error) {
    console.error("Error fetching schema:", error);
  }
}

fetchSchema();
