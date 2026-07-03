/**
 * Exporta schema public via conexão pg (sem Docker / pg_dump)
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { loadAccountsEnv, ensureDataDir, redactUrl } from './config.mjs';

const { source } = loadAccountsEnv();
const dbUrl = source.dbUrl;

if (!dbUrl || dbUrl.includes('[SENHA]') || dbUrl.includes('COLE_')) {
  console.error('❌ GERSON_DATABASE_URL inválida no .env.accounts');
  process.exit(1);
}

const outFile = path.join(ensureDataDir(), 'schema.sql');
console.log('📤 Exportando schema (via pg) de:', redactUrl(dbUrl));

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function q(sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function escId(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

try {
  await client.connect();
  console.log('   ✅ Conectado ao Postgres');

  const parts = ['-- Schema export via pg\n', 'SET client_encoding = UTF8;\n'];

  // Extensions
  const exts = await q(`
    SELECT extname FROM pg_extension
    WHERE extname NOT IN ('plpgsql')
    ORDER BY extname
  `);
  for (const { extname } of exts) {
    parts.push(`CREATE EXTENSION IF NOT EXISTS ${escId(extname)};\n`);
  }

  // Enums
  const enums = await q(`
    SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  for (const { typname, labels } of enums) {
    const vals = labels.map((l) => `'${String(l).replace(/'/g, "''")}'`).join(', ');
    parts.push(`DO $$ BEGIN CREATE TYPE public.${escId(typname)} AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;\n`);
  }

  // Sequences
  const seqs = await q(`
    SELECT sequence_name FROM information_schema.sequences
    WHERE sequence_schema = 'public' ORDER BY sequence_name
  `);
  for (const { sequence_name } of seqs) {
    const [def] = await q(`SELECT pg_get_serial_sequence('public.${sequence_name}', 'id') as s`);
    const seqDef = await q(`
      SELECT start_value, minimum_value, maximum_value, increment
      FROM information_schema.sequences WHERE sequence_schema='public' AND sequence_name=$1
    `, [sequence_name]);
    if (seqDef[0]) {
      const s = seqDef[0];
      parts.push(`CREATE SEQUENCE IF NOT EXISTS public.${escId(sequence_name)} START ${s.start_value} MINVALUE ${s.minimum_value} MAXVALUE ${s.maximum_value} INCREMENT BY ${s.increment};\n`);
    }
  }

  // Tables (sem FKs primeiro)
  const tables = await q(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  for (const { table_name } of tables) {
    const cols = await q(`
      SELECT column_name, data_type, udt_name, character_maximum_length,
             is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table_name]);

    const colDefs = cols.map((c) => {
      let type = c.data_type === 'USER-DEFINED' ? escId(c.udt_name) : c.data_type;
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      if (c.udt_name === 'uuid') type = 'uuid';
      if (c.udt_name === 'timestamptz') type = 'timestamptz';
      if (c.udt_name === 'jsonb') type = 'jsonb';
      if (c.udt_name === '_text') type = 'text[]';
      if (c.udt_name === 'int4') type = 'integer';
      if (c.udt_name === 'int8') type = 'bigint';
      if (c.udt_name === 'bool') type = 'boolean';
      if (c.udt_name === 'numeric') type = 'numeric';
      let def = `${escId(c.column_name)} ${type}`;
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      return def;
    });

    const pks = await q(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `, [table_name]);

    if (pks.length) {
      colDefs.push(`PRIMARY KEY (${pks.map((p) => escId(p.column_name)).join(', ')})`);
    }

    parts.push(`CREATE TABLE IF NOT EXISTS public.${escId(table_name)} (\n  ${colDefs.join(',\n  ')}\n);\n\n`);
  }

  // Foreign keys
  const fks = await q(`
    SELECT tc.table_name, tc.constraint_name, kcu.column_name,
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name,
           rc.update_rule, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
  `);

  for (const fk of fks) {
    parts.push(
      `ALTER TABLE ONLY public.${escId(fk.table_name)} ADD CONSTRAINT ${escId(fk.constraint_name)} ` +
      `FOREIGN KEY (${escId(fk.column_name)}) REFERENCES public.${escId(fk.foreign_table_name)}(${escId(fk.foreign_column_name)}) ` +
      `ON UPDATE ${fk.update_rule} ON DELETE ${fk.delete_rule};\n`
    );
  }

  // Indexes (non-PK)
  const idxs = await q(`
    SELECT indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname
  `);
  for (const { indexdef } of idxs) {
    parts.push(`${indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS').replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS')};\n`);
  }

  // Functions (antes das policies RLS)
  const funcs = await q(`
    SELECT pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  `);
  for (const { def } of funcs) {
    parts.push(`${def};\n\n`);
  }

  // Triggers
  const triggers = await q(`
    SELECT pg_get_triggerdef(t.oid, true) AS def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  `);
  for (const { def } of triggers) {
    parts.push(`${def};\n\n`);
  }

  // Enable RLS + policies
  for (const { table_name } of tables) {
    const rls = await q(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname=$1`, [table_name]);
    if (rls[0]?.relrowsecurity) {
      parts.push(`ALTER TABLE public.${escId(table_name)} ENABLE ROW LEVEL SECURITY;\n`);
    }
  }

  const policies = await q(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname
  `);
  for (const p of policies) {
    const permissive = p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
    const roles = p.roles.replace('{', '').replace('}', '').split(',').map((r) => r.trim()).filter(Boolean).join(', ') || 'public';
    let sql = `CREATE POLICY ${escId(p.policyname)} ON public.${escId(p.tablename)} AS ${permissive} FOR ${p.cmd} TO ${roles}`;
    if (p.qual) sql += ` USING (${p.qual})`;
    if (p.with_check) sql += ` WITH CHECK (${p.with_check})`;
    parts.push(`${sql};\n`);
  }

  fs.writeFileSync(outFile, parts.join('\n'), 'utf8');
  console.log(`✅ Schema salvo: migration-data/schema.sql (${parts.length} blocos, ${tables.length} tabelas)`);
} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
