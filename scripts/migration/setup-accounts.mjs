/**
 * Cria .env.accounts com blocos KAIZEN (destino) + GERSON (origem).
 * Mantém as chaves na máquina para sincronizar quando quiser.
 */
import fs from 'fs';
import path from 'path';
import { ACCOUNTS_ENV, ROOT } from './config.mjs';

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

if (fs.existsSync(ACCOUNTS_ENV)) {
  console.log('ℹ️  .env.accounts já existe — não sobrescrevi.');
  process.exit(0);
}

const main = parseEnvFile(path.join(ROOT, '.env'));
const legacy = parseEnvFile(path.join(ROOT, '.env.migration'));

const kaizenUrl = main.VITE_SUPABASE_URL || legacy.TARGET_SUPABASE_URL || '';
const kaizenAnon = main.VITE_SUPABASE_ANON_KEY || '';
const kaizenService = main.SUPABASE_SERVICE_ROLE_KEY || legacy.TARGET_SERVICE_ROLE_KEY || '';

const content = `# ============================================================
# DUAS CONTAS — NÃO COMMITAR (.env.accounts)
# KAIZEN = MARKETING (seu) | GERSON = Roiexpert (origem/dev)
# ============================================================

# ---------- KAIZEN (ViniDelCielo — pasta MARKETING) ----------
KAIZEN_SUPABASE_URL=${kaizenUrl}
KAIZEN_ANON_KEY=${kaizenAnon}
KAIZEN_SERVICE_ROLE_KEY=${kaizenService}
# Settings → Database → URI (Session mode, porta 5432)
KAIZEN_DATABASE_URL=postgresql://postgres.vpcdbrzpxhhykupjdwti:[SENHA_KAIZEN]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# ---------- GERSON (Roiexpert — dev na pasta Desktop\\Roiexpert) ----------
GERSON_SUPABASE_URL=https://mbwhwimyetpavwvowbdb.supabase.co
GERSON_ANON_KEY=COLE_ANON_DO_PROJETO_GERSON
GERSON_SERVICE_ROLE_KEY=COLE_SERVICE_ROLE_DO_PROJETO_GERSON
GERSON_DATABASE_URL=postgresql://postgres.mbwhwimyetpavwvowbdb:[SENHA_GERSON]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
`;

fs.writeFileSync(ACCOUNTS_ENV, content, 'utf8');

// Migrar .env.migration antigo se existir
if (fs.existsSync(path.join(ROOT, '.env.migration'))) {
  console.log('ℹ️  Você ainda tem .env.migration — pode apagar depois de preencher .env.accounts');
}

console.log('✅ Criado .env.accounts');
console.log('');
console.log('Como funciona:');
console.log('  • Roiexpert (Desktop) → você programa com infra do Gerson');
console.log('  • MARKETING (aqui)    → app Kaizen com infra sua');
console.log('  • npm run sync:supabase → copia schema+dados Gerson → Kaizen');
console.log('');
console.log('Próximo: abra .env.accounts e preencha as chaves GERSON + senhas DATABASE_URL');
