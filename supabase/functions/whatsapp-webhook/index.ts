import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

// URL e Chave pública do Supabase configuradas no ambiente
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    
    // Processamento do Webhook da Evolution API
    // Ignorar status de envio, processar apenas recebimento
    if (payload.event !== "messages.upsert") {
      return new Response("Event ignored", { status: 200 });
    }

    const messageObj = payload.data?.messages?.[0];
    if (!messageObj || messageObj.key.fromMe) {
      return new Response("Ignored outbond message", { status: 200 });
    }

    const fromNumber = messageObj.key.remoteJid.replace("@s.whatsapp.net", "");
    const messageContent = messageObj.message?.conversation || messageObj.message?.extendedTextMessage?.text || "";

    console.log(`Mensagem recebida de ${fromNumber}: ${messageContent}`);

    // 1. CHECAR APROVAÇÕES PENDENTES
    const { data: pendingApproval } = await supabase
      .from("whatsapp_approvals")
      .select("*, department_tasks(*)")
      .eq("phone_number", fromNumber)
      .eq("status", "pending")
      .single();

    if (pendingApproval) {
      const responseText = messageContent.trim();
      let newStatus = "";
      let taskStatus = "";
      let replyMessage = "";

      if (responseText === "1") {
        newStatus = "approved";
        taskStatus = "Aprovado";
        replyMessage = "✅ Material Aprovado! Nossa equipe já foi notificada e dará andamento.";
      } else if (responseText === "2") {
        newStatus = "rejected";
        taskStatus = "Refazer";
        replyMessage = "❌ Solicitado refação. Por favor, detalhe o que precisa ser ajustado digitando uma mensagem comum.";
      } else if (responseText === "3") {
        newStatus = "reschedule";
        taskStatus = "Refazer"; // Usamos refazer como reagendar neste caso, ou podemos criar status custom
        replyMessage = "📅 Solicitação de reagendamento confirmada. O colaborador entrará em contato em breve.";
      } else {
        replyMessage = "⚠️ Opção inválida. Digite 1 para Sim, 2 para Não ou 3 para Reagendar.";
        return sendWhatsAppMessage(fromNumber, replyMessage);
      }

      // Atualiza a aprovação
      await supabase.from("whatsapp_approvals").update({ status: newStatus }).eq("id", pendingApproval.id);
      
      // Atualiza o card do Kanban
      await supabase.from("department_tasks").update({ status: taskStatus }).eq("id", pendingApproval.task_id);

      // Notifica o colaborador (se ele tiver whatsapp)
      if (pendingApproval.employee_id) {
        const { data: emp } = await supabase.from("employees").select("whatsapp_number, name").eq("id", pendingApproval.employee_id).single();
        if (emp?.whatsapp_number) {
          await sendWhatsAppMessage(emp.whatsapp_number, `🔔 *Aprovação Kanban*\nO cliente acabou de responder com a opção *${responseText}* para a tarefa "${pendingApproval.department_tasks.title}". O painel foi atualizado.`);
        }
      }

      // Confirma pro cliente
      await sendWhatsAppMessage(fromNumber, replyMessage);
      return new Response("Approval processed", { status: 200 });
    }

    // 2. BUSCAR CLIENTE
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, whatsapp_number")
      .eq("whatsapp_number", fromNumber)
      .single();

    if (!client) {
      // Opcional: Responder que não está cadastrado
      return new Response("Client not found", { status: 200 });
    }

    // 3. REGISTRAR MENSAGEM NO BANCO (Para aparecer no Chat da Plataforma)
    await supabase.from("whatsapp_messages").insert({
      client_id: client.id,
      direction: "inbound",
      from_number: fromNumber,
      content: messageContent,
      status: "received"
    });

    // 4. LÓGICA DE ROTEAMENTO / MENU
    // Como simplificação para o webhook, consideramos que a resposta do chatbot será gerenciada 
    // lendo os "client_services" e cruzando com o "employee_client_assignments".
    // Aqui injetamos apenas o roteamento direto se houver um atendente primário ou se estiver no menu.
    
    // (A implementação completa do menu de bot pode ser acoplada aqui ou via um webhook secundário do Typebot)
    // Para notificar o funcionário primário daquele cliente:
    const { data: assignment } = await supabase
      .from("employee_client_assignments")
      .select("*, employees(whatsapp_number, name)")
      .eq("client_id", client.id)
      .eq("is_primary", true)
      .limit(1)
      .single();

    if (assignment && assignment.employees?.whatsapp_number) {
      await sendWhatsAppMessage(assignment.employees.whatsapp_number, `💬 *Nova msg de ${client.name}*:\n"${messageContent}"\n\n_Acesse a plataforma para responder._`);
    }

    return new Response("Message processed", { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response("Error processing webhook", { status: 500 });
  }
});

// Mock de envio para Evolution API (Ajustar com URL real)
async function sendWhatsAppMessage(to: string, text: string) {
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
  const instance = Deno.env.get("EVOLUTION_INSTANCE");
  const token = Deno.env.get("EVOLUTION_API_KEY");

  if (!evolutionUrl || !instance || !token) {
    console.log("Variáveis de ambiente do Evolution API não configuradas. Simulação de envio para:", to);
    return;
  }

  try {
    await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": token
      },
      body: JSON.stringify({
        number: to,
        options: { delay: 1200 },
        textMessage: { text: text }
      })
    });
  } catch (err) {
    console.error("Erro ao disparar Evolution:", err);
  }
}
