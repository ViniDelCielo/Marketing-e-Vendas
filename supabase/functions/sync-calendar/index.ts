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
    const { employeeId } = await req.json()

    if (!employeeId) {
      throw new Error('employeeId is required')
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
    if (!clientId || !clientSecret) {
      throw new Error('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nos secrets do Supabase.')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Pegar integração do funcionário
    const { data: integration, error: intError } = await supabase
      .from('employee_integrations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('provider', 'google_calendar')
      .single()

    if (intError || !integration || !integration.refresh_token) {
      throw new Error('Integração não encontrada ou Refresh Token ausente. Desconecte e conecte o Google novamente.')
    }

    // 2. Renovar Access Token usando o Refresh Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error('Falha ao renovar token com o Google.');

    const accessToken = tokenData.access_token;
    
    // Atualizar access_token no banco para a próxima vez
    await supabase.from('employee_integrations').update({ access_token: accessToken }).eq('id', integration.id);

    // 3. Buscar os Eventos do Google Calendar de todas as agendas do usuário
    // Vamos buscar os eventos de 1 mês atrás até 3 meses no futuro
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    // Buscar lista de calendários
    const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const calListData = await calListRes.json();
    if (calListData.error) throw new Error('Erro ao buscar lista de calendários: ' + calListData.error.message);

    let events: any[] = [];
    
    if (calListData.items) {
      for (const calendar of calListData.items) {
        // Ignorar calendários de feriados e aniversários
        if (calendar.id.includes('#holiday@') || calendar.id.includes('#contacts@')) continue;
        
        try {
          const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          
          const calData = await calRes.json();
          if (calData.items) {
            // Adicionar o nome do calendário a cada evento para sabermos de onde veio
            const calEvents = calData.items.map((e: any) => ({ ...e, _calendarName: calendar.summary }));
            events = events.concat(calEvents);
          }
        } catch (err) {
          console.error(`Erro ao buscar eventos do calendário ${calendar.summary}:`, err);
        }
      }
    }

    // 3.5 Buscar Google Tasks
    let tasks: any[] = [];
    try {
      const taskListsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const taskListsData = await taskListsRes.json();
      
      if (taskListsData.items) {
        for (const list of taskListsData.items) {
          const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=true&showHidden=true&dueMin=${timeMin.toISOString()}&dueMax=${timeMax.toISOString()}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const tasksData = await tasksRes.json();
          if (tasksData.items) {
            tasks = tasks.concat(tasksData.items);
          }
        }
      }
    } catch (taskError) {
      console.error('Erro ao buscar Google Tasks:', taskError);
      // Não joga erro para não quebrar os eventos do calendário caso falte escopo
    }

    // 4. Salvar os eventos na tabela `google_events`
    // Primeiro vamos limpar os eventos antigos desse usuario que estão na nossa base
    // para evitar conflitos de eventos apagados (simplificação).
    await supabase.from('google_events').delete().eq('employee_id', employeeId);

    const eventsToInsert = [
      ...events
        .filter((e: any) => e.status !== 'cancelled' && e.start)
        .map((e: any) => {
          const startTime = e.start.dateTime || `${e.start.date}T00:00:00Z`;
          const endTime = e.end.dateTime || `${e.end.date}T23:59:59Z`;
          return {
            employee_id: employeeId,
            google_event_id: e.id,
            title: e.summary ? `[${e._calendarName}] ${e.summary}` : `[${e._calendarName}] Sem título`,
            description: e.description || '',
            start_time: startTime,
            end_time: endTime,
            location: e.location || '',
            html_link: e.htmlLink || '',
            status: e.status,
            color_id: e.colorId || null
          }
        }),
      ...tasks
        .filter((t: any) => t.due) // Apenas tarefas com data de vencimento
        .map((t: any) => {
          return {
            employee_id: employeeId,
            google_event_id: t.id,
            title: t.title || 'Tarefa sem título',
            description: t.notes || '',
            start_time: t.due, // Tarefas do Google sempre enviam 'due' em formato ISO
            end_time: t.due,
            location: 'Google Tasks',
            html_link: t.links?.[0]?.link || '',
            status: t.status === 'completed' ? 'confirmed' : 'confirmed' // Mapeia completed para confirmed pois 'cancelled' remove
          }
        })
    ];

    if (eventsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('google_events').insert(eventsToInsert);
      if (insertError) {
        console.error('Erro ao inserir eventos:', insertError);
        throw new Error('Falha ao salvar eventos no banco.');
      }
    }

    // Atualizar last_sync
    await supabase.from('employee_integrations').update({ last_sync: new Date().toISOString() }).eq('id', integration.id);

    return new Response(JSON.stringify({ success: true, count: eventsToInsert.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in sync-calendar:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
