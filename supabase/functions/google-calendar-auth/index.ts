import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, employeeId, redirectUri } = await req.json()

    if (!code || !employeeId || !redirectUri) {
      throw new Error('code, employeeId e redirectUri são obrigatórios.')
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
    if (!clientId || !clientSecret) {
      throw new Error('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do Supabase.')
    }

    // 1. Trocar o authorization_code pelo refresh_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(`Google OAuth Error: ${tokenData.error_description || tokenData.error}`);
    }

    const { access_token, refresh_token } = tokenData;

    // 2. Pegar o e-mail do Google (Opcional mas útil)
    // Para isso, precisaríamos do escopo de email (userinfo.email).
    // Como pedimos só calendar, não vamos ter o e-mail diretamente, 
    // mas vamos salvar o token.
    
    // Conectar ao banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Salvar no banco (Tabela employee_integrations)
    // Usamos upsert para atualizar se o usuário já tiver conectado antes
    const { error: dbError } = await supabase
      .from('employee_integrations')
      .upsert(
        { 
          employee_id: employeeId, 
          provider: 'google_calendar', 
          access_token, 
          refresh_token: refresh_token || null, // refresh_token só vem no primeiro login
          connected_at: new Date().toISOString()
        },
        { onConflict: 'employee_id, provider' }
      )

    if (dbError) {
      console.error('DB Error:', dbError);
      throw new Error('Falha ao salvar integração no banco de dados.');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in google-calendar-auth:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
