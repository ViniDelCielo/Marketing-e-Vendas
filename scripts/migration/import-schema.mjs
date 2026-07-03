/**
 * Aplica migration-data/schema.sql no Postgres de DESTINO
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { loadAccountsEnv, ensureDataDir, redactUrl } from './config.mjs';

const { target } = loadAccountsEnv();
const dbUrl = target.dbUrl;
const schemaFile = path.join(ensureDataDir(), 'schema.sql');

if (!dbUrl) {
  console.error('❌ Defina TARGET_DATABASE_URL no .env.migration');
  process.exit(1);
}

if (!fs.existsSync(schemaFile)) {
  console.error('❌ Arquivo migration-data/schema.sql não encontrado.');
  console.error('   Rode antes: npm run migrate:export-schema');
  process.exit(1);
}

const sql = fs.readFileSync(schemaFile, 'utf8');
console.log('📥 Importando schema para:', redactUrl(dbUrl));

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Schema importado no KAIZEN');
  console.log('   Próximo: npm run migrate:export-data && npm run migrate:import-data');
} catch (err) {
  console.error('❌ Erro ao importar schema:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
