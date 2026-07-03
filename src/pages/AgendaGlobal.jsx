import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { syncCreateToGlobalCalendar, syncDeleteFromGlobalCalendar, syncUpdateGlobalCalendarColor, syncUpdateToGlobalCalendar } from '../utils/googleCalendarSync';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import {
  Calendar, Plus, X, Video, MapPin, Users, ClipboardList,
  Trash2, Target, CheckCircle, Clock, AlertCircle,
  ChevronLeft, ChevronRight, MapPinned, Link2, UserCircle2, Maximize2, Palette,
  Edit2, Mail, MoreVertical
} from 'lucide-react';

/* ─── Utilitários ─────────────────────────────────────── */
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
const DAY_NAMES = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const GOOGLE_COLORS = {
  '1': { hex: '#7986cb', name: 'Lavanda' },
  '2': { hex: '#33b679', name: 'Sálvia' },
  '3': { hex: '#8e24aa', name: 'Uva' },
  '4': { hex: '#e67c73', name: 'Flamingo' },
  '5': { hex: '#f6bf26', name: 'Banana' },
  '6': { hex: '#f4511e', name: 'Tangerina' },
  '7': { hex: '#039be5', name: 'Pavão' },
  '8': { hex: '#616161', name: 'Grafite' },
  '9': { hex: '#3f51b5', name: 'Mirtilo' },
  '10': { hex: '#0b8043', name: 'Manjericão' },
  '11': { hex: '#d50000', name: 'Tomate' }
};

const getColorStyle = (colorId, defaultHex = '#4285f4') => {
  const hex = GOOGLE_COLORS[colorId]?.hex || defaultHex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    bg: `rgba(${r},${g},${b},0.3)`,
    border: hex,
    text: '#ffffff'
  };
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const eventColor = (status) => {
  if (status === 'Cancelado')  return { bg: '#ef444422', border: '#ef4444', text: '#fca5a5' };
  if (status === 'Realizado')  return { bg: '#10b98122', border: '#10b981', text: '#6ee7b7' };
  return                              { bg: '#6366f122', border: '#818cf8', text: '#a5b4fc' };
};

/* ─── Componente principal ───────────────────────────── */
const AgendaGlobal = () => {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState([]);

  useEffect(() => {
    supabase.from('clients').select('*').then(({data}) => {
      if (data) setClients(data);
    });
  }, []);

  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tasks,         setTasks]         = useState([]);
  const [loadingTasks,  setLoadingTasks]  = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Navegação do calendário
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay,  setSelectedDay]   = useState(null);
  const [expandedDay,  setExpandedDay]   = useState(null); // Modal de visualização diária
  const [detailEvent,  setDetailEvent]   = useState(null); // modal detalhe
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent,    setNewEvent]    = useState(emptyForm());

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEventForm, setEditEventForm] = useState(null);

  function formatDateTimeLocal(date) {
    if (!date) return '';
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }

  function emptyForm(dateStr = '') {
    return { category: 'Agendamento', title:'', client_id:'', start: dateStr, end: '',
             type:'Call', location:'', meeting_link:'', notes:'', guests:[] };
  }

  /* ─ Carregamento ─ */
  useEffect(() => { fetchEvents(); fetchCollaborators(); fetchTasks(); }, []);

  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') { setIsModalOpen(false); setDetailEvent(null); }
    };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  const fetchCollaborators = async () => {
    const { data } = await supabase.from('employees').select('id, name, department');
    if (data) setCollaborators(data);
  };

  const fetchEvents = async () => {
    setLoading(true);
    let meetingsQuery = supabase.from('client_meetings').select('*');
    if (currentUser?.clientUuid) meetingsQuery = meetingsQuery.eq('client_id', currentUser.clientUuid);
    const { data: meetingsData } = await meetingsQuery;

    let googleEventsQuery = supabase
      .from('google_events')
      .select('*')
      .eq('employee_id', '00000000-0000-0000-0000-000000000000');
    // Clientes geralmente não veem eventos do Google genéricos, mas vamos manter
    const { data: googleEventsData } = await googleEventsQuery;

    let tasksQuery = supabase
      .from('department_tasks')
      .select('id, title, department, status, created_at, client_id, metadata, assigned_to')
      .order('created_at', { ascending: false });
    if (currentUser?.clientUuid) tasksQuery = tasksQuery.eq('client_id', currentUser.clientUuid);
    const { data: tasksData } = await tasksQuery;

    let allEvents = [];

    if (meetingsData) {
      // Busca nomes/avatares dos criadores em lote
      const creatorIds = [...new Set(meetingsData.map(m => m.created_by).filter(Boolean))];
      let creatorsMap = {};
      if (creatorIds.length > 0) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, name, avatar_url')
          .in('id', creatorIds);
        if (emps) emps.forEach(e => { creatorsMap[e.id] = e; });
      }

      const formatted = meetingsData.map(m => {
        let startDate = new Date();
        if (m.scheduled_at) {
          const p = new Date(m.scheduled_at);
          if (!isNaN(p.getTime())) startDate = p;
        }
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        return {
          id: m.id,
          clientId: m.client_id,
          meetingTitle: m.title || 'Sem título',
          meetingType: m.type || '',
          start: startDate,
          end: endDate,
          creator: m.created_by ? (creatorsMap[m.created_by] || null) : null,
          resource: m,
          customColor: m.metadata?.color ? getColorStyle(m.metadata.color, '#4285f4') : undefined
        };
      });
      allEvents = [...allEvents, ...formatted];
    }

    if (googleEventsData) {
      const formattedGoogle = googleEventsData.map(ge => {
        const isTask = ge.location === 'Google Tasks';
        const cleanTitle = ge.title ? ge.title.replace(/\[.*?@.*?\]\s*/g, '') : 'Sem título';
        return {
          id: `google_${ge.id}`,
          clientId: null,
          meetingTitle: cleanTitle,
          meetingType: isTask ? 'Google Task' : 'Google',
          start: new Date(ge.start_time),
          end: new Date(ge.end_time || ge.start_time),
          creator: null, // Pode puxar o employee se quiser depois
          resource: {
             ...ge,
             status: ge.status === 'cancelled' ? 'Cancelado' : (new Date(ge.start_time) < new Date() ? 'Realizado' : 'Agendado'),
             created_by: ge.employee_id,
          },
          customColor: isTask 
            ? getColorStyle(ge.color_id, '#ec4899') // Tasks do Google? Se tiver cor, usa, senão default
            : getColorStyle(ge.color_id, '#4285f4')
        };
      });
      allEvents = [...allEvents, ...formattedGoogle];
    }

    if (tasksData) {
      setTasks(tasksData); // Mantém a lista lateral
      const formattedTasks = tasksData.map(t => {
        const meta = typeof t.metadata === 'string' ? JSON.parse(t.metadata) : (t.metadata || {});
        let startDate = new Date();
        if (meta.deadline) {
          const p = new Date(meta.deadline);
          if (!isNaN(p.getTime())) startDate = p;
        } else {
          const p = new Date(t.created_at);
          if (!isNaN(p.getTime())) startDate = p;
        }
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        return {
          id: `task_${t.id}`,
          clientId: t.client_id,
          meetingTitle: t.title || 'Tarefa',
          meetingType: 'Tarefa CRM',
          start: startDate,
          end: endDate,
          creator: null,
          resource: {
             ...t,
             status: t.status,
             created_by: meta.assigned_by,
          },
          customColor: meta.color ? getColorStyle(meta.color, '#ec4899') : { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', text: '#ec4899' }
        };
      });
      allEvents = [...allEvents, ...formattedTasks];
    }

    setEvents(allEvents);
    setLoading(false);
  };

  // Resolve o nome de exibição do cliente a partir da prop clients (sempre atualizada)
  const getClientDisplayName = (clientId) => {
    const c = clients.find(c => c.id === clientId);
    return c?.metadata?.display_name || c?.name || 'Cliente';
  };

  // Converte o tipo interno para o rótulo exibido
  const formatMeetingType = (type) => {
    if (type === 'Call') return 'Online';
    return type || '';
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    let tasksQuery = supabase
      .from('department_tasks')
      .select('id, title, department, status, created_at, client_id, metadata, assigned_to')
      .order('created_at', { ascending: false });
    if (currentUser?.clientUuid) tasksQuery = tasksQuery.eq('client_id', currentUser.clientUuid);
    const { data } = await tasksQuery;
    if (data) setTasks(data);
    setLoadingTasks(false);
  };

  /* ─ Salvar evento ─ */
  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.start) {
      alert('Preencha título e data/hora inicial.');
      return;
    }
    if (newEvent.category === 'Agendamento' && !newEvent.client_id) {
      alert('Selecione um cliente para o agendamento.');
      return;
    }
    try {
      const startIso = new Date(newEvent.start).toISOString();
      const endIso = newEvent.end 
        ? new Date(newEvent.end).toISOString()
        : new Date(new Date(newEvent.start).getTime() + 60 * 60 * 1000).toISOString();
      
      if (newEvent.category === 'Agendamento') {
        const eventDate = new Date(newEvent.start).toDateString();
        const { data: conflicts } = await supabase
          .from('client_meetings').select('*').eq('client_id', newEvent.client_id);

        if (conflicts?.length) {
          const same = conflicts.filter(c => new Date(c.scheduled_at).toDateString() === eventDate);
          if (same.length) {
            const conflict = same[0];
            const time = new Date(conflict.scheduled_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
            const confirmed = await confirm({
              title: 'Conflito de Agendamento',
              message: `O cliente já tem reunião às ${time} (${conflict.title}).\n\nDeseja incluir sua equipe nessa reunião em vez de criar uma nova?`,
              confirmText: 'Incluir Equipe',
              isDanger: false
            });
            if (confirmed) {
              const guests = [...new Set([...(conflict.metadata?.guests||[]), ...newEvent.guests])];
              await supabase.from('client_meetings').update({ metadata: { ...conflict.metadata, guests } }).eq('id', conflict.id);
              alert('Equipe incluída com sucesso!');
              setIsModalOpen(false);
              fetchEvents();
              return;
            }
          }
        }

        const clientName = getClientDisplayName(newEvent.client_id);
        const finalTitle = clientName ? `${newEvent.title} - ${clientName}` : newEvent.title;
        const { data: insertData, error } = await supabase.from('client_meetings').insert([{
          created_by: currentUser?.employeeId || currentUser?.id,
          client_id: newEvent.client_id || null,
          title: finalTitle,
          scheduled_at: startIso,
          type: newEvent.type,
          location: newEvent.location,
          meeting_link: newEvent.meeting_link,
          status: 'Agendado',
          department: currentUser?.department || 'Geral',
          created_by: currentUser?.employeeId || null,
          metadata: { notes: newEvent.notes, guests: newEvent.guests, end_time: endIso }
        }]).select();
        if (error) throw error;

        if (insertData?.[0]) {
          const meeting = insertData[0];
          const guestNames = (newEvent.guests || []).map(gId => collaborators.find(c => c.id === gId)?.name || gId);
          try {
            await syncCreateToGlobalCalendar({
              id: meeting.id,
              meetingTitle: meeting.title,
              clientName,
              scheduled_at: meeting.scheduled_at,
              end: endIso,
              meeting_link: newEvent.meeting_link,
              location: newEvent.location,
              notes: newEvent.notes,
              meetingType: newEvent.type,
              createdBy: currentUser?.name || currentUser?.email || 'ROI Expert',
              guestNames,
            });
          } catch (err) { console.warn('Sync falhou:', err); }
        }
      } else if (newEvent.category === 'Tarefas') {
        const clientName = getClientDisplayName(newEvent.client_id);
        const finalTitle = clientName ? `${newEvent.title} - ${clientName}` : newEvent.title;
        const { error } = await supabase.from('department_tasks').insert([{
          title: finalTitle,
          client_id: newEvent.client_id || null,
          department: currentUser?.department || 'Geral',
          status: 'a_fazer',
          metadata: { deadline: startIso, end_time: endIso, notes: newEvent.notes, guests: newEvent.guests, assigned_by: currentUser?.name || 'Agenda Global' },
          assigned_to: currentUser?.name || 'Geral'
        }]);
        if (error) throw error;
      } else if (newEvent.category === 'Evento') {
        const clientName = newEvent.client_id ? getClientDisplayName(newEvent.client_id) : '';
        const finalTitle = clientName ? `${newEvent.title} - ${clientName}` : newEvent.title;
        const guestNames = (newEvent.guests || []).map(gId => collaborators.find(c => c.id === gId)?.name || gId);
        try {
          const syncRes = await syncCreateToGlobalCalendar({
            id: `evento_${Date.now()}`,
            meetingTitle: finalTitle,
            clientName: newEvent.client_id ? getClientDisplayName(newEvent.client_id) : '',
            scheduled_at: startIso,
            end: endIso,
            meeting_link: newEvent.meeting_link,
            location: newEvent.location,
            notes: newEvent.notes,
            meetingType: newEvent.type,
            createdBy: currentUser?.name || 'ROI Expert',
            guestNames,
          });
          
          if (syncRes && syncRes.eventId) {
            await supabase.from('google_events').insert([{
              google_event_id: syncRes.eventId,
              title: finalTitle,
              start_time: startIso,
              end_time: endIso,
              location: newEvent.location,
              description: newEvent.notes,
              employee_id: currentUser?.employeeId || null
            }]);
          }
        } catch (err) { console.warn('Erro sync Google Evento', err); }
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert('Erro ao criar evento: ' + err.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEventForm.title || !editEventForm.start) {
      alert('Preencha título e data/hora.');
      return;
    }
    try {
      const scheduled_at = new Date(editEventForm.start).toISOString();
      let googleEventId = editEventForm.originalEvent.resource?.google_event_id || editEventForm.originalEvent.resource?.metadata?.google_event_id;

      if (editEventForm.id.toString().startsWith('google_')) {
        await supabase.from('google_events').update({
           title: editEventForm.title,
           start_time: scheduled_at,
           end_time: editEventForm.end ? new Date(editEventForm.end).toISOString() : scheduled_at,
           location: editEventForm.location,
           description: editEventForm.notes
        }).eq('id', editEventForm.originalEvent.resource.id);
      } else if (editEventForm.id.toString().startsWith('task_')) {
        await supabase.from('department_tasks').update({
           title: editEventForm.title,
           metadata: { ...editEventForm.originalEvent.resource.metadata, deadline: scheduled_at, end_time: editEventForm.end ? new Date(editEventForm.end).toISOString() : null, notes: editEventForm.notes, guests: editEventForm.guests }
        }).eq('id', editEventForm.originalEvent.resource.id);
      } else {
        await supabase.from('client_meetings').update({
           title: editEventForm.title,
           client_id: editEventForm.client_id,
           scheduled_at,
           type: editEventForm.type,
           location: editEventForm.location,
           meeting_link: editEventForm.meeting_link,
           metadata: { ...editEventForm.originalEvent.resource.metadata, notes: editEventForm.notes, guests: editEventForm.guests, end_time: editEventForm.end ? new Date(editEventForm.end).toISOString() : null }
        }).eq('id', editEventForm.originalEvent.resource.id);
      }

      if (googleEventId && !editEventForm.id.toString().startsWith('google_')) {
          await syncUpdateToGlobalCalendar({
             googleEventId,
             title: editEventForm.title,
             clientName: editEventForm.client_id ? getClientDisplayName(editEventForm.client_id) : '',
             scheduled_at,
          }).catch(err => console.warn('Sync update falhou:', err));
      }

      setIsEditModalOpen(false);
      setDetailEvent(null);
      fetchEvents();
    } catch (err) {
      alert('Erro ao atualizar evento: ' + err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = await confirm({
      title: 'Excluir Agendamento?',
      message: 'Tem certeza que deseja excluir este agendamento?',
      confirmText: 'Sim, excluir',
      isDanger: true
    });
    if (!confirmed) return;
    try {
      const eventToDelete = events.find(e => e.id === eventId);
      let googleEventId = eventToDelete?.resource?.google_event_id;
      
      // Fallback para tarefas: procurar no metadata
      if (!googleEventId && eventToDelete?.resource?.metadata?.google_event_id) {
        googleEventId = eventToDelete.resource.metadata.google_event_id;
      }

      if (eventId.toString().startsWith('google_')) {
        await supabase.from('google_events').delete().eq('id', eventToDelete.resource.id);
      } else if (eventId.toString().startsWith('task_')) {
        await supabase.from('department_tasks').delete().eq('id', eventToDelete.resource.id);
      } else {
        await supabase.from('client_meetings').delete().eq('id', eventId);
      }

      if (googleEventId) {
        syncDeleteFromGlobalCalendar(googleEventId).catch(err => console.warn('Sync delete falhou:', err));
      }

      setEvents(prev => prev.filter(e => e.id !== eventId));
      setDetailEvent(null);
    } catch (err) {
      console.error('[AgendaCS] Erro ao deletar reunião:', err);
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleChangeColor = async (colorId) => {
    if (!detailEvent) return;
    try {
      let googleEventId = detailEvent.resource?.google_event_id;
      
      if (detailEvent.id.toString().startsWith('google_')) {
        await supabase.from('google_events').update({ color_id: colorId }).eq('id', detailEvent.resource.id);
      } else if (detailEvent.id.toString().startsWith('task_')) {
        const newMeta = { ...(detailEvent.resource.metadata || {}), color: colorId };
        googleEventId = googleEventId || newMeta.google_event_id;
        await supabase.from('department_tasks').update({ metadata: newMeta }).eq('id', detailEvent.resource.id);
      } else {
        const newMeta = { ...(detailEvent.resource.metadata || {}), color: colorId };
        await supabase.from('client_meetings').update({ metadata: newMeta }).eq('id', detailEvent.resource.id);
      }
      
      // Enviar comando para o Google Global se aplicável
      if (!detailEvent.id.toString().startsWith('google_') && googleEventId) {
        syncUpdateGlobalCalendarColor(googleEventId, colorId).catch(err => console.warn('Sync update color falhou:', err));
      }
      
      const updatedColor = getColorStyle(colorId);
      const updatedEvents = events.map(e => {
        if (e.id === detailEvent.id) {
          const u = { ...e, customColor: updatedColor };
          if(u.resource) {
             if (e.id.toString().startsWith('google_')) u.resource.color_id = colorId;
             else u.resource.metadata = { ...u.resource.metadata, color: colorId };
          }
          setDetailEvent(u);
          return u;
        }
        return e;
      });
      setEvents(updatedEvents);
      setShowColorPicker(false);
    } catch (err) {
      console.error('Erro ao alterar cor:', err);
    }
  };

  /* ─ Lógica do Calendário ─ */
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Gera células (incluindo dias do mês anterior e próximo para completar a grade)
  const cells = [];
  // dias do mês anterior
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, thisMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, thisMonth: true, date: new Date(year, month, d) });
  }
  // dias do próximo mês
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, thisMonth: false, date: new Date(year, month + 1, d) });
  }

  const eventsForDay = (date) =>
    events.filter(e => {
      const isMine = e.resource?.created_by === currentUser?.employeeId || e.resource?.created_by === currentUser?.id || e.resource?.metadata?.guests?.includes(currentUser?.employeeId) || e.resource?.metadata?.guests?.includes(currentUser?.id);
      return isSameDay(e.start, date) && (showAllEvents || isMine);
    }).sort((a,b) => a.start - b.start);

  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const goToday   = () => { setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); };

  /* ─ Render ─ */
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, height:'100%', minHeight:0 }}>

      {/* ══ Topo ══ */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Calendar size={22} style={{ color:'var(--primary,#818cf8)' }} />
          <h2 style={{ margin:0, fontSize:'1.15rem', fontWeight:700, color:'var(--text-main,#f1f5f9)' }}>
            Agenda Global
          </h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {!currentUser?.clientUuid && (
            <button
              className={`glass-btn ${showAllEvents ? 'primary' : ''}`}
              onClick={() => setShowAllEvents(!showAllEvents)}
              style={{ display:'flex', alignItems:'center', gap:6, padding: '6px 12px', fontSize: '0.8rem', background: showAllEvents ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: showAllEvents ? '#a5b4fc' : 'var(--text-muted)' }}
            >
              <Users size={15} /> {showAllEvents ? 'Mostrando Todos' : 'Mostrando Apenas Meus'}
            </button>
          )}
          <button
            className="glass-btn primary"
            onClick={() => { setNewEvent(emptyForm()); setIsModalOpen(true); }}
            style={{ display:'flex', alignItems:'center', gap:6 }}
          >
            <Plus size={15} /> {currentUser?.clientUuid ? 'Solicitar Reunião' : 'Novo Agendamento'}
          </button>
        </div>
      </div>

      {/* ══ Layout principal ══ */}
      <div className="cal-layout-responsive" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, flex:1, minHeight:0 }}>

        {/* ─ CALENDÁRIO ─ */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', padding:0, overflow:'hidden', borderRadius:14 }}>

          {/* Header de navegação */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <button onClick={prevMonth} style={navBtn}><ChevronLeft size={16}/></button>
              <button onClick={nextMonth} style={navBtn}><ChevronRight size={16}/></button>
              <button onClick={goToday} style={{ ...navBtn, padding:'4px 14px', borderRadius:20, fontSize:'0.78rem', fontWeight:600, letterSpacing:'.3px' }}>
                Hoje
              </button>
            </div>
            <span style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--text-main,#f1f5f9)', letterSpacing:'.4px' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <span style={{ fontSize:'0.8rem', color:'var(--text-muted,#94a3b8)' }}>
              {events.filter(e => e.start.getMonth()===month && e.start.getFullYear()===year).length} reuniões
            </span>
          </div>

          {/* Grade dos dias da semana */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign:'center', padding:'8px 0', fontSize:'0.72rem', fontWeight:700, letterSpacing:'.8px', color:'var(--text-muted,#94a3b8)', textTransform:'uppercase' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grade de células */}
          {loading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted,#94a3b8)', fontSize:'0.9rem' }}>
              Carregando agenda...
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', flex:1, overflow:'auto' }}>
              {cells.map((cell, idx) => {
                const dayEvents = eventsForDay(cell.date);
                const isToday = cell.thisMonth && isSameDay(cell.date, today);
                const isSelected = selectedDay && isSameDay(cell.date, selectedDay);
                const isPast = cell.date < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div
                    key={idx}
                    className="cal-cell-responsive"
                    onClick={() => setSelectedDay(cell.date)}
                    style={{
                      borderRight: (idx+1)%7===0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      padding:'6px 5px',
                      height: 120,          /* altura fixa — nunca quebra o grid */
                      overflow: 'hidden',
                      cursor:'pointer',
                      background: isSelected
                        ? 'rgba(99,102,241,0.12)'
                        : isToday
                          ? 'rgba(99,102,241,0.06)'
                          : 'transparent',
                      transition:'background .15s',
                      opacity: isPast ? 0.35 : 1,
                      pointerEvents: isPast ? 'none' : 'auto',
                      position:'relative',
                      display:'flex',
                      flexDirection:'column',
                    }}
                    onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.12)' : isToday ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                  >
                    {/* Número do dia */}
                    <div style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      width:24, height:24, borderRadius:'50%',
                      fontSize:'0.8rem', fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#fff' : cell.thisMonth ? 'var(--text-main,#f1f5f9)' : 'rgba(148,163,184,0.3)',
                      background: isToday ? 'var(--primary,#6366f1)' : 'transparent',
                      marginBottom:3,
                      flexShrink:0,
                    }}>
                      {cell.day}
                    </div>

                    {/* Eventos do dia — área scrollável */}
                    <div
                      className="cal-scroll-hidden cal-events-container"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display:'flex',
                        flexDirection:'column',
                        gap:2,
                        flex:1,
                      }}
                    >
                      {dayEvents.map(ev => {
                      const col = ev.customColor || eventColor(ev.resource?.status);
                      return (
                        <div
                          key={ev.id}
                          className="cal-event-item"
                          onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                          style={{
                            background: col.bg,
                            borderLeft: `2px solid ${col.border}`,
                            color: col.text,
                            '--cal-dot-color': col.border,
                            padding: '3px 5px',
                            borderRadius: 4,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer'
                          }}
                          title={ev.meetingTitle}
                        >
                          <span className="cal-event-text">{ev.start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} {ev.meetingTitle}</span>
                        </div>
                      );
                    })}
                    </div>

                    {/* Indicador de scroll quando há muitos eventos */}
                    {dayEvents.length > 2 && (
                      <div className="cal-events-more" style={{
                        position:'absolute', top:3, right:4,
                        fontSize:'0.55rem', fontWeight:700,
                        color:'var(--primary,#818cf8)',
                        background:'rgba(99,102,241,0.15)',
                        borderRadius:4, padding:'1px 4px',
                        pointerEvents:'none',
                      }}>
                        {dayEvents.length} ↕
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─ COLUNA LATERAL ─ */}
        <div className="cal-panel-responsive" style={{ display:'flex', flexDirection:'column', gap:14, minHeight:0, overflow:'hidden' }}>

          {/* Eventos do dia selecionado */}
          {selectedDay && (
            <div className="glass-panel" style={{ padding:14, borderRadius:12, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--primary,#818cf8)', letterSpacing:'.4px' }}>
                  {selectedDay.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setExpandedDay(selectedDay)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                    <Maximize2 size={14}/>
                  </button>
                  <button onClick={() => setSelectedDay(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
                    <X size={14}/>
                  </button>
                </div>
              </div>
              {eventsForDay(selectedDay).length === 0 ? (
                <p style={{ color:'var(--text-muted,#94a3b8)', fontSize:'0.82rem', margin:0 }}>Nenhuma reunião neste dia.</p>
              ) : (
                eventsForDay(selectedDay).map(ev => {
                  const col = ev.customColor || eventColor(ev.resource?.status);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      style={{ padding:'8px 10px', borderRadius:8, marginBottom:6, borderLeft:`3px solid ${col.border}`, background:col.bg, cursor:'pointer' }}
                    >
                      <p style={{ margin:0, fontSize:'0.82rem', fontWeight:600, color:'var(--text-main,#f1f5f9)' }}>{ev.meetingTitle}</p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.72rem', color:col.text }}>
                        {ev.start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} • {ev.resource?.status || 'Agendado'}
                      </p>
                    </div>
                  );
                })
              )}
              <button
                onClick={() => {
                  const pad = n => String(n).padStart(2,'0');
                  const d = selectedDay;
                  const str = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T09:00`;
                  setNewEvent(emptyForm(str));
                  setIsModalOpen(true);
                }}
                style={{ width:'100%', marginTop:6, padding:'6px 0', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#a5b4fc', borderRadius:8, cursor:'pointer', fontSize:'0.78rem', fontWeight:600 }}
              >
                <Plus size={12} style={{ verticalAlign:'middle', marginRight:4 }}/>
                Agendar neste dia
              </button>
            </div>
          )}

          {/* Próximas Reuniões */}
          <div className="glass-panel" style={{ padding:14, borderRadius:12, flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight: 220 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:'0.85rem', fontWeight:700, color:'var(--text-main,#f1f5f9)', display:'flex', alignItems:'center', gap:6 }}>
              <Calendar size={14} style={{ color:'var(--primary,#818cf8)' }}/> Próximas Reuniões
            </h3>
            <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {loading ? (
                <p style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>Carregando...</p>
              ) : events.filter(e => {
                  const isMine = e.resource?.created_by === currentUser?.employeeId || e.resource?.created_by === currentUser?.id || e.resource?.metadata?.guests?.includes(currentUser?.employeeId) || e.resource?.metadata?.guests?.includes(currentUser?.id);
                  return e.start >= today && (showAllEvents || isMine);
                }).sort((a,b) => a.start-b.start).slice(0,8).length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>Nenhuma reunião futura.</p>
              ) : (
                events.filter(e => {
                  const isMine = e.resource?.created_by === currentUser?.employeeId || e.resource?.created_by === currentUser?.id || e.resource?.metadata?.guests?.includes(currentUser?.employeeId) || e.resource?.metadata?.guests?.includes(currentUser?.id);
                  return e.start >= today && (showAllEvents || isMine);
                }).sort((a,b) => a.start-b.start).slice(0,8).map(ev => {
                  const col = ev.customColor || eventColor(ev.resource?.status);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setDetailEvent(ev)}
                      style={{ padding:'8px 10px', borderRadius:8, borderLeft:`3px solid ${col.border}`, background:col.bg, cursor:'pointer', flexShrink:0 }}
                    >
                      <p style={{ margin:0, fontSize:'0.8rem', fontWeight:600, color:'var(--text-main,#f1f5f9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.meetingTitle}</p>
                      <p style={{ margin:'2px 0 0', fontSize:'0.7rem', color:'var(--text-muted,#94a3b8)' }}>
                        {ev.start.toLocaleDateString('pt-BR')} às {ev.start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Demandas Delegadas */}
          <div className="glass-panel" style={{ padding:14, borderRadius:12, flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight: 220 }}>
            <h3 style={{ margin:'0 0 12px', fontSize:'0.85rem', fontWeight:700, color:'var(--text-main,#f1f5f9)', display:'flex', alignItems:'center', gap:6 }}>
              <Target size={14} style={{ color:'var(--primary,#818cf8)' }}/> Demandas Delegadas
            </h3>
            <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {loadingTasks ? (
                <p style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>Carregando...</p>
              ) : tasks.filter(task => showAllEvents || task.assigned_to === currentUser?.employeeId || task.assigned_to === currentUser?.id || task.metadata?.assigned_by_id === currentUser?.employeeId || task.metadata?.assigned_by_id === currentUser?.id).length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>Nenhuma demanda delegada.</p>
              ) : (
                tasks.filter(task => showAllEvents || task.assigned_to === currentUser?.employeeId || task.assigned_to === currentUser?.id || task.metadata?.assigned_by_id === currentUser?.employeeId || task.metadata?.assigned_by_id === currentUser?.id).slice(0,6).map(task => {
                  let borderColor = '#818cf8', bgColor = 'rgba(99,102,241,0.1)', Icon = Clock, textColor = '#a5b4fc';
                  if (task.status === 'Concluído') { borderColor='#10b981'; bgColor='rgba(16,185,129,0.1)'; Icon=CheckCircle; textColor='#6ee7b7'; }
                  else if (task.status === 'Pendente' || task.status === 'A Fazer') { borderColor='#f59e0b'; bgColor='rgba(245,158,11,0.1)'; Icon=Clock; textColor='#fbbf24'; }
                  else if (task.status === 'Aguardando Aprovação' || task.status === 'Em Revisão') { borderColor='#ec4899'; bgColor='rgba(236,72,153,0.1)'; Icon=AlertCircle; textColor='#f472b6'; }
                  const meta = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : (task.metadata||{});
                  const clientName = clients.find(c => c.id === task.client_id)?.name || '—';
                  return (
                    <div key={task.id} style={{ padding:'8px 10px', borderRadius:8, borderLeft:`3px solid ${borderColor}`, background:bgColor, flexShrink:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <p style={{ margin:0, fontSize:'0.8rem', fontWeight:600, color:'var(--text-main,#f1f5f9)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{task.title}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:3, background:bgColor, color:textColor, padding:'2px 6px', borderRadius:10, fontSize:'0.65rem', fontWeight:700, whiteSpace:'nowrap', marginLeft:6 }}>
                          <Icon size={10}/> {task.status}
                        </div>
                      </div>
                      <p style={{ margin:0, fontSize:'0.7rem', color:'var(--text-muted,#94a3b8)' }}>
                        {clientName} → {task.department}
                        {meta.deadline && ` · ${new Date(meta.deadline).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Modal: Detalhe do Evento ══ */}
      {detailEvent && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
          onClick={() => { setDetailEvent(null); setShowColorPicker(false); }}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width:420, padding:24, borderRadius:16, position:'relative', background:'var(--surface,#0f172a)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}
          >
            {/* Faixa de cor topo */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:4, borderRadius:'16px 16px 0 0', background: detailEvent.customColor ? detailEvent.customColor.border : eventColor(detailEvent.resource?.status).border }}/>
            
            <div style={{ position:'absolute', top:14, right:14, display:'flex', gap:2 }}>
              <button onClick={() => {
                setEditEventForm({
                  id: detailEvent.id,
                  originalEvent: detailEvent,
                  title: detailEvent.resource?.title || detailEvent.meetingTitle || '',
                  client_id: detailEvent.resource?.client_id || '',
                  start: formatDateTimeLocal(detailEvent.start),
                  end: formatDateTimeLocal(detailEvent.end),
                  type: detailEvent.resource?.type || 'Call',
                  location: detailEvent.resource?.location || '',
                  meeting_link: detailEvent.resource?.meeting_link || '',
                  notes: detailEvent.resource?.metadata?.notes || '',
                  guests: detailEvent.resource?.metadata?.guests || []
                });
                setIsEditModalOpen(true);
              }} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Editar evento">
                <Edit2 size={16}/>
              </button>
              <button onClick={() => handleDeleteEvent(detailEvent.id)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Excluir evento">
                <Trash2 size={16}/>
              </button>
              <button onClick={() => setShowEmailModal(true)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Enviar e-mail para os convidados">
                <Mail size={16}/>
              </button>
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title="Opções">
                  <MoreVertical size={16}/>
                </button>
                {showOptionsMenu && (
                  <div style={{ position:'absolute', top:36, right:0, background:'#202124', padding:'8px 0', borderRadius:8, boxShadow:'0 10px 30px rgba(0,0,0,0.5)', zIndex:10, minWidth: 180, border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding:'8px 16px', fontSize:'0.85rem', color:'#e8eaed', cursor:'pointer' }} onClick={() => setShowOptionsMenu(false)}>Imprimir</div>
                    <div style={{ padding:'8px 16px', fontSize:'0.85rem', color:'#e8eaed', cursor:'pointer' }} onClick={() => setShowOptionsMenu(false)}>Duplicar</div>
                    <div style={{ padding:'8px 16px', fontSize:'0.85rem', color:'#e8eaed', cursor:'pointer' }} onClick={() => setShowOptionsMenu(false)}>Publicar evento</div>
                    <div style={{ padding:'8px 16px', fontSize:'0.85rem', color:'#e8eaed', cursor:'pointer' }} onClick={() => setShowOptionsMenu(false)}>Alterar proprietário</div>
                  </div>
                )}
              </div>
              
              <div style={{ position:'relative' }}>
                <button onClick={() => setShowColorPicker(!showColorPicker)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Palette size={16}/>
                </button>
                {showColorPicker && (
                  <div style={{ position:'absolute', top:36, right:0, background:'var(--surface,#1e293b)', padding:12, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 10px 30px rgba(0,0,0,0.5)', zIndex:10, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, width: 150 }}>
                    {Object.entries(GOOGLE_COLORS).map(([id, col]) => {
                      const isActive = detailEvent.resource?.color_id === id || detailEvent.resource?.metadata?.color === id;
                      return (
                        <button key={id} onClick={() => handleChangeColor(id)} style={{ width:24, height:24, borderRadius:'50%', background:col.hex, border: isActive ? '2px solid #fff' : 'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} title={col.name}>
                          {isActive && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => { setDetailEvent(null); setShowColorPicker(false); setShowOptionsMenu(false); }} style={{ background:'transparent', border:'none', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={18}/>
              </button>
            </div>
            <h3 style={{ margin:'8px 0 4px', fontSize:'1.05rem', color:'var(--text-main,#f1f5f9)', paddingRight:30 }}>{detailEvent.meetingTitle}</h3>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
              {/* Badge de status */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:eventColor(detailEvent.resource?.status).bg, color:eventColor(detailEvent.resource?.status).text, padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}>
                {detailEvent.resource?.status || 'Agendado'}
              </div>
              {/* Quem agendou */}
              {detailEvent.creator && (
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', color:'var(--text-muted,#94a3b8)' }}>
                  {detailEvent.creator.avatar_url ? (
                    <img src={detailEvent.creator.avatar_url} alt={detailEvent.creator.name} style={{ width:16, height:16, borderRadius:'50%', objectFit:'cover' }} />
                  ) : (
                    <UserCircle2 size={14} style={{ color:'#818cf8' }} />
                  )}
                  <span>Agendado por <strong style={{ color:'var(--text-main,#f1f5f9)' }}>{detailEvent.creator.name}</strong></span>
                </div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:'0.85rem', color:'var(--text-muted,#94a3b8)' }}>
              <Row icon={<Calendar size={14}/>}>
                {detailEvent.start.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} às {detailEvent.start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
              </Row>
              {detailEvent.resource?.type && (
                <Row icon={<Video size={14}/>}>{formatMeetingType(detailEvent.resource.type)}</Row>
              )}
              {detailEvent.resource?.meeting_link && (
                <Row icon={<Link2 size={14}/>}>
                  <a href={detailEvent.resource.meeting_link} target="_blank" rel="noreferrer" style={{ color:'#818cf8' }}>
                    {detailEvent.resource.meeting_link}
                  </a>
                </Row>
              )}
              {detailEvent.resource?.location && (
                <Row icon={<MapPinned size={14}/>}>{detailEvent.resource.location}</Row>
              )}
              {detailEvent.resource?.metadata?.notes && (
                <Row icon={<ClipboardList size={14}/>}>{detailEvent.resource.metadata.notes}</Row>
              )}
            </div>

          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Modal Visual de Enviar E-mail (Placeholder) */}
      {showEmailModal && detailEvent && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:9999999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(2px)' }}
             onClick={() => setShowEmailModal(false)}>
          <div style={{ width:500, background:'#303134', borderRadius:8, padding:'24px', boxShadow:'0 24px 38px 3px rgba(0,0,0,0.14)', color:'#e8eaed', position:'relative' }}
               onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:'1.3rem', margin:'0 0 24px', fontWeight:400, color:'#e8eaed' }}>Enviar e-mail para os convidados</h2>
            
            <label style={{ display:'flex', alignItems:'center', gap:12, fontSize:'0.9rem', marginBottom:24, cursor:'pointer' }}>
              <input type="checkbox" style={{ accentColor:'#8ab4f8', width:18, height:18 }} defaultChecked />
              Enviar cópia para mim
            </label>

            <div style={{ marginBottom:16 }}>
              <input 
                type="text" 
                placeholder="Adicionar e-mail ou nome" 
                style={{ width:'100%', background:'#202124', border:'none', borderBottom:'1px solid #5f6368', padding:'12px 14px', color:'#e8eaed', outline:'none', borderRadius:'4px 4px 0 0', fontSize:'0.95rem' }}
              />
            </div>

            <div style={{ marginBottom:16 }}>
              <input 
                type="text" 
                defaultValue={detailEvent.meetingTitle}
                placeholder="Assunto"
                style={{ width:'100%', background:'#202124', border:'none', borderBottom:'1px solid #5f6368', padding:'12px 14px', color:'#e8eaed', outline:'none', borderRadius:'4px 4px 0 0', fontSize:'0.95rem' }}
              />
            </div>

            <div style={{ marginBottom:16, position:'relative' }}>
              <textarea 
                placeholder="Mensagem"
                rows={5}
                style={{ width:'100%', background:'#202124', border:'none', borderBottom:'2px solid #8ab4f8', padding:'12px 14px', color:'#e8eaed', outline:'none', borderRadius:'4px 4px 0 0', resize:'none', fontSize:'0.95rem' }}
              />
              <div style={{ position:'absolute', bottom:-22, right:0, fontSize:'0.75rem', color:'#9aa0a6' }}>0/2.400</div>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:36 }}>
              <span style={{ fontSize:'0.85rem', color:'#9aa0a6' }}>As informações do evento serão incluídas na mensagem</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowEmailModal(false)} style={{ background:'transparent', border:'none', color:'#8ab4f8', fontWeight:600, padding:'10px 16px', borderRadius:4, cursor:'pointer', fontSize:'0.9rem' }}>Cancelar</button>
                <button onClick={() => setShowEmailModal(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#9aa0a6', fontWeight:600, padding:'10px 24px', borderRadius:24, cursor:'pointer', fontSize:'0.9rem' }}>Enviar</button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ══ Modal: Novo Agendamento ══ */}
      {isModalOpen && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
          onClick={() => setIsModalOpen(false)}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width:500, padding:26, borderRadius:16, position:'relative', maxHeight:'92vh', overflowY:'auto', background:'var(--surface,#0f172a)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}
          >
            <button onClick={() => setIsModalOpen(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={18}/>
            </button>
            <h3 style={{ margin:'0 0 20px', fontSize:'1.1rem', color:'var(--text-main,#f1f5f9)', display:'flex', alignItems:'center', gap:8 }}>
              <Calendar size={18} style={{ color:'var(--primary,#818cf8)' }}/> Novo Registro
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {newEvent.category === 'Agendamento' && (
                <Field label="CLIENTE">
                  <select className="glass-input" style={{ width:'100%' }} value={newEvent.client_id} onChange={e => setNewEvent({...newEvent, client_id: e.target.value})}>
                    <option value="">Selecione um cliente...</option>
                    {clients
                      .filter(c => c.status === 'Ativo' && c.metadata?.show_in_agency === true)
                      .sort((a, b) => (a.metadata?.display_name || a.name || '').localeCompare(b.metadata?.display_name || b.name || ''))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.metadata?.display_name || c.name}</option>
                      ))}
                  </select>
                </Field>
              )}

              <Field label={newEvent.category === 'Tarefas' ? 'TÍTULO DA TAREFA' : newEvent.category === 'Evento' ? 'TÍTULO DO EVENTO' : 'TÍTULO DA REUNIÃO'}>
                <input className="glass-input" style={{ width:'100%' }} placeholder="Ex: Onboarding, Revisão..." value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}/>
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="DATA / HORA INÍCIO">
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={newEvent.start} onChange={e => setNewEvent({...newEvent, start: e.target.value})}/>
                </Field>
                <Field label={<>DATA / HORA FINAL <span style={{fontSize:'0.6rem', fontWeight:400, opacity:0.7, marginLeft:4}}>(OPCIONAL)</span></>}>
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={newEvent.end} onChange={e => setNewEvent({...newEvent, end: e.target.value})}/>
                </Field>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="TIPO">
                  <select className="glass-input" style={{ width:'100%' }} value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})}>
                    <option value="Agendamento">Agendamento</option>
                    <option value="Tarefas">Tarefas</option>
                    <option value="Evento">Evento</option>
                  </select>
                </Field>
                {newEvent.category === 'Agendamento' && (
                  <Field label="MODALIDADE">
                    <select className="glass-input" style={{ width:'100%' }} value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                      <option value="Call">Online</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </Field>
                )}
              </div>

              {(newEvent.category === 'Agendamento' || newEvent.category === 'Evento') && (
                <Field label={newEvent.type === 'Call' && newEvent.category === 'Agendamento' ? 'LINK DA REUNIÃO' : 'LOCAL'}>
                  <input
                    className="glass-input" style={{ width:'100%' }}
                    placeholder={newEvent.type === 'Call' && newEvent.category === 'Agendamento' ? 'https://meet.google.com/...' : 'Endereço ou sala...'}
                    value={newEvent.type === 'Call' && newEvent.category === 'Agendamento' ? newEvent.meeting_link : newEvent.location}
                    onChange={e => {
                      if (newEvent.type === 'Call' && newEvent.category === 'Agendamento') setNewEvent({...newEvent, meeting_link: e.target.value});
                      else setNewEvent({...newEvent, location: e.target.value});
                    }}
                  />
                </Field>
              )}

              <Field label="CONVIDAR COLABORADORES">
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:90, overflowY:'auto', padding:10, background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
                  {collaborators.map(c => {
                    const sel = newEvent.guests.includes(c.id);
                    return (
                      <button key={c.id} onClick={() => {
                        const guests = sel ? newEvent.guests.filter(id => id !== c.id) : [...newEvent.guests, c.id];
                        setNewEvent({...newEvent, guests});
                      }} style={{ padding:'4px 11px', fontSize:'0.72rem', borderRadius:20, cursor:'pointer', background: sel ? 'var(--primary,#6366f1)' : 'rgba(255,255,255,0.05)', border:'none', color: sel ? '#fff' : 'var(--text-muted,#94a3b8)', fontWeight: sel ? 600 : 400 }}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="OBSERVAÇÕES / PAUTA">
                <textarea className="glass-input" style={{ width:'100%', minHeight:80, resize:'vertical' }} placeholder="Tópicos a discutir, informações relevantes..." value={newEvent.notes} onChange={e => setNewEvent({...newEvent, notes: e.target.value})}/>
              </Field>

              <button className="glass-btn primary" onClick={handleSaveEvent} style={{ padding:'12px 0', marginTop:4, fontSize:'0.9rem', fontWeight:700, letterSpacing:'.3px' }}>
                SALVAR AGENDAMENTO
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ══ Modal: Editar Agendamento ══ */}
      {isEditModalOpen && editEventForm && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
          onClick={() => setIsEditModalOpen(false)}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width:500, padding:26, borderRadius:16, position:'relative', maxHeight:'92vh', overflowY:'auto', background:'var(--surface,#0f172a)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}
          >
            <button onClick={() => setIsEditModalOpen(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={18}/>
            </button>
            <h3 style={{ margin:'0 0 20px', fontSize:'1.1rem', color:'var(--text-main,#f1f5f9)', display:'flex', alignItems:'center', gap:8 }}>
              <Edit2 size={18} style={{ color:'var(--primary,#818cf8)' }}/> Editar Evento
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {!editEventForm.id.toString().startsWith('google_') && !editEventForm.id.toString().startsWith('task_') && (
                <Field label="CLIENTE">
                  <select className="glass-input" style={{ width:'100%' }} value={editEventForm.client_id} onChange={e => setEditEventForm({...editEventForm, client_id: e.target.value})}>
                    <option value="">Selecione um cliente...</option>
                    {clients
                      .filter(c => (c.status === 'Ativo' && c.metadata?.show_in_agency === true) || c.id === editEventForm.client_id)
                      .sort((a, b) => (a.metadata?.display_name || a.name || '').localeCompare(b.metadata?.display_name || b.name || ''))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.metadata?.display_name || c.name}</option>
                      ))}
                  </select>
                </Field>
              )}

              <Field label="TÍTULO DO EVENTO">
                <input className="glass-input" style={{ width:'100%' }} placeholder="Ex: Reunião, Tarefa..." value={editEventForm.title} onChange={e => setEditEventForm({...editEventForm, title: e.target.value})}/>
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="DATA / HORA INÍCIO">
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={editEventForm.start} onChange={e => setEditEventForm({...editEventForm, start: e.target.value})}/>
                </Field>
                <Field label={<>DATA / HORA FINAL <span style={{fontSize:'0.6rem', fontWeight:400, opacity:0.7, marginLeft:4}}>(OPCIONAL)</span></>}>
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={editEventForm.end} onChange={e => setEditEventForm({...editEventForm, end: e.target.value})}/>
                </Field>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {!editEventForm.id.toString().startsWith('google_') && !editEventForm.id.toString().startsWith('task_') && (
                  <Field label="TIPO">
                    <select className="glass-input" style={{ width:'100%' }} value={editEventForm.type} onChange={e => setEditEventForm({...editEventForm, type: e.target.value})}>
                      <option value="Call">Online</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </Field>
                )}
              </div>

              {!editEventForm.id.toString().startsWith('google_') && !editEventForm.id.toString().startsWith('task_') && (
                <Field label={editEventForm.type === 'Call' ? 'LINK DA REUNIÃO' : 'LOCAL'}>
                  <input
                    className="glass-input" style={{ width:'100%' }}
                    placeholder={editEventForm.type === 'Call' ? 'https://meet.google.com/...' : 'Endereço ou sala...'}
                    value={editEventForm.type === 'Call' ? editEventForm.meeting_link : editEventForm.location}
                    onChange={e => {
                      if (editEventForm.type === 'Call') setEditEventForm({...editEventForm, meeting_link: e.target.value});
                      else setEditEventForm({...editEventForm, location: e.target.value});
                    }}
                  />
                </Field>
              )}

              <Field label="CONVIDAR COLABORADORES">
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:90, overflowY:'auto', padding:10, background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
                  {collaborators.map(c => {
                    const sel = (editEventForm.guests || []).includes(c.id);
                    return (
                      <button key={c.id} onClick={() => {
                        const guests = sel ? editEventForm.guests.filter(id => id !== c.id) : [...(editEventForm.guests || []), c.id];
                        setEditEventForm({...editEventForm, guests});
                      }} style={{ padding:'4px 11px', fontSize:'0.72rem', borderRadius:20, cursor:'pointer', background: sel ? 'var(--primary,#6366f1)' : 'rgba(255,255,255,0.05)', border:'none', color: sel ? '#fff' : 'var(--text-muted,#94a3b8)', fontWeight: sel ? 600 : 400 }}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="OBSERVAÇÕES / PAUTA">
                <textarea className="glass-input" style={{ width:'100%', minHeight:80, resize:'vertical' }} placeholder="Tópicos a discutir, informações relevantes..." value={editEventForm.notes} onChange={e => setEditEventForm({...editEventForm, notes: e.target.value})}/>
              </Field>

              <button className="glass-btn primary" onClick={handleSaveEdit} style={{ padding:'12px 0', marginTop:4, fontSize:'0.9rem', fontWeight:700, letterSpacing:'.3px' }}>
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ══ Modal: Daily View Modal (Visualização Diária) ══ */}
      {expandedDay && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-main,#020617)', backdropFilter:'blur(6px)' }}
          onClick={() => setExpandedDay(null)}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width:'95%', height:'95%', padding:20, borderRadius:16, display:'flex', flexDirection:'column', background:'var(--surface,#0f172a)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}
          >
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 24, background: 'var(--primary,#6366f1)', color: '#fff' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{DAY_NAMES[expandedDay.getDay()]}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{expandedDay.getDate()}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>
                  {expandedDay.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
                </h2>
              </div>
              <button onClick={() => setExpandedDay(null)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-muted)', width:36, height:36, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={20}/>
              </button>
            </div>

            {/* Grid Diário */}
            <div className="cal-scroll-hidden" style={{ flex: 1, overflowY: 'auto', position: 'relative', borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-main,#020617)' }}>
              <div style={{ position: 'relative', height: 24 * 60, minWidth: 600 }}> {/* 60px por hora */}
                
                {/* Linhas de Horas */}
                {Array.from({length: 24}).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      const clickedDate = new Date(expandedDay);
                      clickedDate.setHours(i, 0, 0, 0);
                      setNewEvent(emptyForm(formatDateTimeLocal(clickedDate)));
                      setIsModalOpen(true);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    style={{ position: 'absolute', top: i * 60, left: 0, right: 0, height: 60, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <div style={{ width: 60, borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4px 0' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {String(i).padStart(2, '0')}:00
                      </span>
                    </div>
                  </div>
                ))}

                {/* Eventos */}
                {(() => {
                  const dayEventsForModal = eventsForDay(expandedDay).map(ev => {
                    const startHour = ev.start.getHours();
                    const startMin = ev.start.getMinutes();
                    const endHour = ev.end.getHours();
                    const endMin = ev.end.getMinutes();
                    
                    const actualStartHour = ev.start < new Date(new Date(expandedDay).setHours(0,0,0,0)) ? 0 : startHour;
                    const actualStartMin = ev.start < new Date(new Date(expandedDay).setHours(0,0,0,0)) ? 0 : startMin;
                    const actualEndHour = ev.end > new Date(new Date(expandedDay).setHours(23,59,59,999)) ? 24 : endHour;
                    const actualEndMin = ev.end > new Date(new Date(expandedDay).setHours(23,59,59,999)) ? 0 : endMin;

                    const top = (actualStartHour * 60) + actualStartMin;
                    let height = ((actualEndHour * 60) + actualEndMin) - top;
                    
                    if (height < 25) height = 25; // Altura mínima
                    return { ...ev, top, height, bottom: top + height, actualStartHour, actualStartMin, actualEndHour, actualEndMin };
                  }).sort((a, b) => a.top - b.top);

                  // Agrupar eventos que se sobrepõem (clusters)
                  const clusters = [];
                  let currentCluster = null;

                  dayEventsForModal.forEach(ev => {
                    if (!currentCluster) {
                      currentCluster = { end: ev.bottom, events: [ev] };
                      clusters.push(currentCluster);
                    } else if (ev.top < currentCluster.end) {
                      currentCluster.events.push(ev);
                      currentCluster.end = Math.max(currentCluster.end, ev.bottom);
                    } else {
                      currentCluster = { end: ev.bottom, events: [ev] };
                      clusters.push(currentCluster);
                    }
                  });

                  // Para cada cluster, distribuir em colunas
                  clusters.forEach(cluster => {
                    const cols = [];
                    cluster.events.forEach(ev => {
                      let placed = false;
                      for (let i = 0; i < cols.length; i++) {
                        if (cols[i][cols[i].length - 1].bottom <= ev.top) {
                          cols[i].push(ev);
                          ev.colIndex = i;
                          placed = true;
                          break;
                        }
                      }
                      if (!placed) {
                        ev.colIndex = cols.length;
                        cols.push([ev]);
                      }
                    });
                    cluster.events.forEach(ev => {
                      ev.numCols = cols.length;
                    });
                  });

                  return dayEventsForModal.map(ev => {
                    const col = ev.customColor || eventColor(ev.resource?.status);
                    
                    // Cálculo de posição para sobreposição
                    const widthPercent = 100 / ev.numCols;
                    const leftOffset = 70; // 70px base
                    
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                        style={{
                          position: 'absolute',
                          top: ev.top,
                          height: ev.height,
                          left: `calc(${leftOffset}px + (100% - ${leftOffset + 10}px) * ${ev.colIndex / ev.numCols})`,
                          width: `calc((100% - ${leftOffset + 10}px) / ${ev.numCols})`,
                          background: col.bg,
                          borderLeft: `4px solid ${col.border}`,
                          borderRadius: 6,
                          padding: '4px 8px',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'transform 0.1s',
                          zIndex: ev.colIndex + 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; e.currentTarget.style.zIndex = 99; }}
                        onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.zIndex = ev.colIndex + 1; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: col.text, marginBottom: 2 }}>
                            {ev.meetingTitle}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: col.text, opacity: 0.8 }}>
                            {String(ev.actualStartHour).padStart(2,'0')}:{String(ev.actualStartMin).padStart(2,'0')} - {ev.actualEndHour === 24 ? '23:59' : String(ev.actualEndHour).padStart(2,'0')}:{String(ev.actualEndMin).padStart(2,'0')}
                          </span>
                          {ev.resource?.metadata?.notes && ev.height > 50 && (
                            <span style={{ fontSize: '0.65rem', color: col.text, opacity: 0.6, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {ev.resource.metadata.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </div>
  );
};

/* ─── Sub-componentes de layout ─── */
const Row = ({ icon, children }) => (
  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
    <span style={{ color:'var(--primary,#818cf8)', marginTop:1, flexShrink:0 }}>{icon}</span>
    <span style={{ color:'var(--text-main,#f1f5f9)', lineHeight:1.5 }}>{children}</span>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, letterSpacing:'.8px', color:'var(--text-muted,#94a3b8)', marginBottom:5 }}>{label}</label>
    {children}
  </div>
);

/* ─── Estilos de botão de navegação ─── */
const navBtn = {
  background:'rgba(255,255,255,0.05)',
  border:'1px solid rgba(255,255,255,0.08)',
  color:'var(--text-muted,#94a3b8)',
  borderRadius:8,
  padding:'4px 8px',
  cursor:'pointer',
  display:'flex',
  alignItems:'center',
  justifyContent:'center',
  transition:'background .15s, color .15s',
};

export default AgendaGlobal;
