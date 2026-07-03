import { useState, useRef, useEffect } from 'react';
import { DollarSign, RefreshCw, ExternalLink, Download, Maximize, BarChart2, List } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

const Pagamentos = () => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState('recebimentos'); // recebimentos | pagamentos
  const [viewMode, setViewMode] = useState('list'); // list | dashboard
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasStatus, setAsaasStatus] = useState('offline');
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterPayment, setFilterPayment] = useState('Todos');

  useEffect(() => {
    const fetchFinances = async () => {
      setLoading(true);

      // Busca todos os clientes ativos
      const { data: cData } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'Ativo')
        .order('name');

      const { data: eData } = await supabase.from('employees').select('*').order('name');

      // Mantém SOMENTE clientes da agência:
      // show_in_agency deve ser EXATAMENTE true (não null, undefined ou false)
      // e não pode ser shadow de funcionário
      if (cData) {
        const agencyClients = cData.filter(c =>
          c.metadata?.show_in_agency === true &&
          c.metadata?.is_employee_shadow !== true
        );
        setClients(agencyClients);
      }
      if (eData) setEmployees(eData);
      
      const { data: config } = await supabase.from('system_settings').select('*').eq('key', 'asaas_api_key').single();
      if (config && config.value && config.value.token) {
        setAsaasApiKey(config.value.token);
        setAsaasStatus('connected');
      }
      
      setLoading(false);
    };
    fetchFinances();
  }, []);

  useEffect(() => {
    if (asaasStatus === 'connected') {
      syncAsaas(true); // Auto sync once on mount if connected
      const interval = setInterval(() => {
        syncAsaas(true);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [asaasStatus]); // Dependencies purposely omit syncAsaas to prevent constant recreation unless useCallback is used. 
  // Real Data for Asaas Recebimentos (Dashboard)
  const statusData = [
    { name: 'Pago', value: clients.filter(c => c.payment_status === 'Pago (Em Dia)').length },
    { name: 'Em Atraso', value: clients.filter(c => c.payment_status === 'Em Atraso').length },
    { name: 'No Prazo', value: clients.filter(c => c.payment_status === 'No Prazo (A Vencer)' || !c.payment_status || c.payment_status === 'Sem Fatura').length },
  ].filter(d => d.value > 0);

  const topClientsData = [...clients]
    .sort((a, b) => (parseFloat(b.contract_value) || 0) - (parseFloat(a.contract_value) || 0))
    .slice(0, 5)
    .map(c => ({
      name: c.name || 'Desconhecido',
      valor: parseFloat(c.contract_value) || 0
    }));

  const byMonth = {};
  clients.forEach(c => {
    if (!c.due_date && !c.start_date) return;
    const date = new Date(c.due_date || c.start_date);
    const m = date.toLocaleString('pt-BR', { month: 'short' }) + '/' + date.getFullYear();
    if (!byMonth[m]) byMonth[m] = { month: m, Recebido: 0, Previsto: 0 };
    if (c.payment_status === 'Pago (Em Dia)') {
      byMonth[m].Recebido += parseFloat(c.contract_value || c.monthly_value) || 0;
    } else {
      byMonth[m].Previsto += parseFloat(c.contract_value || c.monthly_value) || 0;
    }
  });
  const asaasEvolutionData = Object.values(byMonth);

  // Data for Salary Evolution (Dashboard - Equipe)
  const evolutionData = [
    { month: 'Jan/26', 'João Silva': 3000, 'Maria Lima': 2500, 'Carlos Editor': 2000 },
    { month: 'Fev/26', 'João Silva': 3200, 'Maria Lima': 2600, 'Carlos Editor': 2200 },
    { month: 'Mar/26', 'João Silva': 3700, 'Maria Lima': 2950, 'Carlos Editor': 3050 },
  ];

  const distData = [
    { name: 'Salário Base', value: 7500 },
    { name: 'Comissões', value: 1600 },
    { name: 'Ajuda de Custo', value: 600 },
    { name: 'Adiantamentos', value: 500 },
  ];
  
  const fakePagamentosColab = [
    { colaborador: 'João Silva', salarioBase: 3000, comissao: 700, ajudaCusto: 0 },
    { colaborador: 'Maria Lima', salarioBase: 2500, comissao: 450, ajudaCusto: 0 },
    { colaborador: 'Carlos Editor', salarioBase: 2000, comissao: 1050, ajudaCusto: 0 },
  ];
  
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const syncAsaas = async (isAuto = false) => {
    if (!asaasApiKey) {
      if (!isAuto) alert('A Chave da API do Asaas não está configurada.\nPor favor, vá em Gestão -> Conectividade de APIs para configurá-la.');
      return;
    }
    
    if (!isAuto) setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      // Pull Faturas (Payments) from Asaas
      const { data: pData, error: pError } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'sync-payments' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      // Pull Clientes (Customers) from Asaas for fallback matching
      const { data: cData, error: cError } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'sync-customers' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (pError) throw pError;
      if (!pData.success) throw new Error(pData.error);
      if (pData.data && pData.data.errors) {
        throw new Error('Erro do Asaas (Pagamentos): ' + pData.data.errors[0].description);
      }
      if (cData?.data && cData.data.errors) {
        throw new Error('Erro do Asaas (Clientes): ' + cData.data.errors[0].description);
      }
      
      const payments = pData.data.data || [];
      const asaasCustomers = cData?.success && cData.data ? cData.data.data : [];
      
      console.log('Baixados:', payments.length, 'pagamentos e', asaasCustomers.length, 'clientes do Asaas');
      
      // Update Clients List with Asaas Payment Data
      setClients(prevClients => prevClients.map(client => {
        // Encontrar o Asaas ID provável deste cliente
        let matchedAsaasId = client.metadata?.asaas_id;
        
        // Se não tiver ID salvo, tenta descobrir pelo email ou CPF/CNPJ
        if (!matchedAsaasId) {
          const asaasCus = asaasCustomers.find(c => 
            (c.email && c.email === client.email) || 
            (c.cpfCnpj && c.cpfCnpj === client.document)
          );
          if (asaasCus) matchedAsaasId = asaasCus.id;
        }

        // Encontrar os pagamentos reais desse cliente
        const clientPayments = matchedAsaasId ? payments.filter(p => p.customer === matchedAsaasId) : [];
        
        // Se houver pagamentos, ordena pela data de vencimento (mais recente primeiro)
        if (clientPayments.length > 0) {
          clientPayments.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        }
        const asaasPayment = clientPayments[0]; 

        let paymentStatus = 'Sem Fatura';
        let isOverdue = false;

        if (asaasPayment) {
          if (asaasPayment.status === 'OVERDUE') {
            paymentStatus = 'Em Atraso';
            isOverdue = true;
          } else if (asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') {
            paymentStatus = 'Pago (Em Dia)';
          } else if (asaasPayment.status === 'PENDING') {
            const today = new Date();
            const dueDate = new Date(asaasPayment.dueDate);
            if (dueDate < today) {
              paymentStatus = 'Em Atraso';
              isOverdue = true;
            } else {
              paymentStatus = 'No Prazo (A Vencer)';
            }
          }
        }

        return {
          ...client,
          contract_value: client.monthly_value || (asaasPayment ? asaasPayment.value : 0),
          client_status: client.status,
          due_date: asaasPayment ? asaasPayment.dueDate : client.start_date,
          payment_status: paymentStatus,
          is_overdue: isOverdue,
          invoice_url: asaasPayment ? asaasPayment.invoiceUrl : null,
          asaas_id: matchedAsaasId
        };
      }));
      
      if (!isAuto) alert(`Integração concluída! Foram sincronizadas ${payments.length} faturas do Asaas.`);
    } catch (err) {
      if (!isAuto) alert("Erro ao sincronizar com Asaas: " + err.message);
      else console.error("Auto sync Asaas falhou:", err);
    } finally {
      if (!isAuto) setLoading(false);
    }
  };



  const statusColor = (status) => {
    switch (status) {
      case 'RECEBIDO': case 'PAGO': return 'success';
      case 'PENDENTE': case 'AGENDADO': return 'warning';
      case 'ATRASADO': return 'danger';
      default: return 'default';
    }
  };

  const formatCurrency = (val) => {
    if (typeof val !== 'number') return val;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Export to Excel
  const exportToExcel = () => {
    let ws;
    if (subTab === 'recebimentos') {
      const exportData = clients.map(c => ({
        ID: c.id,
        Cliente: c.name,
        Plano: c.plan || 'Personalizado',
        "Valor Mensal": c.monthly_value || 0,
        Status: c.status
      }));
      ws = XLSX.utils.json_to_sheet(exportData);
    } else {
      const exportData = employees.map(item => ({
        ID: item.id,
        Colaborador: item.name,
        Cargo: item.position || 'N/A',
        "Salário Base": 3000, // mock
        "Comissão": 0,
        "Ajuda de Custo": 0,
        "Adiantamento": 0,
        "Total Líquido": 3000,
        Status: item.status
      }));
      ws = XLSX.utils.json_to_sheet(exportData);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `Relatorio_${subTab}_${new Date().getTime()}.xlsx`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      dashboardRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="pagamentos-container" ref={dashboardRef}>
      <div className="pagamentos-header">
        <div className="sub-tab-actions">
          <button 
            className={'sub-tab-btn ' + (subTab === 'recebimentos' ? 'active' : '')}
            onClick={() => { setSubTab('recebimentos'); setViewMode('list'); }}
          >
            Recebimentos (Clientes)
          </button>
          <button 
            className={'sub-tab-btn ' + (subTab === 'pagamentos' ? 'active' : '')}
            onClick={() => setSubTab('pagamentos')}
          >
            Pagamentos (Colaboradores)
          </button>
        </div>

        <div className="header-actions">
          {/* subTab can toggle dashboard / list for BOTH views now */}
          <div className="view-toggle">
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
              title="Lista"
            >
              <List size={18} />
            </button>
            <button 
              className={viewMode === 'dashboard' ? 'active' : ''} 
              onClick={() => setViewMode('dashboard')}
              title="Dashboard"
            >
              <BarChart2 size={18} />
            </button>
          </div>

          {viewMode === 'dashboard' && (
            <button className="icon-btn" onClick={toggleFullscreen} title="Modo Apresentação (Tela Cheia)">
              <Maximize size={18} />
            </button>
          )}

          <button className="icon-btn" onClick={exportToExcel} title="Exportar para Excel">
            <Download size={18} />
          </button>

          <button className={`sync-btn ${asaasStatus === 'connected' ? 'connected' : ''}`} onClick={() => syncAsaas(false)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Sincronizando...' : asaasStatus === 'connected' ? 'Sincronizar Asaas' : 'Conectar Asaas'}
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={24} color="#4ade80" /></div>
          <div>
            <span className="stat-label">Total Recebido (Em Dia)</span>
            <span className="stat-value">{formatCurrency(clients.filter(c => c.payment_status === 'Pago (Em Dia)').reduce((acc, c) => acc + (parseFloat(c.contract_value || c.monthly_value) || 0), 0))}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={24} color="#facc15" /></div>
          <div>
            <span className="stat-label">Total a Receber (No Prazo)</span>
            <span className="stat-value">{formatCurrency(clients.filter(c => c.payment_status === 'No Prazo (A Vencer)' || !c.payment_status).reduce((acc, c) => acc + (parseFloat(c.contract_value || c.monthly_value) || 0), 0))}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={24} color="#f43f5e" /></div>
          <div>
            <span className="stat-label">Total Devedor (Em Atraso)</span>
            <span className="stat-value">{formatCurrency(clients.filter(c => c.payment_status === 'Em Atraso').reduce((acc, c) => acc + (parseFloat(c.contract_value || c.monthly_value) || 0), 0))}</span>
          </div>
        </div>
      </div>

      <div className="card-panel presentation-container">
        {viewMode === 'list' && (
          <>
            <h3 className="section-title">
              {subTab === 'recebimentos' ? 'Faturas Asaas (Clientes)' : 'Histórico de Pagamentos (Equipe)'}
            </h3>

            {subTab === 'recebimentos' && (
              <div className="filters-bar glass-card" style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por cliente..." 
                  value={filterClient} 
                  onChange={e => setFilterClient(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                />
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                >
                  <option value="Todos">Status Cliente: Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Suspenso">Suspenso</option>
                </select>
                <select 
                  value={filterPayment} 
                  onChange={e => setFilterPayment(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                >
                  <option value="Todos">Situação Fatura: Todas</option>
                  <option value="Pago (Em Dia)">Pago (Em Dia)</option>
                  <option value="Em Atraso">Em Atraso</option>
                  <option value="No Prazo (A Vencer)">No Prazo (A Vencer)</option>
                  <option value="Sem Fatura">Sem Fatura</option>
                </select>
              </div>
            )}
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  {subTab === 'recebimentos' ? (
                    <tr>
                      <th>Cliente</th>
                      <th>Status Cliente</th>
                      <th>Vencimento</th>
                      <th>Valor Contrato</th>
                      <th>Situação Pagamento</th>
                      <th>Fatura</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Colaborador</th>
                      <th>Data Pag.</th>
                      <th>Salário Base</th>
                      <th>Comissão</th>
                      <th>Ajuda de Custo</th>
                      <th>Adiantamento</th>
                      <th>Total Líquido</th>
                      <th>Status</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>Carregando dados...</td></tr>
                  ) : subTab === 'recebimentos' ? (
                    clients.length > 0 ? [...clients].filter(c => {
                      const matchClient = !filterClient || c.name?.toLowerCase().includes(filterClient.toLowerCase());
                      const cStatus = c.client_status || c.status;
                      const matchStatus = filterStatus === 'Todos' || cStatus === filterStatus;
                      const matchPayment = filterPayment === 'Todos' || c.payment_status === filterPayment || (!c.payment_status && filterPayment === 'Sem Fatura');
                      return matchClient && matchStatus && matchPayment;
                    }).sort((a, b) => {
                      if (a.client_status === 'Ativo' && b.client_status !== 'Ativo') return -1;
                      if (a.client_status !== 'Ativo' && b.client_status === 'Ativo') return 1;
                      if (a.is_overdue && !b.is_overdue) return -1;
                      if (!a.is_overdue && b.is_overdue) return 1;
                      return 0;
                    }).map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.metadata?.display_name || item.name}</td>
                        <td><span className={`status-badge ${item.client_status === 'Ativo' ? 'success' : item.client_status === 'Suspenso' ? 'danger' : 'warning'}`}>{item.client_status || item.status}</span></td>
                        <td>{item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</td>
                        <td className="fw-bold">{formatCurrency(parseFloat(item.contract_value || item.monthly_value) || 0)}</td>
                        <td>
                          <span className={`status-badge ${!item.payment_status || item.payment_status === 'Sem Fatura' ? 'default' : item.is_overdue ? 'danger' : item.payment_status === 'Pago (Em Dia)' ? 'success' : 'warning'}`}>
                            {item.payment_status || 'Sem Fatura'}
                          </span>
                        </td>
                        <td>
                          {item.invoice_url ? (
                            <a href={item.invoice_url} target="_blank" rel="noopener noreferrer" className="link-action"><ExternalLink size={16} /> Fatura Asaas</a>
                          ) : (
                            <span className="text-muted">Sem Fatura</span>
                          )}
                        </td>
                      </tr>
                    )) : <tr><td colSpan="6" style={{ textAlign: 'center' }}>Nenhum recebimento encontrado. Clique em Sincronizar Asaas.</td></tr>
                  ) : (
                    employees.length > 0 ? employees.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.hired_at || 'N/A'}</td>
                        <td>{formatCurrency(3000)}</td>
                        <td>{formatCurrency(0)}</td>
                        <td>{formatCurrency(0)}</td>
                        <td className="text-danger">-{formatCurrency(0)}</td>
                        <td className="fw-bold text-primary">{formatCurrency(3000)}</td>
                        <td><span className={`status-badge ${statusColor(item.status === 'active' ? 'PAGO' : 'PENDENTE')}`}>{item.status === 'active' ? 'Pago' : 'Aguardando'}</span></td>
                      </tr>
                    )) : <tr><td colSpan="8" style={{ textAlign: 'center' }}>Nenhum pagamento encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {viewMode === 'dashboard' && subTab === 'recebimentos' && (
          <div className="dashboard-grid">
            <div className="chart-box full-width">
              <h4 className="chart-title">Receita por Mês (Asaas)</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={asaasEvolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="Recebido" fill="#10b981" />
                    <Bar dataKey="Previsto" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <h4 className="chart-title">Status de Faturas</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Pago' ? '#10b981' : entry.name === 'Em Atraso' ? '#ef4444' : '#facc15'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <h4 className="chart-title">Top 5 Clientes (MRR)</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis type="number" stroke="#9ca3af" />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="valor" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'dashboard' && subTab === 'pagamentos' && (
          <div className="dashboard-grid">
            <div className="chart-box full-width">
              <h4 className="chart-title">Evolução Salarial (Incluindo Comissões e Benefícios)</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Line type="monotone" dataKey="João Silva" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Maria Lima" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Carlos Editor" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <h4 className="chart-title">Distribuição de Custos com Equipe</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {distData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-box">
              <h4 className="chart-title">Composição por Colaborador (Mês Atual)</h4>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fakePagamentosColab} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="colaborador" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="salarioBase" stackId="a" fill="#6366f1" name="Salário Base" />
                    <Bar dataKey="comissao" stackId="a" fill="#10b981" name="Comissão" />
                    <Bar dataKey="ajudaCusto" stackId="a" fill="#f59e0b" name="Ajuda de Custo" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>



      <style>{`
        /* Fullscreen styles */
        .pagamentos-container:fullscreen {
          background-color: #0b1120;
          padding: 32px;
          overflow-y: auto;
        }

        .pagamentos-container {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        
        .pagamentos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sub-tab-actions, .view-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 4px;
        }

        .sub-tab-btn, .view-toggle button {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sub-tab-btn.active, .view-toggle button.active {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-main);
        }

        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          border-radius: 8px;
          cursor: pointer;
          transition: 0.2s;
        }

        .icon-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: 0.2s;
        }

        .sync-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.25);
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-label { display: block; color: var(--text-muted); font-size: 0.9rem; }
        .stat-value { display: block; color: var(--text-main); font-size: 1.5rem; font-weight: 700; margin-top: 4px; }

        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
        .data-table th { color: var(--text-muted); font-weight: 500; font-size: 0.9rem; }
        
        .fw-bold { font-weight: 600; }
        .text-primary { color: var(--primary) !important; }
        .text-danger { color: #f43f5e !important; }

        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }
        .status-badge.success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .status-badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .status-badge.danger { background: rgba(244, 63, 94, 0.15); color: #f43f5e; }

        .link-action { display: flex; align-items: center; gap: 6px; color: var(--primary); text-decoration: none; font-weight: 500; }
        .link-action:hover { text-decoration: underline; }

        /* Dashboard specific styles */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .chart-box {
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid var(--border-color);
        }
        
        .chart-box.full-width {
          grid-column: 1 / -1;
        }
        
        .chart-title {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 1.1rem;
          color: var(--text-main);
          font-weight: 600;
        }

        .chart-wrapper {
          height: 300px;
          width: 100%;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .pagamentos-header { flex-direction: column; align-items: stretch; }
          .header-actions { flex-wrap: wrap; justify-content: flex-end; }
          .sub-tab-actions { width: 100%; }
          .sub-tab-btn { flex: 1; text-align: center; font-size: 0.8rem; padding: 6px 4px; }
          .stats-row { grid-template-columns: 1fr; }
          .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%; }
          .table-responsive table { min-width: 600px; }
          .sync-btn span { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Pagamentos;
