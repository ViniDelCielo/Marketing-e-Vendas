// ============================================================
// Edge Function: google-calendar-global
// Proxy entre o sistema ROI Expert e o Google Apps Script
// que cria/deleta eventos na Agenda Global do Google.
//
// Variáveis necessárias nos secrets do Supabase:
//   APPS_SCRIPT_URL    → URL da implantação do Apps Script
//   APPS_SCRIPT_SECRET → chave secreta definida no script (roi-expert-sync-2024)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const APPS_SCRIPT_URL    = Deno.env.get('APPS_SCRIPT_URL')    || '';
    const APPS_SCRIPT_SECRET = Deno.env.get('APPS_SCRIPT_SECRET') || 'roi-expert-sync-2024';

    if (!APPS_SCRIPT_URL) {
      return json({ error: 'APPS_SCRIPT_URL não configurada nos secrets do Supabase' }, 500);
    }

    const body = await req.json();
    const { action, meetingId, title, clientName, meetingTitle, start, end, notes, meetingLink, location, meetingType, eventId, createdBy, guestNames, colorId } = body;

    if (!action || !['create', 'delete', 'update'].includes(action)) {
      return json({ error: 'action deve ser create, delete ou update' }, 400);
    }

    // ── Chamar o Apps Script ──────────────────────────────────
    const scriptPayload = {
      secret: APPS_SCRIPT_SECRET,
      action,
      title,
      clientName: clientName || '',
      meetingTitle: meetingTitle || title || '',
      start,
      end,
      notes,
      meetingLink,
      location,
      meetingType: meetingType || '',
      eventId,
      createdBy: createdBy || '',
      guestNames: guestNames || [],
      colorId: colorId || null,
    };

    const scriptRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scriptPayload),
      redirect: 'follow',
    });

    if (!scriptRes.ok) {
      const errText = await scriptRes.text();
      console.error('[google-calendar-global] Apps Script error:', errText);
      return json({ error: 'Erro ao chamar Apps Script', detail: errText }, 500);
    }

    const result = await scriptRes.json();

    // ── Se criou evento, salva o google_event_id no banco ──────
    if (action === 'create' && result.eventId && meetingId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      await supabaseAdmin
        .from('client_meetings')
        .update({ google_event_id: result.eventId })
        .eq('id', meetingId);
    }

    return json({ success: true, ...result });
  } catch (err) {
    console.error('[google-calendar-global] Erro:', err);
    return json({ error: 'Erro interno', detail: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
