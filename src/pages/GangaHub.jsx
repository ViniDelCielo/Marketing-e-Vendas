import { useState } from 'react';
import {
  Star, Zap, Globe, ShoppingBag, BarChart2, Users,
  Plus, X, Loader2, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import FeedbackField from '../components/FeedbackField';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { supabase } from '../lib/supabase';
import GoogleDriveConnector from '../components/GoogleDriveConnector';

/* ──────────────────────────────────────────────────────────
   Helpers de status
────────────────────────────────────────────────────────── */
const STATUS_FLOW = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Aprovado', 'Refazer', 'Concluído'];

const STATUS_BADGE = {
  'A Fazer':       { bg: 'rgba(99,102,241,0.2)',  color: '#a5b4fc', icon: <Clock size={12} /> },
  'Em Andamento':  { bg: 'rgba(59,130,246,0.2)',  color: '#93c5fd', icon: <Zap size={12} /> },
  'Em Revisão':    { bg: 'rgba(245,158,11,0.2)',  color: '#fcd34d', icon: <AlertCircle size={12} /> },
  'Aprovado':      { bg: 'rgba(16,185,129,0.2)',  color: '#6ee7b7', icon: <CheckCircle size={12} /> },
  'Refazer':       { bg: 'rgba(239,68,68,0.2)',   color: '#fca5a5', icon: <AlertCircle size={12} /> },
  'Concluído':     { bg: 'rgba(16,185,129,0.3)',  color: '#10b981', icon: <CheckCircle size={12} /> },
};

const StatusBadge = ({ status, onClick }) => {
  const s = STATUS_BADGE[status] || STATUS_BADGE['A Fazer'];
  return (
    <span
      onClick={onClick}
      title="Clique para avançar status"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem',
        fontWeight: 600, cursor: 'pointer',
        background: s.bg, color: s.color,
        border: `1px solid ${s.color}33`,
        transition: 'all 0.2s',
      }}
    >
      {s.icon} {status}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────
   Métricas visuais do hub
────────────────────────────────────────────────────────── */
const HUB_METRICS = [
  { label: 'Campanhas Ativas',   value: '12',   icon: <Zap size={18} />,        color: '#6366f1' },
  { label: 'Alcance Total',      value: '48K',  icon: <Globe size={18} />,       color: '#3b82f6' },
  { label: 'Pedidos no Mês',     value: '284',  icon: <ShoppingBag size={18} />, color: '#f59e0b' },
  { label: 'Avaliação Média',    value: '4.9★', icon: <Star size={18} />,        color: '#10b981' },
];

/* ──────────────────────────────────────────────────────────
   Conteúdo principal do Ganga Hub
────────────────────────────────────────────────────────── */
const GangaHubContent = ({ client }) => {
  const { tasks, loading, addTask, updateTask, deleteTask } =
    useDepartmentTasks(client.id, 'Ganga Hub');

  const [newCampaign, setNewCampaign] = useState('');
  const [newProduct,  setNewProduct]  = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDirectDelete = async (id) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('department_tasks').delete().eq('id', id);
      if (error) throw error;
      deleteTask(id);
      setConfirmDeleteId(null);
    } catch (err) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const campaigns = tasks.filter(t => t.metadata?.type === 'campaign');
  const products  = tasks.filter(t => t.metadata?.type === 'product');

  const handleAddCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.trim()) return;
    await addTask({ title: newCampaign, status: 'A Fazer', metadata: { type: 'campaign' } });
    setNewCampaign('');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.trim()) return;
    await addTask({ title: newProduct, status: 'A Fazer', metadata: { type: 'product' } });
    setNewProduct('');
  };

  const cycleStatus = async (task) => {
    const next = (STATUS_FLOW.indexOf(task.status) + 1) % STATUS_FLOW.length;
    await updateTask(task.id, { status: STATUS_FLOW[next] });
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', alignItems: 'start' }}>
         <DepartmentGuide department="Ganga Hub" />
         <GoogleDriveConnector client={client} department="Ganga Hub" />
      </div>
      {/* ── Métricas ── */}
      <div className="gh-metrics">
        {HUB_METRICS.map(m => (
          <div key={m.label} className="gh-metric-card glass-panel">
            <div className="gh-metric-icon" style={{ background: m.color + '22', color: m.color }}>
              {m.icon}
            </div>
            <div>
              <div className="gh-metric-value" style={{ color: m.color }}>{m.value}</div>
              <div className="gh-metric-label">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid principal ── */}
      <div className="gh-grid">

        {/* Campanhas */}
        <section className="glass-panel gh-col-big">
          <div className="section-title">
            <Zap size={20} style={{ color: '#6366f1' }} /> Campanhas do Hub
          </div>

          <form onSubmit={handleAddCampaign} className="add-task-form">
            <input
              type="text"
              placeholder="Nova campanha (pressione Enter)..."
              value={newCampaign}
              onChange={e => setNewCampaign(e.target.value)}
              className="glass-input"
            />
            <button type="submit" disabled={!newCampaign.trim()} className="glass-btn primary">
              <Plus size={16} />
            </button>
          </form>

          {loading ? (
            <div className="loading-state"><Loader2 className="spin" /> Carregando campanhas...</div>
          ) : (
            <div className="gh-task-list">
              {campaigns.length === 0 && (
                <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>
                  Nenhuma campanha cadastrada.
                </p>
              )}
              {campaigns.map(c => (
                <div key={c.id} className="gh-task-card glass-card">
                  <div className="gh-task-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span className="gh-badge" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                        Hub&nbsp;Campanha
                      </span>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{c.title}</p>
                      <StatusBadge status={c.status} onClick={() => cycleStatus(c)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {confirmDeleteId === c.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleDirectDelete(c.id)}
                            disabled={deletingId === c.id}
                            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            {deletingId === c.id ? '...' : 'Sim'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(c.id)} className="icon-btn text-muted">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <FeedbackField
                    initialFeedback={c.feedback}
                    onSubmit={(feedback) => updateTask(c.id, { feedback })}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Painel lateral */}
        <div className="gh-sidebar-panels">

          {/* Visão Geral */}
          <section className="glass-panel">
            <div className="section-title">
              <BarChart2 size={20} style={{ color: '#3b82f6' }} /> Visão Geral
            </div>
            <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              O <b>Ganga Hub</b> centraliza as operações de marketing,
              campanhas e gestão de produtos do cliente <b>{client.name}</b>,
              proporcionando rastreamento em tempo real e colaboração integrada.
            </p>
            <div className="gh-progress-wrap">
              {[
                { label: 'Engajamento',  pct: 78, color: '#6366f1' },
                { label: 'Conversão',    pct: 54, color: '#3b82f6' },
                { label: 'Satisfação',   pct: 92, color: '#10b981' },
              ].map(p => (
                <div key={p.label} className="gh-progress-row">
                  <span>{p.label}</span>
                  <span style={{ color: p.color, fontWeight: 700 }}>{p.pct}%</span>
                  <div className="gh-progress-bar">
                    <div style={{ width: `${p.pct}%`, background: p.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Produtos / Serviços */}
          <section className="glass-panel" style={{ flex: 1 }}>
            <div className="section-title">
              <ShoppingBag size={20} style={{ color: '#f59e0b' }} /> Produtos &amp; Serviços
            </div>

            <form onSubmit={handleAddProduct} className="add-task-form" style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Novo produto/serviço..."
                value={newProduct}
                onChange={e => setNewProduct(e.target.value)}
                className="glass-input"
              />
              <button type="submit" disabled={!newProduct.trim()} className="glass-btn primary">
                <Plus size={16} />
              </button>
            </form>

            {loading ? (
              <div className="loading-state"><Loader2 className="spin" /></div>
            ) : (
              <ul className="gh-product-list">
                {products.length === 0 && (
                  <li style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem' }}>
                    Sem produtos cadastrados.
                  </li>
                )}
                {products.map(p => (
                  <li key={p.id} className="gh-product-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.title}</span>
                        <StatusBadge status={p.status} onClick={() => cycleStatus(p)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        {confirmDeleteId === p.id ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleDirectDelete(p.id)}
                              disabled={deletingId === p.id}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              {deletingId === p.id ? '...' : 'Sim'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(p.id)} className="icon-btn text-muted">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <FeedbackField
                      initialFeedback={p.feedback}
                      onSubmit={(feedback) => updateTask(p.id, { feedback })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Equipe */}
          <section className="glass-panel">
            <div className="section-title">
              <Users size={20} style={{ color: '#10b981' }} /> Equipe do Hub
            </div>
            {[
              { name: 'Gestor de Hub',        role: 'Líder',     color: '#10b981' },
              { name: 'Criativo de Conteúdo', role: 'Membro',    color: '#6366f1' },
              { name: 'Analista de Dados',    role: 'Membro',    color: '#3b82f6' },
            ].map(m => (
              <div key={m.name} className="gh-team-member">
                <div className="gh-avatar" style={{ background: m.color + '33', color: m.color }}>
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.72rem', color: m.color }}>{m.role}</div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* ── Estilos locais ── */}
      <style>{`
        /* Métricas */
        .gh-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .gh-metric-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
        }
        .gh-metric-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .gh-metric-value { font-size: 1.4rem; font-weight: 800; line-height: 1; }
        .gh-metric-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

        /* Grid */
        .gh-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 16px;
        }
        .gh-col-big { padding: 20px; }
        .gh-sidebar-panels { display: flex; flex-direction: column; gap: 16px; }

        /* Task list */
        .gh-task-list { display: flex; flex-direction: column; gap: 10px; }
        .gh-task-card { padding: 14px; }
        .gh-task-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 8px; margin-bottom: 10px;
        }
        .gh-badge {
          display: inline-block; padding: 2px 8px;
          border-radius: 20px; font-size: 0.7rem; font-weight: 700;
        }

        /* Progress */
        .gh-progress-wrap { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
        .gh-progress-row { display: grid; grid-template-columns: 1fr auto; gap: 4px; font-size: 0.8rem; }
        .gh-progress-bar {
          grid-column: 1 / -1;
          height: 5px; background: rgba(255,255,255,0.1);
          border-radius: 4px; overflow: hidden;
        }
        .gh-progress-bar > div { height: 100%; border-radius: 4px; transition: width 0.6s ease; }

        /* Products */
        .gh-product-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .gh-product-item {
          padding: 10px 12px; background: rgba(0,0,0,0.2);
          border-radius: 8px; border: 1px solid var(--border-color);
          display: flex; flex-direction: column; gap: 8px;
          transition: background 0.2s;
        }
        .gh-product-item:hover { background: rgba(0,0,0,0.3); }

        /* Team */
        .gh-team-member {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid var(--border-color);
        }
        .gh-team-member:last-child { border-bottom: none; }
        .gh-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
        }

        /* Shared helpers */
        .section-title {
          display: flex; align-items: center; gap: 8px;
          font-weight: 600; font-size: 1rem; margin-bottom: 14px;
          border-bottom: 1px solid var(--border-color); padding-bottom: 10px;
        }
        .glass-btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white; padding: 8px 16px; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: 0.2s; font-size: 0.85rem;
        }
        .glass-btn.primary { background: var(--primary); border-color: transparent; }
        .glass-btn:hover { background: rgba(99,102,241,0.4); border-color: var(--primary); }
        .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .glass-input {
          flex: 1; min-width: 0;
          background: rgba(0,0,0,0.15); border: 1px solid var(--border-color);
          color: white; padding: 8px 12px; border-radius: 8px;
          outline: none; font-size: 0.85rem;
        }
        .glass-input:focus { border-color: var(--primary); }
        .add-task-form { display: flex; gap: 8px; margin-bottom: 16px; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
        .icon-btn:hover { background: rgba(255,0,0,0.1); color: #ff4444; }
        .text-muted { color: var(--text-muted); }
        .text-sm { font-size: 0.85rem; }
        .spin { animation: spin 1s linear infinite; }
        .loading-state {
          display: flex; align-items: center; gap: 8px;
          color: var(--text-muted); padding: 20px; justify-content: center;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Responsivo */
        @media (max-width: 1024px) {
          .gh-metrics { grid-template-columns: repeat(2, 1fr); }
          .gh-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .gh-metrics { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </>
  );
};

/* ──────────────────────────────────────────────────────────
   Wrapper com ClientFolderManager
────────────────────────────────────────────────────────── */
const GangaHub = () => (
  <ClientFolderManager
    title="Ganga Hub"
    description="Central de campanhas, produtos e métricas de hub do cliente — sincronizado em tempo real."
  >
    {(client) => <GangaHubContent client={client} />}
  </ClientFolderManager>
);

export default GangaHub;
