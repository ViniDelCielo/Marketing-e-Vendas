import { loadDotEnv, requireEnv } from './load-env.js';

loadDotEnv();

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error('❌ Variáveis ausentes no .env:', missing.join(', '));
  console.error('   Crie o projeto em https://supabase.com/dashboard e preencha o .env');
  process.exit(1);
}

console.log('✅ Supabase configurado no .env');
console.log('   URL:', process.env.VITE_SUPABASE_URL);
