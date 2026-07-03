import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize, Minimize, Calendar, Clock, CheckCircle2, AlertTriangle, Users, Briefcase, Loader2, Target, CheckCircle, Flame } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CommercialTVDashboard from '../components/Commercial/CommercialTVDashboard';

const DEPARTMENTS = [
  { id: 'Captação', name: 'Captação', color: '#ec4899' },
  { id: 'Edição', name: 'Edição', color: '#8b5cf6' },
  { id: 'Social Media', name: 'Social Media', color: '#14b8a6' },
  { id: 'Design', name: 'Design', color: '#f59e0b' },
  { id: 'Tráfego Pago', name: 'Tráfego Pago', color: '#3b82f6' },
  { id: 'CRM', name: 'CRM', color: '#10b981' },
  { id: 'Comercial', name: 'Comercial', color: '#eab308' },
  { id: 'Sucesso do Cliente', name: 'Sucesso do Cliente', color: '#6366f1' }
];

export default function KanbanBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const handleCardClick = (department) => {
    if (user?.role === 'admin' || user?.role === 'owner') {
      const routes = {
        'Captação': '/captacao',
        'Edição': '/edicao',
        'Social Media': '/social-media',
        'Design': '/design',
        'Tráfego Pago': '/trafego',
        'CRM': '/crm',
        'Comercial': '/comercial'
      };
      if (routes[department]) {
        navigate(routes[department]);
      }
    } else {
      // Se não for admin, mantemos o comportamento de apenas mudar a aba
      setSelectedDept(department);
    }
  };
  const containerRef = useRef(null);

  const fetchData = async () => {
    try {
      // Busca tarefas que NÃO estão concluídas (ou concluídas nas últimas 24h)
      const { data: tasksData, error: taskErr } = await supabase
        .from('department_tasks')
        .select(`
          id, title, department, status, created_at, updated_at,
          clients(name, company, metadata),
          employees(name, avatar_color)
        `)
        .neq('status', 'Concluído')
        .order('created_at', { ascending: false });

      // Busca reuniões a partir de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: meetingsData, error: meetErr } = await supabase
        .from('client_meetings')
        .select(`
          id, title, scheduled_at, status, department, type,
          clients(name, company, metadata)
        `)
        .gte('scheduled_at', today.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(10);

      if (taskErr) console.error(taskErr);
      if (meetErr) console.error(meetErr);

      setTasks(tasksData || []);
      setMeetings(meetingsData || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 180000); // Auto-refresh a cada 3 mins para poupar Supabase
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error("Erro ao tentar entrar em tela cheia:", err);
        });
        setIsFullscreen(true);
      }
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const [selectedDept, setSelectedDept] = useState('Global');

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'Aprovado' && t.status !== 'Concluído'), [tasks]);
  const handoffs = useMemo(() => tasks.filter(t => t.status === 'Em Revisão'), [tasks]);

  if (loading) {
    return <div className="tv-loading"><Loader2 className="spin" size={48} /><span>Iniciando Painel Global...</span></div>;
  }

  // Define as colunas do Kanban detalhado
  const KANBAN_COLS = [
    { id: 'A Fazer', label: 'A Fazer (Fila)', color: '#94a3b8' },
    { id: 'Em Andamento', label: 'Em Andamento', color: '#3b82f6' },
    { id: 'Em Revisão', label: 'Em Revisão (Cliente)', color: '#f59e0b' },
    { id: 'Refazer', label: 'Atenção: Refazer', color: '#ef4444' }
  ];

  return (
    <div ref={containerRef} className={`tv-dashboard ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Top Header */}
      <header className="tv-header">
        <div className="tv-brand">
          <div className="brand-icon"><Target size={28} /></div>
          <div>
            <h1>Centro de Operações</h1>
            <span>Atualizado em: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="tv-dept-tabs">
          <button 
            className={`tv-tab-btn ${selectedDept === 'Global' ? 'active' : ''}`}
            onClick={() => setSelectedDept('Global')}
          >
            Visão Global
          </button>
          {DEPARTMENTS.map(d => (
            <button 
              key={d.id}
              className={`tv-tab-btn ${selectedDept === d.name ? 'active' : ''}`}
              onClick={() => setSelectedDept(d.name)}
              style={selectedDept === d.name ? { borderBottomColor: d.color, color: d.color } : {}}
            >
              {d.name}
            </button>
          ))}
        </div>

        <div className="tv-metrics">
          <button className="tv-fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </button>
        </div>
      </header>

      {/* Main Grid: Departamentos x Reuniões */}
      <div className="tv-main-grid" style={selectedDept === 'Comercial' ? { display: 'block', height: '100%' } : {}}>
        {selectedDept === 'Comercial' ? (
          <CommercialTVDashboard />
        ) : selectedDept === 'Global' ? (
          <div className="tv-depts-area">
            {DEPARTMENTS.map(dept => {
              if (dept.name === 'Comercial') return null; // Hide generic kanban for comercial in global
              const deptTasks = tasks.filter(t => t.department === dept.name);
              const inProgress = deptTasks.filter(t => t.status === 'Em Andamento');
              const toReview = deptTasks.filter(t => t.status === 'Em Revisão' || t.status === 'Em Revisão Interna');
              const toDo = deptTasks.filter(t => t.status === 'A Fazer' || t.status === 'Agendado' || t.status === 'Refazer');
              
              return (
                <div key={dept.id} className="tv-dept-card">
                  <div className="tv-dept-header" style={{ borderBottomColor: dept.color }}>
                    <h3 style={{ color: dept.color }}>{dept.name}</h3>
                    <div className="tv-dept-count" style={{ background: `${dept.color}22`, color: dept.color }}>
                      {deptTasks.length}
                    </div>
                  </div>
                  <div className="tv-dept-body">
                    <div className="tv-task-list">
                      {/* Priorizando mostrar o que está em andamento primeiro */}
                      {[...inProgress, ...toReview, ...toDo].slice(0, 5).map(task => (
                        <div 
                          key={task.id} 
                          className="tv-task-item" 
                          style={{ borderLeftColor: dept.color, cursor: 'pointer' }}
                          onClick={() => handleCardClick(task.department)}
                        >
                          <div className="tv-t-head">
                            <span className={`tv-status-badge s-${task.status.replace(/\s+/g, '-').toLowerCase()}`}>
                              {task.status}
                            </span>
                            <span className="tv-t-user">
                              <Users size={10} /> {task.employees?.name?.split(' ')[0] || 'Geral'}
                            </span>
                          </div>
                          <h4 className="tv-t-title">{task.title}</h4>
                          <span className="tv-t-client">{task.clients?.metadata?.display_name || task.clients?.name || 'Cliente Geral'}</span>
                        </div>
                      ))}
                      {deptTasks.length === 0 && (
                        <div className="tv-empty-tasks">Nenhuma tarefa ativa.</div>
                      )}
                      {deptTasks.length > 5 && (
                        <div className="tv-more-tasks">+{deptTasks.length - 5} tarefas na fila</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="tv-detailed-kanban-area">
            {KANBAN_COLS.map(col => {
              const colTasks = tasks.filter(t => t.department === selectedDept && (
                t.status === col.id || 
                (col.id === 'A Fazer' && t.status === 'Agendado') ||
                (col.id === 'Em Revisão' && t.status === 'Em Revisão Interna')
              ));
              return (
                <div key={col.id} className="tv-kanban-col-card">
                  <div className="tv-k-header" style={{ borderBottomColor: col.color }}>
                    <h3>{col.label}</h3>
                    <span className="count">{colTasks.length}</span>
                  </div>
                  <div className="tv-k-body">
                    {colTasks.map(task => (
                      <div 
                        key={task.id} 
                        className="tv-task-item" 
                        style={{ borderLeftColor: col.color, background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
                        onClick={() => handleCardClick(selectedDept)}
                      >
                        <div className="tv-t-head">
                          <span className="tv-t-user" style={{ color: col.color }}>
                            <Users size={12} /> {task.employees?.name?.split(' ')[0] || 'Equipe'}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="tv-t-title" style={{ fontSize: '1rem', marginTop: 8 }}>{task.title}</h4>
                        <span className="tv-t-client" style={{ fontSize: '0.8rem' }}>{task.clients?.metadata?.display_name || task.clients?.name}</span>
                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="tv-empty-tasks">Coluna vazia.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sidebar: Reuniões e Urgências */}
        {selectedDept !== 'Comercial' && (
          <div className="tv-side-area">
          <div className="tv-panel glass-panel">
            <div className="tv-panel-header">
              <h3><Calendar size={18} color="#10b981" /> Próximas Reuniões {selectedDept !== 'Global' && `(${selectedDept})`}</h3>
            </div>
            <div className="tv-panel-body">
              {meetings.filter(m => selectedDept === 'Global' || !m.department || m.department === selectedDept).length > 0 ? meetings.filter(m => selectedDept === 'Global' || !m.department || m.department === selectedDept).map(meet => {
                const isToday = new Date(meet.scheduled_at).toDateString() === new Date().toDateString();
                return (
                  <div key={meet.id} className={`tv-meet-item ${isToday ? 'is-today' : ''}`}>
                    <div className="tv-meet-time">
                      <span className="day">{new Date(meet.scheduled_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
                      <span className="time">{new Date(meet.scheduled_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="tv-meet-info">
                      <h4>{meet.title}</h4>
                      <span className="client">{meet.clients?.metadata?.display_name || meet.clients?.name}</span>
                      <span className="type"><Clock size={10}/> {meet.type} • {meet.department || 'Geral'}</span>
                    </div>
                  </div>
                )
              }) : (
                <div className="tv-empty-tasks">Nenhuma reunião próxima.</div>
              )}
            </div>
          </div>

          <div className="tv-panel glass-panel" style={{ marginTop: 16 }}>
             <div className="tv-panel-header">
              <h3><Flame size={18} color="#ef4444" /> Atenção: Refações</h3>
            </div>
            <div className="tv-panel-body">
              {tasks.filter(t => t.status === 'Refazer' && (selectedDept === 'Global' || t.department === selectedDept)).length > 0 ? tasks.filter(t => t.status === 'Refazer' && (selectedDept === 'Global' || t.department === selectedDept)).map(t => (
                <div 
                  key={t.id} 
                  className="tv-task-item" 
                  style={{ borderLeftColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', cursor: 'pointer' }}
                  onClick={() => handleCardClick(t.department)}
                >
                  <h4 className="tv-t-title">{t.title}</h4>
                  <span className="tv-t-client" style={{ color: '#ef4444' }}>{t.clients?.metadata?.display_name || t.clients?.name}</span>
                </div>
              )) : (
                <div className="tv-empty-tasks">Sem refações pendentes.</div>
              )}
            </div>
          </div>
          </div>
        )}
      </div>

      <style>{`
        .tv-dashboard {
          display: flex; flex-direction: column; height: 100%;
          background: var(--dark-bg); color: var(--text-main);
          overflow: hidden; /* Foco em visualização 100% densa, sem scroll da página toda */
        }
        
        .tv-dashboard.fullscreen-mode {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          z-index: 99999; padding: 24px;
          background: #0f172a; /* Slate 900 para TV */
        }
        
        .tv-dashboard:not(.fullscreen-mode) {
          border-radius: 12px;
        }

        .tv-loading {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; color: var(--text-muted); gap: 16px; font-size: 1.2rem;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Header */
        .tv-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px 12px 0 0;
        }
        .tv-brand { display: flex; align-items: center; gap: 16px; }
        .brand-icon { 
          width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;
        }
        .tv-brand h1 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; }
        .tv-brand span { font-size: 0.8rem; color: #a5b4fc; font-weight: 700; text-transform: uppercase; }

        .tv-dept-tabs {
          display: flex; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 12px;
        }
        .tv-tab-btn {
          background: transparent; border: none; color: var(--text-muted); padding: 8px 16px;
          border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
          border-bottom: 2px solid transparent;
        }
        .tv-tab-btn:hover { background: rgba(255,255,255,0.05); color: white; }
        .tv-tab-btn.active { background: rgba(255,255,255,0.1); color: white; border-bottom-color: #6366f1; }

        .tv-metrics { display: flex; gap: 16px; }

        .tv-fullscreen-btn {
          background: rgba(255,255,255,0.1); border: none; color: white;
          width: 44px; height: 44px; border-radius: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .tv-fullscreen-btn:hover { background: #6366f1; transform: scale(1.05); }

        /* Main Grid */
        .tv-main-grid {
          display: grid; grid-template-columns: 1fr 320px; gap: 20px;
          padding: 20px; flex: 1; overflow: hidden;
        }
        
        /* Departments Area */
        .tv-depts-area {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          height: 100%; overflow-y: auto;
        }

        /* Detailed Kanban Area */
        .tv-detailed-kanban-area {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
          height: 100%;
        }
        .tv-kanban-col-card {
          background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;
        }
        .tv-k-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px; background: rgba(0,0,0,0.2); border-bottom: 2px solid;
        }
        .tv-k-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: white; }
        .tv-k-header .count { background: rgba(255,255,255,0.1); padding: 2px 10px; border-radius: 12px; font-weight: 800; font-size: 0.85rem; }
        .tv-k-body {
          flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
        }

        .tv-dept-card {
          background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;
        }
        .tv-dept-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; background: rgba(0,0,0,0.2);
          border-bottom: 2px solid;
        }
        .tv-dept-header h3 { margin: 0; font-size: 1.1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .tv-dept-count {
          padding: 2px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 900;
        }

        .tv-dept-body {
          flex: 1; overflow-y: auto; padding: 12px;
          display: flex; flex-direction: column; gap: 8px;
        }

        /* Tasks */
        .tv-task-item {
          background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;
          border-left: 4px solid transparent;
        }
        .tv-t-head { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center; }
        .tv-status-badge { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); color: #ccc; }
        .tv-t-user { font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; font-weight: 700; }
        
        .s-em-andamento { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .s-em-revisão { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
        .s-refazer { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .s-agendado { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        
        .tv-t-title { margin: 0 0 4px; font-size: 0.85rem; font-weight: 600; line-height: 1.3; color: white; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .tv-t-client { font-size: 0.7rem; color: #a5b4fc; font-weight: 700; }

        .tv-empty-tasks { text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 20px 0; font-style: italic; }
        .tv-more-tasks { text-align: center; font-size: 0.75rem; color: #6366f1; font-weight: 700; padding-top: 8px; }

        /* Side Panel */
        .tv-side-area {
          display: flex; flex-direction: column; height: 100%;
        }
        .tv-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .tv-panel-header {
          padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .tv-panel-header h3 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; color: white; }
        .tv-panel-body { padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; flex: 1; }

        /* Meetings */
        .tv-meet-item {
          display: flex; gap: 12px; padding: 12px; background: rgba(0,0,0,0.2);
          border-radius: 8px; border-left: 2px solid transparent;
        }
        .tv-meet-item.is-today {
          border-left-color: #10b981; background: rgba(16, 185, 129, 0.05);
        }
        .tv-meet-time {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; min-width: 50px;
        }
        .tv-meet-time .day { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); }
        .tv-meet-time .time { font-size: 0.85rem; font-weight: 900; color: white; }
        
        .tv-meet-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; justify-content: center; }
        .tv-meet-info h4 { margin: 0 0 4px; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tv-meet-info .client { font-size: 0.75rem; color: #a5b4fc; font-weight: 700; }
        .tv-meet-info .type { font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 4px; text-transform: uppercase; font-weight: 800;}

        /* Scrollbars para a TV */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        @media (max-width: 768px) {
          .tv-dashboard { overflow-y: auto; height: auto; min-height: calc(100vh - 60px); }
          .tv-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 12px; }
          .tv-dept-tabs { overflow-x: auto; width: 100%; padding-bottom: 8px; flex-wrap: nowrap; }
          
          .tv-main-grid { 
            display: flex !important; flex-direction: column !important; 
            padding: 10px; gap: 16px; overflow: visible; height: auto !important;
          }
          
          .tv-depts-area { grid-template-columns: 1fr; height: auto; overflow: visible; }
          .tv-detailed-kanban-area { grid-template-columns: 1fr; height: auto; overflow: visible; }
          
          .tv-kanban-col-card { height: auto; max-height: none; }
          .tv-k-body { overflow: visible; }
          
          .tv-side-area { height: auto; overflow: visible; margin-top: 10px; }
          .tv-panel-body { max-height: 350px; overflow-y: auto; }
        }
      `}</style>
    </div>
  );
}
