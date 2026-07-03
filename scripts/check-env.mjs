import { loadDotEnv, requireEnv } from './load-env.js';
import { assertWriteTarget } from './deploy-targets.mjs';

loadDotEnv();

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error('❌ Variáveis ausentes no .env:', missing.join(', '));
  console.error('   Crie o projeto em https://supabase.com/dashboard e preencha o .env');
  process.exit(1);
}

try {
  assertWriteTarget(process.env.VITE_SUPABASE_URL, '.env');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.log('✅ Supabase configurado no .env (Kaizen / ViniDelCielo)');
console.log('   URL:', process.env.VITE_SUPABASE_URL);
