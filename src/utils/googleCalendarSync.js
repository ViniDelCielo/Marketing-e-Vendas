/**
 * googleCalendarSync.js
 * Utilitário para sincronizar reuniões com o Google Agenda Global
 * via Supabase Edge Function → Google Apps Script → Google Calendar
 */

import { supabase } from '../lib/supabase';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
}
const FUNCTION_URL   = `${SUPABASE_URL}/functions/v1/google-calendar-global`;

/**
 * Cria um evento na Agenda Global do Google.
 * @param {Object} meeting - Dados da reunião criada no banco
 * @param {string} meeting.id - UUID da reunião no banco
 * @param {string} meeting.title
 * @param {string} meeting.scheduled_at - ISO string
 * @param {string} [meeting.meeting_link]
 * @param {string} [meeting.location]
 * @param {string} [meeting.notes]
 * @param {string} [meeting.createdBy] - Nome de quem agendou
 * @param {string[]} [meeting.guestNames] - Nomes dos convidados
 * @returns {Promise<{success: boolean, eventId?: string, error?: string}>}
 */
export async function syncCreateToGlobalCalendar(meeting) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        action: 'create',
        meetingId: meeting.id,
        title: meeting.clientName ? `${meeting.meetingTitle || meeting.title} - ${meeting.clientName}` : (meeting.meetingTitle || meeting.title || ''),
        clientName: meeting.clientName || '',
        meetingTitle: meeting.meetingTitle || meeting.title || '',
        start: meeting.scheduled_at,
        notes: meeting.notes || '',
        meetingLink: meeting.meeting_link || '',
        location: meeting.location || '',
        meetingType: meeting.meetingType || '',
        createdBy: meeting.createdBy || '',
        guestNames: meeting.guestNames || [],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[googleCalendarSync] create falhou:', err);
      return { success: false, error: err };
    }

    const data = await res.json();

    // Salvar o google_event_id no banco para poder deletar depois
    if (data.success && data.eventId && meeting.id) {
      const { error } = await supabase
        .from('client_meetings')
        .update({ google_event_id: data.eventId })
        .eq('id', meeting.id);
        
      if (error) console.warn('[googleCalendarSync] Falha ao salvar google_event_id:', error);
      else console.log('[googleCalendarSync] google_event_id salvo:', data.eventId);
    }

    return data;
  } catch (err) {
    console.warn('[googleCalendarSync] Erro na sync create:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza um evento na Agenda Global do Google.
 * @param {Object} meeting - Dados atualizados da reunião
 * @param {string} meeting.googleEventId - ID do evento no Google Calendar
 * @param {string} [meeting.title]
 * @param {string} [meeting.clientName]
 * @param {string} [meeting.scheduled_at]
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncUpdateToGlobalCalendar(meeting) {
  if (!meeting.googleEventId) return { success: true };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        action: 'update',
        eventId: meeting.googleEventId,
        title: meeting.clientName && meeting.title ? `${meeting.title} - ${meeting.clientName}` : (meeting.title || ''),
        clientName: meeting.clientName || '',
        start: meeting.scheduled_at,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[googleCalendarSync] update falhou:', err);
      return { success: false, error: err };
    }

    return await res.json();
  } catch (err) {
    console.warn('[googleCalendarSync] Erro na sync update:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deleta um evento da Agenda Global do Google.
 * @param {string} googleEventId - ID do evento no Google Calendar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncDeleteFromGlobalCalendar(googleEventId) {
  if (!googleEventId) return { success: true }; // nada a deletar
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        action: 'delete',
        eventId: googleEventId,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[googleCalendarSync] delete falhou:', err);
      return { success: false, error: err };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[googleCalendarSync] Erro na sync delete:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza a cor de um evento na Agenda Global do Google.
 * @param {string} googleEventId - ID do evento no Google Calendar
 * @param {string} colorId - ID da cor no Google Calendar (1 a 11)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncUpdateGlobalCalendarColor(googleEventId, colorId) {
  if (!googleEventId) return { success: true };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        action: 'update',
        eventId: googleEventId,
        colorId: colorId
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[googleCalendarSync] update color falhou:', err);
      return { success: false, error: err };
    }

    return await res.json();
  } catch (err) {
    console.warn('[googleCalendarSync] Erro na sync update color:', err);
    return { success: false, error: err.message };
  }
}
