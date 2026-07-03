import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock, MapPin, Camera, Trash2 } from 'lucide-react';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CaptacaoCalendar = ({ client }) => {
  const { user } = useAuth();
  if (!client) return null;
  const { tasks, updateTask } = useDepartmentTasks(client.id, 'Captação');
  
  const handleUnschedule = async (id, task) => {
    if (!window.confirm("Deseja realmente desmarcar o agendamento desta captação?")) return;
    
    // Atualiza a tarefa desmarcando
    await updateTask(id, {
      status: 'Aguardando Agendamento',
      scheduled_for: null,
      metadata: {
        ...task.metadata,
        client_approved_schedule: false,
        history: [...(task.metadata?.history || []), { action: 'Agendamento desmarcado pelo painel setorial', date: new Date().toISOString() }]
      }
    });

    // Envia a notificação no chat
    const isClient = user?.role === 'client';
    try {
      await supabase.from('chat_messages').insert({
        client_id: client.id,
        department: 'Captação',
        sender_id: user?.id,
        sender_name: user?.name || user?.email || (isClient ? 'Cliente' : 'Equipe ROI Expert'),
        sender_type: isClient ? 'client' : 'employee',
        content: `⚠️ Atenção: A gravação "${task.title}" foi cancelada/desmarcada${isClient ? ' pelo cliente' : ''}. Logo mais remarcaremos uma nova data.`,
        is_internal: false,
      });
    } catch (e) {
      console.warn("Erro ao enviar notificação de cancelamento", e);
    }
  };
  
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  
  // Cells for the calendar
  const cells = [];
  
  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1), thisMonth: false });
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), thisMonth: true });
  }
  
  // Next month padding
  const remaining = 42 - cells.length; // 6 rows
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), thisMonth: false });
  }
  
  // Filter tasks with scheduled_for dates
  const scheduledTasks = tasks.filter(t => t.scheduled_for);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Concluído': return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', text: '#10b981' };
      case 'Agendado': return { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.4)', text: '#818cf8' };
      case 'Pendente':
      case 'Reagendamento Solicitado': return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: 'var(--text-main)' };
    }
  };

  const selectedDayTasks = selectedDay ? scheduledTasks.filter(t => isSameDay(new Date(t.scheduled_for), selectedDay)) : [];

  return (
    <div className="glass-panel" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CalendarIcon size={22} style={{ color: 'var(--primary, #818cf8)' }} />
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Agendamento — Captação
          </h2>
        </div>
      </div>
      
      <div className="cal-layout-responsive" style={{ display: 'flex' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}>
          {/* Header do Mês */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 16 }}>
            <button onClick={prevMonth} className="icon-btn" style={{ padding: 6 }}><ChevronLeft size={16}/></button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, minWidth: 120, textAlign: 'center' }}>
              {monthNames[month]} {year}
            </span>
            <button onClick={nextMonth} className="icon-btn" style={{ padding: 6 }}><ChevronRight size={16}/></button>
          </div>
          
          {/* Dias da Semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.02)' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
              <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
          </div>
          
          {/* Grid de Dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, overflow: 'auto' }}>
            {cells.map((cell, idx) => {
              const dayTasks = scheduledTasks.filter(t => isSameDay(new Date(t.scheduled_for), cell.date));
              const isToday = cell.thisMonth && isSameDay(cell.date, today);
              const isSelected = selectedDay && isSameDay(cell.date, selectedDay);
              const isPast = cell.date < new Date(new Date().setHours(0,0,0,0));
              
              return (
                <div 
                  key={idx}
                  className="cal-cell-responsive"
                  onClick={() => setSelectedDay(cell.date)}
                  style={{
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    padding: '6px 5px',
                    minHeight: 85,
                    overflow: 'hidden',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    background: isSelected ? 'rgba(99,102,241,0.12)' : isToday ? 'rgba(99,102,241,0.06)' : 'transparent',
                    transition: 'background .15s',
                    opacity: isPast ? 0.35 : 1,
                    pointerEvents: isPast ? 'none' : 'auto',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.12)' : isToday ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    fontSize: '0.8rem', fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : cell.thisMonth ? 'var(--text-main)' : 'rgba(148,163,184,0.3)',
                    background: isToday ? 'var(--primary)' : 'transparent',
                    marginBottom: 3,
                    flexShrink: 0
                  }}>
                    {cell.date.getDate()}
                  </div>
                  
                  <div className="cal-scroll-hidden cal-events-container" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    {dayTasks.map(t => {
                      const col = getStatusColor(t.status);
                      const dt = new Date(t.scheduled_for);
                      return (
                        <div 
                          key={t.id}
                          className="cal-event-item"
                          title={t.title}
                          style={{
                            background: col.bg,
                            borderLeft: `2.5px solid ${col.border}`,
                            color: col.text,
                            '--cal-dot-color': col.border,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '3px 5px',
                            borderRadius: '0 4px 4px 0',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <span className="cal-event-text" style={{ fontWeight: 700, marginRight: 4 }}>{dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span>
                          <span className="cal-event-text">{t.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Painel Lateral de Detalhes do Dia */}
        <div className="cal-panel-responsive" style={{ width: 340, background: 'var(--surface, #0f172a)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
          {selectedDay ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '.4px' }}>
                  {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                </span>
                <button onClick={() => setSelectedDay(null)} className="icon-btn"><X size={16} /></button>
              </div>
              
              {selectedDayTasks.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhuma captação neste dia.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
                  {selectedDayTasks.map(t => {
                    const col = getStatusColor(t.status);
                    const dt = new Date(t.scheduled_for);
                    return (
                      <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Camera size={10} /> Gravação
                          </div>
                          <button 
                            onClick={() => handleUnschedule(t.id, t)} 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6, padding: 4 }}
                            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = 1; }}
                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = 0.6; }}
                            title="Desmarcar Agendamento"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--text-main)' }}>{t.title}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Clock size={12} /> {dt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                          </div>
                          {t.metadata?.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <MapPin size={12} /> {t.metadata.location}
                            </div>
                          )}
                          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', background: col.bg, color: col.text, padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, marginTop: 4 }}>
                            {t.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 32, textAlign: 'center' }}>
              Selecione um dia no calendário para ver os detalhes das captações.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaptacaoCalendar;
