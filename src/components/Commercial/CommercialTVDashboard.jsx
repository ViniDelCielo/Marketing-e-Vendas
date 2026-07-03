import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Target, Trophy, Star, Loader2, Calendar, Clock, Video, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CommercialTVDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [globalMeetings, setGlobalMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const fetchData = async () => {
    try {
      // Employees
      const { data: empData } = await supabase.from('employees')
        .select('id, name, avatar_url, avatar_color')
        .eq('status', 'active')
        .ilike('department', '%Comercial%');
      setEmployees(empData || []);

      // Leads
      const { data: lData } = await supabase.from('commercial_leads').select('*');
      setLeads(lData || []);

      // Goals
      const { data: gData } = await supabase.from('commercial_goals').select('*').eq('month', currentMonth);
      setGoals(gData || []);

      // Interactions
      const startOfMonth = `${currentMonth}-01T00:00:00.000Z`;
      const nextMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString();
      const { data: iData } = await supabase.from('commercial_interactions')
        .select('*')
        .gte('created_at', startOfMonth)
        .lt('created_at', nextMonth);
      setInteractions(iData || []);

      // Meetings for goals (Commercial only)
      const { data: mData } = await supabase.from('client_meetings')
        .select('*')
        .eq('department', 'Comercial')
        .gte('scheduled_at', startOfMonth)
        .lt('scheduled_at', nextMonth);
      setMeetings(mData || []);

      // Global Upcoming Meetings (All departments)
      const now = new Date().toISOString();
      const { data: upData } = await supabase.from('client_meetings')
        .select('*')
        .gte('scheduled_at', now)
        .neq('status', 'Cancelado')
        .order('scheduled_at', { ascending: true })
        .limit(8);
      setGlobalMeetings(upData || []);

    } catch (err) {
      console.error('Erro ao buscar dados do TV Comercial', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 180000); // 3 mins auto-refresh
    return () => clearInterval(interval);
  }, [currentMonth]);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}><Loader2 className="spin" size={48} /><span style={{marginTop: 16}}>Carregando TV Comercial...</span></div>;

  const wonLeads = leads.filter(l => l.status === 'Ganho');
  const pipelineLeads = leads.filter(l => l.status !== 'Ganho' && l.status !== 'Perdido');
  
  const totalWonValue = wonLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
  const totalPipelineValue = pipelineLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);

  const empStats = employees.map(emp => {
    const empGoal = goals.find(g => g.employee_id === emp.id) || { sales_goal: 0, prospecting_goal: 0, raiox_goal: 0, meetings_goal: 0 };
    const empSales = wonLeads.filter(l => l.assigned_to === emp.id).length;
    const empProspecting = leads.filter(l => l.assigned_to === emp.id && l.created_at?.startsWith(currentMonth)).length;
    const empRaiox = interactions.filter(i => i.employee_id === emp.id).length;
    const empMeetings = meetings.filter(m => m.created_by === emp.id).length;

    const calcPct = (real, goal) => goal > 0 ? Math.min((real / goal) * 100, 100) : (real > 0 ? 100 : 0);
    const pSales = calcPct(empSales, empGoal.sales_goal);
    const pProspecting = calcPct(empProspecting, empGoal.prospecting_goal);
    const pRaiox = calcPct(empRaiox, empGoal.raiox_goal);
    const pMeetings = calcPct(empMeetings, empGoal.meetings_goal);

    const activeGoalsCount = [empGoal.sales_goal, empGoal.prospecting_goal, empGoal.raiox_goal, empGoal.meetings_goal].filter(v => v > 0).length;
    const globalPerformance = activeGoalsCount > 0 ? (pSales + pProspecting + pRaiox + pMeetings) / activeGoalsCount : 0;

    return { emp, empGoal, empSales, empProspecting, empRaiox, empMeetings, pSales, pProspecting, pRaiox, pMeetings, globalPerformance };
  }).sort((a, b) => b.globalPerformance - a.globalPerformance);

  const getColor = (pct) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 50) return '#eab308';
    return '#ef4444';
  };

  const getInitials = (name) => {
    const p = name.split(' ');
    return p.length > 1 ? p[0][0] + p[1][0] : p[0][0];
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px', height: '100%', overflowY: 'auto' }}>
      
      {/* HEADER MACRO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', padding: 32, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}><TrendingUp size={28}/> Vendas Ganhas no Mês</div>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{wonLeads.length}</div>
          <div style={{ color: '#10b981', fontSize: '1.2rem', marginTop: 12 }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWonValue)}</div>
        </div>
        
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '2px solid rgba(99,102,241,0.3)', padding: 32, borderRadius: 20, textAlign: 'center' }}>
          <div style={{ color: '#818cf8', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}><PieChart size={28}/> Negócios em Andamento</div>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pipelineLeads.length}</div>
          <div style={{ color: '#818cf8', fontSize: '1.2rem', marginTop: 12 }}>Valor Pipeline: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}</div>
        </div>

        {empStats.length > 0 && empStats[0].globalPerformance > 0 ? (
          <div style={{ background: 'rgba(252,211,77,0.1)', border: '2px solid rgba(252,211,77,0.4)', padding: 32, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative' }}>
              <Star size={40} fill="#fcd34d" color="#fcd34d" style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)' }}/>
              {empStats[0].emp.avatar_url ? (
                <img src={empStats[0].emp.avatar_url} alt="Top" style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid #fcd34d', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: empStats[0].emp.avatar_color || '#6366f1', border: '4px solid #fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                  {getInitials(empStats[0].emp.name)}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fcd34d', fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>TOP #1 VENDAS</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{empStats[0].emp.name}</div>
              <div style={{ fontSize: '1.1rem', color: '#fcd34d', marginTop: 8 }}>{empStats[0].empSales} Fechamentos (Média {empStats[0].globalPerformance.toFixed(0)}%)</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)', padding: 32, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={48} color="var(--text-muted)"/>
            <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: 12 }}>Aguardando o primeiro fechamento...</div>
          </div>
        )}
      </div>

      {/* METRICS GRID FOR TV */}
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0 0 0', color: 'var(--text-main)', fontSize: '1.6rem' }}><Target size={28} className="text-primary"/> Raio-X da Equipe Comercial</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {empStats.map((stat, idx) => {
          if (stat.empGoal.sales_goal === 0 && stat.empSales === 0) return null; // Skip empty setups
          return (
            <div key={stat.emp.id} style={{ background: 'rgba(0,0,0,0.3)', border: idx === 0 ? '2px solid rgba(252,211,77,0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {stat.emp.avatar_url ? (
                  <img src={stat.emp.avatar_url} alt={stat.emp.name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: stat.emp.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '1.4rem' }}>
                    {getInitials(stat.emp.name)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{stat.emp.name}</div>
                  <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Desempenho Geral: <span style={{color: getColor(stat.globalPerformance), fontWeight: 900}}>{stat.globalPerformance.toFixed(0)}%</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* VENDAS */}
                {stat.empGoal.sales_goal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '1.1rem' }}>
                      <span style={{color: 'var(--text-muted)'}}>Vendas Diretas</span>
                      <strong style={{color: '#fff'}}>{stat.empSales} <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>/ {stat.empGoal.sales_goal}</span></strong>
                    </div>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${stat.pSales}%`, height: '100%', background: getColor(stat.pSales), borderRadius: 6, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                )}

                {/* PROSPECÇÃO */}
                {stat.empGoal.prospecting_goal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '1.1rem' }}>
                      <span style={{color: 'var(--text-muted)'}}>Prospecção Ativa (Leads)</span>
                      <strong style={{color: '#fff'}}>{stat.empProspecting} <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>/ {stat.empGoal.prospecting_goal}</span></strong>
                    </div>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${stat.pProspecting}%`, height: '100%', background: getColor(stat.pProspecting), borderRadius: 6, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                )}

                {/* RAIO-X */}
                {stat.empGoal.raiox_goal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '1.1rem' }}>
                      <span style={{color: 'var(--text-muted)'}}>Interações de CRM</span>
                      <strong style={{color: '#fff'}}>{stat.empRaiox} <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>/ {stat.empGoal.raiox_goal}</span></strong>
                    </div>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${stat.pRaiox}%`, height: '100%', background: getColor(stat.pRaiox), borderRadius: 6, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                )}

                {/* AGENDAMENTOS */}
                {stat.empGoal.meetings_goal > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '1.1rem' }}>
                      <span style={{color: 'var(--text-muted)'}}>Reuniões Agendadas</span>
                      <strong style={{color: '#fff'}}>{stat.empMeetings} <span style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>/ {stat.empGoal.meetings_goal}</span></strong>
                    </div>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${stat.pMeetings}%`, height: '100%', background: getColor(stat.pMeetings), borderRadius: 6, transition: 'width 1s' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {empStats.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 20 }}>
            Nenhum vendedor cadastrado no departamento Comercial ainda.
          </div>
        )}
      </div>

      {/* GLOBAL MEETINGS */}
      {globalMeetings.length > 0 && (
        <>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 0 0', color: 'var(--text-main)', fontSize: '1.6rem' }}>
            <Calendar size={28} className="text-primary"/> Próximas Reuniões (Todos os Departamentos)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {globalMeetings.map(m => (
              <div key={m.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{m.subject || m.title}</strong>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 12 }}>
                    {m.department}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16}/> {new Date(m.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.type === 'online' ? <><Video size={16}/> Online</> : <><MapPin size={16}/> {m.location || 'Presencial'}</>}
                </div>
                {m.metadata?.lead_id && (
                   <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: 4, fontWeight: 600 }}>Lead Associado</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
};

export default CommercialTVDashboard;
