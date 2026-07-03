import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClients } from '../hooks/useClients';
import {
  Calendar, Video, MapPin, Clock, X, Link as LinkIcon,
  Users, ClipboardList, CheckCircle, AlertCircle,
  Wifi, WifiOff, RefreshCw, LogIn, LogOut, User,
  ChevronLeft, ChevronRight, Plus, Unlink, Zap, Maximize2
} from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const statusColor = (s, customColor = null) => {
  if (customColor) return customColor;
  if (s === 'Cancelado') return { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5' };
  if (s === 'Realizado') return { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#6ee7b7' };
  return { bg: 'rgba(99,102,241,0.15)', border: '#818cf8', text: '#a5b4fc' };
};

const getCaptorColor = (assignedToId) => {
  if (!assignedToId) return null;
  const colors = [
    { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b' },
    { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: '#ec4899' },
    { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa', border: '#8b5cf6' },
    { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#10b981' },
    { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: '#f97316' },
    { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: '#0ea5e9' }
  ];
  let hash = 0;
  for (let i = 0; i < assignedToId.length; i++) {
    hash = assignedToId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/* ─── Mock: estado da conexão Google ───────────────────── */
// Quando integrar de verdade, isso virá do banco (tabela google_auth ou employees.metadata)
const MOCK_GOOGLE_STATUS = {
  connected: false,          // true quando o usuário conectou
  email: null,               // ex: 'vinicius@roiexpert.com.br'
  lastSync: null,            // ISO string da última sincronização
  error: null,               // mensagem de erro se API falhar
};

export default function AgendaPessoal() {
  const { user: currentUser } = useAuth();
  const { clients } = useClients();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [googleStatus, setGoogleStatus] = useState(MOCK_GOOGLE_STATUS);
  const [isConnecting, setIsConnecting] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    category: 'Agendamento',
    title: '', 
    start: '', 
    end: '',
    client_id: '',
    meeting_type: 'Call',
    department: 'Geral',
    notes: '',
    guests: [],
    location: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  function formatDateTimeLocal(date) {
    if (!date) return '';
    const d = new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
  }

  function emptyForm(dateStr = '') {
    return { 
      category: 'Agendamento',
      title: '', 
      start: dateStr, 
      end: '',
      client_id: '',
      meeting_type: 'Call',
      department: 'Geral',
      notes: '',
      guests: [],
      location: ''
    };
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.start) {
      alert('Preencha título e data/hora de início.');
      return;
    }
    setSubmittingCreate(true);
    try {
      const startIso = new Date(createForm.start).toISOString();
      const endIso = createForm.end 
        ? new Date(createForm.end).toISOString()
        : new Date(new Date(createForm.start).getTime() + 60 * 60 * 1000).toISOString();

      const clientObj = createForm.client_id ? clients.find(c => c.id === createForm.client_id) : null;
      const clientName = clientObj ? (clientObj.metadata?.display_name || clientObj.name) : '';
      const finalTitle = clientName ? `${createForm.title} - ${clientName}` : createForm.title;

      if (createForm.category === 'Agendamento') {
        await supabase.from('client_meetings').insert({
          created_by: currentUser.employeeId || currentUser.id,
          client_id: createForm.client_id || null,
          title: finalTitle,
          scheduled_at: startIso,
          type: createForm.meeting_type,
          location: createForm.location,
          status: 'Agendado',
          department: createForm.department,
          metadata: { notes: createForm.notes, guests: createForm.guests, end_time: endIso }
        });
      } else if (createForm.category === 'Tarefas') {
        await supabase.from('department_tasks').insert({
          assigned_to: currentUser.employeeId || currentUser.id,
          client_id: createForm.client_id || null,
          title: finalTitle,
          scheduled_for: startIso,
          department: createForm.department,
          status: 'Agendado',
          description: createForm.notes,
          metadata: { guests: createForm.guests, end_time: endIso, location: createForm.location }
        });
      } else if (createForm.category === 'Evento') {
        await supabase.from('google_events').insert({
          employee_id: currentUser.employeeId || currentUser.id,
          title: finalTitle,
          start_time: startIso,
          end_time: endIso,
          location: createForm.location,
          description: createForm.notes,
          status: 'confirmed'
        });
      }
      setCreateModal(false);
      setCreateForm({ category: 'Agendamento', title: '', start: '', end: '', client_id: '', meeting_type: 'Call', department: 'Geral', notes: '', guests: [], location: '' });
      await fetchData();
    } catch (err) {
      alert('Erro ao criar agendamento: ' + err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { 
    if (currentUser?.id) {
      fetchData(); 
    }
  }, [currentUser?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: collabData } = await supabase.from('employees').select('id, name, department');
      if (collabData) setCollaborators(collabData);

      // Busca apenas reuniões criadas pelo usuário logado
      if (!currentUser?.id && !currentUser?.employeeId) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data: meetingsData, error } = await supabase
        .from('client_meetings')
        .select('*')
        .eq('created_by', currentUser.employeeId || currentUser.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Busca tarefas agendadas (department_tasks) onde o usuário é o responsável
      const { data: tasksData, error: tasksError } = await supabase
        .from('department_tasks')
        .select('*')
        .eq('assigned_to', currentUser.employeeId || currentUser.id)
        .eq('status', 'Agendado')
        .not('scheduled_for', 'is', null);

      if (tasksError) console.error("Erro ao buscar tarefas na agenda pessoal:", tasksError);

      // Verifica conexão com Google
      const { data: intData } = await supabase
        .from('employee_integrations')
        .select('*')
        .eq('employee_id', currentUser.employeeId || currentUser.id)
        .eq('provider', 'google_calendar')
        .single();
        
      if (intData) {
        setGoogleStatus({
          connected: true,
          email: intData.email || 'Conta vinculada',
          lastSync: intData.last_sync,
          error: null
        });
        // REMOVIDO: auto-sync em background ao abrir a página.
        // Isso gerava centenas de chamadas à Edge Function causando erros 400 nos logs.
        // O usuário deve clicar em "Sincronizar" para atualizar manualmente.
      } else {
        setGoogleStatus(MOCK_GOOGLE_STATUS);
      }

      // Busca os Eventos do Google na nossa base
      const { data: googleEventsData } = await supabase
        .from('google_events')
        .select('*')
        .eq('employee_id', currentUser.employeeId || currentUser.id)
        .order('start_time', { ascending: true });

      let allEvents = [];

      // Processa Eventos CRM...
      if (meetingsData) {
        const formatted = meetingsData.map(m => {
          let startDate = new Date();
          if (m.scheduled_at) {
            const p = new Date(m.scheduled_at);
            if (!isNaN(p.getTime())) startDate = p;
          }
          const client = clients?.find(c => c.id === m.client_id);
          return {
            id: m.id,
            title: m.title || 'Sem título',
            client_name: client?.metadata?.display_name || client?.name || 'Cliente',
            start: startDate,
            type: m.type || 'Call',
            status: m.status || 'Agendado',
            department: m.department || '',
            meeting_link: m.meeting_link,
            location: m.location,
            notes: m.metadata?.notes || '',
            guests: m.metadata?.guests || [],
            synced_personal: m.metadata?.synced_personal || false,
            synced_global: m.metadata?.synced_global || false,
          };
        });
        allEvents = [...allEvents, ...formatted];
      }

      // Processa Tarefas CRM...
      if (tasksData) {
        const formattedTasks = tasksData.map(t => {
          let startDate = new Date();
          if (t.scheduled_for) {
            const p = new Date(t.scheduled_for);
            if (!isNaN(p.getTime())) startDate = p;
          }
          const client = clients?.find(c => c.id === t.client_id);
          return {
            id: `task_${t.id}`,
            title: `[${t.department}] ${t.title || 'Sem título'}`,
            client_name: client?.metadata?.display_name || client?.name || 'Cliente',
            start: startDate,
            type: t.department === 'Captação' ? 'Gravação' : 'Tarefa Agendada',
            status: t.status || 'Agendado',
            department: t.department || '',
            meeting_link: '',
            location: t.metadata?.location || '',
            notes: t.description || t.feedback || '',
            guests: [],
            synced_personal: false,
            synced_global: false,
            customColor: t.department === 'Captação' ? getCaptorColor(t.assigned_to) : null,
          };
        });
        allEvents = [...allEvents, ...formattedTasks];
      }

      // Processa Eventos Google...
      if (googleEventsData) {
        const formattedGoogle = googleEventsData.map(ge => {
          const isTask = ge.location === 'Google Tasks';
          return {
            id: `google_${ge.id}`,
            title: ge.title ? ge.title.replace(/^\[.*?@.*?\]\s*/, '') : 'Sem título',
            client_name: isTask ? 'Google Tasks (Pessoal)' : 'Google Calendar (Pessoal)',
            start: new Date(ge.start_time),
            type: isTask ? 'Google Task' : 'Google',
            status: ge.status === 'cancelled' ? 'Cancelado' : (new Date(ge.start_time) < new Date() ? 'Realizado' : 'Agendado'),
            department: '',
            meeting_link: ge.html_link,
            location: isTask ? '' : ge.location,
            notes: ge.description,
            guests: [],
            synced_personal: true, 
            synced_global: false,
            customColor: isTask 
              ? { bg: 'rgba(234,179,8,0.15)', border: '#eab308', text: '#eab308' } // Amarelo para Tasks
              : { bg: 'rgba(74,222,128,0.15)', border: '#4ade80', text: '#4ade80' } // Verde para o Google
          };
        });
        allEvents = [...allEvents, ...formattedGoogle];
      }

      console.log("DADOS_DEBUG:", {
        currentUserId: currentUser?.id,
        currentUserEmployeeId: currentUser?.employeeId,
        meetingsCount: meetingsData?.length || 0,
        tasksCount: tasksData?.length || 0,
        googleEventsCount: googleEventsData?.length || 0,
        allEventsCount: allEvents.length
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Erro ao buscar dados da agenda:", error);
      alert("Erro ao desenhar a agenda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!googleStatus.connected) {
      alert('Você precisa Conectar com Google primeiro.');
      return;
    }
    // Cooldown de 5 minutos entre sincronizações para não sobrecarregar a Edge Function
    const now = Date.now();
    const lastAttempt = parseInt(sessionStorage.getItem('lastCalendarSync') || '0');
    const cooldownMs = 5 * 60 * 1000; // 5 minutos
    if (now - lastAttempt < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - lastAttempt)) / 1000);
      alert(`Aguarde ${remaining}s antes de sincronizar novamente.`);
      return;
    }
    sessionStorage.setItem('lastCalendarSync', String(now));
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: { employeeId: currentUser.employeeId || currentUser.id }
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);
      
      alert(`Sincronização concluída! ${data.count !== undefined ? data.count : '?'} eventos/tarefas atualizados.`);
      await fetchData();
    } catch (err) {
      console.error('Sync Error:', err);
      alert('Falha ao sincronizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Handlers Google (placeholders para integração futura) ─── */
  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Configure VITE_GOOGLE_CLIENT_ID no .env e na Vercel.');
      setIsConnecting(false);
      return;
    }
    // Pega a URL atual do site dinamicamente (seja localhost ou em produção)
    const redirectUri = window.location.origin + '/auth/google/callback';
    
    // Escopos do Google Calendar (Leitura e Escrita) e Tasks (Leitura)
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks.readonly';
    
    // Monta a URL do Google e salva o ID do usuário no "state" para sabermos quem logou
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${currentUser.employeeId || currentUser.id}`;
    
    // Redireciona a página para o Google
    window.location.href = authUrl;
  };

  const handleDisconnectGoogle = async () => {
    // Apaga os eventos e o token do banco
    await supabase.from('google_events').delete().eq('employee_id', currentUser.employeeId || currentUser.id);
    await supabase.from('employee_integrations').delete().eq('employee_id', currentUser.employeeId || currentUser.id).eq('provider', 'google_calendar');
    
    setGoogleStatus(MOCK_GOOGLE_STATUS);
    setEvents(events.filter(e => e.type !== 'Google'));
  };

  /* ─── Calendário ─── */
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevMonthDays - i, thisMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, thisMonth: true, date: new Date(year, month, d) });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push({ day: d, thisMonth: false, date: new Date(year, month + 1, d) });

  const eventsForDay = (date) =>
    events.filter(e => isSameDay(e.start, date)).sort((a, b) => a.start - b.start);

  const upcomingEvents = events
    .filter(e => e.start >= today)
    .sort((a, b) => a.start - b.start)
    .slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 20px 20px' }}>

      {/* ══ Header ══ */}
      <header className="glass-panel" style={{ padding: '20px 28px', borderLeft: '4px solid #818cf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main,#f1f5f9)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Agenda Pessoal
              {currentUser?.name && (
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted,#94a3b8)' }}>
                  — {currentUser.name}
                </span>
              )}
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted,#94a3b8)' }}>
              Suas reuniões agendadas na plataforma · Sincronização com Google Calendar
            </p>
          </div>
        </div>

        {/* Status + Botões */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <GoogleStatusBadge
            status={googleStatus}
            isConnecting={isConnecting}
            onConnect={handleConnectGoogle}
            onDisconnect={handleDisconnectGoogle}
            syncButton={
              <button
                onClick={handleSync}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', cursor: loading ? 'wait' : 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'background 0.2s', opacity: loading ? 0.7 : 1 }}
                onMouseOver={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseOut={e => !loading && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <RefreshCw size={14} className={loading ? "spin-animation" : ""} /> {loading ? 'Atualizando...' : 'Sincronizar'}
              </button>
            }
          />
          <button
            onClick={() => setCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1', color: '#a5b4fc', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.3)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </header>

      {/* ══ Layout principal ══ */}
      <div className="cal-layout-responsive" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, flex:1, minHeight:0 }}>

        {/* ─ CALENDÁRIO ─ */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
          {/* Nav header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <NavBtn onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></NavBtn>
              <NavBtn onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}><ChevronRight size={16} /></NavBtn>
              <NavBtn onClick={() => { setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(null); }}
                style={{ padding: '4px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                Hoje
              </NavBtn>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main,#f1f5f9)' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted,#94a3b8)' }}>
              {events.filter(e => e.start.getMonth() === month && e.start.getFullYear() === year).length} reuniões suas
            </span>
          </div>

          {/* Dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.8px', color: 'var(--text-muted,#94a3b8)', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Grade */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted,#94a3b8)', fontSize: '0.9rem' }}>Carregando sua agenda...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {cells.map((cell, idx) => {
                const dayEvs = eventsForDay(cell.date);
                const isToday = cell.thisMonth && isSameDay(cell.date, today);
                const isSel = selectedDay && isSameDay(cell.date, selectedDay);
                const isPast = cell.date < new Date(new Date().setHours(0,0,0,0));
                return (
                  <div
                    key={idx}
                    className="cal-cell-responsive"
                    onClick={() => setSelectedDay(cell.date)}
                    style={{
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      padding: '6px 5px', minHeight: 90, cursor: isPast ? 'not-allowed' : 'pointer',
                      background: isSel ? 'rgba(99,102,241,0.12)' : isToday ? 'rgba(99,102,241,0.06)' : 'transparent',
                      transition: 'background .15s',
                      opacity: isPast ? 0.35 : 1,
                      pointerEvents: isPast ? 'none' : 'auto',
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(99,102,241,0.12)' : isToday ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                  >
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, borderRadius: '50%', marginBottom: 3,
                      fontSize: '0.8rem', fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#fff' : cell.thisMonth ? 'var(--text-main,#f1f5f9)' : 'rgba(148,163,184,0.3)',
                      background: isToday ? '#6366f1' : 'transparent',
                    }}>{cell.day}</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayEvs.slice(0, 3).map(ev => {
                        const col = statusColor(ev.status, ev.customColor);
                        return (
                          <div
                            key={ev.id}
                            className="cal-event-item"
                            onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                            title={ev.title}
                            style={{
                              background: col.bg, borderLeft: `2.5px solid ${col.border}`,
                              color: col.text, fontSize: '0.63rem', fontWeight: 600,
                              padding: '2px 4px', borderRadius: '0 4px 4px 0',
                              overflow: 'hidden', cursor: 'pointer', lineHeight: 1.35,
                              display: 'flex', alignItems: 'center', gap: 3,
                            }}
                            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.3)'}
                            onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                          >
                            {/* Ícone de sincronização Google */}
                            {ev.synced_personal && (
                              <span title="Sincronizado com Google Pessoal" style={{ fontSize: '0.55rem', opacity: 0.8 }}>G</span>
                            )}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {ev.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvs.length > 3 && (
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted,#94a3b8)', paddingLeft: 4 }}>
                          +{dayEvs.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─ COLUNA LATERAL ─ */}
        <div className="cal-panel-responsive" style={{ display:'flex', flexDirection:'column', gap:14, minHeight:0, overflow:'hidden' }}>

          {/* Dia selecionado */}
          {selectedDay && (
            <div className="glass-panel" style={{ padding: 14, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', letterSpacing: '.4px' }}>
                  {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setExpandedDay(selectedDay)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Maximize2 size={16} />
                  </button>
                  <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              {eventsForDay(selectedDay).length === 0 ? (
                <p style={{ color: 'var(--text-muted,#94a3b8)', fontSize: '0.82rem', margin: 0 }}>Nenhuma reunião sua neste dia.</p>
              ) : (
                eventsForDay(selectedDay).map(ev => {
                  const col = statusColor(ev.status, ev.customColor);
                  return (
                    <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                      style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${col.border}`, background: col.bg, cursor: 'pointer' }}>
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main,#f1f5f9)' }}>{ev.title}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: col.text }}>
                        {ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {ev.status}
                        {ev.synced_personal && <span style={{ marginLeft: 6, opacity: 0.7 }}>· 🔗 Google</span>}
                      </p>
                    </div>
                  );
                })
              )}
              <button 
                onClick={() => {
                  setCreateForm(emptyForm(formatDateTimeLocal(selectedDay)));
                  setCreateModal(true);
                }}
                style={{ width: '100%', marginTop: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', padding: '8px 0', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
              >
                <Plus size={16} />
                Agendar neste dia
              </button>
            </div>
          )}

          {/* Próximas reuniões */}
          <div className="glass-panel" style={{ padding: 14, borderRadius: 12 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main,#f1f5f9)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: '#818cf8' }} /> Minhas Próximas Reuniões
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {loading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Carregando...</p>
              ) : upcomingEvents.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Você não tem reuniões futuras.</p>
              ) : upcomingEvents.map(ev => {
                const col = statusColor(ev.status, ev.customColor);
                return (
                  <div key={ev.id} onClick={() => setSelectedEvent(ev)}
                    style={{ padding: '8px 10px', borderRadius: 8, borderLeft: `3px solid ${col.border}`, background: col.bg, cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main,#f1f5f9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</p>
                      {ev.synced_personal && (
                        <span title="Sincronizado com Google" style={{ marginLeft: 6, fontSize: '0.65rem', color: '#4ade80', flexShrink: 0 }}>● G</span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-muted,#94a3b8)' }}>
                      {ev.start.toLocaleDateString('pt-BR')} às {ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '0.68rem', color: col.text }}>{ev.client_name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info sobre sincronização */}
          <div className="glass-panel" style={{ padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} /> Como funciona a sincronização
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: '0.76rem', color: 'var(--text-muted,#94a3b8)', lineHeight: 1.5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                <span><strong style={{ color: 'var(--text-main)' }}>Sistema → Google:</strong> Reuniões criadas aqui vão para o Google Agenda</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#4ade80', flexShrink: 0 }}>✓</span>
                <span><strong style={{ color: 'var(--text-main)' }}>Google → Sistema:</strong> Seus eventos pessoais também aparecem aqui em verde</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#a5b4fc', flexShrink: 0 }}>ℹ</span>
                <span>Sincronização bidirecional ativada com sucesso!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Modal detalhe ══ */}
      {selectedEvent && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelectedEvent(null)}>
          <div className="glass-panel" onClick={e => e.stopPropagation()}
            style={{ width: 440, padding: 24, borderRadius: 16, position: 'relative', background: 'var(--surface,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

            {/* Faixa topo */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, borderRadius: '16px 16px 0 0', background: statusColor(selectedEvent.status, selectedEvent.customColor).border }} />

            <button onClick={() => setSelectedEvent(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>

            <h3 style={{ margin: '8px 0 4px', fontSize: '1.05rem', color: 'var(--text-main,#f1f5f9)', paddingRight: 30 }}>{selectedEvent.title}</h3>
            <p style={{ margin: '0 0 14px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600 }}>{selectedEvent.client_name}</p>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <span style={{ background: statusColor(selectedEvent.status, selectedEvent.customColor).bg, color: statusColor(selectedEvent.status, selectedEvent.customColor).text, padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                {selectedEvent.status}
              </span>
              {selectedEvent.synced_personal && (
                <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ No Google Pessoal
                </span>
              )}
              {selectedEvent.synced_global && (
                <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ Na Agenda Global
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: 'var(--text-muted,#94a3b8)' }}>
              <InfoRow icon={<Calendar size={14} />}>
                {selectedEvent.start.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} às {selectedEvent.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </InfoRow>
              {selectedEvent.type && (
                <InfoRow icon={<Video size={14} />}>
                  {selectedEvent.type === 'Call' ? 'Online' : selectedEvent.type}
                </InfoRow>
              )}
              {selectedEvent.meeting_link && (
                <InfoRow icon={<LinkIcon size={14} />}>
                  <a href={selectedEvent.meeting_link} target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>
                    {selectedEvent.meeting_link}
                  </a>
                </InfoRow>
              )}
              {selectedEvent.location && (
                <InfoRow icon={<MapPin size={14} />}>{selectedEvent.location}</InfoRow>
              )}
              {selectedEvent.notes && (
                <InfoRow icon={<ClipboardList size={14} />}>{selectedEvent.notes}</InfoRow>
              )}
            </div>

            {/* Ações de Sincronização */}
            <div style={{ marginTop: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.6px' }}>SINCRONIZAR COM GOOGLE AGENDA</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <SyncToggleBtn
                  active={selectedEvent.synced_personal}
                  disabled={!googleStatus.connected}
                  label="Minha Agenda"
                  icon="👤"
                  title={!googleStatus.connected ? 'Conecte seu Google primeiro' : (selectedEvent.synced_personal ? 'Remover da minha agenda' : 'Adicionar à minha agenda')}
                  onClick={() => {
                    // TODO: chamar Edge Function para sincronizar
                    alert(googleStatus.connected
                      ? 'Em breve: sincronizar com Google Pessoal!'
                      : 'Conecte sua conta Google primeiro (botão no topo da página).'
                    );
                  }}
                />
                <SyncToggleBtn
                  active={selectedEvent.synced_global}
                  label="Agenda Global"
                  icon="🏢"
                  title={selectedEvent.synced_global ? 'Remover da agenda global' : 'Adicionar à agenda global ROI Expert'}
                  onClick={() => {
                    // TODO: chamar Edge Function para sincronizar com Service Account
                    alert('Em breve: sincronizar com Agenda Global ROI Expert!');
                  }}
                />
              </div>
            </div>

            <button onClick={() => setSelectedEvent(null)}
              style={{ width: '100%', marginTop: 14, padding: '9px 0', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              Fechar
            </button>
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
                      setCreateForm(emptyForm(formatDateTimeLocal(clickedDate)));
                      setCreateModal(true);
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
                    let endHour = startHour + 1;
                    let endMin = startMin;
                    
                    if (ev.end) {
                      endHour = ev.end.getHours();
                      endMin = ev.end.getMinutes();
                    }
                    
                    const actualStartHour = ev.start < new Date(new Date(expandedDay).setHours(0,0,0,0)) ? 0 : startHour;
                    const actualStartMin = ev.start < new Date(new Date(expandedDay).setHours(0,0,0,0)) ? 0 : startMin;
                    const actualEndHour = (ev.end || new Date(ev.start.getTime() + 60*60*1000)) > new Date(new Date(expandedDay).setHours(23,59,59,999)) ? 24 : endHour;
                    const actualEndMin = (ev.end || new Date(ev.start.getTime() + 60*60*1000)) > new Date(new Date(expandedDay).setHours(23,59,59,999)) ? 0 : endMin;

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
                    const col = ev.customColor || statusColor(ev.status);
                    
                    // Cálculo de posição para sobreposição
                    const leftOffset = 70; // 70px base
                    
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
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
                            {ev.title}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: col.text, opacity: 0.8 }}>
                            {String(ev.actualStartHour).padStart(2,'0')}:{String(ev.actualStartMin).padStart(2,'0')} - {ev.actualEndHour === 24 ? '23:59' : String(ev.actualEndHour).padStart(2,'0')}:{String(ev.actualEndMin).padStart(2,'0')}
                          </span>
                          {ev.notes && ev.height > 50 && (
                            <span style={{ fontSize: '0.65rem', color: col.text, opacity: 0.6, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {ev.notes}
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

      {/* Modal Criar Agendamento/Tarefa */}
      {createModal && createPortal(
        <div style={{ position:'fixed', inset:0, zIndex:999999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
          onClick={() => setCreateModal(false)}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width:500, padding:26, borderRadius:16, position:'relative', maxHeight:'92vh', overflowY:'auto', background:'var(--surface,#0f172a)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 25px 60px rgba(0,0,0,0.5)' }}
          >
            <button onClick={() => setCreateModal(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--text-muted)', width:32, height:32, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <X size={18}/>
            </button>
            <h3 style={{ margin:'0 0 20px', fontSize:'1.1rem', color:'var(--text-main,#f1f5f9)', display:'flex', alignItems:'center', gap:8 }}>
              <Calendar size={18} style={{ color:'var(--primary,#818cf8)' }}/> Novo Agendamento
            </h3>

            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              {/* Cliente (Só se não for Evento, e para Tarefa é opcional) */}
              {createForm.category !== 'Evento' && (
                <Field label="CLIENTE">
                  <select className="glass-input" style={{ width:'100%' }} value={createForm.client_id} onChange={e => setCreateForm({...createForm, client_id: e.target.value})}>
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

              <Field label="TÍTULO DA REUNIÃO">
                <input className="glass-input" style={{ width:'100%' }} placeholder="Ex: Onboarding, Revisão..." value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})}/>
              </Field>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="DATA / HORA INÍCIO">
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={createForm.start} onChange={e => setCreateForm({...createForm, start: e.target.value})}/>
                </Field>
                <Field label={<>DATA / HORA FINAL <span style={{fontSize:'0.6rem', fontWeight:400, opacity:0.7, marginLeft:4}}>(OPCIONAL)</span></>}>
                  <input type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width:'100%' }} value={createForm.end} onChange={e => setCreateForm({...createForm, end: e.target.value})}/>
                </Field>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="TIPO">
                  <select className="glass-input" style={{ width:'100%' }} value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})}>
                    <option value="Agendamento">Agendamento</option>
                    <option value="Tarefas">Tarefas</option>
                    <option value="Evento">Evento</option>
                  </select>
                </Field>
                <Field label="MODALIDADE">
                  <select className="glass-input" style={{ width:'100%' }} value={createForm.meeting_type} onChange={e => setCreateForm({...createForm, meeting_type: e.target.value})}>
                    <option value="Call">Online</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </Field>
              </div>

              {createForm.category === 'Agendamento' && (
                createForm.meeting_type === 'Call' ? (
                  <Field label="LINK DA REUNIÃO">
                    <input className="glass-input" style={{ width:'100%' }} placeholder="https://meet.google.com/..." value={createForm.location} onChange={e => setCreateForm({...createForm, location: e.target.value})}/>
                  </Field>
                ) : (
                  <Field label="LOCAL DA REUNIÃO">
                    <input className="glass-input" style={{ width:'100%' }} placeholder="Endereço ou local..." value={createForm.location} onChange={e => setCreateForm({...createForm, location: e.target.value})}/>
                  </Field>
                )
              )}

              <Field label="CONVIDAR COLABORADORES">
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:90, overflowY:'auto', padding:10, background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
                  {collaborators.map(c => {
                    const sel = createForm.guests.includes(c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => {
                        const guests = sel ? createForm.guests.filter(id => id !== c.id) : [...createForm.guests, c.id];
                        setCreateForm({...createForm, guests});
                      }} style={{ padding:'4px 11px', fontSize:'0.72rem', borderRadius:20, cursor:'pointer', background: sel ? 'var(--primary,#6366f1)' : 'rgba(255,255,255,0.05)', border:'none', color: sel ? '#fff' : 'var(--text-muted,#94a3b8)', fontWeight: sel ? 600 : 400 }}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="OBSERVAÇÕES / PAUTA">
                <textarea className="glass-input" style={{ width:'100%', minHeight:80, resize:'vertical' }} placeholder="Tópicos a discutir, informações relevantes..." value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})}/>
              </Field>

              <button className="glass-btn primary" disabled={submittingCreate} onClick={handleCreate} style={{ padding:'12px 0', marginTop:4, fontSize:'0.9rem', fontWeight:700, letterSpacing:'.3px' }}>
                {submittingCreate ? 'SALVANDO...' : 'SALVAR AGENDAMENTO'}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </div>
  );
}

/* ─── Sub-componentes ─────────────────────────────────── */

function GoogleStatusBadge({ status, isConnecting, onConnect, onDisconnect, syncButton }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {/* Indicador de status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 10,
        background: status.connected ? 'rgba(74,222,128,0.08)' : status.error ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${status.connected ? 'rgba(74,222,128,0.25)' : status.error ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}>
        {status.connected ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
            <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 600 }}>Google Conectado</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>· {status.email}</span>
          </>
        ) : status.error ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block', boxShadow: '0 0 6px #f87171' }} />
            <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>Erro na Conexão</span>
          </>
        ) : (
          <>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Google não conectado</span>
          </>
        )}
      </div>

      {/* Botão conectar/desconectar */}
      {status.connected ? (
        <button onClick={onDisconnect}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
          <Unlink size={13} /> Desconectar
        </button>
      ) : (
        <button onClick={onConnect} disabled={isConnecting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-main,#f1f5f9)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, opacity: isConnecting ? 0.7 : 1 }}>
          {isConnecting ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {isConnecting ? 'Conectando...' : 'Conectar Google'}
        </button>
      )}

      {syncButton}
    </div>
  );
}

function SyncToggleBtn({ active, disabled, label, icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        flex: 1, padding: '8px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#4ade80' : disabled ? 'rgba(148,163,184,0.4)' : 'var(--text-muted,#94a3b8)',
        fontSize: '0.75rem', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        opacity: disabled ? 0.5 : 1,
        transition: 'all .2s',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span>{active ? '✓ ' : ''}{label}</span>
    </button>
  );
}

const InfoRow = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
    <span style={{ color: '#818cf8', marginTop: 1, flexShrink: 0 }}>{icon}</span>
    <span style={{ color: 'var(--text-main,#f1f5f9)', lineHeight: 1.5 }}>{children}</span>
  </div>
);

const NavBtn = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-muted,#94a3b8)', borderRadius: 8, padding: '4px 8px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .15s',
    ...style
  }}>{children}</button>
);

const Field = ({ label, children }) => (
  <div>
    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, letterSpacing:'.8px', color:'var(--text-muted,#94a3b8)', marginBottom:5 }}>{label}</label>
    {children}
  </div>
);
