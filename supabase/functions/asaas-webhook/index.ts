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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const reqBody = await req.json()
    const event = reqBody.event
    const payment = reqBody.payment

    if (!payment || !payment.customer) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid payload: missing payment.customer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const customerId = payment.customer
    console.log(`[Asaas Webhook] Recebido evento: ${event} para o customer ID: ${customerId}`)

    // 1. Busca o cliente pelo Asaas Customer ID
    const { data: clients, error: clientFetchErr } = await supabaseAdmin
      .from('clients')
      .select('*')

    if (clientFetchErr) throw clientFetchErr

    const client = (clients || []).find((c: any) => {
      let meta = c.metadata
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta) } catch(e) {}
      }
      return meta && (meta.asaas_id === customerId || meta.asaasId === customerId)
    })

    if (!client) {
      console.log(`[Asaas Webhook] Cliente não encontrado na base de dados para o Asaas ID: ${customerId}`)
      return new Response(JSON.stringify({ success: true, message: 'Customer not linked in database' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Busca chave da API do Asaas nas configurações
    const { data: config } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'asaas_api_key')
      .single()

    const asaasToken = config?.value?.token?.trim()
    const asaasEnv = config?.value?.env || 'production'

    if (!asaasToken) {
      throw new Error('Asaas API Key not configured in system_settings')
    }

    const asaasUrl = asaasEnv === 'sandbox' ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3'

    // 3. Puxa as últimas cobranças do cliente para recalcular o status financeiro de forma precisa
    const payRes = await fetch(`${asaasUrl}/payments?customer=${customerId}&limit=100`, {
      method: 'GET',
      headers: {
        'access_token': asaasToken,
        'Content-Type': 'application/json'
      }
    });

    if (!payRes.ok) {
      throw new Error(`Failed to fetch payments from Asaas: ${payRes.statusText}`)
    }

    const payData = await payRes.json()

    let financialStatus = 'SEM COBRANÇA'
    let financialDetails: any = {
      paidMonths: 0,
      pendingMonths: 0,
      lastPaidDate: null,
      daysUntilNext: null,
      nextDueDate: null
    }

    if (payData.data && payData.data.length > 0) {
      const payments = payData.data
      const hasOverdue = payments.some((p: any) => p.status === 'OVERDUE')
      const hasPending = payments.some((p: any) => p.status === 'PENDING')
      const hasPaid = payments.some((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH')

      if (hasOverdue) {
        financialStatus = 'DEVENDO'
      } else if (hasPending) {
        financialStatus = 'A VENCER'
      } else if (hasPaid) {
        financialStatus = 'PAGO'
      } else {
        financialStatus = payments[0].status === 'RECEIVED' || payments[0].status === 'CONFIRMED' ? 'PAGO' : 'VERIFICAR'
      }

      const paidPayments = payments.filter((p: any) => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH')
      const pendingOrOverdue = payments.filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE')
      
      if (paidPayments.length > 0) {
         paidPayments.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
         financialDetails.lastPaidDate = paidPayments[0].dueDate 
      }

      const startDate = client.start_date ? new Date(client.start_date) : null
      const endDate = client.end_date ? new Date(client.end_date) : null
      const lastPaid = financialDetails.lastPaidDate ? new Date(financialDetails.lastPaidDate) : null

      // Meses pagos: do inicio_contrato ate HOJE (meses decorridos)
      const today = new Date()
      if (startDate) {
          let m = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth())
          if (today.getDate() < startDate.getDate()) m--
          financialDetails.paidMonths = m > 0 ? m : 0
      } else {
          financialDetails.paidMonths = paidPayments.length
      }

      // Meses faltantes: de HOJE ate fim_contrato
      if (endDate) {
          let m = (endDate.getFullYear() - today.getFullYear()) * 12 + (endDate.getMonth() - today.getMonth())
          if (today.getDate() < endDate.getDate()) m++
          financialDetails.pendingMonths = m > 0 ? m : 0
      } else {
          financialDetails.pendingMonths = pendingOrOverdue.length
      }

      // Proximo pagamento
      if (pendingOrOverdue.length > 0) {
         pendingOrOverdue.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
         financialDetails.nextDueDate = pendingOrOverdue[0].dueDate
      } else if (lastPaid) {
         const next = new Date(lastPaid)
         next.setMonth(next.getMonth() + 1)
         financialDetails.nextDueDate = next.toISOString().split('T')[0]
      }

      if (financialDetails.nextDueDate) {
         const nextDate = new Date(financialDetails.nextDueDate)
         const today = new Date()
         const diffTime = nextDate.getTime() - today.getTime()
         financialDetails.daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      }
    }

    // 4. Atualiza os metadados do cliente
    let clientMeta = client.metadata || {}
    if (typeof clientMeta === 'string') {
      try { clientMeta = JSON.parse(clientMeta) } catch(e) { clientMeta = {} }
    }

    clientMeta.financial_status = financialStatus
    clientMeta.financial_details = financialDetails

    // ===== AUTO-RENOVAÇÃO =====
    let autoRenewPayload: any = {}
    if (clientMeta.auto_renew && client.start_date && client.end_date) {
      const today = new Date()
      const startDate = new Date(client.start_date)
      let endDate = new Date(client.end_date)
      const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())

      if (durationMonths > 0 && today > endDate) {
        const isStillPaying = financialStatus === 'PAGO' || financialStatus === 'A VENCER'
        if (isStillPaying) {
          while (endDate < today) {
            endDate.setMonth(endDate.getMonth() + durationMonths)
          }
          autoRenewPayload.end_date = endDate.toISOString().split('T')[0]
          // Recalcula meses faltantes
          let pendM = (endDate.getFullYear() - today.getFullYear()) * 12 + (endDate.getMonth() - today.getMonth())
          if (today.getDate() < endDate.getDate()) pendM++
          financialDetails.pendingMonths = pendM > 0 ? pendM : 0
          clientMeta.financial_details = financialDetails
        }
      }
    }

    await supabaseAdmin
      .from('clients')
      .update({ metadata: clientMeta, ...autoRenewPayload })
      .eq('id', client.id)

    // 5. Registra o histórico na tabela workflow_history
    await supabaseAdmin
      .from('workflow_history')
      .insert({
        client_id: client.id,
        department: 'Financeiro',
        action: 'Sincronização Webhook Asaas',
        actor: 'Sistema (Asaas Webhook)',
        details: {
          event: event,
          paymentId: payment.id,
          financialStatus: financialStatus,
          value: payment.value,
          dueDate: payment.dueDate
        }
      })

    console.log(`[Asaas Webhook] Sucesso ao atualizar cliente ${client.name} para o status ${financialStatus}`)

    return new Response(JSON.stringify({ success: true, financialStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[Asaas Webhook] Erro: ${error.message}`)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
