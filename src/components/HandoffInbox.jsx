import { useState, useEffect, useId } from 'react';
import { supabase } from '../lib/supabase';
import { Film, CheckCircle, Clock, ArrowRightCircle, Sparkles, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';

export default function HandoffInbox({ client, currentDepartment }) {
  const [incomingTasks, setIncomingTasks] = useState([]);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, task: null, reason: '' });
  const { user } = useAuth();
  const instanceId = useId(); // ID único para evitar conflito de canais realtime
  const { addTask: addCurrentDeptTask } = useDepartmentTasks(client?.id, currentDepartment);

  useEffect(() => {
    if (!client?.id || !currentDepartment) return;

    const fetchIncoming = async () => {
      // Buscamos tarefas que tenham a flag de handoff ativa para este departamento
      const { data } = await supabase
        .from('department_tasks')
        .select('*')
        .eq('client_id', client.id)
        .or('status.eq.Em Revisão,status.eq.Concluído,status.eq.Aguardando Aceite');
      
      if (data) {
        const filtered = data.filter(t => {
          // Garantir que metadata seja objeto
          let meta = t.metadata;
          if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch(e) { meta = {}; } }
          
          return meta?.waiting_handoff === true && meta?.sent_to_department === currentDepartment;
        });
        setIncomingTasks(filtered);
      }
    };

    fetchIncoming();

    const uniqueChannelName = `handoff-${client.id}-${currentDepartment}-${instanceId.replace(/:/g, '')}`;

    const channel = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_tasks', filter: `client_id=eq.${client.id}` }, () => {
        fetchIncoming();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [client?.id, currentDepartment, instanceId]);

  const handleAcceptMaterial = async (task) => {
    try {
      console.log('Aceitando material:', task.id, task.title);

      // 1. Marca a tarefa de origem como Concluída
      let currentMetadata = task.metadata;
      if (typeof currentMetadata === 'string') {
        try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
      }
      if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

      const history = currentMetadata.history || [];
      const newHistoryEntry = {
        action: `Material Aceito por ${currentDepartment}`,
        by: user?.name || 'Membro da Equipe',
        date: new Date().toISOString()
      };
      
      const newMetadata = { 
        ...currentMetadata, 
        history: [...history, newHistoryEntry],
        waiting_handoff: false 
      };

      // Atualiza a tarefa original (de Edição, por exemplo)
      const { error: updateErr } = await supabase.from('department_tasks').update({ 
        status: 'Concluído',
        metadata: newMetadata 
      }).eq('id', task.id);

      if (updateErr) throw updateErr;

      let initialStatus = 'Prontos p/ Editar';

      // 2. Cria uma nova tarefa no departamento atual (ex: Social Media)
      // Usamos o addTask do hook que já injeta client_id e departmentName
      const createdTask = await addCurrentDeptTask({
        title: task.title,
        status: initialStatus,
        assigned_to: null,
        requested_sla_days: task.requested_sla_days || currentMetadata.requested_sla_days || 0,
        scheduled_for: task.scheduled_for || currentMetadata.publishDate || null,
        metadata: {
          chain_id: currentMetadata.chain_id || task.id, 
          original_task_id: task.id,
          received_from: task.department,
          drive_link: currentMetadata.drive_link,
          platform: currentMetadata.platform,
          description: currentMetadata.description,
          publishDate: currentMetadata.publishDate,
          requested_sla_days: currentMetadata.requested_sla_days,
          type: currentMetadata.type || 'Atividade',
          history: [{
            action: `Iniciado em ${currentDepartment}`,
            by: user?.name || 'Membro da Equipe',
            date: new Date().toISOString()
          }]
        }
      });

      if (createdTask) {
        console.log('Nova tarefa criada com sucesso:', createdTask.id);
        window.dispatchEvent(new CustomEvent('workflow-update'));
        alert(`Material aceito! O card já deve aparecer na sua coluna "Prontos p/ Editar".`);
      } else {
        throw new Error("Falha ao criar a nova tarefa no Kanban.");
      }

      setIncomingTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (err) {
      console.error('Erro no handoff:', err);
      alert("Erro ao aceitar o material: " + err.message);
    }
  };

  const handleRejectMaterial = (task) => {
    setRejectModal({ isOpen: true, task, reason: '' });
  };

  const confirmReject = async () => {
    const { task, reason } = rejectModal;
    if (!reason.trim()) {
      alert("Por favor, digite o motivo da recusa.");
      return;
    }

    try {
      console.log('Recusando material:', task.id, task.title);

      let currentMetadata = task.metadata;
      if (typeof currentMetadata === 'string') {
        try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
      }
      if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

      const history = currentMetadata.history || [];
      const newHistoryEntry = {
        action: `Demanda Recusada por ${currentDepartment}. Motivo: ${reason}`,
        by: user?.name || 'Membro da Equipe',
        date: new Date().toISOString()
      };
      
      const newMetadata = { 
        ...currentMetadata, 
        history: [...history, newHistoryEntry],
        waiting_handoff: false 
      };

      const { error: updateErr } = await supabase.from('department_tasks').update({ 
        status: 'Refazer', // Devolve como Refazer
        metadata: newMetadata 
      }).eq('id', task.id);

      if (updateErr) throw updateErr;

      setRejectModal({ isOpen: false, task: null, reason: '' });
      setIncomingTasks(prev => prev.filter(t => t.id !== task.id));
      window.dispatchEvent(new CustomEvent('workflow-update'));
      alert("A demanda foi devolvida ao setor de origem com sucesso.");
    } catch (err) {
      console.error('Erro ao recusar:', err);
      alert("Erro ao recusar a demanda: " + err.message);
    }
  };

  if (!incomingTasks.length) return null;

  return (
    <div className="handoff-inbox-premium" style={{ 
      padding: '20px', 
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', 
      border: '2px solid rgba(168, 85, 247, 0.3)', 
      borderRadius: '16px',
      marginBottom: '20px',
      boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
      animation: 'glow-border 2s infinite alternate'
    }}>
      <h4 style={{ margin: '0 0 16px 0', color: '#a855f7', display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.1rem', fontWeight: 800 }}>
        <Sparkles size={20} className="text-secondary" /> 
        VOCÊ TEM NOVOS MATERIAIS PARA ACEITAR ({incomingTasks.length})
      </h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {incomingTasks.map(task => (
          <div key={task.id} className="handoff-item-card" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            background: 'rgba(0,0,0,0.4)', 
            padding: '16px 20px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,255,255,0.1)',
            transition: '0.3s'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Vindo de: {task.department}
              </span>
              <strong style={{ display: 'block', fontSize: '1rem', color: '#fff', marginTop: 4 }}>{task.title}</strong>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} /> Enviado em {new Date(task.updated_at).toLocaleString()}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
               {task.metadata?.drive_link && (
                <a href={task.metadata.drive_link} target="_blank" rel="noreferrer" style={{ 
                  color: '#93c5fd', 
                  textDecoration: 'none', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px'
                }}>
                  Ver Drive
                </a>
              )}
              <button onClick={() => handleAcceptMaterial(task)} className="accept-btn-premium" style={{ 
                background: '#10b981', 
                color: '#fff', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '10px', 
                fontWeight: 800, 
                fontSize: '0.85rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <CheckCircle size={18} /> ACEITAR
              </button>

              <button onClick={() => handleRejectMaterial(task)} className="reject-btn-premium" style={{ 
                background: '#ef4444', 
                color: '#fff', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '10px', 
                fontWeight: 800, 
                fontSize: '0.85rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <XCircle size={18} /> RECUSAR
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes glow-border {
          from { border-color: rgba(168, 85, 247, 0.3); box-shadow: 0 0 10px rgba(168, 85, 247, 0.1); }
          to { border-color: rgba(168, 85, 247, 0.8); box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
        }
        .handoff-item-card:hover {
          border-color: rgba(168, 85, 247, 0.5);
          background: rgba(0,0,0,0.5);
          transform: translateX(4px);
        }
        }
        .accept-btn-premium:hover, .reject-btn-premium:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 450, maxWidth: '90%', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircle size={24} /> Recusar Demanda
            </h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Por favor, informe o motivo da recusa. O card voltará para o setor de origem (<strong>{rejectModal.task?.department}</strong>) na coluna "Refazer".
            </p>
            <textarea
              className="glass-input"
              rows={4}
              style={{ width: '100%', marginBottom: 16 }}
              placeholder="Ex: Falta o link do drive..."
              value={rejectModal.reason}
              onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="glass-btn"
                onClick={() => setRejectModal({ isOpen: false, task: null, reason: '' })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="glass-btn primary"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={confirmReject}
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
