import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useServices } from '../../hooks/useServices';
import { 
  Briefcase, Users, AlertTriangle, CheckCircle, Clock, Search, 
  BarChart3, TrendingUp, ChevronDown, Calendar, Loader2, Download,
  FileText, Table as TableIcon, Filter, User, Plus, Trash2, Edit, Save
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';

export default function ManagerArea() {
  const { user, isGestor, deptPermissions } = useAuth();
  const { services } = useServices();
  
  const availableDepts = useMemo(() => {
    const isAdmin = user?.role === 'owner' || user?.role === 'admin';
    if (isAdmin) return services;
    const gestorDeptIds = deptPermissions.filter(p => p.role === 'Gestor').map(p => p.service_id);
    return services.filter(s => gestorDeptIds.includes(s.id));
  }, [services, user, deptPermissions]);

  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'rules' | 'approvals'
  
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [slaRules, setSlaRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rules Management
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ id: null, activity_name: '', days_allowed: 1, description: '' });

  useEffect(() => {
    if (availableDepts.length > 0 && !selectedDeptId) {
      setSelectedDeptId(availableDepts[0].id);
    }
  }, [availableDepts, selectedDeptId]);

  const selectedDept = availableDepts.find(d => d.id === selectedDeptId);

  useEffect(() => {
    if (selectedDeptId) fetchData();
  }, [selectedDeptId]);

  const fetchData = async () => {
    if (!selectedDeptId) return;
    setLoading(true);
    try {
      const { data: clientsData } = await supabase.from('client_services').select('*, clients(*)').eq('service_id', selectedDeptId).eq('status', 'active');
      const { data: empData } = await supabase.from('employee_permissions').select('*, employees(*)').eq('service_id', selectedDeptId);
      const { data: tasksData } = await supabase.from('department_tasks').select('*').eq('department', selectedDept?.name).neq('status', 'Concluído').neq('status', 'Aprovado');
      // Adicionar tarefas concluídas recentemente (últimos 30 dias) para métricas de performance
      const { data: recentTasks } = await supabase.from('department_tasks').select('*').eq('department', selectedDept?.name).in('status', ['Concluído', 'Aprovado']).gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const allTasks = [...(tasksData || []), ...(recentTasks || [])];
      const { data: rulesData } = await supabase.from('department_sla_rules').select('*').eq('service_id', selectedDeptId);

      setClients(clientsData || []);
      setEmployees((empData || []).map(e => e.employees).filter(Boolean));
      setTasks(allTasks);
      setSlaRules(rulesData || []);
    } catch (error) {
      console.error("Erro ao buscar dados do gestor:", error);
    } finally {
      setLoading(false);
    }
  };

  const debugInfo = useMemo(() => ({
    tasksCount: tasks.length,
    clientsCount: clients.length,
    employeesCount: employees.length
  }), [tasks, clients, employees]);

  const metrics = useMemo(() => {
    const totalTasks = tasks.length;
    let onTime = 0, delayed = 0;
    tasks.forEach(task => {
      // Prioridade: Regra específica da tarefa > SLA do cliente
      const rule = slaRules.find(r => r.id === task.rule_id);
      const clientSvc = clients.find(c => c.client_id === task.client_id);
      const slaDays = rule ? rule.days_allowed : (clientSvc?.metadata?.sla_days || 0);
      
      if (slaDays === 0) { onTime++; return; }
      const deadline = new Date(new Date(task.created_at).getTime() + (slaDays * 24 * 60 * 60 * 1000));
      if (task.status === 'Concluído' || task.status === 'Aprovado') {
        if (new Date(task.updated_at) <= deadline) onTime++; else delayed++;
      } else {
        if (new Date() <= deadline) onTime++; else delayed++;
      }
    });
    return { totalTasks, onTime, delayed, efficiency: totalTasks > 0 ? Math.round((onTime / totalTasks) * 100) : 100 };
  }, [tasks, clients, slaRules]);

  const collabStats = useMemo(() => {
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assigned_to === emp.id);
      let onTime = 0, delayed = 0;
      empTasks.forEach(task => {
        const rule = slaRules.find(r => r.id === task.rule_id);
        const clientSvc = clients.find(c => c.client_id === task.client_id);
        const slaDays = rule ? rule.days_allowed : (clientSvc?.metadata?.sla_days || 0);
        const deadline = new Date(new Date(task.created_at).getTime() + (slaDays * 24 * 60 * 60 * 1000));
        if (task.status === 'Concluído' || task.status === 'Aprovado') {
          if (new Date(task.updated_at) <= deadline) onTime++; else delayed++;
        } else {
          if (new Date() <= deadline) onTime++; else delayed++;
        }
      });
      return { 
        ...emp, total: empTasks.length, onTime, delayed, 
        efficiency: empTasks.length > 0 ? Math.round((onTime / empTasks.length) * 100) : 100,
        clientsHandled: Array.from(new Set(empTasks.map(t => {
          const c = clients.find(cl => cl.client_id === t.client_id);
          return c?.clients?.name;
        }))).filter(Boolean),
        chartData: [{ name: 'OK', value: onTime, fill: '#34d399' }, { name: 'Atraso', value: delayed, fill: '#fb7185' }]
      };
    });
  }, [employees, tasks, clients, slaRules]);

  const handleSaveRule = async (e) => {
    e.preventDefault();
    const data = { 
      service_id: selectedDeptId, 
      activity_name: ruleForm.activity_name, 
      days_allowed: ruleForm.days_allowed, 
      description: ruleForm.description 
    };
    if (ruleForm.id) await supabase.from('department_sla_rules').update(data).eq('id', ruleForm.id);
    else await supabase.from('department_sla_rules').insert([data]);
    setIsRuleModalOpen(false);
    fetchData();
  };

  const handleApproveSla = async (taskId, status) => {
    try {
      await supabase.from('department_tasks').update({ 
        sla_approval_status: status,
        sla_approval_by: user.id,
        sla_approval_at: new Date().toISOString()
      }).eq('id', taskId);
      fetchData();
    } catch (error) {
      console.error("Erro ao aprovar SLA:", error);
    }
  };

  const deleteRule = async (id) => {
    if (confirm('Deseja excluir esta regra de SLA?')) {
      await supabase.from('department_sla_rules').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="manager-area">
      <div className="dept-selector no-print">
        {availableDepts.map(dept => (
          <button key={dept.id} className={`dept-btn ${selectedDeptId === dept.id ? 'active' : ''}`} onClick={() => setSelectedDeptId(dept.id)} style={{ borderColor: dept.color, color: selectedDeptId === dept.id ? 'white' : dept.color }}>{dept.name}</button>
        ))}
      </div>

      <div className="sub-tabs-nav no-print">
        <button className={`sub-tab ${activeSubTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSubTab('dashboard')}><BarChart3 size={16} /> Painel de Performance</button>
        <button className={`sub-tab ${activeSubTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveSubTab('rules')}><Clock size={16} /> Configurar Regras e SLAs</button>
        <button className={`sub-tab ${activeSubTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveSubTab('approvals')}>
          <AlertTriangle size={16} /> Aprovações Pendentes
          {tasks.filter(t => t.sla_approval_status === 'pending').length > 0 && (
            <span className="count-badge">{tasks.filter(t => t.sla_approval_status === 'pending').length}</span>
          )}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, paddingRight: 12 }}>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{debugInfo.tasksCount} Atividades</span>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{debugInfo.clientsCount} Clientes</span>
        </div>
      </div>

      {activeSubTab === 'dashboard' ? (
        <>
          <div className="stats-grid">
            <div className="stat-card glass-panel"><div className="stat-icon"><Briefcase size={22} /></div><div className="stat-info"><label>Tarefas no Mês</label><div className="value">{metrics.totalTasks}</div></div></div>
            <div className="stat-card glass-panel"><div className="stat-icon text-success" style={{ background: 'rgba(52, 211, 153, 0.1)' }}><CheckCircle size={22} /></div><div className="stat-info"><label>Dentro do Prazo</label><div className="value text-success">{metrics.onTime}</div></div></div>
            <div className="stat-card glass-panel"><div className="stat-icon text-danger" style={{ background: 'rgba(248, 113, 113, 0.1)' }}><AlertTriangle size={22} /></div><div className="stat-info"><label>Atrasos Detectados</label><div className="value text-danger">{metrics.delayed}</div></div></div>
            <div className="stat-card glass-panel"><div className="stat-icon text-primary" style={{ background: 'rgba(99, 102, 241, 0.1)' }}><TrendingUp size={22} /></div><div className="stat-info"><label>Eficiência Geral</label><div className="value text-primary">{metrics.efficiency}%</div></div></div>
          </div>

          <div className="content-grid">
            <div className="collab-section glass-panel">
              <h3><Users size={18} /> Equipe de Execução</h3>
              <div className="collab-list">
                {collabStats.map(collab => (
                  <div key={collab.id} className="collab-report-card">
                    <div className="collab-header-main">
                      <div className="collab-profile">
                        <div className="collab-avatar-large" style={{ background: collab.avatar_color }}>{collab.name?.charAt(0)}</div>
                        <div className="collab-info-text"><h4>{collab.name}</h4><p>{collab.efficiency}% Eficiência</p></div>
                      </div>
                      <div className="collab-chart-mini"><ResponsiveContainer width={80} height={50}><PieChart><Pie data={collab.chartData} innerRadius={15} outerRadius={22} dataKey="value">{collab.chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie></PieChart></ResponsiveContainer></div>
                    </div>
                    <div className="collab-details">
                      <div className="det"><span className="dot" style={{background:'#34d399'}}></span> {collab.onTime} OK</div>
                      <div className="det"><span className="dot" style={{background:'#f87171'}}></span> {collab.delayed} Atrasos</div>
                    </div>
                    {collab.clientsHandled.length > 0 && (
                      <div className="collab-clients-list">
                        <label>Contas Ativas:</label>
                        <div className="client-tags">
                          {collab.clientsHandled.map((cname, idx) => (
                            <span key={idx} className="client-mini-tag">{cname}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="tasks-summary-section glass-panel">
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <h3><Calendar size={18} /> Atividades por Tipo de SLA</h3>
                 <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status em Tempo Real</span>
               </div>
               <div className="sla-grid-dashboard">
                  {slaRules.map(rule => {
                    const ruleTasks = tasks.filter(t => t.rule_id === rule.id && t.status !== 'Concluído' && t.status !== 'Aprovado');
                    const delayedCount = ruleTasks.filter(t => {
                      const d = new Date(new Date(t.created_at).getTime() + (rule.days_allowed * 24 * 60 * 60 * 1000));
                      return new Date() > d;
                    }).length;
                    const totalRuleTasks = tasks.filter(t => t.rule_id === rule.id).length;
                    const onTimeCount = totalRuleTasks - tasks.filter(t => t.rule_id === rule.id && (new Date(new Date(t.updated_at || new Date()).getTime()) > new Date(new Date(t.created_at).getTime() + (rule.days_allowed * 24 * 60 * 60 * 1000)))).length;
                    const efficiency = totalRuleTasks > 0 ? Math.round((onTimeCount / totalRuleTasks) * 100) : 100;

                    return (
                      <div key={rule.id} className="sla-status-card">
                         <div className="rule-info">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <h4>{rule.activity_name}</h4>
                              <span className="efficiency-mini">{efficiency}% Efic.</span>
                            </div>
                            <span style={{ fontSize: '0.7rem' }}>Limite: {rule.days_allowed} dias</span>
                         </div>
                         
                         <div className="rule-progress-container">
                            <div className="progress-bar-bg">
                               <div className="progress-bar-fill" style={{ width: `${efficiency}%`, background: efficiency > 80 ? '#34d399' : efficiency > 50 ? '#fbbf24' : '#f87171' }}></div>
                            </div>
                         </div>

                         <div className="rule-metrics">
                            <div className="metric-box">
                               <span className="m-val">{ruleTasks.length}</span>
                               <span className="m-lbl">Pendentes</span>
                            </div>
                            <div className={`metric-box ${delayedCount > 0 ? 'critical' : ''}`}>
                               <span className="m-val">{delayedCount}</span>
                               <span className="m-lbl">Atrasados</span>
                            </div>
                         </div>
                      </div>
                    );
                  })}
                  {slaRules.length === 0 && <p className="text-muted">Nenhuma regra de SLA configurada.</p>}
               </div>
            </div>
          </div>
        </>
      ) : activeSubTab === 'rules' ? (
        <div className="rules-management-view">
          <div className="section-header">
             <div>
               <h3>Regras de SLA por Tipo de Serviço</h3>
               <p>Defina o tempo padrão para cada atividade do departamento.</p>
             </div>
             <button className="primary-btn" onClick={() => { setRuleForm({ id: null, activity_name: '', days_allowed: 1, description: '' }); setIsRuleModalOpen(true); }}><Plus size={18} /> Nova Regra</button>
          </div>

          <div className="rules-grid">
            {slaRules.map(rule => (
              <div key={rule.id} className="rule-card glass-panel">
                <div className="rule-card-header">
                   <h4>{rule.activity_name}</h4>
                   <div className="rule-actions">
                      <button className="icon-btn" onClick={() => { setRuleForm(rule); setIsRuleModalOpen(true); }}><Edit size={14} /></button>
                      <button className="icon-btn text-danger" onClick={() => deleteRule(rule.id)}><Trash2 size={14} /></button>
                   </div>
                </div>
                <div className="rule-card-body">
                   <div className="time-badge"><Clock size={14} /> {rule.days_allowed} dias para execução</div>
                   <p>{rule.description || 'Sem descrição.'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="approvals-view">
           <div className="section-header">
              <h3>Solicitações de Exceção de Prazo</h3>
              <p>Trabalhos que excederam o SLA padrão e aguardam sua autorização.</p>
           </div>
           
           <div className="approvals-list">
              {tasks.filter(t => t.sla_approval_status === 'pending').map(task => {
                const rule = slaRules.find(r => r.id === task.rule_id);
                const employee = employees.find(e => e.id === task.assigned_to);
                const client = clients.find(c => c.client_id === task.client_id);
                
                return (
                  <div key={task.id} className="approval-card glass-panel">
                    <div className="app-info">
                       <div className="app-main">
                          <h4>{task.title}</h4>
                          <span className="app-client">{client?.clients?.name || 'Cliente'}</span>
                       </div>
                       <div className="app-meta">
                          <div className="app-user"><User size={12}/> {employee?.name || 'Executor'}</div>
                          <div className="app-type">{rule?.activity_name || 'Geral'}</div>
                       </div>
                    </div>
                    
                    <div className="app-sla-comparison">
                       <div className="sla-comp-box">
                          <label>SLA Padrão</label>
                          <div className="val">{rule?.days_allowed || 0} dias</div>
                       </div>
                       <div className="sla-comp-separator"><ChevronDown size={16} style={{transform:'rotate(-90deg)'}}/></div>
                       <div className="sla-comp-box highlight">
                          <label>Solicitado</label>
                          <div className="val">{task.requested_sla_days} dias</div>
                       </div>
                    </div>

                    <div className="app-actions">
                       <button className="approve-btn" onClick={() => handleApproveSla(task.id, 'approved')}><CheckCircle size={16}/> Aprovar Prazo</button>
                       <button className="reject-btn" onClick={() => handleApproveSla(task.id, 'rejected')}><Trash2 size={16}/> Rejeitar</button>
                    </div>
                  </div>
                );
              })}
              {tasks.filter(t => t.sla_approval_status === 'pending').length === 0 && (
                <div className="empty-state">
                   <CheckCircle size={40} style={{opacity:0.2, marginBottom:16}}/>
                   <p>Nenhuma solicitação pendente.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {isRuleModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>{ruleForm.id ? 'Editar Regra' : 'Nova Regra de SLA'}</h3>
            <form onSubmit={handleSaveRule}>
              <div className="form-group"><label>Nome do Serviço/Atividade</label><input type="text" required value={ruleForm.activity_name} onChange={e => setRuleForm({...ruleForm, activity_name: e.target.value})} placeholder="Ex: Edição de Reels, Roteiro..."/></div>
              <div className="form-group"><label>Prazo Estipulado (Dias)</label><input type="number" min="1" required value={ruleForm.days_allowed} onChange={e => setRuleForm({...ruleForm, days_allowed: parseInt(e.target.value)})} /></div>
              <div className="form-group"><label>Descrição/Instruções</label><textarea value={ruleForm.description} onChange={e => setRuleForm({...ruleForm, description: e.target.value})} placeholder="Descreva o que compõe este serviço..." rows={3}></textarea></div>
              <div className="modal-actions"><button type="button" className="glass-btn" onClick={() => setIsRuleModalOpen(false)}>Cancelar</button><button type="submit" className="primary-btn"><Save size={18} /> Salvar Regra</button></div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .manager-area { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
        .dept-selector { display: flex; gap: 8px; flex-wrap: wrap; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .dept-btn { white-space: nowrap; padding: 6px 12px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text-muted); font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: 0.2s; box-sizing: border-box; }
        .dept-btn.active { background: rgba(255, 255, 255, 0.05); box-shadow: inset 0 0 0 1px currentColor, 0 0 10px rgba(255,255,255,0.1); }
        
        .sub-tabs-nav { display: flex; gap: 4px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 12px; align-self: flex-start; }
        .sub-tab { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; color: var(--text-muted); font-size: 0.85rem; font-weight: 600; cursor: pointer; border-radius: 8px; transition: 0.2s; }
        .sub-tab.active { background: #6366f1; color: white; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .stat-card { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.05); }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; color: #6366f1; }
        .stat-info label { display: block; font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
        .stat-info .value { font-size: 1.8rem; font-weight: 900; line-height: 1; }
        
        .content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }
        .collab-report-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .collab-header-main { display: flex; justify-content: space-between; align-items: center; }
        .collab-profile { display: flex; align-items: center; gap: 12px; }
        .collab-avatar-large { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; }
        .collab-info-text h4 { margin: 0; font-size: 0.95rem; }
        .collab-info-text p { margin: 0; font-size: 0.75rem; color: #6366f1; font-weight: 700; }
        .collab-details { display: flex; gap: 12px; margin-top: 12px; }
        .det { font-size: 0.7rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        .det .dot { width: 6px; height: 6px; border-radius: 50%; }

        .collab-clients-list { margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; }
        .collab-clients-list label { font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; }
        .client-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .client-mini-tag { font-size: 0.65rem; background: rgba(99, 102, 241, 0.1); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(99, 102, 241, 0.2); }

        .sla-grid-dashboard { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
        .sla-status-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .rule-info h4 { margin: 0; font-size: 1rem; }
        .rule-info span { font-size: 0.75rem; color: var(--text-muted); }
        .rule-metrics { display: flex; gap: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }
        .metric-box { flex: 1; display: flex; flex-direction: column; }
        .m-val { font-size: 1.4rem; font-weight: 900; }
        .m-lbl { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
        .metric-box.critical .m-val { color: #fb7185; }
        
        .efficiency-mini { font-size: 0.75rem; font-weight: 800; color: #a5b4fc; background: rgba(165, 180, 252, 0.1); padding: 2px 6px; border-radius: 4px; }
        .rule-progress-container { margin: 8px 0; }
        .progress-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .progress-bar-fill { height: 100%; transition: width 1s ease; }
        
        .count-badge { background: #fb7185; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-weight: 900; }

        .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 24px; }
        
        .approvals-list { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
        .approval-card { padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .app-info { flex: 1; }
        .app-main h4 { margin: 0; font-size: 1.1rem; }
        .app-client { font-size: 0.8rem; color: #a5b4fc; font-weight: 700; }
        .app-meta { display: flex; gap: 16px; margin-top: 4px; font-size: 0.75rem; color: var(--text-muted); }
        .app-user { display: flex; align-items: center; gap: 4px; }
        
        .app-sla-comparison { display: flex; align-items: center; gap: 16px; background: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 12px; }
        .sla-comp-box { display: flex; flex-direction: column; align-items: center; }
        .sla-comp-box label { font-size: 0.6rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
        .sla-comp-box .val { font-size: 1rem; font-weight: 800; }
        .sla-comp-box.highlight .val { color: #fb7185; }
        
        .app-actions { display: flex; gap: 8px; }
        .approve-btn { display: flex; align-items: center; gap: 8px; background: #34d399; color: #064e3b; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
        .reject-btn { display: flex; align-items: center; gap: 8px; background: rgba(248, 113, 113, 0.1); color: #fb7185; border: 1px solid rgba(248, 113, 113, 0.2); padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
        
        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px; color: var(--text-muted); }
        .rule-card { padding: 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 12px; transition: 0.2s; }
        .rule-card:hover { border-color: #6366f1; transform: translateY(-2px); }
        .rule-card-header { display: flex; justify-content: space-between; align-items: center; }
        .rule-card-header h4 { margin: 0; color: #a5b4fc; }
        .time-badge { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #fbbf24; font-weight: 700; background: rgba(251, 191, 36, 0.1); padding: 4px 10px; border-radius: 8px; width: fit-content; }
        .rule-card-body p { margin: 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }

        .section-header { display: flex; justify-content: space-between; align-items: center; }
        .primary-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .primary-btn:hover { background: #4f46e5; }
        .icon-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: 0.2s; }
        .icon-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
        .text-danger:hover { color: #fb7185; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { width: 100%; max-width: 500px; padding: 24px; }
        .form-group { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
        .form-group input, .form-group textarea { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; color: white; outline: none; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
        
        @media (max-width: 768px) {
          .content-grid { grid-template-columns: 1fr; }
          .approval-card { flex-direction: column; align-items: flex-start; gap: 16px; }
          .app-actions { width: 100%; display: flex; flex-direction: column; }
          .app-actions button { width: 100%; justify-content: center; }
          .section-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          .sub-tabs-nav { flex-direction: column; width: 100%; }
          .sub-tab { width: 100%; justify-content: center; }
          .collab-header-main { flex-direction: column; gap: 12px; align-items: flex-start; }
          .rule-card-header { flex-direction: column; gap: 12px; align-items: flex-start; }
          .dept-selector { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
          .app-sla-comparison { width: 100%; justify-content: space-around; }
        }
      `}</style>
    </div>
  );
}
