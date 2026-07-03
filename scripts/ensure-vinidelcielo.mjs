/**
 * Garante que deploy/push vai para ViniDelCielo — NUNCA Gerson.
 * Uso: node scripts/ensure-vinidelcielo.mjs [--deploy]
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDotEnv } from './load-env.js';
import {
  ALLOWED_GITHUB_REMOTE,
  BLOCKED_CLI_IDENTITIES,
  KAIZEN_PROJECT_REF,
  assertWriteTarget,
  extractProjectRef,
} from './deploy-targets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const forDeploy = process.argv.includes('--deploy');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: true, cwd: ROOT });
}

// 1. Git remote
const gitConfig = path.join(ROOT, '.git', 'config');
if (fs.existsSync(gitConfig)) {
  const cfg = fs.readFileSync(gitConfig, 'utf8');
  if (!cfg.includes(ALLOWED_GITHUB_REMOTE)) {
    fail(`❌ Git remote incorreto. Deve apontar para ${ALLOWED_GITHUB_REMOTE}.`);
  }
  console.log('✅ Git → ViniDelCielo/Marketing-e-Vendas');
}

// 2. .env principal → só Kaizen
loadDotEnv();
const envUrl = process.env.VITE_SUPABASE_URL || '';
try {
  assertWriteTarget(envUrl, '.env (VITE_SUPABASE_URL)');
  console.log(`✅ .env → Kaizen (${KAIZEN_PROJECT_REF})`);
} catch (e) {
  fail(e.message);
}

// 3. Sem pasta .vercel do Gerson
const vercelDir = path.join(ROOT, '.vercel');
if (fs.existsSync(vercelDir)) {
  const pj = path.join(vercelDir, 'project.json');
  if (fs.existsSync(pj)) {
    const data = JSON.parse(fs.readFileSync(pj, 'utf8'));
    if (String(data.projectName || '').toLowerCase().includes('roiexpert')) {
      fail('❌ Pasta .vercel aponta para projeto roiexpert (Gerson). Apague .vercel/ e rode deploy na conta ViniDelCielo.');
    }
  }
}

if (!forDeploy) {
  console.log('\n✅ Ambiente local OK para ViniDelCielo.');
  console.log('   Para deploy: faça login ViniDelCielo e rode npm run deploy:online');
  process.exit(0);
}

// 4. Vercel CLI — bloqueia Gerson
const vercelWho = run('npx', ['vercel', 'whoami']);
const vercelUser = (vercelWho.stdout || vercelWho.stderr || '').trim().split('\n').pop().trim().toLowerCase();
if (!vercelUser || vercelWho.status !== 0) {
  fail('❌ Vercel CLI não logado. Rode: npx vercel logout && npx vercel login (conta ViniDelCielo)');
}
for (const blocked of BLOCKED_CLI_IDENTITIES) {
  if (vercelUser.includes(blocked)) {
    fail(
      `❌ Vercel logado como "${vercelUser}" (Gerson).\n` +
      '   Rode: npx vercel logout\n' +
      '   Depois: npx vercel login  → conta ViniDelCielo\n' +
      '   Nunca faça deploy com login do Gerson.'
    );
  }
}
console.log(`✅ Vercel CLI → ${vercelUser}`);

// 5. Supabase link local (se existir)
const linkedRef = path.join(ROOT, 'supabase', '.temp', 'project-ref');
if (fs.existsSync(linkedRef)) {
  const ref = fs.readFileSync(linkedRef, 'utf8').trim();
  try {
    assertWriteTarget(ref, 'supabase link');
    console.log(`✅ Supabase link → Kaizen (${ref})`);
  } catch (e) {
    fail(e.message + '\n   Rode: npx supabase link --project-ref ' + KAIZEN_PROJECT_REF);
  }
} else {
  console.log('ℹ️  Supabase ainda não linkado (ok — link será feito no deploy Kaizen)');
}

// 6. Supabase CLI — avisa se só vê projetos Gerson
const sbList = run('npx', ['supabase', 'projects', 'list', '-o', 'json']);
if (sbList.status === 0 && sbList.stdout) {
  try {
    const data = JSON.parse(sbList.stdout);
    const projects = data?.projects ?? data ?? [];
    const refs = projects.map((p) => p.ref || p.id).filter(Boolean);
    if (refs.length && !refs.includes(KAIZEN_PROJECT_REF)) {
      fail(
        '❌ Supabase CLI não vê o projeto Kaizen.\n' +
        '   Login atual parece ser do Gerson (Roimax/Roiexpert).\n' +
        '   Rode: npx supabase logout && npx supabase login  → conta ViniDelCielo'
      );
    }
    if (refs.includes(KAIZEN_PROJECT_REF)) {
      console.log('✅ Supabase CLI → acesso ao Kaizen confirmado');
    }
  } catch {
    // ignore parse errors
  }
}

console.log('\n✅ Pronto para deploy SOMENTE em ViniDelCielo / Kaizen');
