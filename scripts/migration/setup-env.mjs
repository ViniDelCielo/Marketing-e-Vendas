/**
 * Cria .env.migration com destino (KAIZEN) preenchido a partir do .env principal.
 * Você só precisa completar SOURCE_* (projeto antigo).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MIGRATION_ENV, ROOT } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainEnvPath = path.join(ROOT, '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

if (fs.existsSync(MIGRATION_ENV)) {
  console.log('ℹ️  .env.migration já existe — não sobrescrevi.');
  console.log('   Edite manualmente ou apague e rode de novo: npm run migrate:setup');
  process.exit(0);
}

const main = parseEnvFile(mainEnvPath);
const targetUrl = main.VITE_SUPABASE_URL || '';
const targetKey = main.SUPABASE_SERVICE_ROLE_KEY || '';

if (!targetUrl || !targetKey) {
  console.error('❌ Preencha VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env primeiro.');
  process.exit(1);
}

const content = `# Gerado por npm run migrate:setup — NÃO COMMITAR
# Complete SOURCE_* com dados do projeto antigo (Gerson), depois apague este arquivo com migrate:cleanup

# --- Origem (exportar schema + dados) ---
SOURCE_SUPABASE_URL=https://mbwhwimyetpavwvowbdb.supabase.co
SOURCE_SERVICE_ROLE_KEY=COLE_A_SERVICE_ROLE_DO_PROJETO_ANTIGO

# Supabase → Settings → Database → Connection string (URI, mode Session)
# Troque [SENHA] pela senha do banco do projeto antigo
SOURCE_DATABASE_URL=postgresql://postgres.mbwhwimyetpavwvowbdb:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# --- Destino (KAIZEN — já preenchido) ---
TARGET_SUPABASE_URL=${targetUrl}
TARGET_SERVICE_ROLE_KEY=${targetKey}

# Supabase KAIZEN → Settings → Database → URI (mesma senha que você definiu ao criar o projeto)
TARGET_DATABASE_URL=postgresql://postgres.vpcdbrzpxhhykupjdwti:[SENHA_KAIZEN]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
`;

fs.writeFileSync(MIGRATION_ENV, content, 'utf8');
console.log('✅ Criado .env.migration');
console.log('   1. Abra o arquivo e preencha SOURCE_SERVICE_ROLE_KEY, SOURCE_DATABASE_URL e TARGET_DATABASE_URL');
console.log('   2. npm run migrate:export-schema');
console.log('   3. npm run migrate:import-schema');
console.log('   4. npm run migrate:export-data');
console.log('   5. npm run migrate:import-data');
console.log('   6. npm run migrate:cleanup');
