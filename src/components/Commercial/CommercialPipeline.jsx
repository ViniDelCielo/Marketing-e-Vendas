import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, Phone, Mail, Building, DollarSign, X, MessageSquare, Send, Calendar, CheckSquare, Clock, User, Award, Tag, ArrowRight, Bot, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STAGES = ['Novo Lead', 'Qualificação', 'Reunião Agendada', 'Proposta Enviada', 'Em Negociação', 'Ganho', 'Perdido'];

const CommercialPipeline = ({ leads, employees, onLeadsChange }) => {
  const authContext = useAuth();
  const currentUser = authContext?.user;

  const [draggedLead, setDraggedLead] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Lead details drawer (Raio-X) state
  const [selectedLead, setSelectedLead] = useState(null);
  const [rightPanelTab, setRightPanelTab] = useState('notes'); // 'notes' | 'whatsapp'
  const [interactions, setInteractions] = useState([]);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);

  // Forms
  const [newInteraction, setNewInteraction] = useState('');
  const [interactionType, setInteractionType] = useState('note');
  const [taskName, setTaskName] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskCategory, setTaskCategory] = useState('call');
  const [waMessageText, setWaMessageText] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [loadingWa, setLoadingWa] = useState(false);

  // Filters
  const [sellerFilter, setSellerFilter] = useState('all'); // 'all' | 'me' | 'employee_id'

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchActiveConnections();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      fetchInteractions(selectedLead.id);
      fetchWhatsappMessages(selectedLead.phone);
    }
  }, [selectedLead]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [whatsappMessages]);

  const fetchActiveConnections = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'commercial_whatsapp_configs')
        .single();
      
      if (data?.value) {
        const active = data.value.filter(c => c.status === 'connected');
        setActiveConnections(active);
        if (active.length > 0) {
          setSelectedConnection(active[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching active whatsapp configs:', e);
    }
  };

  const fetchInteractions = async (leadId) => {
    try {
      const { data } = await supabase
        .from('commercial_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      setInteractions(data || []);
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  };

  const fetchWhatsappMessages = async (phone) => {
    if (!phone) {
      setWhatsappMessages([]);
      return;
    }
    setLoadingWa(true);
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .or(`from_number.eq.${cleanPhone},to_number.eq.${cleanPhone},from_number.eq.55${cleanPhone},to_number.eq.55${cleanPhone}`)
        .order('created_at', { ascending: true });
      
      setWhatsappMessages(data || []);
    } catch (err) {
      console.error('Error fetching whatsapp messages:', err);
    } finally {
      setLoadingWa(false);
    }
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDirectDelete = async (id) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('commercial_leads').delete().eq('id', id);
      if (error) throw error;
      onLeadsChange();
      setConfirmDeleteId(null);
      if (selectedLead?.id === id) {
        setSelectedLead(null);
      }
    } catch (err) {
      alert('Erro ao excluir lead: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrop = async (e, stage) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.status === stage) return;
    
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ status: stage, updated_at: new Date().toISOString() })
        .eq('id', draggedLead.id);
        
      if (error) throw error;
      
      // Log transition note
      await supabase.from('commercial_interactions').insert([{
        lead_id: draggedLead.id,
        employee_id: currentUser?.employeeId || null,
        type: 'note',
        content: `Mapeado no Pipeline para: ${stage}`
      }]);

      if (selectedLead?.id === draggedLead.id) {
        setSelectedLead({ ...selectedLead, status: stage });
        fetchInteractions(draggedLead.id);
      }

      onLeadsChange();
    } catch (err) {
      alert('Erro ao mover lead: ' + err.message);
    }
    setDraggedLead(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.trim() || !selectedLead) return;
    try {
      const { error } = await supabase.from('commercial_interactions').insert([{
        lead_id: selectedLead.id,
        employee_id: currentUser?.employeeId || null,
        type: interactionType,
        content: newInteraction
      }]);
      if (error) throw error;
      setNewInteraction('');
      fetchInteractions(selectedLead.id);
    } catch (err) {
      alert('Erro ao adicionar interação: ' + err.message);
    }
  };

  const handleScheduleTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim() || !taskDueDate || !selectedLead) return;

    const taskPayload = {
      taskName: taskName.trim(),
      due_date: taskDueDate,
      category: taskCategory,
      completed: false,
      completed_at: null
    };

    try {
      const { error } = await supabase.from('commercial_interactions').insert([{
        lead_id: selectedLead.id,
        employee_id: currentUser?.employeeId || null,
        type: 'task',
        content: JSON.stringify(taskPayload)
      }]);
      if (error) throw error;
      
      setTaskName('');
      setTaskDueDate('');
      fetchInteractions(selectedLead.id);
    } catch (err) {
      alert('Erro ao agendar tarefa: ' + err.message);
    }
  };

  const toggleTaskCompleted = async (interaction, isChecked) => {
    try {
      const parsed = JSON.parse(interaction.content);
      parsed.completed = isChecked;
      parsed.completed_at = isChecked ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('commercial_interactions')
        .update({ content: JSON.stringify(parsed) })
        .eq('id', interaction.id);

      if (error) throw error;
      fetchInteractions(selectedLead.id);
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    if (!waMessageText.trim() || !selectedLead || !selectedLead.phone) return;
    setSendingWa(true);

    const cleanPhone = selectedLead.phone.replace(/\D/g, '');
    const messageContent = waMessageText.trim();

    try {
      const { error: dbErr } = await supabase.from('whatsapp_messages').insert([{
        direction: 'outbound',
        from_number: selectedConnection?.whatsapp_number || 'Comercial',
        to_number: cleanPhone,
        content: messageContent,
        status: 'sent'
      }]);
      if (dbErr) throw dbErr;

      if (selectedConnection && selectedConnection.api_url && selectedConnection.api_key && selectedConnection.instance_name) {
        try {
          await fetch(`${selectedConnection.api_url}/message/sendText/${selectedConnection.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': selectedConnection.api_key
            },
            body: JSON.stringify({
              number: cleanPhone,
              options: { delay: 1000 },
              textMessage: { text: messageContent }
            })
          });
        } catch (apiErr) {
          console.warn('WhatsApp API send failed (CORS or offline), message saved locally:', apiErr);
        }
      }

      setWaMessageText('');
      fetchWhatsappMessages(selectedLead.phone);
      
      await supabase.from('commercial_interactions').insert([{
        lead_id: selectedLead.id,
        employee_id: currentUser?.employeeId || null,
        type: 'email',
        content: `WhatsApp enviado: "${messageContent.slice(0, 60)}${messageContent.length > 60 ? '...' : ''}"`
      }]);
      fetchInteractions(selectedLead.id);

      // Chatbot auto reply simulation
      if (selectedLead.name.toLowerCase().includes('teste') || selectedLead.origin === 'Outbound') {
        setTimeout(async () => {
          await supabase.from('whatsapp_messages').insert([{
            direction: 'inbound',
            from_number: cleanPhone,
            to_number: selectedConnection?.whatsapp_number || 'Comercial',
            content: `Olá! Recebi seu WhatsApp: "${messageContent.slice(0, 20)}...". Retornaremos em breve!`,
            status: 'received'
          }]);
          fetchWhatsappMessages(selectedLead.phone);
        }, 2000);
      }

    } catch (err) {
      alert('Erro ao enviar WhatsApp: ' + err.message);
    } finally {
      setSendingWa(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;

      await supabase.from('commercial_interactions').insert([{
        lead_id: leadId,
        employee_id: currentUser?.employeeId || null,
        type: 'note',
        content: `Status alterado para: ${newStatus}`
      }]);

      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
      onLeadsChange();
    } catch (err) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleAssignedSellerChange = async (leadId, employeeId) => {
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ assigned_to: employeeId || null })
        .eq('id', leadId);
      if (error) throw error;

      const sellerName = employees.find(e => e.id === employeeId)?.name || 'Nenhum';
      await supabase.from('commercial_interactions').insert([{
        lead_id: leadId,
        employee_id: currentUser?.employeeId || null,
        type: 'note',
        content: `Lead atribuído ao vendedor: ${sellerName}`
      }]);

      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, assigned_to: employeeId });
      }
      onLeadsChange();
    } catch (err) {
      alert('Erro ao atribuir vendedor: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Ganho') return '#10b981';
    if (status === 'Perdido') return '#ef4444';
    if (status === 'Novo Lead') return '#3b82f6';
    if (status === 'Proposta Enviada') return '#8b5cf6';
    return '#f59e0b';
  };

  // Filter leads based on seller filter
  const sellerFilteredLeads = leads.filter(lead => {
    if (sellerFilter === 'all') return true;
    if (sellerFilter === 'me') return lead.assigned_to === currentUser?.employeeId;
    return lead.assigned_to === sellerFilter;
  });

  const tasks = interactions
    .filter(i => i.type === 'task')
    .map(i => {
      try {
        const parsed = JSON.parse(i.content);
        return { ...parsed, interactionId: i.id, raw: i };
      } catch {
        return { taskName: i.content, due_date: i.created_at, category: 'call', completed: false, interactionId: i.id, raw: i };
      }
    });

  const pendingTasksCount = tasks.filter(t => !t.completed).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      
      {/* PIPELINE FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Responsável no Funil:</span>
          <select 
            className="glass-input" 
            style={{ height: '36px', padding: '0 12px', fontSize: '0.82rem' }}
            value={sellerFilter}
            onChange={e => setSellerFilter(e.target.value)}
          >
            <option value="all">Funil Completo (Todos)</option>
            {currentUser?.employeeId && <option value="me">Meus Leads</option>}
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Arraste e solte os cards para atualizar as etapas de vendas.
        </div>
      </div>

      {/* PIPELINE BOARD */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', flex: 1, minHeight: '600px', alignItems: 'start' }}>
        
        {STAGES.map(stage => {
          const columnLeads = sellerFilteredLeads.filter(l => l.status === stage);
          const totalValue = columnLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
          
          return (
            <div 
              key={stage} 
              className="kanban-column"
              style={{ 
                minWidth: '290px', 
                background: 'rgba(0,0,0,0.15)', 
                borderRadius: '12px', 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                maxHeight: 'calc(100vh - 280px)',
                overflowY: 'hidden'
              }}
              onDrop={(e) => handleDrop(e, stage)}
              onDragOver={handleDragOver}
            >
              
              {/* COLUMN HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: stage === 'Ganho' ? '#10b981' : stage === 'Perdido' ? '#ef4444' : 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(stage), display: 'inline-block' }}></span>
                  {stage}
                </h4>
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                  {columnLeads.length}
                </span>
              </div>
              
              {totalValue > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </div>
              )}
              
              {/* COLUMN CARDS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {columnLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    className="glass-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onClick={() => handleLeadClick(lead)}
                    style={{ 
                      padding: '12px', 
                      cursor: 'grab', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      borderLeft: `3px solid ${getStatusColor(stage)}`,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 10,
                      transition: '0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white' }}>{lead.name}</div>
                      
                      <div style={{ display: 'flex', gap: 4 }}>
                        {confirmDeleteId === lead.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); handleDirectDelete(lead.id); }}
                              disabled={deletingId === lead.id}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                              Sim
                            </button>
                            <button
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button 
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(lead.id); }} 
                            className="icon-btn text-muted" 
                            style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }} 
                            onMouseOver={e => e.currentTarget.style.opacity = 1}
                            onMouseOut={e => e.currentTarget.style.opacity = 0.3}
                            title="Excluir Lead"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {lead.company && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Building size={11}/> {lead.company}</div>}
                    {lead.estimated_value > 0 && <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={11}/> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimated_value)}</div>}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 6 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        👤 {employees.find(e => e.id === lead.assigned_to)?.name || 'Sem vendedor'}
                      </span>
                      {lead.phone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: '#34d399', fontWeight: 700 }}>
                          <MessageSquare size={10} /> WhatsApp
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* DETAILED LEAD DRAWER (CRM RAIO-X) */}
      {selectedLead && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)' }} onClick={() => setSelectedLead(null)}>
          <div 
            className="glass-panel" 
            onClick={e => e.stopPropagation()}
            style={{ 
              width: '650px', 
              height: '100vh',
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              animation: 'slideInRight 0.3s ease',
              borderRadius: 0
            }}
          >
            
            {/* DRAWER HEADER */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'start', background: 'rgba(255,255,255,0.01)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>{selectedLead.name}</h3>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)' }}>
                    ORIGEM: {selectedLead.origin || 'Outbound'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building size={14}/> {selectedLead.company || 'Sem empresa'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14}/> {selectedLead.phone || 'Sem celular'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14}/> {selectedLead.email || 'Sem e-mail'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
                    <Award size={14}/> Est: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.estimated_value)}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="glass-btn" style={{ padding: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <X size={16}/>
              </button>
            </div>
            
            {/* DOUBLE PANEL GRID */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '270px 1fr', minHeight: 0 }}>
              
              {/* LEFT PROFILE PANEL */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: 16, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
                
                {/* EDIT STATUS & OWNER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>ETAPA DO FUNIL</label>
                    <select 
                      className="glass-input" 
                      value={selectedLead.status} 
                      onChange={e => handleStatusChange(selectedLead.id, e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '0.8rem', fontWeight: 600, borderLeft: `3px solid ${getStatusColor(selectedLead.status)}` }}
                    >
                      {STAGES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>VENDEDOR ATRIBUÍDO</label>
                    <select 
                      className="glass-input" 
                      value={selectedLead.assigned_to || ''} 
                      onChange={e => handleAssignedSellerChange(selectedLead.id, e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                    >
                      <option value="">Não atribuído</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CHEKLIST TASKS */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TAREFAS DO LEAD</span>
                    {pendingTasksCount > 0 && (
                      <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                        {pendingTasksCount} Pendente{pendingTasksCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tasks.map(task => {
                      const isOverdue = !task.completed && new Date(task.due_date) < new Date();
                      return (
                        <div key={task.interactionId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: 8, border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)'}` }}>
                          <input 
                            type="checkbox" 
                            checked={task.completed} 
                            onChange={e => toggleTaskCompleted(task.raw, e.target.checked)}
                            style={{ marginTop: 2, cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.8rem', color: task.completed ? 'var(--text-muted)' : 'white', textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 600, display: 'block', wordBreak: 'break-word' }}>
                              {task.taskName}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: isOverdue ? '#f87171' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Clock size={10} /> {new Date(task.due_date).toLocaleDateString('pt-BR')} {new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {tasks.length === 0 && (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>Sem tarefas registradas.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT FEED & CONVERSATION PANEL */}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                
                {/* TABS SWITCHER */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <button 
                    onClick={() => setRightPanelTab('notes')}
                    style={{ 
                      flex: 1, padding: '12px 16px', background: 'none', border: 'none', 
                      borderBottom: rightPanelTab === 'notes' ? '2px solid #6366f1' : 'none',
                      color: rightPanelTab === 'notes' ? '#a5b4fc' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <FileText size={16} /> Atividades & Notas
                  </button>
                  <button 
                    onClick={() => setRightPanelTab('whatsapp')}
                    style={{ 
                      flex: 1, padding: '12px 16px', background: 'none', border: 'none', 
                      borderBottom: rightPanelTab === 'whatsapp' ? '2px solid #10b981' : 'none',
                      color: rightPanelTab === 'whatsapp' ? '#34d399' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <MessageSquare size={16} /> Conversa WhatsApp
                  </button>
                </div>

                {/* TAB CONTENT */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  
                  {/* 1. NOTES & ACTIVITIES TAB */}
                  {rightPanelTab === 'notes' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      
                      {/* DOUBLE FORM: CREATE LOG OR TASK */}
                      <div style={{ padding: 16, background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        
                        {/* Log Note form */}
                        <form onSubmit={handleAddInteraction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>REGISTRAR INTERAÇÃO</span>
                            <select className="glass-input" value={interactionType} onChange={e => setInteractionType(e.target.value)} style={{ padding: '4px 8px', fontSize: '0.75rem', height: 26 }}>
                              <option value="note">📝 Anotação</option>
                              <option value="call">📞 Ligação</option>
                              <option value="meeting">🤝 Reunião</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input 
                              className="glass-input" 
                              placeholder="Descreva a interação..." 
                              value={newInteraction}
                              onChange={e => setNewInteraction(e.target.value)}
                              style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                            />
                            <button type="submit" className="glass-btn primary" style={{ padding: '0 16px', fontSize: '0.8rem', fontWeight: 700 }}>
                              Salvar
                            </button>
                          </div>
                        </form>

                        {/* Add Task form */}
                        <form onSubmit={handleScheduleTask} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>AGENDAR TAREFA / SEGUIMENTO</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                            <input 
                              required 
                              placeholder="Lembrete (ex: Enviar proposta)" 
                              className="glass-input" 
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                              value={taskName}
                              onChange={e => setTaskName(e.target.value)}
                            />
                            <input 
                              required
                              type="datetime-local" max="9999-12-31T23:59" 
                              className="glass-input" 
                              style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'white' }}
                              value={taskDueDate}
                              onChange={e => setTaskDueDate(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Canal:</span>
                              <select className="glass-input" value={taskCategory} onChange={e => setTaskCategory(e.target.value)} style={{ padding: '2px 6px', fontSize: '0.72rem', height: 22 }}>
                                <option value="call">📞 Ligação</option>
                                <option value="email">📧 E-mail</option>
                                <option value="meeting">🤝 Reunião</option>
                                <option value="proposal">📝 Proposta</option>
                              </select>
                            </div>
                            <button type="submit" className="glass-btn" style={{ padding: '4px 12px', fontSize: '0.78rem', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              Agendar
                            </button>
                          </div>
                        </form>

                      </div>

                      {/* LOG FEED */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {interactions.map(int => {
                          if (int.type === 'task') return null;
                          return (
                            <div key={int.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.82rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: 6, fontSize: '0.7rem' }}>
                                <span style={{ fontWeight: 800, color: int.type === 'call' ? '#f59e0b' : int.type === 'meeting' ? '#3b82f6' : '#a5b4fc' }}>
                                  {int.type === 'call' ? '📞 LIGAÇÃO' : int.type === 'meeting' ? '🤝 REUNIÃO' : int.type === 'email' ? '📧 WHATSAPP' : '📝 NOTA'}
                                </span>
                                <span>{new Date(int.created_at).toLocaleString('pt-BR')}</span>
                              </div>
                              <div style={{ color: 'white', lineHeight: 1.4 }}>{int.content}</div>
                              <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                                Por: {employees.find(e => e.id === int.employee_id)?.name || 'Desconhecido'}
                              </div>
                            </div>
                          );
                        })}
                        {interactions.filter(i => i.type !== 'task').length === 0 && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nenhuma atividade registrada.</p>
                        )}
                      </div>

                    </div>
                  )}

                  {/* 2. WHATSAPP CONVERSATION TAB */}
                  {rightPanelTab === 'whatsapp' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0b141a', position: 'relative' }}>
                      
                      {/* Active sender config bar */}
                      <div style={{ background: '#202c33', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a3942' }}>
                        <span style={{ fontSize: '0.72rem', color: '#8696a0', fontWeight: 600 }}>ENVIAR POR:</span>
                        {activeConnections.length > 0 ? (
                          <select 
                            className="glass-input" 
                            value={selectedConnection?.id || ''} 
                            onChange={e => setSelectedConnection(activeConnections.find(c => c.id === e.target.value))}
                            style={{ background: '#2a3942', border: 'none', color: '#34d399', fontWeight: 700, padding: '3px 8px', fontSize: '0.72rem', height: 24 }}
                          >
                            {activeConnections.map(conn => (
                              <option key={conn.id} value={conn.id}>🟢 {conn.name} ({conn.whatsapp_number})</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Sem números ativos</span>
                        )}
                      </div>

                      {/* Chat Messages Area */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23182229\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '60px 60px' }}>
                        {loadingWa ? (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <RefreshCw size={24} className="spin" style={{ color: '#10b981' }} />
                          </div>
                        ) : (
                          whatsappMessages.map((msg, idx) => {
                            const isOut = msg.direction === 'outbound';
                            return (
                              <div key={msg.id || idx} style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start' }}>
                                <div style={{ 
                                  background: isOut ? '#005c4b' : '#202c33', 
                                  color: 'white', 
                                  padding: '8px 12px 6px', 
                                  borderRadius: 8, 
                                  borderBottomRightRadius: isOut ? 2 : 8,
                                  borderBottomLeftRadius: !isOut ? 2 : 8,
                                  maxWidth: '75%',
                                  fontSize: '0.82rem',
                                  wordBreak: 'break-word',
                                  border: '1px solid rgba(255,255,255,0.03)'
                                }}>
                                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.content}</p>
                                  <span style={{ fontSize: '0.58rem', color: '#8696a0', float: 'right', marginTop: 4, marginLeft: 16 }}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                        {!loadingWa && whatsappMessages.length === 0 && (
                          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', maxWidth: 200 }}>
                            <Bot size={28} style={{ marginBottom: 8 }} />
                            <p style={{ margin: 0, fontSize: '0.78rem' }}>Envie a primeira mensagem para abrir conversa com este lead.</p>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input Bar */}
                      <form onSubmit={handleSendWhatsApp} style={{ background: '#202c33', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #2a3942' }}>
                        <input 
                          className="glass-input" 
                          placeholder={selectedLead.phone ? "Escreva uma mensagem..." : "Cadastre celular para enviar WhatsApp"}
                          disabled={!selectedLead.phone || sendingWa}
                          value={waMessageText}
                          onChange={e => setWaMessageText(e.target.value)}
                          style={{ flex: 1, padding: '8px 14px', borderRadius: 20, background: '#2a3942', border: 'none', fontSize: '0.85rem' }}
                        />
                        <button 
                          type="submit" 
                          disabled={sendingWa || !waMessageText.trim() || !selectedLead.phone}
                          style={{ 
                            width: 38, height: 38, borderRadius: '50%', background: '#00a884', 
                            border: 'none', color: 'white', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                          }}
                        >
                          {sendingWa ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                        </button>
                      </form>

                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ANIMATION STYLES */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.8;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .glass-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default CommercialPipeline;
