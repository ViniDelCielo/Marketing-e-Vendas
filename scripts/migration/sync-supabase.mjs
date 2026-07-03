/**
 * Pipeline completo: Gerson → Kaizen (schema + dados)
 */
import { spawnSync } from 'child_process';

const steps = [
  ['export-schema-pg', 'Exportando estrutura das tabelas...'],
  ['import-schema', 'Criando tabelas no KAIZEN...'],
  ['export-data', 'Exportando dados do Gerson...'],
  ['import-data', 'Importando dados no KAIZEN...'],
];

console.log('🔄 sync:supabase — Gerson → Kaizen\n');

for (const [script, label] of steps) {
  console.log(`\n── ${label}`);
  const result = spawnSync('node', [`scripts/migration/${script}.mjs`], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    console.error(`\n❌ Falhou em: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log('\n✅ Supabase sincronizado. Dados temporários em migration-data/ (gitignored).');
console.log('   Opcional: npm run sync:cleanup-data  (apaga só os JSON exportados)');
