import { useState, useEffect } from 'react';
import { Plus, Save, PenTool, CheckCircle, AlertTriangle, Settings, Users, Briefcase } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { supabase } from '../../lib/supabase';

const RH = () => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('colaboradores'); // colaboradores | capacidade

  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees from Supabase
  useEffect(() => {
    const fetchTeam = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (data) {
        setTeam(data);
      }
      setLoading(false);
    };

    fetchTeam();
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('rh-employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchTeam();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Capacity Planning Mocks and State
  const [totalClients, setTotalClients] = useState(25); // Set manually or fetched from CRM

  // Admin configuration: how many clients each role can handle
  const [capacityConfig, setCapacityConfig] = useState([
    { department: 'Design', maxClientsPerPerson: 8 },
    { department: 'Social Media', maxClientsPerPerson: 5 },
    { department: 'Edição', maxClientsPerPerson: 10 },
    { department: 'Tráfego', maxClientsPerPerson: 15 },
    { department: 'Captação', maxClientsPerPerson: 6 },
  ]);

  // Calculate actual demand vs current team
  const generateCapacityData = () => {
    return capacityConfig.map(config => {
      // count current employees in this department
      const currentStaff = team.filter(t => t.department === config.department).length;
      
      // Calculate needed staff
      const neededStaff = Math.ceil(totalClients / config.maxClientsPerPerson);
      
      const gap = neededStaff - currentStaff;

      return {
        department: config.department,
        'Equipe Atual': currentStaff,
        'Necessário': neededStaff,
        gap: gap > 0 ? gap : 0,
        status: gap > 0 ? 'Contratar' : 'Dentro do Ideal',
        maxCapacity: config.maxClientsPerPerson
      };
    });
  };

  const capacityData = generateCapacityData();

  const handleUpdateCapacity = (dept, value) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setCapacityConfig(config => config.map(c => 
        c.department === dept ? { ...c, maxClientsPerPerson: num } : c
      ));
    }
  };

  const sendForSignature = (id) => {
    setTeam(team.map(t => 
      t.id === id ? { ...t, assinatura: 'Aguardando Assinatura...' } : t
    ));
    setTimeout(() => {
      setTeam(team.map(t => 
        t.id === id ? { ...t, assinatura: 'Assinado (Gov.br)' } : t
      ));
    }, 2000);
  };

  return (
    <div className="rh-container">
      <div className="rh-header">
        <div className="sub-tab-actions">
          <button 
            className={'sub-tab-btn ' + (activeTab === 'colaboradores' ? 'active' : '')}
            onClick={() => setActiveTab('colaboradores')}
          >
            Quadro de Funcionários
          </button>
          <button 
            className={'sub-tab-btn ' + (activeTab === 'capacidade' ? 'active' : '')}
            onClick={() => setActiveTab('capacidade')}
          >
            Gestão & Capacidade Operacional
          </button>
        </div>

        {activeTab === 'colaboradores' && (
          <div className="text-muted text-sm" style={{ paddingRight: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={14} /> Cadastro principal movido para Configurações Gerais
            </span>
          </div>
        )}
      </div>

      {activeTab === 'colaboradores' && (
        <div className="tab-pane fade-in">
          <div className="card-panel">
            <h3 className="section-title">Contratos de Colaboradores e RH</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Setor</th>
                    <th>Cargo</th>
                    <th>Dados Pagamento</th>
                    <th>Assinatura de Contrato</th>
                  </tr>
                </thead>
                <tbody>
                  {team.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted" style={{ padding: '24px' }}>
                        Nenhum colaborador cadastrado. Adicione novos colaboradores no menu Configurações Gerais.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted" style={{ padding: '24px' }}>
                        Carregando equipe...
                      </td>
                    </tr>
                  )}
                  {team.map(t => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.department || '-'}</td>
                      <td>{t.position || '-'}</td>
                      <td><span className="text-muted text-sm">{t.email || '-'}</span></td>
                      <td>
                        <div className="signature-area">
                          {t.contract_url ? (
                            <a href={t.contract_url} target="_blank" rel="noopener noreferrer" className="status-badge success" style={{ textDecoration: 'none' }}>
                              <CheckCircle size={14} /> Contrato Anexado
                            </a>
                          ) : (
                            <span className="status-badge warning">Contrato Pendente</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'capacidade' && (
        <div className="tab-pane fade-in">
          <div className="dashboard-grid">
            
            {/* KPI Cards */}
            <div className="chart-box full-width kpi-row">
              <div className="kpi-card">
                <div className="kpi-icon"><Briefcase size={24} color="#6366f1" /></div>
                <div>
                  <span className="stat-label">Total de Clientes Ativos</span>
                  <div className="client-input-wrapper">
                    <input 
                      type="number" 
                      value={totalClients} 
                      onChange={(e) => setTotalClients(e.target.value)} 
                      className="kpi-input"
                    />
                    <span className="text-muted text-sm">clientes</span>
                  </div>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon"><Users size={24} color="#10b981" /></div>
                <div>
                  <span className="stat-label">Total de Colaboradores</span>
                  <span className="stat-value">{team.length}</span>
                </div>
              </div>
              <div className="kpi-card highlight-danger">
                <div className="kpi-icon"><AlertTriangle size={24} color="#f43f5e" /></div>
                <div>
                  <span className="stat-label">Vagas a Contratar</span>
                  <span className="stat-value">{capacityData.reduce((acc, curr) => acc + curr.gap, 0)} Pessoas</span>
                </div>
              </div>
            </div>

            {/* Configuração Matemática */}
            <div className="chart-box configuration-box">
              <h4 className="chart-title flex-between">
                <span><Settings size={18} /> Metas e Capacidade por Setor</span>
              </h4>
              <p className="text-muted text-sm mb-4">
                Quantos clientes <strong>um(a) único(a) colaborador(a)</strong> consegue atender em cada área? (Alterar modifica o gráfico ao lado).
              </p>
              
              <div className="config-list">
                {capacityConfig.map(config => (
                  <div key={config.department} className="config-item">
                    <span className="config-dept">{config.department}</span>
                    <div className="config-input-group">
                      <span>1 Func. = </span>
                      <input 
                        type="number" 
                        value={config.maxClientsPerPerson}
                        min="1"
                        onChange={(e) => handleUpdateCapacity(config.department, e.target.value)}
                        className="config-input"
                      />
                      <span>Clientes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico de Necessidade x Realidade */}
            <div className="chart-box chart-large">
              <h4 className="chart-title">Equipe Atual x Necessidade Projetada (Hiring Gap)</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="department" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="Equipe Atual" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Necessário" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de Alertas de Contratação */}
            <div className="chart-box full-width">
              <h4 className="chart-title">Status de Contratação e Alertas</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Departamento / Área</th>
                      <th>Capacidade Total (Atual)</th>
                      <th>Volume de Clientes (Demanda)</th>
                      <th>Gap de Colaboradores</th>
                      <th>Status de Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacityData.map((data, i) => (
                      <tr key={i}>
                        <td><strong>{data.department}</strong></td>
                        <td>{data['Equipe Atual']} Equipe x {data.maxCapacity} = {data['Equipe Atual'] * data.maxCapacity} Clientes</td>
                        <td>{totalClients} Clientes</td>
                        <td>
                          {data.gap > 0 ? (
                            <span className="text-danger fw-bold">Faltam {data.gap} recursos</span>
                          ) : (
                            <span className="text-success fw-bold">Ok (+{(data['Equipe Atual'] - data['Necessário'])} de folga)</span>
                          )}
                        </td>
                        <td>
                          {data.gap > 0 ? (
                            <button className="btn-sm btn-danger"><Plus size={14} /> Abrir Vaga</button>
                          ) : (
                            <span className="status-badge success">Capacidade Saudável</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        .rh-container {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .rh-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }

        .sub-tab-actions {
          display: flex;
          flex-wrap: wrap;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 4px;
        }

        .sub-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: 0.2s;
        }

        .sub-tab-btn.active {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-main);
        }

        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-outline-primary {
          background: transparent;
          border: 1px solid var(--primary);
          color: var(--primary);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: 0.2s;
        }

        .btn-outline-primary:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.85rem;
        }

        .btn-danger {
          background: rgba(244, 63, 94, 0.15);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
        }

        .form-panel {
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.85rem; color: var(--text-muted); }
        .form-group input, .form-group select {
          padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color); color: var(--text-main); outline: none;
        }

        .form-actions { margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; }

        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
        .data-table th { color: var(--text-muted); font-weight: 500; font-size: 0.9rem; }

        .signature-area { display: flex; align-items: center; gap: 8px; }

        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }
        .status-badge.success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .status-badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

        .text-sm { font-size: 0.85rem; }
        .text-muted { color: var(--text-muted); }
        .text-danger { color: #f43f5e; }
        .text-success { color: #4ade80; }
        .fw-bold { font-weight: 700; }

        /* Dashboard de Capacidade */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 20px;
        }

        .full-width { grid-column: 1 / -1; }
        
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
        }

        .kpi-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .kpi-card.highlight-danger {
          border-color: rgba(244, 63, 94, 0.3);
          background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(244, 63, 94, 0.05) 100%);
        }

        .kpi-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center;
        }

        .stat-label { display: block; color: var(--text-muted); font-size: 0.9rem; margin-bottom: 4px; }
        .stat-value { display: block; color: var(--text-main); font-size: 1.5rem; font-weight: 700; }
        
        .client-input-wrapper {
          display: flex; align-items: baseline; gap: 8px;
        }
        .kpi-input {
          background: transparent; border: none; border-bottom: 2px solid var(--primary);
          color: var(--text-main); font-size: 1.5rem; font-weight: 700; width: 60px; outline: none;
        }

        .chart-box {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 24px;
          border: 1px solid var(--border-color);
        }

        .chart-title { margin-top: 0; margin-bottom: 12px; font-size: 1.1rem; color: var(--text-main); font-weight: 600; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .mb-4 { margin-bottom: 16px; }

        .configuration-box {
          display: flex; flex-direction: column;
        }

        .config-list {
          display: flex; flex-direction: column; gap: 12px;
        }

        .config-item {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          padding: 12px 16px; border-radius: 8px;
        }

        .config-dept { font-weight: 600; color: var(--text-main); }
        
        .config-input-group {
          display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;
        }
        .config-input {
          background: rgba(0,0,0,0.2); border: 1px solid var(--border-color);
          color: var(--text-main); width: 50px; text-align: center; padding: 4px; border-radius: 6px; outline: none;
        }

        .chart-wrapper { height: 350px; width: 100%; margin-top: 16px; }

        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .kpi-row { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .rh-header { flex-direction: column; align-items: flex-start; }
          .sub-tab-actions { width: 100%; }
          .sub-tab-btn { flex: 1; text-align: center; font-size: 0.8rem; padding: 6px 8px; }
          .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
          .table-responsive table { min-width: 600px; }
          .kpi-row { grid-template-columns: 1fr !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default RH;
