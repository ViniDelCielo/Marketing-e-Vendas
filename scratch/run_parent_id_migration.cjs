// Script para rodar a migration de parent_id no Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Lê variáveis do .env
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && key.trim()) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log('🔄 Conectando ao Supabase:', SUPABASE_URL);
  console.log('🔄 Adicionando coluna parent_id em crm_pipelines...\n');

  // Estratégia 1: Usar a API REST do Supabase diretamente para rodar SQL
  // via fetch na endpoint /rest/v1/rpc
  try {
    const sql = `ALTER TABLE public.crm_pipelines ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;`;
    
    // Tenta via RPC exec_sql
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.log('⚠️  exec_sql não disponível, tentando método alternativo...');
      
      // Tenta via execute_sql
      const res2 = await supabase.rpc('execute_sql', { sql_string: sql });
      if (res2.error) {
        console.log('⚠️  execute_sql também não disponível.');
        console.log('\n📋 Por favor, rode manualmente no SQL Editor do Supabase:');
        console.log('━'.repeat(60));
        console.log(sql);
        console.log('━'.repeat(60));
        console.log('\n🌐 Acesse o SQL Editor do seu projeto no Supabase Dashboard');
        return;
      }
      console.log('✅ Sucesso via execute_sql!');
    } else {
      console.log('✅ Sucesso via exec_sql!');
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('\n📋 Por favor, rode manualmente no SQL Editor do Supabase:');
    console.log('━'.repeat(60));
    console.log(`ALTER TABLE public.crm_pipelines ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;`);
    console.log(`CREATE INDEX IF NOT EXISTS idx_crm_pipelines_parent_id ON public.crm_pipelines(parent_id);`);
    console.log('━'.repeat(60));
    console.log('\n🌐 Acesse o SQL Editor do seu projeto no Supabase Dashboard');
  }

  // Verificar se a coluna agora existe fazendo uma query simples
  console.log('\n🔍 Verificando se a coluna parent_id existe...');
  const { data: testData, error: testError } = await supabase
    .from('crm_pipelines')
    .select('id, name, parent_id')
    .limit(1);
  
  if (testError) {
    if (testError.message.includes('parent_id')) {
      console.log('❌ AINDA NÃO EXISTE - rode o SQL manualmente no dashboard do Supabase.');
      console.log('\n🌐 Dashboard: abra o SQL Editor do seu projeto Supabase');
      console.log('\n📋 SQL para rodar:');
      console.log('ALTER TABLE public.crm_pipelines ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.crm_pipelines(id) ON DELETE CASCADE;');
      console.log('CREATE INDEX IF NOT EXISTS idx_crm_pipelines_parent_id ON public.crm_pipelines(parent_id);');
    } else {
      console.log('⚠️  Erro ao verificar:', testError.message);
    }
  } else {
    console.log('✅ Coluna parent_id encontrada! Migration aplicada com sucesso.');
    console.log('   Dados de exemplo:', JSON.stringify(testData?.[0] || {}, null, 2));
    console.log('\n🎉 Sub-Funis estão prontos para uso!');
  }
}

runMigration();
