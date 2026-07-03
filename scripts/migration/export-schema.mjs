/**
 * Exporta SCHEMA (estrutura) do Postgres de origem → migration-data/schema.sql
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadAccountsEnv, ensureDataDir, redactUrl } from './config.mjs';

const { source } = loadAccountsEnv();
const dbUrl = source.dbUrl;

if (!dbUrl) {
  console.error('❌ Defina GERSON_DATABASE_URL no .env.accounts');
  process.exit(1);
}

if (dbUrl.includes('[SENHA]') || dbUrl.includes('COLE_')) {
  console.error('❌ DATABASE_URL ainda tem placeholder — coloque a senha real.');
  process.exit(1);
}

const outDir = ensureDataDir();
const outFile = path.join(outDir, 'schema.sql');

console.log('📤 Exportando schema de:', redactUrl(dbUrl));

function supabaseDump(url) {
  return spawnSync(
    'npx',
    ['supabase', 'db', 'dump', '--db-url', url, '-f', outFile, '--schema', 'public'],
    { encoding: 'utf8', shell: true }
  );
}

function pgDump(url) {
  return spawnSync(
    'pg_dump',
    ['--schema=public', '--schema-only', '--no-owner', '--no-privileges', '--no-comments', '-f', outFile, url],
    { encoding: 'utf8', shell: true }
  );
}

function attempt(label, fn) {
  console.log(`   → ${label}...`);
  const r = fn();
  if (r.stdout?.trim()) console.log(r.stdout.trim());
  if (r.stderr?.trim()) console.log(r.stderr.trim());
  const success = r.status === 0 && fs.existsSync(outFile) && fs.statSync(outFile).size > 100;
  return { success, r };
}

const urls = [dbUrl];

if (dbUrl.includes('db.mbwhwimyetpavwvowbdb')) {
  urls.push(
    dbUrl
      .replace('postgresql://postgres:', 'postgresql://postgres.mbwhwimyetpavwvowbdb:')
      .replace('@db.mbwhwimyetpavwvowbdb.supabase.co:5432', '@aws-0-sa-east-1.pooler.supabase.com:5432')
  );
}

let lastResult = null;
let success = false;

for (const url of urls) {
  const a = attempt(`supabase db dump (${redactUrl(url)})`, () => supabaseDump(url));
  lastResult = a.r;
  if (a.success) {
    success = true;
    break;
  }
}

if (!success) {
  const a = attempt('pg_dump local', () => pgDump(dbUrl));
  lastResult = a.r;
  success = a.success;
}

if (!success) {
  console.error('❌ Falha ao exportar schema.');
  if (lastResult) console.error(lastResult.stderr || lastResult.stdout || '(sem saída)');
  console.error('\nVerifique GERSON_DATABASE_URL (senha, host, região).');
  process.exit(1);
}

console.log(`✅ Schema salvo em migration-data/schema.sql (${fs.statSync(outFile).size} bytes)`);
console.log('   Próximo: npm run sync:import-schema');
