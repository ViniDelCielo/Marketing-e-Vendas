/**
 * Importa migration-data/*.json → Supabase KAIZEN (destino)
 */
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadAccountsEnv, ensureDataDir, redactUrl } from './config.mjs';
import { TABLE_EXPORT_ORDER } from './tables.mjs';

const { target } = loadAccountsEnv();
const url = target.url;
const key = target.serviceKey;

if (!url || !key) {
  console.error('❌ Preencha KAIZEN_* no .env.accounts ou use .env principal');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const dataDir = ensureDataDir();

console.log('📥 Importando dados para:', redactUrl(url));

// 1. Usuários auth
const authFile = path.join(dataDir, '_auth_users.json');
if (fs.existsSync(authFile)) {
  const users = JSON.parse(fs.readFileSync(authFile, 'utf8'));
  let created = 0;
  let skipped = 0;
  for (const u of users) {
    const { data: existing } = await supabase.auth.admin.getUserById(u.id);
    if (existing?.user) {
      skipped++;
      continue;
    }
    const { error } = await supabase.auth.admin.createUser({
      id: u.id,
      email: u.email,
      email_confirm: true,
      user_metadata: u.user_metadata || {},
      app_metadata: u.app_metadata || {},
      password: crypto.randomUUID() + 'Aa1!',
    });
    if (error) {
      console.warn(`   ⚠️  user ${u.email}: ${error.message}`);
    } else {
      created++;
    }
  }
  console.log(`   _auth_users: ${created} criados, ${skipped} já existiam`);
  console.log('   ℹ️  Senhas antigas NÃO migram — use "Esqueci senha" ou redefina no painel Auth');
}

// 2. Tabelas public
for (const table of TABLE_EXPORT_ORDER) {
  const file = path.join(dataDir, `${table}.json`);
  if (!fs.existsSync(file)) continue;

  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!rows.length) {
    console.log(`   ⏭️  ${table}: vazio`);
    continue;
  }

  const batchSize = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`   ❌ ${table}: ${error.message}`);
      break;
    }
    inserted += batch.length;
  }
  console.log(`   ✅ ${table}: ${inserted} registros`);
}

console.log('\n✅ Import de dados concluído');
console.log('   Opcional: npm run migrate:cleanup  (apaga migration-data e .env.migration)');
