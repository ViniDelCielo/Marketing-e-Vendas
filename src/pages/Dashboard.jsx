import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Clock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Cards para navegação rápida do Admin e Funcionário
  const DEPARTMENTS = [
    { title: 'Social Media', desc: 'Planejamento e Gaveta', path: '/social-media', color: 'rgba(99, 102, 241, 0.8)' },
    { title: 'Tráfego', desc: 'Campanhas e Leads', path: '/trafego', color: 'rgba(16, 185, 129, 0.8)' },
    { title: 'Edição', desc: 'Aprovação e Padrões', path: '/edicao', color: 'rgba(236, 72, 153, 0.8)' },
    { title: 'Prospecção Ativa', desc: 'Contatos e Automações', path: '/prospeccao-ativa', color: 'rgba(6, 182, 212, 0.8)' },
    { title: 'Captação', desc: 'Gravações e Copys', path: '/captacao', color: 'rgba(245, 158, 11, 0.8)' },
    { title: 'Design', desc: 'Capas e Templates', path: '/design', color: 'rgba(56, 189, 248, 0.8)' },
    { title: 'CRM', desc: 'Integração Kommo', path: '/crm', color: 'rgba(168, 85, 247, 0.8)' },
    { title: 'Comercial', desc: 'Análise de Vendas', path: '/comercial', color: 'rgba(20, 184, 166, 0.8)' },
    { title: 'Sucesso do Cliente', desc: 'Resumo Cliente', path: '/sucesso-do-cliente', color: 'rgba(100, 116, 139, 0.8)' },
  ];

  const [clientContract, setClientContract] = useState(null);

  useEffect(() => {
    if (user?.role === 'client' && user?.clientUuid) {
      supabase
        .from('clients')
        .select('start_date, end_date')
        .eq('id', user.clientUuid)
        .single()
        .then(({ data }) => setClientContract(data));
    }
  }, [user]);

  // Calcula os dias restantes para o cliente
  let contractDiff = null;
  let contractLabel = 'Sem prazo definido';
  let contractColor = 'var(--text-muted)';
  
  if (clientContract?.end_date) {
    const end = new Date(clientContract.end_date);
    const today = new Date();
    end.setUTCHours(0,0,0,0);
    today.setUTCHours(0,0,0,0);
    contractDiff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    
    if (contractDiff < 0) {
      contractColor = '#ef4444';
      contractLabel = `Contrato vencido há ${Math.abs(contractDiff)} dias`;
    } else if (contractDiff <= 15) {
      contractColor = '#f59e0b';
      contractLabel = `Vence em ${contractDiff} dias`;
    } else {
      contractColor = '#10b981';
      contractLabel = `Renovação em ${contractDiff} dias`;
    }
  }

  const [stats, setStats] = useState({ clients: 0, employees: 0, deptCounts: {} });

  useEffect(() => {
    async function loadStats() {
      if (user?.role === 'owner' || user?.role === 'admin') {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, status, metadata')
          .eq('status', 'Ativo');
        
        const activeAgencyClients = clientsData ? clientsData.filter(c => c.metadata?.show_in_agency === true) : [];
          
        const { count: employeesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .neq('role', 'client');

        const { data: svcsData } = await supabase
          .from('client_services')
          .select('client_id, service_id')
          .eq('status', 'active');

        const deptCounts = {};
        DEPARTMENTS.forEach(dept => {
           let activeTab = dept.path.replace('/', '');
           if (activeTab === 'design') activeTab = 'designer';
           const isServiceDept = ['social-media', 'trafego', 'edicao', 'captacao', 'designer'].includes(activeTab);
           
           if (isServiceDept) {
             const svcs = svcsData ? svcsData.filter(s => s.service_id === activeTab && activeAgencyClients.some(c => c.id === s.client_id)) : [];
             deptCounts[dept.path] = svcs.length;
           } else {
             deptCounts[dept.path] = activeAgencyClients.length;
           }
        });
          
        setStats({
          clients: activeAgencyClients.length,
          employees: employeesCount || 0,
          deptCounts
        });
      }
    }
    loadStats();
  }, [user]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <h1>Visão Geral do Workspace</h1>
        <p>Acesse rapidamente os módulos e acompanhe as métricas recentes.</p>
      </div>

      {(user?.role === 'owner' || user?.role === 'admin') ? (
        <>
          <div className="stats-grid">
            <div className="glass-card stat-card">
              <h3>Total de Clientes</h3>
              <p className="stat-number">{stats.clients}</p>
            </div>
            <div className="glass-card stat-card">
              <h3>Total de Colaboradores</h3>
              <p className="stat-number">{stats.employees}</p>
            </div>
          </div>

          <h2 className="section-title">Acessos Rápidos (Departamentos)</h2>
          
          <div className="departments-grid">
            <div 
              className="glass-card dept-card"
              onClick={() => navigate('/kanban')}
              style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(0,0,0,0.4))', border: '1px solid rgba(99, 102, 241, 0.4)' }}
            >
              <div className="dept-icon-bg" style={{ backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>TV</span>
              </div>
              <div className="dept-info">
                <h3 style={{ color: '#a5b4fc', fontSize: '1.2rem' }}>Kanban Global (Líderes)</h3>
                <p>Visão geral de demandas e refações</p>
              </div>
            </div>
            
            {DEPARTMENTS.map(dept => (
              <div 
                key={dept.title} 
                className="glass-card dept-card"
                onClick={() => navigate(dept.path)}
              >
                <div className="dept-icon-bg" style={{ backgroundColor: dept.color }} />
                <div className="dept-info">
                  <h3>{dept.title}</h3>
                  <p>{dept.desc}</p>
                </div>
                <div className="dept-count-badge">
                  {stats.deptCounts?.[dept.path] !== undefined ? (
                    <><span className="count-number">{stats.deptCounts[dept.path]}</span><span className="count-label">clientes</span></>
                  ) : (
                    <span className="count-number">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', marginTop: 20 }}>
          <h2 style={{ color: 'var(--text-main)', marginBottom: 10 }}>Bem-vindo ao ROI Expert</h2>
          <p style={{ color: 'var(--text-muted)' }}>Utilize o menu lateral para acessar os departamentos liberados para o seu perfil.</p>
        </div>
      )}

      <style>{`
        .dashboard-wrapper {
          height: 100%;
          overflow-y: auto;
          /* Tira o padding adicional do Layout se já estiver em page-container */
        }
        .dashboard-header {
          margin-bottom: 32px;
        }
        .contract-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 30px;
          margin-bottom: 32px;
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
        }
        .contract-info h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 8px 0;
          font-size: 1.1rem;
        }
        .contract-status {
          margin: 0;
          font-weight: 600;
          font-size: 1.5rem;
        }
        .contract-dates {
          display: flex;
          gap: 32px;
        }
        .date-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .date-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .date-val {
          font-size: 1.1rem;
          color: var(--text-main);
        }
        @media (max-width: 768px) {
          .contract-banner { flex-direction: column; align-items: flex-start; gap: 20px; }
          .contract-dates { width: 100%; justify-content: space-between; }
          .date-box { align-items: flex-start; }
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .stat-card {
          padding: 24px;
          text-align: center;
        }
        .stat-card h3 {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 8px;
        }
        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }
        .section-title {
          font-size: 1.25rem;
          margin-bottom: 20px;
        }
        .departments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          padding-bottom: 32px;
        }
        .dept-card {
          position: relative;
          padding: 24px;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .dept-icon-bg {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          flex-shrink: 0;
        }
        .dept-info h3 {
          font-size: 1.1rem;
          margin-bottom: 4px;
        }
        .dept-info p {
          font-size: 0.85rem;
          margin: 0;
        }
        .dept-count-badge {
          margin-left: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          min-width: 60px;
        }
        .count-number {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1;
        }
        .count-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
