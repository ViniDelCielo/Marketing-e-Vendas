import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const ACCOUNTS_ENV = path.join(ROOT, '.env.accounts');
const LEGACY_MIGRATION_ENV = path.join(ROOT, '.env.migration');
const DATA_DIR = path.join(ROOT, 'migration-data');

import {
  assertReadOnlySource,
  assertWriteTarget,
  extractProjectRef,
} from '../deploy-targets.mjs';

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

function pick(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (value && !value.includes('COLE_') && !value.includes('[SENHA')) return value;
  }
  return '';
}

export function loadAccountsEnv() {
  const file = fs.existsSync(ACCOUNTS_ENV) ? ACCOUNTS_ENV : LEGACY_MIGRATION_ENV;
  if (!fs.existsSync(file)) {
    console.error('❌ Crie .env.accounts (npm run accounts:setup)');
    console.error('   Arquivo com chaves KAIZEN + GERSON — gitignored, fica na sua máquina.');
    process.exit(1);
  }

  const env = parseEnvFile(file);
  const mainEnv = parseEnvFile(path.join(ROOT, '.env'));

  const source = {
    url: pick(env, ['GERSON_SUPABASE_URL', 'SOURCE_SUPABASE_URL']),
    anonKey: pick(env, ['GERSON_ANON_KEY', 'SOURCE_ANON_KEY']),
    serviceKey: pick(env, ['GERSON_SERVICE_ROLE_KEY', 'SOURCE_SERVICE_ROLE_KEY']),
    dbUrl: pick(env, ['GERSON_DATABASE_URL', 'SOURCE_DATABASE_URL']),
  };

  const target = {
    url: pick(env, ['KAIZEN_SUPABASE_URL', 'TARGET_SUPABASE_URL']) || mainEnv.VITE_SUPABASE_URL,
    anonKey: pick(env, ['KAIZEN_ANON_KEY', 'TARGET_ANON_KEY']) || mainEnv.VITE_SUPABASE_ANON_KEY,
    serviceKey: pick(env, ['KAIZEN_SERVICE_ROLE_KEY', 'TARGET_SERVICE_ROLE_KEY']) || mainEnv.SUPABASE_SERVICE_ROLE_KEY,
    dbUrl: pick(env, ['KAIZEN_DATABASE_URL', 'TARGET_DATABASE_URL']),
  };

  // Segurança: origem = só leitura | destino = só Kaizen (ViniDelCielo)
  if (source.url) assertReadOnlySource(source.url, 'GERSON (origem)');
  if (target.url) assertWriteTarget(target.url, 'KAIZEN (destino)');
  if (target.dbUrl) assertWriteTarget(extractProjectRef(target.dbUrl) || target.dbUrl, 'KAIZEN DATABASE_URL');

  return { source, target, file };
}

/** @deprecated use loadAccountsEnv */
export function loadMigrationEnv() {
  const { source, target } = loadAccountsEnv();
  return {
    SOURCE_SUPABASE_URL: source.url,
    SOURCE_SERVICE_ROLE_KEY: source.serviceKey,
    SOURCE_DATABASE_URL: source.dbUrl,
    TARGET_SUPABASE_URL: target.url,
    TARGET_SERVICE_ROLE_KEY: target.serviceKey,
    TARGET_DATABASE_URL: target.dbUrl,
  };
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function redactUrl(url = '') {
  if (!url) return '(vazio)';
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.slice(0, 24) + '...';
  }
}

export { ROOT, DATA_DIR, ACCOUNTS_ENV, LEGACY_MIGRATION_ENV };
export const MIGRATION_ENV = ACCOUNTS_ENV;
