import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Target, Calendar, Settings, X, Save, Trophy, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const CommercialDashboard = ({ leads, employees }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  
  const [showConfig, setShowConfig] = useState(false);
  const [isGlobal, setIsGlobal] = useState(true);
  
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  const [globalForm, setGlobalForm] = useState({ sales_goal: 0, prospecting_goal: 0, raiox_goal: 0, meetings_goal: 0 });
  const [indivForm, setIndivForm] = useState({});

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    // Fetch goals
    const { data: gData } = await supabase.from('commercial_goals').select('*').eq('month', currentMonth);
    setGoals(gData || []);
    
    // Initialize individual forms based on existing goals
    const initialIndiv = {};
    employees.forEach(emp => {
      const eGoal = gData?.find(g => g.employee_id === emp.id);
      initialIndiv[emp.id] = {
        sales_goal: eGoal?.sales_goal || 0,
        prospecting_goal: eGoal?.prospecting_goal || 0,
        raiox_goal: eGoal?.raiox_goal || 0,
        meetings_goal: eGoal?.meetings_goal || 0,
      };
    });
    setIndivForm(initialIndiv);

    // Fetch current month interactions
    const startOfMonth = `${currentMonth}-01T00:00:00.000Z`;
    const nextMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1)).toISOString();
    
    const { data: iData } = await supabase.from('commercial_interactions')
      .select('*')
      .gte('created_at', startOfMonth)
      .lt('created_at', nextMonth);
    setInteractions(iData || []);

    // Fetch current month meetings (commercial dept)
    const { data: mData } = await supabase.from('client_meetings')
      .select('*')
      .eq('department', 'Comercial')
      .gte('scheduled_at', startOfMonth)
      .lt('scheduled_at', nextMonth);
    setMeetings(mData || []);
  };

  const handleSaveGoals = async () => {
    try {
      if (isGlobal) {
        // Apply to all
        const upserts = employees.map(emp => ({
          employee_id: emp.id,
          month: currentMonth,
          sales_goal: globalForm.sales_goal,
          prospecting_goal: globalForm.prospecting_goal,
          raiox_goal: globalForm.raiox_goal,
          meetings_goal: globalForm.meetings_goal
        }));
        const { error } = await supabase.from('commercial_goals').upsert(upserts, { onConflict: 'employee_id, month' });
        if (error) throw error;
      } else {
        // Apply individually
        const upserts = employees.map(emp => ({
          employee_id: emp.id,
          month: currentMonth,
          sales_goal: indivForm[emp.id]?.sales_goal || 0,
          prospecting_goal: indivForm[emp.id]?.prospecting_goal || 0,
          raiox_goal: indivForm[emp.id]?.raiox_goal || 0,
          meetings_goal: indivForm[emp.id]?.meetings_goal || 0
        }));
        const { error } = await supabase.from('commercial_goals').upsert(upserts, { onConflict: 'employee_id, month' });
        if (error) throw error;
      }
      setShowConfig(false);
      fetchData();
      alert('Metas salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar metas: ' + err.message);
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'owner' || user?.is_manager;

  const wonLeads = leads.filter(l => l.status === 'Ganho');
  const pipelineLeads = leads.filter(l => l.status !== 'Ganho' && l.status !== 'Perdido');
  const lostLeads = leads.filter(l => l.status === 'Perdido');

  const totalWonValue = wonLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
  const totalPipelineValue = pipelineLeads.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
  const avgTicket = wonLeads.length > 0 ? totalWonValue / wonLeads.length : 0;
  
  const totalClosed = wonLeads.length + lostLeads.length;
  const conversionRate = totalClosed > 0 ? (wonLeads.length / totalClosed) * 100 : 0;

  // Calculate stats per employee
  const empStats = employees.map(emp => {
    const empGoal = goals.find(g => g.employee_id === emp.id) || { sales_goal: 0, prospecting_goal: 0, raiox_goal: 0, meetings_goal: 0 };
    
    // Vendas Diretas (Ganhas este mês)
    // Note: in a real app, we should check `updated_at` for the exact won date, but here we count won leads assigned to them.
    const empSales = wonLeads.filter(l => l.assigned_to === emp.id).length;
    
    // Prospecção Ativa (Leads criados este mês, assuming ID from leads)
    const empProspecting = leads.filter(l => l.assigned_to === emp.id && l.created_at?.startsWith(currentMonth)).length;

    // Raio-X (Interactions this month)
    const empRaiox = interactions.filter(i => i.employee_id === emp.id).length;

    // Agendamentos (Meetings this month)
    const empMeetings = meetings.filter(m => m.created_by === emp.id).length;

    // Calc percentages
    const calcPct = (real, goal) => goal > 0 ? Math.min((real / goal) * 100, 100) : (real > 0 ? 100 : 0);
    
    const pSales = calcPct(empSales, empGoal.sales_goal);
    const pProspecting = calcPct(empProspecting, empGoal.prospecting_goal);
    const pRaiox = calcPct(empRaiox, empGoal.raiox_goal);
    const pMeetings = calcPct(empMeetings, empGoal.meetings_goal);

    // Global performance score for ranking
    const totalGoalsActive = [empGoal.sales_goal, empGoal.prospecting_goal, empGoal.raiox_goal, empGoal.meetings_goal].filter(v => v > 0).length;
    const globalPerformance = totalGoalsActive > 0 ? (pSales + pProspecting + pRaiox + pMeetings) / totalGoalsActive : 0;

    return {
      emp, empGoal, empSales, empProspecting, empRaiox, empMeetings,
      pSales, pProspecting, pRaiox, pMeetings, globalPerformance
    };
  }).sort((a, b) => b.globalPerformance - a.globalPerformance); // Sort by performance for ranking

  const getColor = (pct) => {
    if (pct >= 100) return '#10b981'; // Green
    if (pct >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const getInitials = (name) => {
    const p = name.split(' ');
    return p.length > 1 ? p[0][0] + p[1][0] : p[0][0];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Cards */}
      <div className="dept-grid">
        <section className="glass-panel">
          <div className="section-title"><TrendingUp size={20} /> Vendas Fechadas</div>
          <div style={{fontSize: '3rem', fontWeight: 'bold', color: '#10b981'}}>{wonLeads.length}</div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Receita: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWonValue)}</p>
        </section>

        <section className="glass-panel">
          <div className="section-title"><PieChart size={20} /> Pipeline Ativo</div>
          <div style={{fontSize: '3rem', fontWeight: 'bold', color: '#6366f1'}}>{pipelineLeads.length}</div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Valor Oportunidades: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}</p>
        </section>

        <section className="glass-panel">
          <div className="section-title"><Target size={20} /> Conversão</div>
          <div style={{fontSize: '3rem', fontWeight: 'bold', color: 'white'}}>{conversionRate.toFixed(1)}%</div>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Ticket Médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicket)}</p>
        </section>
      </div>

      {/* METAS POR VENDEDOR */}
      <section className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={20} className="text-primary"/> Metas por Vendedor ({currentMonth})</h3>
          {isManager && (
            <button onClick={() => setShowConfig(true)} className="glass-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <Settings size={14}/> Configurar Metas
            </button>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {empStats.map(stat => {
            const hasGoals = stat.empGoal.sales_goal > 0 || stat.empGoal.prospecting_goal > 0 || stat.empGoal.raiox_goal > 0 || stat.empGoal.meetings_goal > 0;
            if (!hasGoals && stat.empSales === 0 && stat.empProspecting === 0) return null;

            return (
              <div key={stat.emp.id} className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {stat.emp.avatar_url ? (
                    <img src={stat.emp.avatar_url} alt={stat.emp.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: stat.emp.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                      {getInitials(stat.emp.name)}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stat.emp.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média: <span style={{color: getColor(stat.globalPerformance), fontWeight: 'bold'}}>{stat.globalPerformance.toFixed(0)}%</span></div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Prospecção */}
                  {stat.empGoal.prospecting_goal > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{color: 'var(--text-muted)'}}>Prospecção Ativa</span>
                        <span>{stat.empProspecting} / {stat.empGoal.prospecting_goal}</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                        <div style={{ width: `${stat.pProspecting}%`, height: '100%', background: getColor(stat.pProspecting), borderRadius: '3px', transition: 'width 0.5s' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Vendas Diretas */}
                  {stat.empGoal.sales_goal > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{color: 'var(--text-muted)'}}>Vendas Diretas</span>
                        <span>{stat.empSales} / {stat.empGoal.sales_goal}</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                        <div style={{ width: `${stat.pSales}%`, height: '100%', background: getColor(stat.pSales), borderRadius: '3px', transition: 'width 0.5s' }}></div>
                      </div>
                    </div>
                  )}

                  {/* Raio X */}
                  {stat.empGoal.raiox_goal > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{color: 'var(--text-muted)'}}>Raio-X (Interações)</span>
                        <span>{stat.empRaiox} / {stat.empGoal.raiox_goal}</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                        <div style={{ width: `${stat.pRaiox}%`, height: '100%', background: getColor(stat.pRaiox), borderRadius: '3px', transition: 'width 0.5s' }}></div>
                      </div>
                    </div>
                  )}

                  {/* Agendamentos */}
                  {stat.empGoal.meetings_goal > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                        <span style={{color: 'var(--text-muted)'}}>Agendamentos</span>
                        <span>{stat.empMeetings} / {stat.empGoal.meetings_goal}</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                        <div style={{ width: `${stat.pMeetings}%`, height: '100%', background: getColor(stat.pMeetings), borderRadius: '3px', transition: 'width 0.5s' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {empStats.every(s => s.empGoal.sales_goal === 0 && s.empGoal.prospecting_goal === 0 && s.empSales === 0) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma meta configurada ou desempenho registrado.</p>
          )}
        </div>
      </section>

      {/* RANKING SECTION */}
      {empStats.filter(s => s.globalPerformance > 0).length > 0 && (
        <section className="glass-panel" style={{ padding: 24, borderTop: '3px solid #fcd34d' }}>
          <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#fcd34d' }}>
            <Trophy size={20}/> Destaques da Equipe (Ranking)
          </h3>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
            {empStats.filter(s => s.globalPerformance > 0).slice(0, 3).map((stat, idx) => (
              <div key={stat.emp.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '16px 24px', borderRadius: 16, minWidth: 160, position: 'relative', border: idx === 0 ? '1px solid rgba(252,211,77,0.5)' : '1px solid rgba(255,255,255,0.05)' }}>
                {idx === 0 && <Star size={24} fill="#fcd34d" color="#fcd34d" style={{ position: 'absolute', top: -12 }}/>}
                {stat.emp.avatar_url ? (
                  <img src={stat.emp.avatar_url} alt={stat.emp.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${idx===0?'#fcd34d':'#64748b'}` }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: stat.emp.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '1.5rem', border: `3px solid ${idx===0?'#fcd34d':'#64748b'}` }}>
                    {getInitials(stat.emp.name)}
                  </div>
                )}
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: idx===0?'#fcd34d':'white' }}>#{idx+1} {stat.emp.name.split(' ')[0]}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Desempenho: <strong style={{color: getColor(stat.globalPerformance)}}>{stat.globalPerformance.toFixed(0)}%</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.empSales} Vendas</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONFIG MODAL */}
      {showConfig && isManager && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={20} className="text-primary"/> Configuração de Metas Comerciais</h3>
              <button onClick={() => setShowConfig(false)} className="icon-btn text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'flex', gap: 10, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
                <button onClick={() => setIsGlobal(true)} className={`glass-btn ${isGlobal ? 'primary' : ''}`} style={{ flex: 1 }}>Meta Global (Para Todos)</button>
                <button onClick={() => setIsGlobal(false)} className={`glass-btn ${!isGlobal ? 'primary' : ''}`} style={{ flex: 1 }}>Metas Individuais</button>
              </div>

              {isGlobal ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 20, borderRadius: 12 }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Defina valores únicos que serão aplicados para TODOS os vendedores da equipe.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>1. Prospecção Ativa (Qtd Leads)</label><input type="number" min="0" className="glass-input" style={{width:'100%'}} value={globalForm.prospecting_goal} onChange={e => setGlobalForm({...globalForm, prospecting_goal: parseInt(e.target.value)||0})} /></div>
                    <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>2. Vendas Diretas (Qtd Fechamentos)</label><input type="number" min="0" className="glass-input" style={{width:'100%'}} value={globalForm.sales_goal} onChange={e => setGlobalForm({...globalForm, sales_goal: parseInt(e.target.value)||0})} /></div>
                    <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>3. Raio-X (Qtd Interações Registradas)</label><input type="number" min="0" className="glass-input" style={{width:'100%'}} value={globalForm.raiox_goal} onChange={e => setGlobalForm({...globalForm, raiox_goal: parseInt(e.target.value)||0})} /></div>
                    <div><label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>4. Agendamentos (Qtd Reuniões)</label><input type="number" min="0" className="glass-input" style={{width:'100%'}} value={globalForm.meetings_goal} onChange={e => setGlobalForm({...globalForm, meetings_goal: parseInt(e.target.value)||0})} /></div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {employees.map(emp => (
                    <div key={emp.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                      <strong style={{ display: 'block', marginBottom: 12, color: 'var(--text-main)' }}>{emp.name}</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <div><label style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>1. Prospecções</label><input type="number" min="0" className="glass-input" style={{width:'100%', padding: 6}} value={indivForm[emp.id]?.prospecting_goal||0} onChange={e => setIndivForm({...indivForm, [emp.id]: {...indivForm[emp.id], prospecting_goal: parseInt(e.target.value)||0}})} /></div>
                        <div><label style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>2. Vendas</label><input type="number" min="0" className="glass-input" style={{width:'100%', padding: 6}} value={indivForm[emp.id]?.sales_goal||0} onChange={e => setIndivForm({...indivForm, [emp.id]: {...indivForm[emp.id], sales_goal: parseInt(e.target.value)||0}})} /></div>
                        <div><label style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>3. Raio-X</label><input type="number" min="0" className="glass-input" style={{width:'100%', padding: 6}} value={indivForm[emp.id]?.raiox_goal||0} onChange={e => setIndivForm({...indivForm, [emp.id]: {...indivForm[emp.id], raiox_goal: parseInt(e.target.value)||0}})} /></div>
                        <div><label style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>4. Agendamentos</label><input type="number" min="0" className="glass-input" style={{width:'100%', padding: 6}} value={indivForm[emp.id]?.meetings_goal||0} onChange={e => setIndivForm({...indivForm, [emp.id]: {...indivForm[emp.id], meetings_goal: parseInt(e.target.value)||0}})} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowConfig(false)} className="glass-btn">Cancelar</button>
              <button onClick={handleSaveGoals} className="glass-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Save size={16}/> Salvar Metas</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CommercialDashboard;
