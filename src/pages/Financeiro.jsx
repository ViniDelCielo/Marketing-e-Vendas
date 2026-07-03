import { useState, useEffect } from 'react';
import {
  DollarSign, FileText, Users, CreditCard,
  CheckCircle, Clock, AlertTriangle, Calendar,
  Loader2, ExternalLink, TrendingDown, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import ClientFolderManager from '../components/ClientFolderManager';
import RH from './Administrativo/RH';
import Contratos from './Administrativo/Contratos';
import Pagamentos from './Administrativo/Pagamentos';

/* ─────────────────────────────────────────────
   VIEW EXCLUSIVA PARA CLIENTES
   Busca apenas os dados do próprio cliente e
   exibe um painel financeiro personalizado.
───────────────────────────────────────────── */
function ClientFinanceiroDashboard() {
  const { user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [allPayments, setAllPayments] = useState([]); // histórico de parcelas do asaas
  const [loading, setLoading] = useState(true);

  const fmt = (val) =>
    `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Busca somente o registro do próprio cliente
        const { data: clientRow } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.clientUuid)
          .single();

        setClientData(clientRow || null);

        // 2. Busca pagamentos Asaas para este cliente
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await supabase.functions.invoke('asaas-proxy', {
          body: { action: 'sync-payments' },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data?.success) {
          const asaasId = clientRow?.metadata?.asaas_id;
          const all = Array.isArray(res.data.data?.data) ? res.data.data.data : [];
          const mine = asaasId ? all.filter(p => p.customer === asaasId) : [];
          // Ordena do mais recente para o mais antigo
          mine.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
          setAllPayments(mine);
        }
      } catch (err) {
        console.error('Erro ao carregar financeiro do cliente:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.clientUuid) load();
  }, [user?.clientUuid]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: 'var(--text-muted)', gap: 12 }}>
        <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
        Carregando suas informações financeiras...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Nenhum dado financeiro encontrado para sua conta.
      </div>
    );
  }

  // ─── Calcula informações do contrato ──────────────────────────────────────
  const nextPayment = allPayments.find(
    p => p.status === 'PENDING' || p.status === 'OVERDUE'
  );
  const lastPaid = allPayments.find(
    p => p.status === 'RECEIVED' || p.status === 'CONFIRMED'
  );

  // Status do próximo pagamento
  let statusLabel = 'Sem Fatura';
  let statusColor = '#94a3b8';
  let statusBg = 'rgba(255,255,255,0.05)';
  let StatusIcon = Clock;

  if (nextPayment) {
    const dueDate = new Date(nextPayment.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (nextPayment.status === 'OVERDUE' || dueDate < today) {
      statusLabel = 'Em Atraso';
      statusColor = '#fb7185';
      statusBg = 'rgba(239,68,68,0.15)';
      StatusIcon = AlertTriangle;
    } else if (diffDays <= 5) {
      statusLabel = `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
      statusColor = '#fbbf24';
      statusBg = 'rgba(245,158,11,0.15)';
      StatusIcon = Clock;
    } else {
      statusLabel = 'Em Dia';
      statusColor = '#34d399';
      statusBg = 'rgba(16,185,129,0.15)';
      StatusIcon = CheckCircle;
    }
  } else if (lastPaid) {
    statusLabel = 'Pago em Dia';
    statusColor = '#34d399';
    statusBg = 'rgba(16,185,129,0.15)';
    StatusIcon = CheckCircle;
  }

  // Meses restantes do contrato
  let monthsRemaining = null;
  let contractEndDate = null;
  if (clientData.start_date && clientData.contract_duration_months) {
    const start = new Date(clientData.start_date);
    const end = new Date(start);
    end.setMonth(end.getMonth() + clientData.contract_duration_months);
    contractEndDate = end;
    const now = new Date();
    const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    monthsRemaining = Math.max(0, diff);
  }

  // Total pago histórico
  const totalPaid = allPayments
    .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
    .reduce((acc, p) => acc + parseFloat(p.value || 0), 0);

  const totalOverdue = allPayments
    .filter(p => p.status === 'OVERDUE')
    .reduce((acc, p) => acc + parseFloat(p.value || 0), 0);

  // Contagem de parcelas
  const paidCount = allPayments.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED').length;
  const overdueCount = allPayments.filter(p => p.status === 'OVERDUE' || (p.status === 'PENDING' && new Date(p.dueDate) < new Date())).length;

  // Calcula total de parcelas a partir das datas do contrato (start_date → end_date)
  const calcInstallmentsFromDates = () => {
    if (clientData.start_date && clientData.end_date) {
      const start = new Date(clientData.start_date);
      const end = new Date(clientData.end_date);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(1, months);
    }
    return null;
  };
  const totalInstallments = calcInstallmentsFromDates() ?? clientData.contract_duration_months ?? allPayments.length ?? 0;
  const pendingCount = Math.max(0, totalInstallments - paidCount - overdueCount);
  const progressPct = totalInstallments > 0 ? Math.round((paidCount / totalInstallments) * 100) : 0;

  const paymentStatusInfo = (status, dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    if (status === 'RECEIVED' || status === 'CONFIRMED')
      return { label: 'Pago', color: '#34d399', bg: 'rgba(16,185,129,0.15)' };
    if (status === 'OVERDUE' || (status === 'PENDING' && due < today))
      return { label: 'Em Atraso', color: '#fb7185', bg: 'rgba(239,68,68,0.12)' };
    return { label: 'Aguardando', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' };
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '22px 28px', borderLeft: '4px solid #6366f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>
            {clientData.name}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {clientData.plan || 'Plano Personalizado'} · Cliente desde {clientData.start_date ? new Date(clientData.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '–'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: statusBg, border: `1px solid ${statusColor}40`, padding: '10px 18px', borderRadius: 10 }}>
          <StatusIcon size={18} style={{ color: statusColor }} />
          <span style={{ fontWeight: 700, color: statusColor, fontSize: '0.95rem' }}>{statusLabel}</span>
        </div>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>

        {/* Valor da parcela */}
        <div className="glass-card" style={{ padding: 20, borderTop: '2px solid #6366f1' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor da Parcela</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
            {fmt(clientData.monthly_value || nextPayment?.value || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>por mês</div>
        </div>

        {/* Próximo vencimento */}
        <div className="glass-card" style={{ padding: 20, borderTop: '2px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próximo Vencimento</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
            {nextPayment?.dueDate ? new Date(nextPayment.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '–'}
          </div>
          <div style={{ fontSize: '0.75rem', color: statusColor, marginTop: 4, fontWeight: 600 }}>{statusLabel}</div>
        </div>

        {/* Meses restantes */}
        {monthsRemaining !== null && (
          <div className="glass-card" style={{ padding: 20, borderTop: '2px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meses Restantes</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{monthsRemaining}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Fim em {contractEndDate?.toLocaleDateString('pt-BR')}
            </div>
          </div>
        )}

        {/* Total pago com contador X/Y */}
        <div className="glass-card" style={{ padding: 20, borderTop: '2px solid #34d399' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pago</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{fmt(totalPaid)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>{paidCount}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>de</span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalInstallments || '?'}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>parcelas pagas</span>
          </div>
        </div>

        {/* Débito em atraso — só mostra se há */}
        {totalOverdue > 0 && (
          <div className="glass-card" style={{ padding: 20, borderTop: '2px solid #ef4444' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Atraso</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fb7185' }}>{fmt(totalOverdue)}</div>
            <div style={{ fontSize: '0.75rem', color: '#fb7185', marginTop: 4, fontWeight: 600 }}>Regularize o quanto antes</div>
          </div>
        )}
      </div>


      {/* ── Contrato ────────────────────────────────────────── */}
      {clientData.contract_url && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FileText size={18} style={{ color: '#a5b4fc' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Seu Contrato</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '14px 18px', borderRadius: 10, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{clientData.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {clientData.plan || 'Plano Personalizado'}
                {clientData.start_date && ` · Início: ${new Date(clientData.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
              </div>
            </div>
            <a
              href={clientData.contract_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#a5b4fc', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.35)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
            >
              <FileText size={15} /> Ver PDF do Contrato Assinado
            </a>
          </div>
        </div>
      )}

      {/* ── Histórico de Faturas ─────────────────────────────── */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <DollarSign size={18} style={{ color: '#a5b4fc' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Histórico de Faturas</h3>
        </div>

        {allPayments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhuma fatura encontrada.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Vencimento', 'Valor', 'Situação', 'Fatura'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPayments.map((p, i) => {
                  const info = paymentStatusInfo(p.status, p.dueDate);
                  return (
                    <tr key={p.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', color: 'var(--text-main)' }}>
                        {new Date(p.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff' }}>
                        {fmt(p.value)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: info.bg, color: info.color, padding: '4px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700 }}>
                          {info.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {p.invoiceUrl ? (
                          <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#60a5fa', fontSize: '0.82rem', textDecoration: 'none', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: 6 }}>
                            <ExternalLink size={13} /> Ver Fatura
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   VIEW PARA FUNCIONÁRIOS/ADMIN (inalterada)
───────────────────────────────────────────── */
export default function Financeiro() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  // ─── CLIENTE: render completamente separado ───
  if (isClient) {
    return (
      <div className="rh-financeiro-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="admin-tabs" style={{ padding: '24px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="tab-btn active">
            <DollarSign size={16} /> Minha Área Financeira
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ClientFinanceiroDashboard />
        </div>
        <TabStyle />
      </div>
    );
  }

  // ─── FUNCIONÁRIO/ADMIN: view original ────────
  return <FinanceiroAdmin />;
}

/* ─── Componente admin original ─────────────── */
function FinanceiroAdmin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('clientes');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asaasPayments, setAsaasPayments] = useState([]);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterPayment, setFilterPayment] = useState('Todos');

  const fmt = (val) => `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    const fetchAsaas = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const res = await supabase.functions.invoke('asaas-proxy', {
          body: { action: 'sync-payments' },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data?.success) setAsaasPayments(res.data.data.data);
      } catch (err) {
        console.error('Erro ao buscar asaas:', err);
      }
    };

    const fetchClientsAndAsaas = async () => {
      setLoading(true);
      const { data } = await supabase.from('clients').select('*').order('name');
      if (data) setClients(data);
      await fetchAsaas();
      setLoading(false);
    };

    fetchClientsAndAsaas();
    const id = setInterval(fetchAsaas, 30000);
    return () => clearInterval(id);
  }, []);

  const getClientAsaasInfo = (client) => {
    const arr = Array.isArray(asaasPayments) ? asaasPayments : [];
    const ps = arr.filter(p => p.customer === client.metadata?.asaas_id);
    ps.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    const ap = ps[0];
    let paymentStatus = 'Sem Fatura', isOverdue = false;
    if (ap) {
      if (ap.status === 'OVERDUE') { paymentStatus = 'Em Atraso'; isOverdue = true; }
      else if (ap.status === 'RECEIVED' || ap.status === 'CONFIRMED') { paymentStatus = 'Pago (Em Dia)'; }
      else if (ap.status === 'PENDING') {
        const due = new Date(ap.dueDate);
        if (due < new Date()) { paymentStatus = 'Em Atraso'; isOverdue = true; }
        else paymentStatus = 'No Prazo (A Vencer)';
      }
    }
    return {
      contract_value: client.monthly_value || (ap ? ap.value : 0),
      due_date: ap ? ap.dueDate : client.start_date,
      payment_status: paymentStatus,
      is_overdue: isOverdue,
      invoice_url: ap ? ap.invoiceUrl : null
    };
  };

  const clientsWithInfo = clients.map(c => ({ ...c, ...getClientAsaasInfo(c) }));

  return (
    <div className="rh-financeiro-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="admin-tabs" style={{ padding: '24px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className={`tab-btn ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}><DollarSign size={16} /> Financeiro dos Clientes</button>
        <button className={`tab-btn ${activeTab === 'rh' ? 'active' : ''}`} onClick={() => setActiveTab('rh')}><Users size={16} /> Equipe &amp; RH</button>
        <button className={`tab-btn ${activeTab === 'contratos' ? 'active' : ''}`} onClick={() => setActiveTab('contratos')}><FileText size={16} /> Contratos</button>
        <button className={`tab-btn ${activeTab === 'pagamentos' ? 'active' : ''}`} onClick={() => setActiveTab('pagamentos')}><CreditCard size={16} /> Pagamentos da Agência</button>
      </div>

      <div className="tab-content" style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'clientes' && (
          <ClientFolderManager title="Financeiro e Contratos" description="Acompanhe invoices, status de pagamentos e contratos firmados.">
            {(selectedClient) => {
              const displayedClientsWithInfo = selectedClient 
                ? clientsWithInfo.filter(c => c.id === selectedClient.id) 
                : clientsWithInfo;
              
              const filteredList = selectedClient 
                ? displayedClientsWithInfo 
                : displayedClientsWithInfo.filter(c => {
                    const matchClient = !filterClient || c.name?.toLowerCase().includes(filterClient.toLowerCase());
                    const matchStatus = filterStatus === 'Todos' || c.status === filterStatus;
                    const matchPayment = filterPayment === 'Todos' || c.payment_status === filterPayment || (!c.payment_status && filterPayment === 'Sem Fatura');
                    return matchClient && matchStatus && matchPayment;
                  }).sort((a, b) => {
                    if (a.status === 'Ativo' && b.status !== 'Ativo') return -1;
                    if (a.status !== 'Ativo' && b.status === 'Ativo') return 1;
                    if (a.is_overdue && !b.is_overdue) return -1;
                    if (!a.is_overdue && b.is_overdue) return 1;
                    return 0;
                  });

              const contractsList = selectedClient 
                ? clients.filter(c => c.id === selectedClient.id && c.contract_url) 
                : clients.filter(c => c.contract_url);

              return (
                <div className="dept-grid">
                  <section className="glass-panel col-span-2">
                    <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span><DollarSign size={20} /> Histórico de Faturas (Invoices)</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: 'rgba(74,222,128,0.1)', borderRadius: '12px' }}><DollarSign size={24} color="#4ade80" /></div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Recebido (Em Dia)</span>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{fmt(displayedClientsWithInfo.filter(c => c.payment_status === 'Pago (Em Dia)').reduce((acc, c) => acc + (parseFloat(c.contract_value) || 0), 0))}</span>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: 'rgba(250,204,21,0.1)', borderRadius: '12px' }}><DollarSign size={24} color="#facc15" /></div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total a Receber (No Prazo)</span>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{fmt(displayedClientsWithInfo.filter(c => c.payment_status === 'No Prazo (A Vencer)' || !c.payment_status || c.payment_status === 'Sem Fatura').reduce((acc, c) => acc + (parseFloat(c.contract_value) || 0), 0))}</span>
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '12px', background: 'rgba(244,63,94,0.1)', borderRadius: '12px' }}><DollarSign size={24} color="#f43f5e" /></div>
                        <div>
                          <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Devedor (Em Atraso)</span>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{fmt(displayedClientsWithInfo.filter(c => c.payment_status === 'Em Atraso').reduce((acc, c) => acc + (parseFloat(c.contract_value) || 0), 0))}</span>
                        </div>
                      </div>
                    </div>

                    {!selectedClient && (
                      <div className="filters-bar glass-card" style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', flexWrap: 'wrap' }}>
                        <input type="text" placeholder="Buscar por cliente..." value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
                          <option value="Todos">Status Cliente: Todos</option>
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                          <option value="Suspenso">Suspenso</option>
                        </select>
                        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>
                          <option value="Todos">Situação Fatura: Todas</option>
                          <option value="Pago (Em Dia)">Pago (Em Dia)</option>
                          <option value="Em Atraso">Em Atraso</option>
                          <option value="No Prazo (A Vencer)">No Prazo (A Vencer)</option>
                          <option value="Sem Fatura">Sem Fatura</option>
                        </select>
                      </div>
                    )}

                    <table className="recordings-table" style={{ width: '100%', marginTop: '16px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '12px' }}>Cliente</th>
                          <th style={{ padding: '12px' }}>Status Cliente</th>
                          <th style={{ padding: '12px' }}>Vencimento</th>
                          <th style={{ padding: '12px' }}>Valor Contrato</th>
                          <th style={{ padding: '12px' }}>Situação Pagamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan="5" style={{ padding: '16px 12px', textAlign: 'center' }}>Carregando...</td></tr>
                        ) : filteredList.length > 0 ? (
                          filteredList.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '16px 12px' }}>{c.name}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{ background: c.status === 'Ativo' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: c.status === 'Ativo' ? '#34d399' : '#fbbf24', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{c.status}</span>
                              </td>
                              <td style={{ padding: '16px 12px' }}>{c.due_date ? new Date(c.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</td>
                              <td style={{ padding: '16px 12px', fontWeight: 'bold' }}>R$ {parseFloat(c.contract_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '16px 12px' }}>
                                <span style={{ background: !c.payment_status || c.payment_status === 'Sem Fatura' ? 'rgba(255,255,255,0.1)' : c.is_overdue ? 'rgba(239,68,68,0.2)' : c.payment_status === 'Pago (Em Dia)' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: !c.payment_status || c.payment_status === 'Sem Fatura' ? '#ccc' : c.is_overdue ? '#ef4444' : c.payment_status === 'Pago (Em Dia)' ? '#34d399' : '#fbbf24', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                  {c.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="5" style={{ padding: '16px 12px', textAlign: 'center' }}>Nenhum cliente cadastrado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </section>

                  <section className="glass-panel">
                    <div className="section-title"><FileText size={20} /> Contratos Ativos</div>
                    {loading ? (
                      <div style={{ padding: '16px', marginTop: '16px' }}>Carregando contratos...</div>
                    ) : contractsList.length > 0 ? (
                      contractsList.map(c => (
                        <div key={c.id} className="contract-card glass-card" style={{ padding: '16px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: '0 0 8px 0' }}>{c.name}</h4>
                              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.plan || 'Plano Personalizado'}</p>
                            </div>
                            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px' }}>Assinado</span>
                          </div>
                          <a href={c.contract_url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '8px', display: 'flex', gap: '8px', textDecoration: 'none' }}>
                            <FileText size={16} /> Ver PDF Assinado
                          </a>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '16px', marginTop: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum contrato ativo</div>
                    )}
                  </section>
                </div>
              );
            }}
          </ClientFolderManager>
        )}

        {activeTab === 'rh' && <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}><RH /></div>}
        {activeTab === 'contratos' && <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}><Contratos /></div>}
        {activeTab === 'pagamentos' && <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}><Pagamentos /></div>}
      </div>

      <TabStyle />
    </div>
  );
}

function TabStyle() {
  return (
    <style>{`
      .tab-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 10px 18px;
        background: transparent; border: none;
        border-bottom: 2px solid transparent;
        color: var(--text-muted);
        font-size: 0.88rem; font-weight: 500;
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        transition: all 0.2s;
        margin-bottom: -1px;
      }
      .tab-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-main); }
      .tab-btn.active {
        color: #a5b4fc;
        border-bottom-color: #6366f1;
        background: rgba(99,102,241,0.08);
      }
    `}</style>
  );
}
