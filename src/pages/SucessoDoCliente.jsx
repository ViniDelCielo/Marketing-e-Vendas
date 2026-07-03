import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Headphones, CheckSquare, Clock, CheckCircle, RefreshCw,
  Film, Video, Megaphone, Target, Palette, Calendar, CalendarDays,
  ThumbsUp, Eye, Send, AlertCircle, Loader2, X, FileText, 
  PieChart, Users, ClipboardList, Plus, HardDrive, ExternalLink, 
  Check, MapPin, Repeat, Trash2, ChevronDown, Edit2
} from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import { ResponsaveisPanel, ResponsaveisContaPanel } from '../components/FileManager';
import MeetingScheduler from '../components/MeetingScheduler';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../hooks/useClients';
import { useConfirm } from '../context/ConfirmContext';
import AgendaCS from './AgendaCS';
import AgendaPessoal from './AgendaPessoal';
import ErrorBoundary from '../components/ErrorBoundary';
import DepartmentPipeline from '../components/DepartmentPipeline';

const DEPT_NAME_MAP = {
  'social-media': 'Social Media',
  'trafego':      'Tráfego Pago',
  'edicao':       'Edição',
  'captacao':     'Captação',
  'design':       'Design',
  'crm':          'CRM'
};

const DEPT_ICONS = {
  'Captação':    <Film size={16} />,
  'Edição':      <Video size={16} />,
  'Social Media':<Megaphone size={16} />,
  'Tráfego Pago':<Target size={16} />,
  'Design':      <Palette size={16} />,
  'CRM':         <Users size={16} />
};

// Cor do ponto na linha do tempo por status
const statusDot = (status) => {
  if (status === 'Concluído' || status === 'Aprovado') return '#34d399';
  if (status === 'Em Revisão') return '#f59e0b';
  if (status === 'Agendado') return '#a5b4fc';
  return '#3b82f6';
};

const ClientTimeline = ({ client }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [timelineGroups, setTimelineGroups] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [selectedKanbanDept, setSelectedKanbanDept] = useState(null);
  const kanbanRef = useRef(null);

  useEffect(() => {
    if (selectedKanbanDept && kanbanRef.current) {
      setTimeout(() => {
        kanbanRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedKanbanDept]);
  const [trafegoLogs, setTrafegoLogs] = useState([]);
  const [activeServices, setActiveServices] = useState([]);
  const [minutes, setMinutes] = useState([]);
  const [isMinuteModalOpen, setIsMinuteModalOpen] = useState(false);
  const INITIAL_MINUTE_STATE = { 
    empresa: client?.name || '', segmento: client?.metadata?.company_info?.segmento || '', data: new Date().toISOString().split('T')[0], modeloReuniao: 'Online (Meet)', 
    participantesEquipe: [], participantesCliente: '', pauta: '', resumo: '', 
    feedbackTrafego: '', feedbackConteudo: '', feedbackCrm: '', feedbackSdr: '', 
    proximosPassos: '', proximaReuniao: '', topics: '', drive_link: '', participantesNotificados: [] 
  };
  const [newMinute, setNewMinute] = useState(INITIAL_MINUTE_STATE);
  const [isFeedbacksOpen, setIsFeedbacksOpen] = useState(false);

  useEffect(() => {
    if (isMinuteModalOpen) {
      setNewMinute(prev => ({ ...prev, empresa: client?.name || prev.empresa, segmento: client?.metadata?.company_info?.segmento || prev.segmento }));
    }
  }, [isMinuteModalOpen, client]);
  const [collaborators, setCollaborators] = useState([]);
  const [savingMinute, setSavingMinute] = useState(false);
  const [expandedMinuteId, setExpandedMinuteId] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMinuteModalOpen(false);
      }
    };
    if (isMinuteModalOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMinuteModalOpen]);

  const fetchTasks = useCallback(async () => {
    if (!client?.id) return;
    const activeDeptNames = activeServices.map(sId => DEPT_NAME_MAP[sId]).filter(Boolean);
    
    let query = supabase
      .from('department_tasks')
      .select('*')
      .eq('client_id', client.id);

    if (activeDeptNames.length > 0) {
      query = query.in('department', activeDeptNames);
    }

    const { data } = await query.order('created_at', { ascending: true });

    if (data) {
      setRawTasks(data);
      const groups = {};
      data.forEach(task => {
        const chainId = task.metadata?.chain_id || task.id;
        if (!groups[chainId]) {
          groups[chainId] = {
            chain_id: chainId,
            title: (task.title || 'Tarefa sem título').replace(/\[Recebido de .*?\] /g, ''),
            tasks: []
          };
        }
        groups[chainId].tasks.push(task);
      });
      Object.values(groups).forEach(g => {
        g.tasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
      setTimelineGroups(Object.values(groups));
    }
    setLoading(false);
  }, [client?.id]);

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel(`timeline-${client?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_tasks', filter: `client_id=eq.${client?.id}` }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [client?.id, fetchTasks]);

  // Re-fetch tasks when activeServices changes to apply the filter
  useEffect(() => {
    fetchTasks();
  }, [activeServices, fetchTasks]);

  useEffect(() => {
    const fetchTrafegoLogs = async () => {
      if (!client?.id) return;
      const { data } = await supabase
        .from('trafego_logs')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setTrafegoLogs(data || []);
    };
    fetchTrafegoLogs();
  }, [client?.id]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!client?.id) return;
      const { data } = await supabase
        .from('client_services')
        .select('service_id')
        .eq('client_id', client.id)
        .eq('status', 'active');
      setActiveServices(data?.map(s => s.service_id) || []);
    };
    fetchServices();
  }, [client?.id]);

  useEffect(() => {
    const fetchCollaborators = async () => {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      setCollaborators(data || []);
    };
    fetchCollaborators();
  }, []);


  useEffect(() => {
    const fetchMinutes = async () => {
      if (!client?.id) return;
      const { data } = await supabase
        .from('meeting_minutes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });
      setMinutes(data || []);
    };
    fetchMinutes();
  }, [client?.id]);

  const parseMinuteContent = (content) => {
    const extract = (regex, fallback = '') => {
      const match = content.match(regex);
      return match ? match[1].trim() : fallback;
    };
    
    const empresa = extract(/🏢 Empresa\/Cliente:\s*(.*)/) || '';
    const segmento = extract(/🏷️ Segmento:\s*(.*)/) || '';
    const dataStr = extract(/📅 Data:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/) || '';
    let data = new Date().toISOString().split('T')[0];
    if (dataStr) {
       const [d, m, y] = dataStr.split('/');
       data = `${y}-${m}-${d}`;
    }

    const modeloReuniao = extract(/💻 Modelo:\s*(.*)/) || 'Online (Meet)';
    const participantesCliente = extract(/👤 Participantes \(Cliente\):\s*(.*)/) || '';
    const equipeStr = extract(/👥 Participantes \(Equipe\):\s*(.*)/) || '';
    
    const participantesEquipe = equipeStr === 'Nenhum' ? [] : equipeStr.split(',').map(s => {
      const match = s.trim().match(/^(.*?)(?:\s*\((.*?)\))?$/);
      return { name: match?.[1]?.trim() || '', role: match?.[2]?.trim() || '' };
    });

    const pauta = extract(/📋 Pauta da Reunião:\n([\s\S]*?)(?=\n📝 Resumo das Discussões:)/) || '';
    const resumo = extract(/📝 Resumo das Discussões:\n([\s\S]*?)(?=\n🚀 Próximos Passos:)/) || '';
    const proximosPassos = extract(/🚀 Próximos Passos:\n([\s\S]*?)(?=\n📊 Feedbacks:)/) || '';

    const feedbackTrafego = extract(/• Tráfego:\s*(.*)/) || '';
    const feedbackConteudo = extract(/• Conteúdo:\s*(.*)/) || '';
    const feedbackCrm = extract(/• CRM:\s*(.*)/) || '';
    const feedbackSdr = extract(/• SDR:\s*(.*)/) || '';

    const proxDataStr = extract(/🗓️ Próxima Reunião:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/) || '';
    let proximaReuniao = '';
    if (proxDataStr) {
       const [d, m, y] = proxDataStr.split('/');
       proximaReuniao = `${y}-${m}-${d}`;
    }

    return {
      empresa, segmento, data, modeloReuniao,
      participantesCliente: participantesCliente === 'Nenhum' ? '' : participantesCliente,
      participantesEquipe, pauta, resumo, proximosPassos, proximaReuniao,
      feedbackTrafego: feedbackTrafego === 'N/A' ? '' : feedbackTrafego,
      feedbackConteudo: feedbackConteudo === 'N/A' ? '' : feedbackConteudo,
      feedbackCrm: feedbackCrm === 'N/A' ? '' : feedbackCrm,
      feedbackSdr: feedbackSdr === 'N/A' ? '' : feedbackSdr,
    };
  };

  const handleAddMinute = async () => {
    if (!newMinute.resumo.trim() && !newMinute.pauta.trim()) {
      alert('Preencha ao menos a pauta ou o resumo da reunião.');
      return;
    }
    setSavingMinute(true);
    
    const equipeText = Array.isArray(newMinute.participantesEquipe) && newMinute.participantesEquipe.length > 0
      ? newMinute.participantesEquipe.map(p => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ')
      : 'Nenhum';

    const compiledContent = `🏢 Empresa/Cliente: ${newMinute.empresa}
🏷️ Segmento: ${newMinute.segmento}
📅 Data: ${newMinute.data.split('-').reverse().join('/')}
💻 Modelo: ${newMinute.modeloReuniao}

👥 Participantes (Equipe): ${equipeText}
👤 Participantes (Cliente): ${newMinute.participantesCliente || 'Nenhum'}

📋 Pauta da Reunião:
${newMinute.pauta}

📝 Resumo das Discussões:
${newMinute.resumo}

🚀 Próximos Passos:
${newMinute.proximosPassos}

📊 Feedbacks:
• Tráfego: ${newMinute.feedbackTrafego || 'N/A'}
• Conteúdo: ${newMinute.feedbackConteudo || 'N/A'}
• CRM: ${newMinute.feedbackCrm || 'N/A'}
• SDR: ${newMinute.feedbackSdr || 'N/A'}

🗓️ Próxima Reunião: ${newMinute.proximaReuniao ? newMinute.proximaReuniao.split('-').reverse().join('/') : 'Não definida'}`;

    try {
      const mentionedIds = (newMinute.participantesNotificados || []).map(p => p.employee_id).filter(Boolean);

      if (newMinute.id) {
        // Editando ata existente
        const { error } = await supabase.from('meeting_minutes').update({
          content: compiledContent,
          drive_link: newMinute.drive_link.trim(),
          mentioned_ids: mentionedIds
        }).eq('id', newMinute.id);
        if (error) throw error;
      } else {
        // Criando ata nova
        const { error } = await supabase.from('meeting_minutes').insert([{
          client_id: client.id,
          author_name: user?.name || 'Gestor',
          content: compiledContent,
          topics: '',
          drive_link: newMinute.drive_link.trim(),
          mentioned_ids: mentionedIds
        }]);
        if (error) throw error;
      }

      if (mentionedIds.length > 0) {
        const taggedNames = newMinute.participantesNotificados.map(c => c.name).join(', ');
        
        // Cria uma mensagem privada (PV) para cada colaborador notificado
        const pvMessages = mentionedIds.map(empId => ({
          client_id: empId, // No chat P2P, o client_id é o ID do colaborador que recebe
          department: 'Sucesso do Cliente',
          sender_id: user?.id,
          sender_type: 'employee',
          sender_name: user?.name || 'Sistema',
          content: `🔔 *Nova Ata de Reunião Registrada!*\n\n${compiledContent}`,
          is_internal: false
        }));

        if (pvMessages.length > 0) {
          await supabase.from('chat_messages').insert(pvMessages);
        }
      }

      setNewMinute(INITIAL_MINUTE_STATE);
      setIsMinuteModalOpen(false);
      const { data } = await supabase.from('meeting_minutes').select('*').eq('client_id', client.id).order('created_at', { ascending: false });
      setMinutes(data || []);
    } catch (err) {
      alert("Erro ao salvar ata: " + err.message);
    } finally {
      setSavingMinute(false);
    }
  };



  // M6: Cliente aprova o agendamento de gravação
  const approveSchedule = async (task) => {
    setApproving(task.id);
    try {
      const meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata || {};
      await supabase.from('department_tasks').update({
        status: 'A Fazer', // Agora cria o card automático no Kanban
        metadata: {
          ...meta,
          client_approved_schedule: true,
          client_approved_at: new Date().toISOString(),
          history: [...(meta.history || []), { action: 'Agendamento aprovado pelo cliente. Card gerado no Kanban.', by: user?.name || 'Cliente', date: new Date().toISOString() }]
        }
      }).eq('id', task.id);
      fetchTasks();
    } finally {
      setApproving(null);
    }
  };

  // M8: Cliente aprova o post de Social Media
  const approvePost = async (task) => {
    setApproving(task.id);
    try {
      const meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata || {};
      await supabase.from('department_tasks').update({
        status: 'Aprovado',
        metadata: {
          ...meta,
          client_approved_post: true,
          client_post_approved_at: new Date().toISOString(),
          history: [...(meta.history || []), { action: 'Post aprovado pelo cliente', by: user?.name || 'Cliente', date: new Date().toISOString() }]
        }
      }).eq('id', task.id);
      fetchTasks();
    } finally {
      setApproving(null);
    }
  };

  // M6: Cliente sugere nova data
  const suggestDate = async (task, newDate) => {
    if (!newDate) return;
    setApproving(task.id);
    try {
      const meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : task.metadata || {};
      await supabase.from('department_tasks').update({
        metadata: {
          ...meta,
          suggested_date: newDate,
          client_feedback_needed: false, // O cliente já deu o feedback
          history: [...(meta.history || []), { action: `Cliente sugeriu nova data: ${new Date(newDate).toLocaleString('pt-BR')}`, by: user?.name || 'Cliente', date: new Date().toISOString() }]
        }
      }).eq('id', task.id);
      fetchTasks();
    } finally {
      setApproving(null);
    }
  };

  const [suggestingFor, setSuggestingFor] = useState(null);
  const [suggestionDate, setSuggestionDate] = useState('');

  // Cálculos de métricas por departamento
  const deptStats = useMemo(() => {
    const stats = {};
    rawTasks.forEach(task => {
      const dept = task.department;
      if (!stats[dept]) stats[dept] = { total: 0, pending: 0, done: 0, review: 0 };
      stats[dept].total++;
      
      const doneStatuses = ['Concluído', 'Aprovado', 'Agendar/Concluído', 'Entregue'];
      const reviewStatuses = ['Em Revisão', 'Em Revisão Interna', 'Aguardando Cliente', 'Aguardando Aprovação Cliente', 'Solicitar Gravação', 'Ajuste do Cliente'];
      
      if (doneStatuses.includes(task.status)) {
        stats[dept].done++;
      } else if (reviewStatuses.includes(task.status)) {
        stats[dept].review++;
      } else {
        stats[dept].pending++;
      }

      // Específicos
      const s = task.status ? task.status.trim() : '';
      if (dept === 'Social Media') {
        if (['Aguardando Aprovação Cliente', 'Aguardando Cliente', 'Em Revisão', 'Em Revisão Interna'].includes(s)) stats[dept].paraAprovar = (stats[dept].paraAprovar || 0) + 1;
        else if (['Refazer', 'Ajuste do Cliente'].includes(s)) stats[dept].ajustando = (stats[dept].ajustando || 0) + 1;
        else if (['Concluído', 'Agendar/Concluído'].includes(s)) stats[dept].postados = (stats[dept].postados || 0) + 1;
        else stats[dept].agendados = (stats[dept].agendados || 0) + 1;
      } else if (dept === 'Edição') {
        if (['A Fazer'].includes(s)) stats[dept].aFazer = (stats[dept].aFazer || 0) + 1;
        else if (['Em Andamento'].includes(s)) stats[dept].editando = (stats[dept].editando || 0) + 1;
        else if (['Em Revisão', 'Em Revisão Interna', 'Aguardando Cliente', 'Aguardando Aprovação Cliente'].includes(s)) stats[dept].aguardandoAprovacao = (stats[dept].aguardandoAprovacao || 0) + 1;
        else if (['Refazer', 'Ajuste do Cliente', 'Ajuste Interno'].includes(s)) stats[dept].ajustando = (stats[dept].ajustando || 0) + 1;
        else if (['Concluído', 'Aprovado', 'Entregue', 'Agendar/Concluído'].includes(s)) stats[dept].finalizado = (stats[dept].finalizado || 0) + 1;
        else stats[dept].aFazer = (stats[dept].aFazer || 0) + 1; // Fallback
      } else if (dept === 'Design') {
        if (['A Fazer'].includes(s)) stats[dept].aFazer = (stats[dept].aFazer || 0) + 1;
        else if (['Refazer', 'Ajuste do Cliente'].includes(s)) stats[dept].ajustando = (stats[dept].ajustando || 0) + 1;
        else if (['Concluído', 'Aprovado', 'Entregue'].includes(s)) stats[dept].finalizado = (stats[dept].finalizado || 0) + 1;
        else stats[dept].criando = (stats[dept].criando || 0) + 1;
      }
    });
    return stats;
  }, [rawTasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 2. Resumo Estratégico por Departamento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
         {/* Bloco Tráfego */}
         {activeServices.includes('trafego') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('Tráfego Pago')} style={{ padding: 20, borderTop: '4px solid #3b82f6', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Tráfego Pago</h4>
                  <Target size={18} color="#3b82f6" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leads</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{(Number(client.metadata?.leads_meta || 0) + Number(client.metadata?.leads_google || 0))}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saldo</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>R$ {(Number(client.metadata?.meta_balance || 0) + Number(client.metadata?.google_balance || 0)).toLocaleString('pt-BR')}</div>
                  </div>
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-muted)' }}>Status da Gestão:</label>
                  {trafegoLogs.slice(0, 2).map(log => (
                    <div key={log.id} style={{ fontSize: '0.75rem', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #3b82f6', lineHeight: 1.3 }}>
                      {log.content}
                    </div>
                  ))}
                  {trafegoLogs.length === 0 && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nenhum log recente.</p>}
               </div>
            </div>
         )}

         {/* Bloco Edição */}
         {activeServices.includes('edicao') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('Edição')} style={{ padding: 20, borderTop: '4px solid #ef4444', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Edição de Vídeos</h4>
                  <Video size={18} color="#ef4444" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>A Fazer</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{deptStats['Edição']?.aFazer || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Editando</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{deptStats['Edição']?.editando || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Aprovação</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{deptStats['Edição']?.aguardandoAprovacao || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Ajustando</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{deptStats['Edição']?.ajustando || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Finalizado</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{deptStats['Edição']?.finalizado || 0}</div>
                  </div>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                     <span>Total de Entregas:</span>
                     <strong style={{ color: 'var(--text-main)' }}>{deptStats['Edição']?.done || 0} vídeos</strong>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <div style={{ 
                      width: `${(deptStats['Edição']?.done / (deptStats['Edição']?.total || 1)) * 100}%`, 
                      height: '100%', background: '#ef4444', borderRadius: 2 
                    }}/>
                  </div>
               </div>
            </div>
         )}

         {/* Bloco Social Media */}
         {activeServices.includes('social-media') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('Social Media')} style={{ padding: 20, borderTop: '4px solid #8b5cf6', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Social Media</h4>
                  <Megaphone size={18} color="#8b5cf6" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Para Aprovar</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{deptStats['Social Media']?.paraAprovar || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Solicitar Ajuste</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{deptStats['Social Media']?.ajustando || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Agendados</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{deptStats['Social Media']?.agendados || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8, overflow: 'hidden' }}>
                     <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>Postados</label>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>{deptStats['Social Media']?.postados || 0}</div>
                  </div>
               </div>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  Frequência de postagens mantida conforme planejado. {deptStats['Social Media']?.review || 0} posts aguardando sua revisão final no calendário.
               </p>
            </div>
         )}

         {/* Bloco CRM */}
         {activeServices.includes('crm') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('CRM')} style={{ padding: 20, borderTop: '4px solid #f59e0b', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>CRM</h4>
                  <Users size={18} color="#f59e0b" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Em Andamento</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{deptStats['CRM']?.pending || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Finalizados</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{deptStats['CRM']?.done || 0}</div>
                  </div>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                     <span>Total de Demandas:</span>
                     <strong style={{ color: 'var(--text-main)' }}>{deptStats['CRM']?.total || 0}</strong>
                  </div>
               </div>
            </div>
         )}

         {/* Bloco Captação */}
         {activeServices.includes('captacao') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('Captação')} style={{ padding: 20, borderTop: '4px solid #10b981', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Captação</h4>
                  <Film size={18} color="#10b981" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agendados</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{deptStats['Captação']?.pending || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Realizados</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{deptStats['Captação']?.done || 0}</div>
                  </div>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                     <span>Total de Captações:</span>
                     <strong style={{ color: 'var(--text-main)' }}>{deptStats['Captação']?.total || 0}</strong>
                  </div>
               </div>
            </div>
         )}

         {/* Bloco Design */}
         {activeServices.includes('design') && (
            <div className="glass-panel" onClick={() => setSelectedKanbanDept('Design')} style={{ padding: 20, borderTop: '4px solid #ec4899', cursor: 'pointer' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Design</h4>
                  <Palette size={18} color="#ec4899" />
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>A Fazer</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{deptStats['Design']?.aFazer || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Criando</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{deptStats['Design']?.criando || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ajustando</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{deptStats['Design']?.ajustando || 0}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10 }}>
                     <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Finalizado</label>
                     <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ec4899' }}>{deptStats['Design']?.finalizado || 0}</div>
                  </div>
               </div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                     <span>Total de Peças:</span>
                     <strong style={{ color: 'var(--text-main)' }}>{deptStats['Design']?.total || 0}</strong>
                  </div>
               </div>
            </div>
         )}
      </div>

      {selectedKanbanDept && (
        <div ref={kanbanRef} className="glass-panel" style={{ marginTop: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden', padding: 0, border: '1px solid rgba(99, 102, 241, 0.2)', animation: 'slideDownFade 0.4s ease-out forwards' }}>
          <style>{`
            @keyframes slideDownFade {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--dark-bg)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={18} className="text-primary" />
                Kanban de {selectedKanbanDept}
              </h3>
              <button onClick={() => setSelectedKanbanDept(null)} className="icon-btn text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#0f172a' }}>
              <DepartmentPipeline client={client} departmentName={selectedKanbanDept} readOnly={true} />
            </div>
        </div>
      )}

      {/* 3. Atas de Reunião */}
      <section className="glass-panel" style={{ padding: 20 }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
               <ClipboardList size={20} className="text-primary" /> Atas de Reunião e Decisões Estratégicas
            </h3>
            <button onClick={() => setIsMinuteModalOpen(true)} className="glass-btn primary small" style={{ fontSize: '0.75rem' }}>
               <Plus size={14} /> Nova Ata
            </button>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {minutes.map(ata => {
              const isExpanded = expandedMinuteId === ata.id;
              const taggedNames = collaborators.filter(c => ata.mentioned_ids?.includes(c.id)).map(c => c.name);
              
              return (
              <div key={ata.id} onClick={() => setExpandedMinuteId(isExpanded ? null : ata.id)} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: isExpanded ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: '0.2s' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                       <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(ata.created_at).toLocaleString('pt-BR')} • {ata.author_name}
                       </span>
                       {ata.topics && <span style={{ marginLeft: 10, fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{ata.topics}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const notificados = (ata.mentioned_ids || []).map(id => {
                            const emp = collaborators.find(c => c.id === id);
                            return emp ? { name: emp.name, role: emp.department || emp.role || '', employee_id: emp.id } : null;
                          }).filter(Boolean);
                          const parsed = parseMinuteContent(ata.content);
                          setNewMinute({ ...parsed, drive_link: ata.drive_link || '', participantesNotificados: notificados, id: ata.id });
                          setIsMinuteModalOpen(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#6366f1', cursor: 'pointer', padding: 4 }}
                        title="Editar Ata"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await confirm({
                            title: 'Apagar Ata?',
                            message: 'Deseja realmente apagar esta ata?',
                            confirmText: 'Sim, apagar',
                            isDanger: true
                          });
                          if (confirmed) {
                            try {
                              await supabase.from('meeting_minutes').delete().eq('id', ata.id);
                              setMinutes(prev => prev.filter(m => m.id !== ata.id));
                            } catch(err) {
                              alert('Erro ao apagar: ' + err.message);
                            }
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                        title="Excluir Ata"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                 </div>
                 
                 {isExpanded ? (
                    <>
                       <div style={{ fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: ata.drive_link || taggedNames.length > 0 ? 16 : 0, color: 'var(--text-main)' }}>{ata.content}</div>
                       
                       {taggedNames.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: ata.drive_link ? 12 : 0, alignItems: 'center' }}>
                             <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Notificados:</span>
                             {taggedNames.map(name => (
                                <span key={name} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: 12 }}>
                                   {name}
                                </span>
                             ))}
                          </div>
                       )}

                       {ata.drive_link && (
                          <a 
                            href={ata.drive_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="glass-btn small"
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 8, 
                              fontSize: '0.75rem', 
                              background: 'rgba(66, 133, 244, 0.1)', 
                              color: '#93c5fd',
                              border: '1px solid rgba(66, 133, 244, 0.2)',
                              padding: '6px 12px'
                            }}
                          >
                            <HardDrive size={14} /> Ver Documento no Drive
                          </a>
                       )}
                    </>
                 ) : (
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                       {ata.content.length > 150 ? ata.content.substring(0, 150) + '...' : ata.content}
                    </div>
                 )}
              </div>
            )})}
            {minutes.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Nenhuma ata registrada ainda.</p>}
         </div>
      </section>


       {/* Modal de Nova Ata */}
       {isMinuteModalOpen && createPortal(
          <div className="modal-overlay" style={{ zIndex: 99999, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
             <div className="glass-panel" style={{ width: 800, maxHeight: '90vh', overflowY: 'auto', padding: 32, position: 'relative' }}>
                <button onClick={() => setIsMinuteModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                   <X size={20} />
                </button>
                <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                   <ClipboardList size={22} className="text-primary"/> {newMinute.id ? 'Editar Ata' : 'Registrar Ata de Reunião'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>NOME DA EMPRESA</label>
                        <input className="glass-input" style={{ width: '100%' }} value={newMinute.empresa || ''} onChange={e => setNewMinute({...newMinute, empresa: e.target.value})} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SEGMENTO</label>
                          <input className="glass-input" style={{ width: '100%' }} value={newMinute.segmento || ''} onChange={e => setNewMinute({...newMinute, segmento: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>DATA DA REUNIÃO</label>
                          <input type="date" max="9999-12-31" className="glass-input" style={{ width: '100%' }} value={newMinute.data || ''} onChange={e => setNewMinute({...newMinute, data: e.target.value})} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>MODELO DE REUNIÃO</label>
                          <div style={{ position: 'relative' }}>
                             <select className="glass-input" style={{ width: '100%', appearance: 'none', cursor: 'pointer' }} value={newMinute.modeloReuniao} onChange={e => setNewMinute({...newMinute, modeloReuniao: e.target.value})}>
                                <option value="Online (Meet)">Online (Meet)</option>
                                <option value="Presencial">Presencial</option>
                             </select>
                             <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PARTICIPANTES - EQUIPE</label>
                          <ResponsaveisContaPanel 
                            label="Participantes - Equipe"
                            value={newMinute.participantesEquipe} 
                            onChange={v => setNewMinute({...newMinute, participantesEquipe: v})} 
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PARTICIPANTES - CLIENTE</label>
                          <input className="glass-input" style={{ width: '100%' }} placeholder="Ex: Roberto (CEO)" value={newMinute.participantesCliente} onChange={e => setNewMinute({...newMinute, participantesCliente: e.target.value})} />
                        </div>
                      </div>

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>LINK DO GOOGLE DRIVE (OPCIONAL)</label>
                       <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                             <HardDrive size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(66, 133, 244, 0.6)' }} />
                             <input 
                               className="glass-input" 
                               style={{ width: '100%', paddingLeft: 36 }} 
                               placeholder="Cole o link do documento ou pasta..."
                               value={newMinute.drive_link}
                               onChange={e => setNewMinute({...newMinute, drive_link: e.target.value})}
                             />
                          </div>
                          {client.metadata?.drive_folder_url && (
                             <button 
                               type="button"
                               onClick={() => window.open(client.metadata.drive_folder_url, '_blank')}
                               className="glass-btn"
                               style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                               title="Abrir pasta raiz do cliente para subir arquivo"
                             >
                                <ExternalLink size={14} /> Abrir Drive
                             </button>
                          )}
                       </div>

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PAUTA DA REUNIÃO</label>
                      <textarea className="glass-input" style={{ width: '100%', minHeight: 60, resize: 'vertical', padding: 12, marginBottom: 16 }} value={newMinute.pauta} onChange={e => setNewMinute({...newMinute, pauta: e.target.value})} />

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>RESUMO DAS DISCUSSÕES</label>
                      <textarea className="glass-input" style={{ width: '100%', minHeight: 100, resize: 'vertical', padding: 12, marginBottom: 16 }} value={newMinute.resumo} onChange={e => setNewMinute({...newMinute, resumo: e.target.value})} />

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PRÓXIMOS PASSOS</label>
                      <textarea className="glass-input" style={{ width: '100%', minHeight: 60, resize: 'vertical', padding: 12, marginBottom: 16 }} value={newMinute.proximosPassos} onChange={e => setNewMinute({...newMinute, proximosPassos: e.target.value})} />

                      <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16, cursor: 'pointer' }} onClick={() => setIsFeedbacksOpen(!isFeedbacksOpen)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700, margin: 0, cursor: 'pointer' }}>FEEDBACKS</label>
                          <ChevronDown size={18} style={{ color: 'var(--text-muted)', transform: isFeedbacksOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                        </div>
                        {isFeedbacksOpen && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }} onClick={e => e.stopPropagation()}>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Tráfego Pago</label>
                              <textarea className="glass-input" style={{ width: '100%', fontSize: '0.8rem', minHeight: 60, resize: 'vertical', padding: 10 }} value={newMinute.feedbackTrafego} onChange={e => setNewMinute({...newMinute, feedbackTrafego: e.target.value})} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Conteúdo</label>
                              <textarea className="glass-input" style={{ width: '100%', fontSize: '0.8rem', minHeight: 60, resize: 'vertical', padding: 10 }} value={newMinute.feedbackConteudo} onChange={e => setNewMinute({...newMinute, feedbackConteudo: e.target.value})} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>CRM</label>
                              <textarea className="glass-input" style={{ width: '100%', fontSize: '0.8rem', minHeight: 60, resize: 'vertical', padding: 10 }} value={newMinute.feedbackCrm} onChange={e => setNewMinute({...newMinute, feedbackCrm: e.target.value})} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SDR</label>
                              <textarea className="glass-input" style={{ width: '100%', fontSize: '0.8rem', minHeight: 60, resize: 'vertical', padding: 10 }} value={newMinute.feedbackSdr} onChange={e => setNewMinute({...newMinute, feedbackSdr: e.target.value})} />
                            </div>
                          </div>
                        )}
                      </div>

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PRÓXIMA REUNIÃO</label>
                      <input type="date" max="9999-12-31" className="glass-input" style={{ width: '100%' }} value={newMinute.proximaReuniao} onChange={e => setNewMinute({...newMinute, proximaReuniao: e.target.value})} />

                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4, marginTop: 16 }}>NOTIFICAR GESTORES / MARCAR COLABORADORES</label>
                      <ResponsaveisContaPanel 
                        label="Notificar Gestores / Marcar Colaboradores"
                        value={newMinute.participantesNotificados || []} 
                        onChange={v => setNewMinute({...newMinute, participantesNotificados: v})} 
                        hideChat={true}
                      />
                   </div>
                   <button 
                     onClick={handleAddMinute} 
                     disabled={savingMinute}
                     className="glass-btn primary" 
                     style={{ width: '100%', padding: 14, fontWeight: 800 }}
                   >
                      {savingMinute ? 'SALVANDO...' : 'PUBLICAR ATA PARA A EQUIPE'}
                   </button>
                </div>
             </div>
          </div>, document.getElementById('modal-root') || document.body
        )}


     </div>
  );
};

const SucessoDoCliente = () => {
  const [activeTab, setActiveTab] = useState('agenda');
  const { clients } = useClients();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('agenda')}
          className={`glass-btn ${activeTab === 'agenda' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Calendar size={18} /> Agenda Global
        </button>
        <button 
          onClick={() => setActiveTab('pessoal')}
          className={`glass-btn ${activeTab === 'pessoal' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <CalendarDays size={18} /> Agenda Pessoal
        </button>
        <button 
          onClick={() => setActiveTab('clientes')}
          className={`glass-btn ${activeTab === 'clientes' ? 'primary' : ''}`}
          style={{ padding: '8px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Users size={18} /> Painel de Clientes
        </button>
      </div>

      <div style={{ flex: 1, minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'agenda' ? (
          <AgendaCS clients={clients} />
        ) : activeTab === 'pessoal' ? (
          <AgendaPessoal />
        ) : (
          <ErrorBoundary>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 16 }}>
              <ClientFolderManager title="Sucesso do Cliente" description="Acompanhe a cadência de reuniões, o histórico do cliente e delegue tarefas.">
              {(client) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <DepartmentGuide department="Sucesso do Cliente" />
                    <GoogleDriveConnector client={client} department="Sucesso do Cliente" />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '14px 18px', background: 'rgba(99,102,241,0.08)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
                    <Headphones size={18} style={{ color: '#a5b4fc', flexShrink: 0 }}/>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      Acompanhe seus materiais em tempo real. Quando um agendamento ou post precisar da sua aprovação,
                      um <strong style={{ color: '#fcd34d' }}>botão de aprovação</strong> aparecerá automaticamente na linha do tempo.
                    </p>
                  </div>

                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
                    <Clock size={22} className="text-primary" /> Linha do Tempo de Entregáveis
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 8px' }}>
                    Histórico completo de todos os conteúdos produzidos para você, por departamento.
                  </p>

                  <ClientTimeline client={client} />
                </div>
              )}
            </ClientFolderManager>
          </div>
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default SucessoDoCliente;
