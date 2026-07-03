/**
 * Exporta dados das tabelas public (origem) → migration-data/*.json
 * Usa SOURCE_SERVICE_ROLE_KEY — roda só na sua máquina, pasta gitignored
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadAccountsEnv, ensureDataDir, redactUrl } from './config.mjs';
import { TABLE_EXPORT_ORDER } from './tables.mjs';

const { source } = loadAccountsEnv();
const url = source.url;
const key = source.serviceKey;

if (!url || !key) {
  console.error('❌ Preencha GERSON_SUPABASE_URL e GERSON_SERVICE_ROLE_KEY no .env.accounts');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const outDir = ensureDataDir();
const manifest = { exportedAt: new Date().toISOString(), tables: {} };

console.log('📤 Exportando dados de:', redactUrl(url));

// Auth users (profiles depende de auth.users)
const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (usersErr) {
  console.warn('⚠️  auth.users:', usersErr.message);
} else {
  const users = usersData?.users || [];
  fs.writeFileSync(path.join(outDir, '_auth_users.json'), JSON.stringify(users, null, 2));
  manifest.tables._auth_users = users.length;
  console.log(`   _auth_users: ${users.length} registros`);
}

for (const table of TABLE_EXPORT_ORDER) {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(`   ⏭️  ${table}: ignorado (${error.message})`);
      continue;
    }
    const rows = data || [];
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[table] = rows.length;
    console.log(`   ✅ ${table}: ${rows.length} registros`);
  } catch (e) {
    console.log(`   ⏭️  ${table}: ${e.message}`);
  }
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('\n✅ Export concluído em migration-data/ (gitignored)');
console.log('   Próximo: npm run migrate:import-data');
