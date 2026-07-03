const fs = require('fs');

async function test() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
  const functionUrl = `${supabaseUrl}/functions/v1/asaas-proxy`;
  const anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

  console.log('Function URL:', functionUrl);

  try {
    // 1. List clients to inspect metadata
    console.log('\nListing clients from database via edge function...');
    const listRes = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ action: 'list-clients' })
    });
    
    const listJson = await listRes.json();
    if (!listJson.success) {
      console.error('List error:', listJson.error);
    } else {
      const clients = listJson.data;
      console.log(`Total clients in database: ${clients.length}`);
      console.log('Sample clients metadata:');
      clients.slice(0, 10).forEach(c => {
        console.log(`- ${c.name} | doc: ${c.document} | email: ${c.email} | metadata:`, JSON.stringify(c.metadata));
      });

      // Filter Asaas clients
      const asaasClients = clients.filter(c => {
        const meta = c.metadata;
        if (!meta) return false;
        if (typeof meta === 'object') {
          return meta.asaas_id || meta.asaasId;
        } else if (typeof meta === 'string') {
          return meta.includes('asaas_id') || meta.includes('asaasId');
        }
        return false;
      });
      console.log(`\nFiltered Asaas clients locally: ${asaasClients.length}`);
    }

    // 2. Run clear-asaas-database
    console.log('\nInvoking clear-asaas-database...');
    const clearRes = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ action: 'clear-asaas-database' })
    });
    const clearJson = await clearRes.json();
    console.log('Clear Response:', JSON.stringify(clearJson, null, 2));

  } catch (err) {
    console.error('Fetch exception:', err);
  }
}

test();
