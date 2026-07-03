import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Calendar as CalendarIcon, Plus, X, MapPin, Trash2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import CaptacaoPipeline from '../components/CaptacaoPipeline';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import CaptacaoCalendar from '../components/CaptacaoCalendar';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CaptacaoAgenda = ({ client }) => {
  const { user } = useAuth();
  if (!client) return null;
  const { tasks, updateTask, addTask, deleteTask } = useDepartmentTasks(client.id, 'Captação');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ title: '', scheduled_for: '', deadline: '', assigned_to: '', location: '' });
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [captadorSchedule, setCaptadorSchedule] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    supabase.from('employees').select('id, name').eq('status', 'active').then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => {
    if (!formData.assigned_to) {
      setCaptadorSchedule([]);
      return;
    }
    const fetchSchedule = async () => {
      const { data } = await supabase
        .from('department_tasks')
        .select('id, scheduled_for, title, client_id')
        .eq('assigned_to', formData.assigned_to)
        .eq('status', 'Agendado')
        .not('scheduled_for', 'is', null);
        
      if (data) {
        setCaptadorSchedule(data.map(t => ({
          ...t,
          date: new Date(t.scheduled_for)
        })));
      }
    };
    fetchSchedule();
  }, [formData.assigned_to]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingTask(null);
      }
    };
    if (isModalOpen || editingTask) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, editingTask]);

  useEffect(() => {
    const handleOpenSchedule = (e) => {
      if (e.detail) {
        openEditModal(e.detail);
      }
    };
    window.addEventListener('open_captacao_schedule_modal', handleOpenSchedule);
    return () => window.removeEventListener('open_captacao_schedule_modal', handleOpenSchedule);
  }, []);

  const waitingTasks = tasks.filter(t => (t.status === 'Agendado' || t.status === 'Pendente' || t.status === 'Reagendamento Solicitado' || t.status === 'Aguardando Agendamento' || t.status === 'A Fazer') && !t.metadata?.capture_started);

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    const now = new Date();
    
    await addTask({
      title: formData.title,
      status: formData.scheduled_for ? 'Pendente' : 'Aguardando Agendamento',
      scheduled_for: formData.scheduled_for || null,
      assigned_to: formData.assigned_to,
      metadata: { 
        location: formData.location,
        deadline: formData.deadline,
        calendar_status: 'pending_client',
        client_approved_schedule: false,
        history: [{ action: formData.scheduled_for ? 'Agendamento sugerido (Aguardando Aprovação)' : 'Demanda recebida (Aguardando Agendamento Interno)', date: now.toISOString() }]
      }
    });

    if (formData.scheduled_for) {
      try {
        await supabase.from('chat_messages').insert({
          client_id: client.id,
          department: 'Captação',
          sender_id: user?.id,
          sender_name: user?.name || user?.email || 'Equipe ROI Expert',
          sender_type: 'employee',
          content: `🎥 Nova data de Captação sugerida para: ${new Date(formData.scheduled_for).toLocaleString('pt-BR')}. Por favor, aprove no seu painel!`,
          is_internal: false,
        });
      } catch (e) { console.warn(e); }
    }

    setIsModalOpen(false);
    setFormData({ title: '', scheduled_for: '', deadline: '', assigned_to: '', location: '' });
  };

  const handleEditAppointment = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    
    const wasWaiting = editingTask.status === 'Aguardando Agendamento';
    const hasNewDate = !!formData.scheduled_for;
    
    await updateTask(editingTask.id, {
      title: formData.title,
      status: (wasWaiting && hasNewDate) ? 'Pendente' : editingTask.status,
      scheduled_for: formData.scheduled_for || null,
      assigned_to: formData.assigned_to,
      metadata: {
        ...editingTask.metadata,
        deadline: formData.deadline,
        location: formData.location,
        history: [...(editingTask.metadata?.history || []), { action: (wasWaiting && hasNewDate) ? 'Data de gravação sugerida (Enviado para aprovação do cliente)' : 'Demanda editada', date: new Date().toISOString() }]
      }
    });
    
    if (hasNewDate && (wasWaiting || editingTask.scheduled_for !== formData.scheduled_for)) {
      try {
        await supabase.from('chat_messages').insert({
          client_id: client.id,
          department: 'Captação',
          sender_id: user?.id,
          sender_name: user?.name || user?.email || 'Equipe ROI Expert',
          sender_type: 'employee',
          content: `🎥 Atualização na Captação: Nova data sugerida para ${new Date(formData.scheduled_for).toLocaleString('pt-BR')}. Por favor, aprove!`,
          is_internal: false,
        });
      } catch (e) { console.warn(e); }
    }
    
    setEditingTask(null);
    setFormData({ title: '', scheduled_for: '', deadline: '', assigned_to: '', location: '' });
    alert('Agendamento atualizado com sucesso!');
  };

  const safelyGetDateString = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 16);
    } catch(e) {
      return '';
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    const needsMigration = !task.metadata?.deadline && task.scheduled_for;
    const initialDeadline = needsMigration 
      ? safelyGetDateString(task.scheduled_for) 
      : safelyGetDateString(task.metadata?.deadline);
      
    const initialScheduledFor = needsMigration
      ? '' 
      : safelyGetDateString(task.scheduled_for);

    setFormData({
      title: task.title || '',
      deadline: initialDeadline,
      scheduled_for: initialScheduledFor,
      assigned_to: task.assigned_to || '',
      location: task.metadata?.location || client.address || ''
    });
  };

  const handleManualApproval = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    await updateTask(taskId, {
      status: 'A Fazer',
      metadata: {
        ...task.metadata,
        client_approved_schedule: true,
        manually_approved: true,
        capture_started: true,
        started_at: new Date().toISOString(),
        history: [...(task.metadata?.history || []), { action: 'Aprovação manual realizada pelo captador/admin e movido para o Kanban', date: new Date().toISOString() }]
      }
    });
    window.dispatchEvent(new Event('refresh_captacao_pipeline'));
  };

  const handleStartCapture = async (taskId) => {
    await updateTask(taskId, { 
      status: 'A Fazer', 
      metadata: { 
        ...tasks.find(t=>t.id===taskId).metadata, 
        capture_started: true,
        started_at: new Date().toISOString() 
      } 
    });
    window.dispatchEvent(new Event('refresh_captacao_pipeline'));
  };

  const renderMiniCalendar = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={16} className="text-primary"/> Agenda do Captador
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={prevMonth} className="icon-btn" style={{ padding: 4 }}><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button type="button" onClick={nextMonth} className="icon-btn" style={{ padding: 4 }}><ChevronRight size={16}/></button>
          </div>
        </div>
        
        {!formData.assigned_to ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
            Selecione um captador ao lado para ver a disponibilidade.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1, alignContent: 'start' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, paddingBottom: 8 }}>{d}</div>
            ))}
            
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = dateObj < today;
              
              const dayEvents = captadorSchedule.filter(e => e.date.toDateString() === dateObj.toDateString());
              const isSelected = formData.scheduled_for && new Date(formData.scheduled_for).toDateString() === dateObj.toDateString();
              
              return (
                <div 
                  key={day}
                  onClick={() => {
                    if (isPast) return;
                    dateObj.setHours(9, 0, 0, 0);
                    const offset = dateObj.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
                    setFormData({...formData, scheduled_for: localISOTime});
                  }}
                  style={{ 
                    aspectRatio: '1', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isSelected ? 'var(--primary)' : (isPast ? 'transparent' : 'rgba(255,255,255,0.03)'),
                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    color: isPast ? 'rgba(255,255,255,0.2)' : (isSelected ? '#fff' : 'var(--text-main)'),
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.2s',
                    position: 'relative',
                    opacity: isPast ? 0.6 : 1
                  }}
                  onMouseOver={e => !isSelected && !isPast && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseOut={e => !isSelected && !isPast && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  {day}
                  {dayEvents.length > 0 && (
                    <div style={{ position: 'absolute', bottom: 4, display: 'flex', gap: 2 }}>
                      {dayEvents.slice(0, 3).map((_, idx) => (
                        <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#f59e0b' }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="glass-panel col-span-2">
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarIcon size={20} /> Fila de Agendamentos (Aguardando Gravação)
        </div>
        <button onClick={() => {
          setFormData({ title: '', scheduled_for: '', deadline: '', assigned_to: '', location: client.address || '' });
          setIsModalOpen(true);
        }} className="glass-btn primary btn-sm">
          <Plus size={16} /> Novo Agendamento
        </button>
      </div>

      {waitingTasks.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: 24, textAlign: 'center' }}>
          Nenhum agendamento pendente. Clique em "Novo Agendamento" para começar.
        </p>
      ) : (
        <div style={{ padding: '0 12px 12px' }}>
          <table className="recordings-table">
            <thead>
              <tr>
                <th>Demanda / Local</th>
                <th>Datas (Prazo / Gravação)</th>
                <th>Responsável</th>
                <th>SLA Aprovação</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {waitingTasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{task.title}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} /> {task.metadata?.location || 'Não informado'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>
                      Prazo: {task.metadata?.deadline ? new Date(task.metadata.deadline).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado'}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                      Gravação: {task.scheduled_for ? new Date(task.scheduled_for).toLocaleString('pt-BR', { timeZone: 'UTC' }) : <span style={{ color: '#94a3b8' }}>Aguardando agendamento...</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>
                       {task.assigned_to ? (employees.find(e => e.id === task.assigned_to)?.name || 'Não encontrado') : 'Não atribuído'}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      if (task.metadata?.client_approved_schedule) return <span style={{ color: '#34d399', fontSize: '0.75rem' }}>Finalizado</span>;
                      if (!task.metadata?.approval_deadline) return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>;
                      const deadline = new Date(task.metadata?.approval_deadline);
                      const now = new Date();
                      const diff = deadline - now;
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      if (isNaN(hours)) return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>;
                      if (diff < 0) return <span style={{ color: '#ef4444', fontWeight: 700 }}>ATRASADO</span>;
                      return <span style={{ color: '#fbbf24' }}>{hours}h restantes</span>;
                    })()}
                  </td>
                  <td>
                    {task.metadata?.client_approved_schedule ? (
                      <span className="badge-confirmed">Confirmado</span>
                    ) : (
                      <span className="badge-pending">Pendente</span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!task.metadata?.client_approved_schedule ? (
                      <>
                        {task.status === 'Aguardando Agendamento' || (!task.metadata?.deadline && task.scheduled_for) ? (
                          <button onClick={() => openEditModal(task)} className="status-btn primary" style={{ padding: '6px 10px', fontSize: '0.7rem', background: '#f59e0b' }}>
                            AGENDAR CAPTAÇÃO
                          </button>
                        ) : task.status === 'Pendente' ? (
                          <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Aguardando Cliente</span>
                        ) : task.status === 'Reagendamento Solicitado' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditModal(task)} className="status-btn primary" style={{ padding: '6px 10px', fontSize: '0.7rem', background: '#f59e0b' }}>
                              REAGENDAR
                            </button>
                            <button 
                              onClick={async () => {
                                const newDate = task.metadata?.suggested_date || task.scheduled_for;
                                await updateTask(task.id, {
                                  status: 'A Fazer',
                                  scheduled_for: newDate,
                                  metadata: {
                                    ...task.metadata,
                                    client_approved_schedule: true,
                                    manually_approved: true,
                                    capture_started: true,
                                    started_at: new Date().toISOString(),
                                    history: [...(task.metadata?.history || []), { action: 'Reagendamento aprovado pelo captador e movido para o Kanban', date: new Date().toISOString() }]
                                  }
                                });
                                window.dispatchEvent(new Event('refresh_captacao_pipeline'));
                              }} 
                              className="status-btn success" 
                              style={{ padding: '6px 10px', fontSize: '0.7rem' }}
                            >
                              APROVAR
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleManualApproval(task.id)} className="status-btn primary" style={{ padding: '6px 10px', fontSize: '0.7rem', background: '#6366f1' }}>
                            APROVAR MANUAL
                          </button>
                        )}
                        <button onClick={() => openEditModal(task)} className="icon-btn" style={{ color: '#94a3b8' }} title="Editar">
                          <Edit3 size={16} />
                        </button>
                        {confirmDeleteId === task.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button 
                              onClick={async () => {
                                try {
                                  await supabase.from('chat_messages').insert({
                                    client_id: client.id,
                                    department: 'Captação',
                                    sender_id: user?.id,
                                    sender_name: user?.name || user?.email || 'Equipe ROI Expert',
                                    sender_type: 'employee',
                                    content: `⚠️ Atenção: A demanda de captação "${task.title}" foi excluída do nosso sistema.`,
                                    is_internal: false,
                                  });
                                } catch(e) { console.warn(e); }
                                deleteTask(task.id);
                                setConfirmDeleteId(null);
                              }}
                              style={{ background: '#ef4444', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.65rem', padding: '4px 8px', cursor: 'pointer', fontWeight: 700 }}
                            >
                              SIM
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'white', fontSize: '0.65rem', padding: '4px 8px', cursor: 'pointer' }}
                            >
                              NÃO
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(task.id)} 
                            className="icon-btn" 
                            style={{ color: '#ef4444' }}
                            title="Excluir Agendamento"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button onClick={() => handleStartCapture(task.id)} className="status-btn success" style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 800 }}>
                        REALIZAR CAPTAÇÃO
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isModalOpen && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 800, maxWidth: '90vw', padding: 0, position: 'relative', background: 'var(--surface, #0f172a)', display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
              <X size={20} />
            </button>
            <div style={{ padding: 32 }}>
              <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={20} className="text-primary" /> Novo Agendamento
              </h3>
              <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="field-label">Título da Captação</label>
                    <input required className="glass-input" style={{ width: '100%' }} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Gravação de Reels" />
                  </div>
                  <div>
                    <label className="field-label">Local / Observação</label>
                    <input className="glass-input" style={{ width: '100%' }} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ex: Estúdio A" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="field-label">Data de Postagem / Prazo</label>
                      <input required type="datetime-local" min={`${new Date().getFullYear()}-01-01T00:00`} max={`${new Date().getFullYear()}-12-31T23:59`} className="glass-input" style={{ width: '100%' }} value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                    </div>
                    <div>
                      <label className="field-label">Data da Gravação (Opcional)</label>
                      <input type="datetime-local" min={`${new Date().getFullYear()}-01-01T00:00`} max={`${new Date().getFullYear()}-12-31T23:59`} className="glass-input" style={{ width: '100%' }} value={formData.scheduled_for} onChange={e => setFormData({...formData, scheduled_for: e.target.value})} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="field-label">Captador</label>
                      <select required className="glass-input" style={{ width: '100%' }} value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                        <option value="">Selecione...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="glass-btn primary" style={{ flex: 1 }}>Agendar</button>
                </div>
              </form>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
              {renderMiniCalendar()}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {editingTask && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 800, maxWidth: '90vw', padding: 0, position: 'relative', background: 'var(--surface, #0f172a)', display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
            <button type="button" onClick={() => setEditingTask(null)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
              <X size={20} />
            </button>
            <div style={{ padding: 32 }}>
              <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 size={20} className="text-primary" /> Editar Agendamento
              </h3>
              <form onSubmit={handleEditAppointment} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="field-label">Título da Captação</label>
                  <input required className="glass-input" style={{ width: '100%' }} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div>
                  <label className="field-label">Local / Observação</label>
                  <input className="glass-input" style={{ width: '100%' }} value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="field-label">Data de Postagem / Prazo</label>
                    <input required type="datetime-local" min={`${new Date().getFullYear()}-01-01T00:00`} max={`${new Date().getFullYear()}-12-31T23:59`} className="glass-input" style={{ width: '100%' }} value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                  </div>
                  <div>
                    <label className="field-label">Data da Gravação (Sugerida)</label>
                    <input type="datetime-local" min={`${new Date().getFullYear()}-01-01T00:00`} max={`${new Date().getFullYear()}-12-31T23:59`} className="glass-input" style={{ width: '100%' }} value={formData.scheduled_for} onChange={e => setFormData({...formData, scheduled_for: e.target.value})} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="field-label">Captador</label>
                    <select required className="glass-input" style={{ width: '100%' }} value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                      <option value="">Selecione...</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setEditingTask(null)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
                  <button type="submit" className="glass-btn primary" style={{ flex: 1 }}>Salvar</button>
                </div>
              </form>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 24 }}>
              {renderMiniCalendar()}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      <style>{`
        .icon-btn { background: transparent; border: none; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s; color: var(--text-muted); }
        .icon-btn:hover { background: rgba(255,255,255,0.05); transform: scale(1.1); color: var(--text-main); }
        .recordings-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.85rem; }
        .recordings-table th { text-align: left; padding: 12px; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px; }
        .recordings-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .field-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; display: block; font-weight: 500; }
        .badge-confirmed { background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(245, 158, 11, 0.3); }
      `}</style>
    </section>
  );
};

const ClientCaptacaoApprovals = ({ client }) => {
  const { user } = useAuth();
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', reason: '' });

  if (!client) return null;
  const { tasks, updateTask } = useDepartmentTasks(client.id, 'Captação');
  const pendingTasks = tasks.filter(t => t.status === 'Pendente' || t.status === 'Reagendamento Solicitado');

  const handleApprove = async (task) => {
    await updateTask(task.id, {
      status: 'A Fazer',
      metadata: {
        ...task.metadata,
        client_approved_schedule: true,
        capture_started: true,
        started_at: new Date().toISOString(),
        history: [...(task.metadata?.history || []), { action: 'Data aprovada pelo cliente e movida para Kanban', date: new Date().toISOString() }]
      }
    });

    try {
      await supabase.from('chat_messages').insert({
        client_id: client.id,
        department: 'Captação',
        sender_id: user?.id,
        sender_name: user?.name || user?.email || 'Cliente',
        sender_type: 'client',
        content: `✅ A data sugerida para a captação "${task.title}" foi aprovada pelo cliente!`,
        is_internal: false,
      });
    } catch(e) { console.warn(e); }

    alert('Data aprovada com sucesso! A captação já está em sua agenda.');
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleData.date || !rescheduleData.reason) return;

    if (rescheduleModal.scheduled_for) {
      const newD = new Date(rescheduleData.date);
      const oldD = new Date(rescheduleModal.scheduled_for);
      
      if (Math.abs(newD.getTime() - oldD.getTime()) < 60000) {
        alert('A nova data sugerida não pode ser exatamente igual à data atual do agendamento.');
        return;
      }
    }
    
    const reasonText = `Motivo: ${rescheduleData.reason} | Sugestão de data: ${new Date(rescheduleData.date).toLocaleString('pt-BR', { timeZone: 'UTC' })}`;
    
    await updateTask(rescheduleModal.id, {
      status: 'Reagendamento Solicitado',
      metadata: {
        ...rescheduleModal.metadata,
        client_approved_schedule: false,
        reschedule_reason: reasonText,
        suggested_date: rescheduleData.date,
        history: [...(rescheduleModal.metadata?.history || []), { action: `Reagendamento solicitado: ${reasonText}`, date: new Date().toISOString() }]
      }
    });

    try {
      await supabase.from('chat_messages').insert({
        client_id: client.id,
        department: 'Captação',
        sender_id: user?.id,
        sender_name: user?.name || user?.email || 'Cliente',
        sender_type: 'client',
        content: `⚠️ O cliente solicitou reagendamento para a captação "${rescheduleModal.title}".\n${reasonText}`,
        is_internal: false,
      });
    } catch(e) { console.warn(e); }

    alert('Solicitação de reagendamento enviada para a equipe.');
    setRescheduleModal(null);
    setRescheduleData({ date: '', reason: '' });
  };

  const handleRescheduleClick = (task) => {
    setRescheduleModal(task);
    setRescheduleData({ date: '', reason: '' });
  };

  const renderMiniCalendar = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={16} className="text-primary"/> Agenda do Captador
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={prevMonth} className="icon-btn" style={{ padding: 4 }}><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button type="button" onClick={nextMonth} className="icon-btn" style={{ padding: 4 }}><ChevronRight size={16}/></button>
          </div>
        </div>
        
        {!formData.assigned_to ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
            Selecione um captador ao lado para ver a disponibilidade.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1, alignContent: 'start' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, paddingBottom: 8 }}>{d}</div>
            ))}
            
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              
              const dayEvents = captadorSchedule.filter(e => e.date.toDateString() === dateObj.toDateString());
              const isSelected = formData.scheduled_for && new Date(formData.scheduled_for).toDateString() === dateObj.toDateString();
              
              return (
                <div 
                  key={day}
                  onClick={() => {
                    dateObj.setHours(9, 0, 0, 0);
                    const offset = dateObj.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
                    setFormData({...formData, scheduled_for: localISOTime});
                  }}
                  style={{ 
                    aspectRatio: '1', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: isSelected ? '#fff' : 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                >
                  {day}
                  {dayEvents.length > 0 && (
                    <div style={{ position: 'absolute', bottom: 4, display: 'flex', gap: 2 }}>
                      {dayEvents.slice(0, 3).map((_, idx) => (
                        <div key={idx} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#f59e0b' }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (pendingTasks.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: 24, borderLeft: '4px solid #f59e0b', marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b' }}>
        <CalendarIcon size={20} /> Aprovação de Captações Pendentes
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        A equipe sugeriu datas para as seguintes gravações. Por favor, confirme ou solicite reagendamento.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pendingTasks.map(task => (
          <div key={task.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-main)' }}>{task.title}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarIcon size={12} /> {task.scheduled_for ? new Date(task.scheduled_for).toLocaleString('pt-BR', { timeZone: 'UTC' }) : 'Data não informada'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {task.metadata?.location || 'Não informado'}</span>
              </div>
              {task.status === 'Reagendamento Solicitado' && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
                  Sua solicitação de reagendamento está sendo avaliada.
                </div>
              )}
            </div>
            {task.status === 'Pendente' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleRescheduleClick(task)} className="glass-btn small" style={{ color: '#ef4444' }}>Solicitar Reagendamento</button>
                <button onClick={() => handleApprove(task)} className="glass-btn primary small">Aprovar Data</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rescheduleModal && createPortal(
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={18} className="text-primary"/> Solicitar Reagendamento
              </h3>
              <button className="icon-btn" onClick={() => setRescheduleModal(null)} style={{ cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nova data da Gravação *</label>
                <input required type="datetime-local" min={`${new Date().getFullYear()}-01-01T00:00`} max={`${new Date().getFullYear()}-12-31T23:59`} className="glass-input" style={{ width: '100%' }} value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} />
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Motivo do Reagendamento *</label>
                <textarea required className="glass-input" style={{ width: '100%', minHeight: 80, resize: 'vertical' }} value={rescheduleData.reason} onChange={e => setRescheduleData({...rescheduleData, reason: e.target.value})} placeholder="Explique por que precisa reagendar..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="glass-btn" onClick={() => setRescheduleModal(null)}>Cancelar</button>
                <button type="submit" className="glass-btn primary">Enviar Solicitação</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const Captacao = () => {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <ClientFolderManager title="Departamento de Captação" description="Agendamento de gravações, copys para roteiro e feedbacks rápidos.">
      {(client) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <DepartmentGuide department="Captação" />
            <GoogleDriveConnector client={client} department="Captação" />
          </div>
          {/* Fila de agendamentos e pipeline — apenas para funcionários */}
          {!isClient && (
            <>
              <CaptacaoAgenda client={client} />
              <div style={{ marginTop: 24 }}>
                <div className="section-title"><Camera size={20} /> Pipeline de Produção (Pós-Gravação)</div>
                <CaptacaoPipeline client={client} />
              </div>
            </>
          )}
          {isClient && <ClientCaptacaoApprovals client={client} />}
          <CaptacaoCalendar client={client} />
        </div>
      )}
    </ClientFolderManager>
  );
};
export default Captacao;
