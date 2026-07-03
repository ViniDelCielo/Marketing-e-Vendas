// ============================================================
// Edge Function: send-push
// Supabase Deno Edge Function para disparar Web Push
// Arquivo: supabase/functions/send-push/index.ts
//
// Variáveis necessárias nos secrets do Supabase:
//   VAPID_PRIVATE_KEY  → chave privada VAPID
//   VAPID_PUBLIC_KEY   → chave pública VAPID (mesma do .env)
//   VAPID_SUBJECT      → mailto:seu@email.com ou https://seudominio.com
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// web-push port para Deno
import webPush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Configurar chaves VAPID
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')  || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidSubject    = Deno.env.get('VAPID_SUBJECT')     || 'mailto:admin@roiexpert.com.br';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys não configuradas nos secrets do Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Parsear body
    const body = await req.json();
    const { userId, title, body: notifBody, url, icon } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role para ler subscriptions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Buscar todas as subscriptions do usuário
    const { data: subs, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (subError) {
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma subscription encontrada para este usuário' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payload da notificação
    const payload = JSON.stringify({
      title: title || 'ROI Expert',
      body: notifBody || 'Você tem uma nova notificação.',
      icon: icon || '/favicon.svg',
      url: url || 'https://roiexpert.com.br',
      tag: `roi-${Date.now()}`,
    });

    // Enviar para cada subscription em paralelo
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    const sent     = results.filter((r) => r.status === 'fulfilled').length;
    const failed   = results.filter((r) => r.status === 'rejected').length;

    // Remover subscriptions expiradas (410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`[send-push] Falha ao enviar para ${subs[idx].endpoint}:`, result.reason);
        if (
          result.reason?.statusCode === 410 ||
          result.reason?.statusCode === 404
        ) {
          expiredEndpoints.push(subs[idx].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, failed, expired: expiredEndpoints.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push] Erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
