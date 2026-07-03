import re

file_path = r'c:\Users\HP\.gemini\antigravity\scratch\marketing-app\src\layouts\MainLayout.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """      // Busca todas as tarefas ativas para processar notificações globais (SLA, Aprovações, Handoffs)
      const { data: allTasks, error: errTasks } = await supabase
        .from('department_tasks')
        .select('id, title, status, client_id, department, metadata, updated_at')
        .neq('status', 'Concluído');

      if (!errTasks && allTasks) {
        const DEPT_SERVICE_MAP = {
          'Social Mídia': 'social-media',
          'Tráfego Pago': 'trafego',
          'Edição': 'edicao',
          'Captação': 'captacao',
          'Design': 'design',
        };

        const relevantTasks = allTasks.filter(t => {
          if (isOwnerOrAdmin) return true;
          const destDept = t.metadata?.sent_to_department || t.department;
          const serviceId = DEPT_SERVICE_MAP[destDept];
          return serviceId && hasService(serviceId);
        });

        if (relevantTasks.length > 0) {
          const cIds = [...new Set(relevantTasks.map(t => t.client_id))].filter(Boolean);
          let cliMap = {};
          if (cIds.length > 0) {
            const { data: tClients } = await supabase.from('clients').select('id, name').in('id', cIds);
            if (tClients) tClients.forEach(tc => { cliMap[tc.id] = tc.name; });
          }

          const now = Date.now();
          const yesterday = now - 24 * 60 * 60 * 1000;

          relevantTasks.forEach(t => {
            const destDept = t.metadata?.sent_to_department || t.department;
            const destPath = ALL_NAV.find(n => n.name === destDept)?.path || '/';

            // 1. Handoffs pendentes
            if (t.status === 'Em Revisão' && t.metadata?.waiting_handoff && t.metadata?.sent_to_department) {
              notifs.push({
                id: 'handoff_' + t.id,
                title: `Novo Material p/ ${t.metadata.sent_to_department}`,
                description: `Recebido da ${t.department} para o cliente ${cliMap[t.client_id] || 'Desconhecido'}.`,
                time: new Date(t.updated_at || Date.now()),
                type: 'action',
                onClick: () => { navigate(`${destPath}?client=${t.client_id}`); setIsOpen(false); }
              });
            }

            // 2. Tarefas delegadas pelo CS
            if (t.status === 'A Fazer' && t.metadata?.assigned_by === 'Sucesso do Cliente') {
              notifs.push({
                id: 'cstask_' + t.id,
                title: `Demanda de Sucesso do Cliente`,
                description: `Nova solicitação para ${t.department} (${cliMap[t.client_id] || 'Desconhecido'}).`,
                time: new Date(t.updated_at || Date.now()),
                type: 'alert',
                onClick: () => { navigate(`${destPath}?client=${t.client_id}`); setIsOpen(false); }
              });
            }

            // 3. SLA Atrasado
            if (t.status !== 'Aprovado' && t.metadata?.timeLimits?.end) {
              const limit = new Date(t.metadata.timeLimits.end).getTime();
              if (now > limit) {
                notifs.push({
                  id: 'sla_' + t.id,
                  title: `⚠️ SLA Atrasado: ${t.department}`,
                  description: `A tarefa "${t.title}" do cliente ${cliMap[t.client_id] || 'Desconhecido'} estourou o prazo!`,
                  time: new Date(t.metadata.timeLimits.end),
                  type: 'alert',
                  onClick: () => { navigate(`${destPath}?client=${t.client_id}`); setIsOpen(false); }
                });
              }
            }

            // 4. Aprovações e Retrabalhos do Cliente (Últimas 24h)
            if (t.status === 'Aprovado' || t.status === 'Refazer' || t.status === 'Alteração Solicitada') {
              const updatedTime = new Date(t.updated_at).getTime();
              if (updatedTime > yesterday) {
                const isApproved = t.status === 'Aprovado';
                notifs.push({
                  id: 'status_' + t.id,
                  title: isApproved ? `✅ Aprovado pelo Cliente` : `❌ Ajuste Solicitado`,
                  description: `O cliente ${cliMap[t.client_id] || 'Desconhecido'} ${isApproved ? 'aprovou' : 'solicitou alteração em'} "${t.title}".`,
                  time: new Date(t.updated_at),
                  type: isApproved ? 'action' : 'alert',
                  onClick: () => { navigate(`${destPath}?client=${t.client_id}`); setIsOpen(false); }
                });
              }
            }
          });
        }
      }"""

# Use regex to find the block starting with "// Busca tarefas pendentes aguardando Handoff"
# and ending right before "// Busca mensagens recentes do chat (últimas 24h)"

pattern = re.compile(
    r'\s*// Busca tarefas pendentes aguardando Handoff para os departamentos do usuário.*?// Busca tarefas delegadas pelo Sucesso do Cliente.*?}\s*}\s*(?=\s*// Busca mensagens recentes do chat \(últimas 24h\))',
    re.DOTALL
)

new_content = pattern.sub('\n' + replacement + '\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement successful.")
