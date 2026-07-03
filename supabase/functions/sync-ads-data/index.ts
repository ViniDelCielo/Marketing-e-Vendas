import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { client_id } = await req.json()
    if (!client_id) {
      throw new Error("client_id is required")
    }

    // Initialize Supabase Client with Service Role (Admin)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get Master Tokens from agency_integrations
    const { data: integrations, error: intError } = await supabase
      .from('agency_integrations')
      .select('*')
    
    if (intError) throw intError

    const metaCreds = integrations.find(i => i.provider === 'meta')?.credentials
    const googleCreds = integrations.find(i => i.provider === 'google')?.credentials

    // 2. Get client's connections
    const { data: connections, error: connError } = await supabase
      .from('ads_connections')
      .select('*')
      .eq('client_id', client_id)

    if (connError) throw connError

    let totalLeadsMeta = 0
    let totalClicksMeta = 0
    let totalSpendMeta = 0

    let totalLeadsGoogle = 0
    let totalClicksGoogle = 0
    let totalSpendGoogle = 0

    // 3. Process each connection
    for (const conn of connections) {
      if (conn.platform === 'Meta Ads' && metaCreds?.access_token) {
        try {
          // Fetch from Meta Graph API
          // Note: account_id must be in the format 'act_XXXXX'
          const accountId = conn.account_id.startsWith('act_') ? conn.account_id : `act_${conn.account_id}`
          const url = `https://graph.facebook.com/v19.0/${accountId}/insights?fields=spend,clicks,actions&date_preset=this_month&access_token=${metaCreds.access_token}`
          const res = await fetch(url)
          const data = await res.json()
          
          if (data.data && data.data.length > 0) {
            const insights = data.data[0]
            totalSpendMeta += parseFloat(insights.spend || 0)
            totalClicksMeta += parseInt(insights.clicks || 0)
            
            // Search for leads in actions
            const leadsAction = insights.actions?.find((a: any) => a.action_type === 'lead')
            if (leadsAction) {
              totalLeadsMeta += parseInt(leadsAction.value || 0)
            }
          }
        } catch (e) {
          console.error(`Error fetching Meta for account ${conn.account_id}:`, e)
        }
      }

      if (conn.platform === 'Google Ads' && googleCreds?.refresh_token && googleCreds?.developer_token) {
        try {
          // 1. Obter Access Token usando o Refresh Token
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: googleCreds.client_id,
              client_secret: googleCreds.client_secret,
              refresh_token: googleCreds.refresh_token,
              grant_type: 'refresh_token'
            })
          });
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          if (accessToken) {
            // Remove hífens do account_id (ex: "123-456-7890" vira "1234567890")
            const customerId = conn.account_id.replace(/-/g, '');
            
            // 2. Fazer a busca de métricas na Google Ads API via GAQL
            const query = `
              SELECT 
                metrics.clicks, 
                metrics.conversions, 
                metrics.cost_micros 
              FROM customer 
              WHERE segments.date DURING THIS_MONTH
            `;

            const headers: Record<string, string> = {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': googleCreds.developer_token,
              'Content-Type': 'application/json'
            };

            // Se você usar a conta MCC (Manager) para gerar o token, precisa enviar o ID da MCC no header
            if (googleCreds.mcc_id) {
              headers['login-customer-id'] = googleCreds.mcc_id.replace(/-/g, '');
            }

            const adsRes = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ query })
            });

            const adsData = await adsRes.json();

            if (adsData.results && adsData.results.length > 0) {
              // Google Ads retorna custo em micros (dividir por 1 milhão)
              const metrics = adsData.results[0].metrics;
              totalClicksGoogle += parseInt(metrics.clicks || 0);
              totalLeadsGoogle += parseInt(metrics.conversions || 0);
              totalSpendGoogle += (parseInt(metrics.costMicros || 0) / 1000000);
            } else if (adsData.error) {
              console.error(`Google Ads API Error for ${customerId}:`, adsData.error);
            }
          }
        } catch (e) {
          console.error(`Error fetching Google Ads for account ${conn.account_id}:`, e);
        }
      }
    }

    // 4. Update client metadata
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('metadata')
      .eq('id', client_id)
      .single()

    if (clientError) throw clientError

    const currentMetadata = clientData.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      leads_meta: totalLeadsMeta,
      leads_google: totalLeadsGoogle,
      clicks_meta: totalClicksMeta,
      clicks_google: totalClicksGoogle,
      meta_balance: totalSpendMeta.toFixed(2),
      google_balance: totalSpendGoogle.toFixed(2)
    }

    await supabase
      .from('clients')
      .update({ metadata: newMetadata })
      .eq('id', client_id)

    return new Response(JSON.stringify({ success: true, metadata: newMetadata }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
