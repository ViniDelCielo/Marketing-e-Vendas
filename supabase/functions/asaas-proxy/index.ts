import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const reqBody = await req.json()
    const action = reqBody.action
    const payload = reqBody.payload || reqBody

    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      throw new Error('Not authorized: Missing token')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Not authorized: ' + (authError?.message || 'Invalid user session'))
    }

    // Para ações não relacionadas ao Asaas API, não precisamos buscar asaasToken
    let asaasToken = ''
    let asaasEnv = 'production'
    if (action === 'sync-customers' || action === 'sync-payments' || action === 'check-financial-status') {
      const { data: config } = await supabaseClient
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_api_key')
        .single()

      asaasToken = config?.value?.token?.trim()
      asaasEnv = config?.value?.env || 'production'
      if (!asaasToken) {
        throw new Error('Asaas API Key not configured in system_settings')
      }
    }

    let asaasUrl = asaasEnv === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'

    let responseData;

    if (action === 'sync-customers') {
      // Paginação completa: busca TODOS os clientes do Asaas, página por página
      const allCustomers: any[] = []
      let offset = 0
      const pageSize = 100
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`${asaasUrl}/customers?limit=${pageSize}&offset=${offset}`, {
          method: 'GET',
          headers: {
            'access_token': asaasToken,
            'Content-Type': 'application/json'
          }
        })
        const page = await res.json()

        if (page.errors) {
          throw new Error('Erro do Asaas: ' + page.errors[0]?.description)
        }

        const customers = page.data || []
        allCustomers.push(...customers)

        // Asaas retorna hasMore=true enquanto houver mais páginas
        if (page.hasMore === false || customers.length < pageSize) {
          hasMore = false
        } else {
          offset += pageSize
        }
      }

      responseData = { data: allCustomers, totalCount: allCustomers.length }

    } else if (action === 'sync-payments') {
      // Puxa pagamentos do Asaas
      const res = await fetch(`${asaasUrl}/payments?limit=100`, {
        method: 'GET',
        headers: {
          'access_token': asaasToken,
          'Content-Type': 'application/json'
        }
      });
      responseData = await res.json()
    } else if (action === 'list-clients') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      const allClients: any[] = []
      let from = 0
      const limit = 1000
      let hasMore = true
      while (hasMore) {
        const { data, error } = await supabaseAdmin
          .from('clients')
          .select('id, name, email, document, metadata')
          .range(from, from + limit - 1)
        if (error) throw error
        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allClients.push(...data)
          if (data.length < limit) {
            hasMore = false
          } else {
            from += limit
          }
        }
      }
      responseData = allClients
    } else if (action === 'clear-asaas-database') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // 1. Busca todos os client_ids que estao referenciados em tabelas filhas.
      // Como o numero de clientes reais da agencia e pequeno, essas tabelas filhas
      // tendem a ser muito pequenas, retornando pouquissimos registros.
      const { data: services } = await supabaseAdmin.from('client_services').select('client_id')
      const { data: approvals } = await supabaseAdmin.from('client_approvals').select('client_id')
      const { data: history } = await supabaseAdmin.from('workflow_history').select('client_id')
      const { data: tasks } = await supabaseAdmin.from('department_tasks').select('client_id')
      const { data: messages } = await supabaseAdmin.from('chat_messages').select('client_id')
      const { data: meetings } = await supabaseAdmin.from('client_meetings').select('client_id')
      const { data: profiles } = await supabaseAdmin.from('profiles').select('client_uuid').not('client_uuid', 'is', null)

      // Unifica todos os IDs referenciados
      const referencedIdsSet = new Set<string>()
      services?.forEach(s => s.client_id && referencedIdsSet.add(s.client_id))
      approvals?.forEach(a => a.client_id && referencedIdsSet.add(a.client_id))
      history?.forEach(h => h.client_id && referencedIdsSet.add(h.client_id))
      tasks?.forEach(t => t.client_id && referencedIdsSet.add(t.client_id))
      messages?.forEach(m => m.client_id && referencedIdsSet.add(m.client_id))
      meetings?.forEach(m => m.client_id && referencedIdsSet.add(m.client_id))
      profiles?.forEach(p => p.client_uuid && referencedIdsSet.add(p.client_uuid))

      const referencedIds = Array.from(referencedIdsSet)
      
      // Se houver algum ID referenciado, filtramos quais desses pertencem ao Asaas
      let asaasReferencedIds: string[] = []
      if (referencedIds.length > 0) {
        const { data: refClients } = await supabaseAdmin
          .from('clients')
          .select('id, metadata')
          .in('id', referencedIds)

        const refAsaas = (refClients || []).filter(c => {
          let meta = c.metadata
          if (!meta) return false
          
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta) } catch(e) {}
          }
          
          if (meta && meta.show_in_agency === true) return false
          
          if (!meta) return false
          if (typeof meta === 'object') {
            return meta.asaas_id || meta.asaasId
          } else if (typeof meta === 'string') {
            return meta.includes('asaas_id') || meta.includes('asaasId')
          }
          return false
        })
        asaasReferencedIds = refAsaas.map(c => c.id)
      }

      // 2. Para os clientes Asaas que estao referenciados em tabelas filhas, limpamos as chaves
      if (asaasReferencedIds.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < asaasReferencedIds.length; i += chunkSize) {
          const chunk = asaasReferencedIds.slice(i, i + chunkSize)
          await supabaseAdmin.from('client_services').delete().in('client_id', chunk)
          await supabaseAdmin.from('client_approvals').delete().in('client_id', chunk)
          await supabaseAdmin.from('workflow_history').delete().in('client_id', chunk)
          await supabaseAdmin.from('department_tasks').delete().in('client_id', chunk)
          await supabaseAdmin.from('chat_messages').delete().in('client_id', chunk)
          await supabaseAdmin.from('client_meetings').delete().in('client_id', chunk)
          await supabaseAdmin.from('profiles').update({ client_uuid: null }).in('client_uuid', chunk)
        }
      }

      // 3. Agora efetuamos as delecoes globais na tabela clients
      let deletedCount = 0

      // Busca todos para filtrar no JS, evitando complexidade com JSONB nulo no PostgREST
      const { data: asaasClients, error: err1 } = await supabaseAdmin
        .from('clients')
        .select('id, metadata')
        
      if (err1) throw err1

      const toDelete = (asaasClients || []).filter(c => {
         let meta = c.metadata;
         if (!meta) return false;
         
         if (typeof meta === 'string') {
            try { meta = JSON.parse(meta) } catch(e) {}
         }

         const isAsaas = (typeof meta === 'object' && (meta.asaas_id || meta.asaasId)) || 
                         (typeof meta === 'string' && (meta.includes('asaas_id') || meta.includes('asaasId')));
         
         if (!isAsaas) return false;

         // Protege os que estao na agencia
         if (meta && meta.show_in_agency === true) {
             return false;
         }

         return true;
      }).map(c => c.id);

      if (toDelete.length > 0) {
          const chunkSize = 100;
          for (let i = 0; i < toDelete.length; i += chunkSize) {
              const chunk = toDelete.slice(i, i + chunkSize);
              const { error } = await supabaseAdmin.from('clients').delete().in('id', chunk);
              if (error) throw error;
              deletedCount += chunk.length;
          }
      }

      responseData = { deletedCount, totalAnalyzed: deletedCount }
    } else if (action === 'deduplicate-clients') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 1. Busca todos os clientes com paginacao para evitar limite de 1000 registros do PostgREST
      const allClients: any[] = []
      let from = 0
      const limit = 1000
      let hasMore = true
      while (hasMore) {
        const { data: chunkData, error: fetchErr } = await supabaseAdmin
          .from('clients')
          .select('*')
          .range(from, from + limit - 1)
        if (fetchErr) throw fetchErr
        if (!chunkData || chunkData.length === 0) {
          hasMore = false
        } else {
          allClients.push(...chunkData)
          if (chunkData.length < limit) {
            hasMore = false
          } else {
            from += limit
          }
        }
      }

      const groups: Record<string, any[]> = {}
      allClients.forEach(client => {
        let key = null
        
        // Resolve metadados que podem vir como string ou objeto
        let meta = client.metadata
        if (meta && typeof meta === 'string') {
          try {
            meta = JSON.parse(meta)
          } catch (_) {
            // Ignora erro de parsing
          }
        }

        if (meta && typeof meta === 'object') {
          if (meta.asaas_id || meta.asaasId) {
            key = `asaas:${meta.asaas_id || meta.asaasId}`
          }
        }
        
        if (!key && client.email && client.email.trim().toLowerCase()) {
          key = `email:${client.email.trim().toLowerCase()}`
        }
        
        if (!key && client.document && client.document.trim()) {
          key = `doc:${client.document.trim().replace(/\D/g, '')}`
        }

        if (key) {
          if (!groups[key]) groups[key] = []
          groups[key].push(client)
        }
      })

      let mergedGroupsCount = 0
      const allDuplicateIdsToDelete: string[] = []

      for (const key of Object.keys(groups)) {
        const list = groups[key]
        if (list.length <= 1) continue

        // Escolhe o "master" — NUNCA deletar registros editados manualmente
        list.sort((a, b) => {
          const aMeta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : (a.metadata || {})
          const bMeta = typeof b.metadata === 'string' ? JSON.parse(b.metadata) : (b.metadata || {})

          // 1º critério: registro editado manualmente (manually_edited_at) sempre ganha
          const aManual = aMeta?.manually_edited_at ? 1 : 0
          const bManual = bMeta?.manually_edited_at ? 1 : 0
          if (aManual !== bManual) return bManual - aManual

          // 2º critério: show_in_agency=true (vinculado à agência) ganha
          const aShow = aMeta?.show_in_agency === true ? 1 : 0
          const bShow = bMeta?.show_in_agency === true ? 1 : 0
          if (aShow !== bShow) return bShow - aShow

          // 3º critério: status Ativo ganha
          const aActive = a.status === 'Ativo' ? 1 : 0
          const bActive = b.status === 'Ativo' ? 1 : 0
          if (aActive !== bActive) return bActive - aActive

          // 4º critério: tem email ganha
          const aEmail = a.email ? 1 : 0
          const bEmail = b.email ? 1 : 0
          if (aEmail !== bEmail) return bEmail - aEmail

          // 5º critério: mais campos preenchidos ganha
          const aFields = [a.name, a.company, a.phone, a.document, a.address].filter(Boolean).length
          const bFields = [b.name, b.company, b.phone, b.document, b.address].filter(Boolean).length
          if (aFields !== bFields) return bFields - aFields

          return 0
        })

        const master = list[0]
        const duplicates = list.slice(1)

        // PROTEÇÃO ABSOLUTA: nunca deletar um registro que foi editado manualmente
        // ou está vinculado à agência — mesmo que seja considerado "duplicata".
        const safeDuplicates = duplicates.filter(d => {
          const dMeta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {})
          const isProtected = dMeta?.show_in_agency === true || !!dMeta?.manually_edited_at
          
          if (isProtected) {
             // Transfere o asaas_id do duplicado (se houver) para o master se o master ainda nao tiver
             const masterMeta = typeof master.metadata === 'string' ? JSON.parse(master.metadata) : (master.metadata || {})
             const dAsaasId = dMeta?.asaas_id || dMeta?.asaasId
             if (dAsaasId && !(masterMeta?.asaas_id || masterMeta?.asaasId)) {
                masterMeta.asaas_id = dAsaasId
                supabaseAdmin.from('clients').update({ metadata: masterMeta }).eq('id', master.id).then()
             }
          }
          
          return !isProtected // só inclui na lista de exclusão se NÃO for protegido
        })

        const duplicateIds = safeDuplicates.map(d => d.id)

        if (duplicateIds.length > 0) {
          // Atualiza referências em lote para este grupo
          await supabaseAdmin.from('client_services').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('client_approvals').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('workflow_history').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('department_tasks').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('chat_messages').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('client_meetings').update({ client_id: master.id }).in('client_id', duplicateIds)
          await supabaseAdmin.from('profiles').update({ client_uuid: master.id }).in('client_uuid', duplicateIds)

          allDuplicateIdsToDelete.push(...duplicateIds)
          mergedGroupsCount++
        }
      }

      if (allDuplicateIdsToDelete.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < allDuplicateIdsToDelete.length; i += chunkSize) {
          const chunk = allDuplicateIdsToDelete.slice(i, i + chunkSize);
          const { error: deleteErr } = await supabaseAdmin
            .from('clients')
            .delete()
            .in('id', chunk);
          if (deleteErr) throw deleteErr;
        }
      }

      responseData = { deletedCount: allDuplicateIdsToDelete.length, mergedGroupsCount }
    } else if (action === 'check-financial-status') {
      const { clientId } = payload;
      if (!clientId) throw new Error('clientId is required');

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: client, error: clientErr } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
      
      if (clientErr || !client) throw new Error('Client not found');

      let meta = client.metadata || {};
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta) } catch(e) { meta = {} }
      }

      let asaasId = meta.asaas_id || meta.asaasId;

      if (!asaasId) {
        // Need to find in Asaas
        let searchUrl = `${asaasUrl}/customers?limit=1`;
        if (client.document) {
          const doc = client.document.replace(/\D/g, '');
          searchUrl += `&cpfCnpj=${doc}`;
        } else if (client.email) {
          searchUrl += `&email=${encodeURIComponent(client.email)}`;
        } else {
          searchUrl += `&name=${encodeURIComponent(client.name)}`;
        }

        const res = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'access_token': asaasToken,
            'Content-Type': 'application/json'
          }
        });
        const searchData = await res.json();
        
        if (searchData.data && searchData.data.length > 0) {
          asaasId = searchData.data[0].id;
          meta.asaas_id = asaasId;
        } else {
          // If not found in Asaas, maybe they just don't have Asaas yet.
          // In this case, we can say "VERIFICAR" or just error out.
          throw new Error('Cliente não encontrado no Asaas (sem CNPJ/Email/Nome correspondente).');
        }
      }

      // Puxar as últimas cobranças do cliente (limite de 100 para ter histórico e futuro)
      const payRes = await fetch(`${asaasUrl}/payments?customer=${asaasId}&limit=100`, {
        method: 'GET',
        headers: {
          'access_token': asaasToken,
          'Content-Type': 'application/json'
        }
      });
      const payData = await payRes.json();

      let financialStatus = 'SEM COBRANÇA';
      let financialDetails = {
        paidMonths: 0,
        pendingMonths: 0,
        lastPaidDate: null,
        daysUntilNext: null,
        nextDueDate: null
      };

      if (payData.data && payData.data.length > 0) {
        const payments = payData.data;
        const hasOverdue = payments.some((p: any) => p.status === 'OVERDUE');
        const hasPending = payments.some((p: any) => p.status === 'PENDING');
        const hasPaid = payments.some((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH');

        if (hasOverdue) {
          financialStatus = 'DEVENDO';
        } else if (hasPending) {
          financialStatus = 'A VENCER';
        } else if (hasPaid) {
          financialStatus = 'PAGO';
        } else {
          // Caso só tenha cobranças estornadas ou outras, vamos olhar o status da primeira da lista
          financialStatus = payments[0].status === 'RECEIVED' || payments[0].status === 'CONFIRMED' ? 'PAGO' : 'VERIFICAR';
        }

        const paidPayments = payments.filter((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH');
        const pendingOrOverdue = payments.filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE');
        
        if (paidPayments.length > 0) {
           paidPayments.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
           financialDetails.lastPaidDate = paidPayments[0].dueDate; 
        }

        const startDate = client.start_date ? new Date(client.start_date) : null;
        const endDate = client.end_date ? new Date(client.end_date) : null;
        const lastPaid = financialDetails.lastPaidDate ? new Date(financialDetails.lastPaidDate) : null;

        // Meses pagos: do inicio_contrato ate HOJE (meses decorridos)
        const today = new Date();
        if (startDate) {
            let m = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
            // Se o dia atual for antes do dia de início, desconta 1
            if (today.getDate() < startDate.getDate()) m--;
            financialDetails.paidMonths = m > 0 ? m : 0;
        } else {
            financialDetails.paidMonths = paidPayments.length;
        }

        // Meses faltantes: de HOJE ate fim_contrato
        if (endDate) {
            let m = (endDate.getFullYear() - today.getFullYear()) * 12 + (endDate.getMonth() - today.getMonth());
            // Se o dia atual for antes do dia de encerramento, esse mês ainda conta como faltante
            if (today.getDate() < endDate.getDate()) m++;
            // Mas não deve exceder o total do contrato menos os pagos
            financialDetails.pendingMonths = m > 0 ? m : 0;
        } else {
            financialDetails.pendingMonths = pendingOrOverdue.length;
        }

        // Proximo pagamento
        if (pendingOrOverdue.length > 0) {
           pendingOrOverdue.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
           financialDetails.nextDueDate = pendingOrOverdue[0].dueDate;
        } else if (lastPaid) {
           const next = new Date(lastPaid);
           next.setMonth(next.getMonth() + 1);
           financialDetails.nextDueDate = next.toISOString().split('T')[0];
        }

        if (financialDetails.nextDueDate) {
           const nextDate = new Date(financialDetails.nextDueDate);
           const today = new Date();
           const diffTime = nextDate.getTime() - today.getTime();
           financialDetails.daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      // ===== AUTO-RENOVAÇÃO =====
      // Se auto_renew está ativo, contrato venceu e cliente continua pagando → renova
      let autoRenewed = false;
      let newEndDate = client.end_date;
      if (meta.auto_renew && client.start_date && client.end_date) {
        const today = new Date();
        const startDate = new Date(client.start_date);
        let endDate = new Date(client.end_date);

        // Calcula duração original do contrato em meses
        const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());

        if (durationMonths > 0 && today > endDate) {
          // Contrato venceu — verifica se cliente continua pagando
          const isStillPaying = financialStatus === 'PAGO' || financialStatus === 'A VENCER';

          if (isStillPaying) {
            // Renova: avança end_date repetidamente até cobrir a data atual
            while (endDate < today) {
              endDate.setMonth(endDate.getMonth() + durationMonths);
            }
            newEndDate = endDate.toISOString().split('T')[0];
            autoRenewed = true;

            // Recalcula meses com o novo end_date
            const newEnd = endDate;
            const todayRecalc = new Date();
            let pendM = (newEnd.getFullYear() - todayRecalc.getFullYear()) * 12 + (newEnd.getMonth() - todayRecalc.getMonth());
            if (todayRecalc.getDate() < newEnd.getDate()) pendM++;
            financialDetails.pendingMonths = pendM > 0 ? pendM : 0;
          }
        }
      }

      meta.financial_status = financialStatus;
      meta.financial_details = financialDetails;

      // Save to DB (inclui atualização de end_date se auto-renovado)
      const updatePayload: any = { metadata: meta };
      if (autoRenewed && newEndDate) {
        updatePayload.end_date = newEndDate;
      }
      await supabaseAdmin.from('clients').update(updatePayload).eq('id', clientId);

      responseData = { financialStatus, financialDetails, asaasId, autoRenewed, newEndDate: autoRenewed ? newEndDate : null };
    } else {
      throw new Error('Invalid action')
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
