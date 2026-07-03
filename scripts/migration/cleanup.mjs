/**
 * Remove só migration-data/ (JSON/SQL exportados).
 * Mantém .env.accounts — você usa as duas contas de forma recorrente.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, ACCOUNTS_ENV, LEGACY_MIGRATION_ENV } from './config.mjs';

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    fs.rmSync(p, { recursive: true, force: true });
  }
  fs.rmdirSync(dir);
}

const wipeAccounts = process.argv.includes('--all');

if (fs.existsSync(DATA_DIR)) {
  rmDir(DATA_DIR);
  console.log('🗑️  migration-data/ removido');
} else {
  console.log('ℹ️  migration-data/ já estava vazio');
}

if (wipeAccounts) {
  for (const f of [ACCOUNTS_ENV, LEGACY_MIGRATION_ENV]) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`🗑️  ${path.basename(f)} removido`);
    }
  }
}

console.log('✅ Limpeza concluída');
if (!wipeAccounts) {
  console.log('   .env.accounts mantido (use sync:supabase quando quiser de novo)');
}
