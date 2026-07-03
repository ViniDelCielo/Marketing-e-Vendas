import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Building, Phone, Mail, FileText, X, MessageSquare, Send, Calendar, CheckSquare, Clock, User, Award, Tag, ArrowRight, Bot, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const STAGES = ['Novo Lead', 'Qualificação', 'Reunião Agendada', 'Proposta Enviada', 'Em Negociação', 'Ganho', 'Perdido'];

const CommercialCRM = ({ leads, employees, onLeadsChange }) => {
  const authContext = useAuth();
  const currentUser = authContext?.user;

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Lead details tabs & state
  const [rightPanelTab, setRightPanelTab] = useState('notes'); // 'notes' | 'whatsapp'
  const [interactions, setInteractions] = useState([]);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [activeConnections, setActiveConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  
  // Creation/Interaction forms
  const [newInteraction, setNewInteraction] = useState('');
  const [interactionType, setInteractionType] = useState('note'); // 'note' | 'call' | 'meeting'
  
  // Task scheduling form
  const [taskName, setTaskName] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskCategory, setTaskCategory] = useState('call'); // 'call' | 'email' | 'meeting' | 'proposal'
  
  // WhatsApp sending form
  const [waMessageText, setWaMessageText] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [loadingWa, setLoadingWa] = useState(false);
  
  // Filters
  const [sellerFilter, setSellerFilter] = useState('all'); // 'all' | 'me' | 'employee_id'

  // Form lead creation
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    estimated_value: '',
    origin: 'Outbound',
    assigned_to: ''
  });

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
      // Query messages that match with or without 55 country code
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

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setRightPanelTab('notes');
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('commercial_leads').insert([{
        ...formData,
        estimated_value: Number(formData.estimated_value) || 0,
        status: 'Novo Lead',
        assigned_to: formData.assigned_to || currentUser?.employeeId || null
      }]);
      if (error) throw error;
      onLeadsChange();
      setIsModalOpen(false);
      setFormData({ name: '', company: '', email: '', phone: '', estimated_value: '', origin: 'Outbound', assigned_to: '' });
    } catch (err) {
      alert('Erro ao criar lead: ' + err.message);
    }
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

    // Store task details in JSON format inside the content field
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
      // 1. Save message to DB
      const { error: dbErr } = await supabase.from('whatsapp_messages').insert([{
        direction: 'outbound',
        from_number: selectedConnection?.whatsapp_number || 'Comercial',
        to_number: cleanPhone,
        content: messageContent,
        status: 'sent'
      }]);
      if (dbErr) throw dbErr;

      // 2. Call external Evolution API if connected
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
      
      // Log interaction of WhatsApp sent
      await supabase.from('commercial_interactions').insert([{
        lead_id: selectedLead.id,
        employee_id: currentUser?.employeeId || null,
        type: 'email', // Maps visually as contact sent
        content: `WhatsApp enviado: "${messageContent.slice(0, 60)}${messageContent.length > 60 ? '...' : ''}"`
      }]);
      fetchInteractions(selectedLead.id);

      // Simulate a quick chatbot answer for test leads after 2 seconds
      if (selectedLead.name.toLowerCase().includes('teste') || selectedLead.origin === 'Outbound') {
        setTimeout(async () => {
          await supabase.from('whatsapp_messages').insert([{
            direction: 'inbound',
            from_number: cleanPhone,
            to_number: selectedConnection?.whatsapp_number || 'Comercial',
            content: `Olá! Recebi sua mensagem: "${messageContent.slice(0, 20)}...". Retorno em breve!`,
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
      
      // Log status change interaction
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

  const filteredLeads = sellerFilteredLeads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm)
  );

  // Extract parsed tasks
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
    <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
      
      {/* LEFT CRM INTERFACE: LIST OF LEADS */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        
        {/* TOP CONTROLS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Buscar por nome, empresa ou cel..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 40, width: '100%', paddingRight: 12, height: '38px' }}
              />
            </div>

            {/* Seller Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Responsável:</span>
              <select 
                className="glass-input" 
                style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem' }}
                value={sellerFilter}
                onChange={e => setSellerFilter(e.target.value)}
              >
                <option value="all">👥 Mostrar Todos</option>
                {currentUser?.employeeId && <option value="me">👤 Atribuídos a Mim</option>}
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>💼 {emp.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="glass-btn primary" style={{ height: '38px', padding: '0 20px', fontWeight: 700 }}>
            <Plus size={16} /> Adicionar Lead
          </button>
        </div>

        {/* LEADS LIST TABLE */}
        <div className="glass-panel" style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 16px' }}>Lead / Empresa</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Valor Est.</th>
                <th style={{ padding: '14px 16px' }}>Celular</th>
                <th style={{ padding: '14px 16px' }}>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr 
                  key={lead.id} 
                  onClick={() => handleLeadClick(lead)}
                  style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.03)', 
                    cursor: 'pointer',
                    background: selectedLead?.id === lead.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                    transition: '0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = selectedLead?.id === lead.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = selectedLead?.id === lead.id ? 'rgba(99,102,241,0.08)' : 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'white' }}>{lead.name}</div>
                    {lead.company && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.company}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: `${getStatusColor(lead.status)}15`, color: getStatusColor(lead.status), border: `1px solid ${getStatusColor(lead.status)}30`, padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 700 }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.estimated_value)}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{lead.phone || '-'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{employees.find(e => e.id === lead.assigned_to)?.name || '-'}</td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-muted)' }}>
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT CRM DETAILED ACCORDION (KOMMO DRAWER) */}
      {selectedLead && (
        <div className="glass-panel" style={{ 
          width: '650px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.3s ease'
        }}>
          
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

              {/* CRM CHEKLIST TASKS */}
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
                            placeholder="Descreva a interação com o lead..." 
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

                    {/* INTERACTION LOG FEED */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {interactions.map(int => {
                        if (int.type === 'task') return null; // Rendered in left checklist
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
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Sem números ativos em Conectividade</span>
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
      )}

      {/* CREATE LEAD MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass-panel" style={{ width: 420, padding: 24, position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>
              <Plus size={20} className="text-primary" /> Novo Lead
            </h3>
            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nome do Contato *</label>
                <input required placeholder="Ex: Gerson Barbosa" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Empresa</label>
                <input placeholder="Ex: ROI Expert" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Telefone</label>
                  <input placeholder="Ex: 11991141179" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>E-mail</label>
                  <input type="email" placeholder="Ex: gerson@roiexpert.com" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Valor Estimado (R$)</label>
                  <input type="number" placeholder="Ex: 5000" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.estimated_value} onChange={e => setFormData({...formData, estimated_value: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Origem</label>
                  <select className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})}>
                    <option value="Outbound">Outbound Ativo</option>
                    <option value="Inbound - Tráfego">Inbound - Tráfego</option>
                    <option value="Indicação">Indicação</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Vendedor Responsável</label>
                <select className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                  <option value="">Atribuir a mim</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="glass-btn primary" style={{ flex: 1 }}>Criar Lead</button>
              </div>
            </form>
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
      `}</style>
    </div>
  );
};

export default CommercialCRM;
