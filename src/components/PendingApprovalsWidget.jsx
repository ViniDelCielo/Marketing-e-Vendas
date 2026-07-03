import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PendingApprovalsWidget = ({ client, currentDepartment, user, onWorkflowUpdate }) => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectingTaskId, setRejectingTaskId] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');

  const deptKey = currentDepartment === 'Captação' ? 'captacao' : 'social_media';

  const fetchPending = async () => {
    if (!client?.id) return;
    try {
      const { data, error } = await supabase
        .from('department_tasks')
        .eq('client_id', client.id)
        .in('status', ['Em Revisão Interna', 'Em Revisão']);

      if (!error && data) {
        const filtered = data.filter(t => {
          let meta = t.metadata;
          if (typeof meta === 'string') {
            try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
          }
          if (meta?.waiting_handoff) return false;
          const approvedBy = meta?.approved_by || [];
          const userId = user?.employeeId || user?.id;
          if (approvedBy.includes(userId)) return false; // Already approved by me
          if (approvedBy.length >= 2) return false; // Already fully approved
          return true;
        });
        setPendingTasks(filtered);
      }
    } catch (e) {
      console.error('Error fetching pending approvals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();

    const channelName = `pending-approvals-${client?.id}-${currentDepartment}`;
    const sub = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_tasks', filter: `client_id=eq.${client.id}` }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [client?.id, currentDepartment]);

  const handleApprove = async (task) => {
    let meta = task.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
    }
    if (!meta) meta = {};
    
    const approvedBy = meta.approved_by || [];
    const userId = user?.employeeId || user?.id;
    if (!approvedBy.includes(userId)) {
      approvedBy.push(userId);
    }
    meta.approved_by = approvedBy;

    const now = new Date().toISOString();
    const history = [...(meta.history || [])];
    history.push({
      action: `Aprovação computada (${approvedBy.length}/2)`,
      by: user?.name || 'Sistema',
      date: now
    });
    meta.history = history;

    const bothApproved = approvedBy.length >= 2;
    const updates = { metadata: meta };

    if (bothApproved) {
      updates.status = task.department === 'Social Media' ? 'Aguardando Cliente' : 'Aprovado';
      history.push({
        action: `Aprovação dupla concluída. Movido para ${updates.status}.`,
        by: 'Sistema',
        date: now
      });

      if (task.department !== 'Social Media') {
        // Automatically create the task in Social Media A Fazer
        const { data: assignments } = await supabase
          .from('employee_client_assignments')
          .select('employee_id')
          .eq('client_id', client.id)
          .eq('department', 'Social Media')
          .maybeSingle();

        const socialEmployeeId = assignments?.employee_id || null;
        const socialMetadata = {
          ...meta,
          history: [{ action: 'Tarefa gerada automaticamente após aprovação interna de outro setor', by: 'Sistema', date: now }],
          original_task_id: task.id,
          sent_from_department: task.department
        };

        await supabase.from('department_tasks').insert([{
          client_id: client.id,
          department: 'Social Media',
          title: task.title,
          status: 'A Fazer',
          metadata: socialMetadata,
          assigned_to: socialEmployeeId,
          requested_sla_days: 1
        }]);
      }
    }

    const { error } = await supabase.from('department_tasks').update(updates).eq('id', task.id);
    if (error) {
      alert('Erro ao aprovar: ' + error.message);
    } else {
      window.dispatchEvent(new CustomEvent('workflow-update'));
      fetchPending();
      if (onWorkflowUpdate) onWorkflowUpdate();
    }
  };

  const handleReject = async (task) => {
    if (!rejectFeedback.trim()) {
      alert('Por favor, insira o feedback/motivo da reprovação.');
      return;
    }

    let meta = task.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
    }
    if (!meta) meta = {};

    const now = new Date().toISOString();
    const history = [...(meta.history || [])];
    history.push({
      action: `Ajuste/Reprovação solicitado por ${user?.name}: "${rejectFeedback}"`,
      by: user?.name || 'Sistema',
      date: now
    });
    meta.history = history;

    if (task.department === 'Social Media') {
      // Se já está em Social Media, só volta pra Refazer
      const { error } = await supabase.from('department_tasks').update({
        status: 'Refazer',
        feedback: rejectFeedback,
        metadata: meta
      }).eq('id', task.id);
      
      if (error) alert('Erro ao solicitar ajuste: ' + error.message);
    } else {
      // Se for de outro departamento (Edição, Captação), marca como concluída e joga a bucha pra Social Media
      const { error: updateErr } = await supabase.from('department_tasks').update({
        status: 'Concluído',
        metadata: { ...meta, history: [...history, { action: 'Fechada via Reprovação - Transferida para Social Media', by: 'Sistema', date: now }] }
      }).eq('id', task.id);

      if (!updateErr) {
        const { data: assignments } = await supabase
          .from('employee_client_assignments')
          .select('employee_id')
          .eq('client_id', client.id)
          .eq('department', 'Social Media')
          .maybeSingle();

        await supabase.from('department_tasks').insert([{
          client_id: client.id,
          department: 'Social Media',
          title: `[REFAZER] ${task.title} (${task.department})`,
          status: 'Refazer',
          feedback: rejectFeedback,
          metadata: {
            ...meta,
            history: [{ action: `Recebido do setor ${task.department} com pedido de alteração: ${rejectFeedback}`, by: user?.name || 'Sistema', date: now }],
            original_task_id: task.id,
            sent_from_department: task.department
          },
          assigned_to: assignments?.employee_id || null,
          requested_sla_days: 1
        }]);
      } else {
        alert('Erro ao redirecionar ajuste: ' + updateErr.message);
      }
    }

    setRejectingTaskId(null);
    setRejectFeedback('');
    window.dispatchEvent(new CustomEvent('workflow-update'));
    fetchPending();
    if (onWorkflowUpdate) onWorkflowUpdate();
  };

  if (loading || pendingTasks.length === 0) return null;

  return (
    <div className="pending-approvals-widget glass-card" style={{
      marginBottom: 20,
      padding: '16px 20px',
      border: '1px solid rgba(245, 158, 11, 0.2)',
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(255, 255, 255, 0.02))',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
      borderRadius: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
        <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
          Revisão de Conteúdos Pendente ({pendingTasks.length})
        </h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Aprovação interna necessária de ambos departamentos
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pendingTasks.map(task => (
          <div key={task.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 10,
            gap: 16,
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="badge" style={{ background: 'rgba(167, 139, 250, 0.2)', color: '#c084fc', fontSize: '0.7rem' }}>
                  Edição
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {task.title}
                </span>
              </div>
              {task.metadata?.drive_link && (
                <a href={task.metadata.drive_link} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                  color: '#6366f1',
                  textDecoration: 'none',
                  marginTop: 4
                }}>
                  <ExternalLink size={12} /> Abrir Material de Edição
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {rejectingTaskId === task.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Motivo da alteração..."
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', minWidth: 200, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                  />
                  <button onClick={() => handleReject(task)} className="status-btn" style={{ background: '#ef4444', color: 'white', padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                    Confirmar
                  </button>
                  <button onClick={() => setRejectingTaskId(null)} className="status-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => handleApprove(task)} style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}>
                    <Check size={14} /> Aprovar
                  </button>
                  <button onClick={() => setRejectingTaskId(task.id)} style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}>
                    <X size={14} /> Solicitar Ajuste
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingApprovalsWidget;
