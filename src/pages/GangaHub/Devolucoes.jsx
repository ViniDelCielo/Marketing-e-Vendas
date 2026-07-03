// GangaHub/Devolucoes.jsx — Controle de Devoluções e Trocas
import { useState } from 'react';
import {
  RotateCcw, AlertCircle, Clock, Check, X,
  MessageSquare, Download, Plus, Search
} from 'lucide-react';

const MOTIVOS = ['Todos', 'Produto Defeituoso', 'Produto Diferente do Anunciado', 'Arrependimento', 'Atraso na Entrega', 'Dano no Transporte', 'Tamanho/Modelo Errado', 'Outro'];
const STATUS_DEV = ['Todos', 'Solicitado', 'Em Análise', 'Aprovado - Troca', 'Aprovado - Reembolso', 'Reprovado', 'Concluído'];
const PLATAFORMAS_D = ['Todas', 'Mercado Livre', 'TikTok Shop', 'Shopify/Site'];

const STATUS_CONFIG = {
  'Solicitado': { color: '#9ca3af', bg: 'rgba(107,114,128,0.2)', icon: <Clock size={12} /> },
  'Em Análise': { color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', icon: <AlertCircle size={12} /> },
  'Aprovado - Troca': { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)', icon: <RotateCcw size={12} /> },
  'Aprovado - Reembolso': { color: '#10b981', bg: 'rgba(16,185,129,0.2)', icon: <Check size={12} /> },
  'Reprovado': { color: '#ef4444', bg: 'rgba(239,68,68,0.2)', icon: <X size={12} /> },
  'Concluído': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.2)', icon: <Check size={12} /> },
};

const DEVS_INICIAL = [
  { id: 1, pedido: 'ML-8799', cliente: 'Carlos Mattos', produto: 'Chroma Mini LED', plataforma: 'Mercado Livre', motivo: 'Produto Defeituoso', status: 'Em Análise', data: '2026-03-17', valor: 79, obs: 'LED apaga após 10 min de uso.' },
  { id: 2, pedido: 'TK-438', cliente: 'Fernanda Rocha', produto: 'LapelWave Pro', plataforma: 'TikTok Shop', motivo: 'Produto Diferente do Anunciado', status: 'Aprovado - Reembolso', data: '2026-03-16', valor: 199, obs: 'Recebeu modelo diferente do comprado.' },
  { id: 3, pedido: 'SH-098', cliente: 'Gustavo Pires', produto: 'Creator Studio RGB', plataforma: 'Shopify/Site', motivo: 'Arrependimento', status: 'Solicitado', data: '2026-03-19', valor: 349, obs: 'Comprador desistiu da compra.' },
  { id: 4, pedido: 'ML-8810', cliente: 'Simone Castro', produto: 'ProPrompt v2', plataforma: 'Mercado Livre', motivo: 'Dano no Transporte', status: 'Aprovado - Troca', data: '2026-03-15', valor: 289, obs: 'Embalagem chegou amassada.' },
  { id: 5, pedido: 'TK-435', cliente: 'Diego Ferraz', produto: 'Painel Glow PRO LED', plataforma: 'TikTok Shop', motivo: 'Produto Defeituoso', status: 'Reprovado', data: '2026-03-14', valor: 179, obs: 'Produto funcionando após análise técnica.' },
  { id: 6, pedido: 'ML-8805', cliente: 'Tatiane Nunes', produto: 'Kit Creator AI Pro', plataforma: 'Mercado Livre', motivo: 'Atraso na Entrega', status: 'Concluído', data: '2026-03-12', valor: 699, obs: 'Reembolso processado.' },
];

const EMPTY_FORM = { pedido: '', cliente: '', produto: '', plataforma: 'Mercado Livre', motivo: 'Produto Defeituoso', status: 'Solicitado', data: new Date().toISOString().slice(0, 10), valor: '', obs: '' };

export default function GangaHubDevolucoes() {
  const [devs, setDevs] = useState(DEVS_INICIAL);
  const [busca, setBusca] = useState('');
  const [filtStatus, setFiltStatus] = useState('Todos');
  const [filtPlat, setFiltPlat] = useState('Todas');
  const [filtMotivo, setFiltMotivo] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detalhe, setDetalhe] = useState(null);

  const filtradas = devs.filter(d =>
    (filtStatus === 'Todos' || d.status === filtStatus) &&
    (filtPlat === 'Todas' || d.plataforma === filtPlat) &&
    (filtMotivo === 'Todos' || d.motivo === filtMotivo) &&
    (d.pedido.toLowerCase().includes(busca.toLowerCase()) || d.cliente.toLowerCase().includes(busca.toLowerCase()))
  );

  const totais = {
    total: devs.length,
    emAnalise: devs.filter(d => d.status === 'Em Análise').length,
    concluidos: devs.filter(d => d.status === 'Aprovado - Reembolso' || d.status === 'Concluído').length,
    valorTotal: devs.reduce((a, d) => a + d.valor, 0),
  };

  const handleSave = () => {
    setDevs(ds => [...ds, { ...form, id: Date.now(), valor: Number(form.valor) }]);
    setShowForm(false); setForm(EMPTY_FORM);
  };

  const updateStatus = (id, status) => setDevs(ds => ds.map(d => d.id === id ? { ...d, status } : d));

  const exportCSV = () => {
    const header = 'Pedido,Cliente,Produto,Plataforma,Motivo,Status,Data,Valor,Observacao';
    const rows = devs.map(d =>
      `"${d.pedido}","${d.cliente}","${d.produto}","${d.plataforma}","${d.motivo}","${d.status}","${d.data}",${d.valor},"${d.obs}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gangahub_devolucoes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="ghd-wrap">
      {/* KPIs */}
      <div className="ghd-kpis">
        <div className="glass-panel ghd-kpi"><RotateCcw size={20} style={{ color: '#8b5cf6' }} /><div><b>{totais.total}</b><span>Total de Devoluções</span></div></div>
        <div className="glass-panel ghd-kpi"><Clock size={20} style={{ color: '#f59e0b' }} /><div><b style={{ color: '#fcd34d' }}>{totais.emAnalise}</b><span>Em Análise</span></div></div>
        <div className="glass-panel ghd-kpi"><Check size={20} style={{ color: '#10b981' }} /><div><b style={{ color: '#6ee7b7' }}>{totais.concluidos}</b><span>Reembolsos Concluídos</span></div></div>
        <div className="glass-panel ghd-kpi"><X size={20} style={{ color: '#ef4444' }} /><div><b style={{ color: '#fca5a5' }}>R$ {totais.valorTotal.toLocaleString('pt-BR')}</b><span>Valor em Risco</span></div></div>
      </div>

      {/* Toolbar */}
      <div className="ghd-toolbar glass-panel">
        <div className="ghd-search">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Buscar pedido ou cliente..." value={busca} onChange={e => setBusca(e.target.value)} className="ghd-sinput" />
        </div>
        <select className="ghd-sel" value={filtStatus} onChange={e => setFiltStatus(e.target.value)}>
          {STATUS_DEV.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="ghd-sel" value={filtPlat} onChange={e => setFiltPlat(e.target.value)}>
          {PLATAFORMAS_D.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="ghd-sel" value={filtMotivo} onChange={e => setFiltMotivo(e.target.value)}>
          {MOTIVOS.map(m => <option key={m}>{m}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghd-btn" onClick={exportCSV}><Download size={15} /> Exportar</button>
          <button className="ghd-btn primary" onClick={() => setShowForm(true)}><Plus size={15} /> Nova Solicitação</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ghd-table">
            <thead>
              <tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Plataforma</th><th>Motivo</th><th>Data</th><th>Valor</th><th>Status</th><th>Obs.</th><th>Alterar Status</th></tr>
            </thead>
            <tbody>
              {filtradas.map(d => {
                const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG['Solicitado'];
                return (
                  <tr key={d.id}>
                    <td><code style={{ color: '#a5b4fc', fontSize: '0.78rem' }}>{d.pedido}</code></td>
                    <td style={{ fontWeight: 600 }}>{d.cliente}</td>
                    <td style={{ fontSize: '0.82rem' }}>{d.produto}</td>
                    <td><span style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{d.plataforma}</span></td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.motivo}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.data}</td>
                    <td style={{ fontWeight: 700, color: '#fca5a5' }}>R$ {d.valor}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                        {sc.icon} {d.status}
                      </span>
                    </td>
                    <td>
                      <button className="ghd-obs-btn" title={d.obs} onClick={() => setDetalhe(d)}>
                        <MessageSquare size={14} /> Ver
                      </button>
                    </td>
                    <td>
                      <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)} className="ghd-status-sel">
                        {STATUS_DEV.filter(s => s !== 'Todos').map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Nenhuma devolução encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nova solicitação */}
      {showForm && (
        <div className="ghd-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ghd-modal glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Nova Devolução / Troca</h3>
              <button className="ghd-icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="ghd-form-grid">
              {[['Nº Pedido', 'pedido'], ['Cliente', 'cliente'], ['Produto', 'produto'], ['Valor (R$)', 'valor', 'number'], ['Data', 'data', 'date']].map(([label, key, type]) => (
                <div key={key} className="ghd-field"><label>{label}</label>
                  <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="ghd-input" />
                </div>
              ))}
              {[['Plataforma', 'plataforma', PLATAFORMAS_D.filter(p => p !== 'Todas')], ['Motivo', 'motivo', MOTIVOS.filter(m => m !== 'Todos')], ['Status', 'status', STATUS_DEV.filter(s => s !== 'Todos')]].map(([label, key, opts]) => (
                <div key={key} className="ghd-field"><label>{label}</label>
                  <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="ghd-input">
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="ghd-field ghd-full"><label>Observações</label>
                <textarea value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} className="ghd-input" rows={3} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="ghd-btn" onClick={() => setShowForm(false)}><X size={14} /> Cancelar</button>
              <button className="ghd-btn primary" onClick={handleSave}><Check size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe */}
      {detalhe && (
        <div className="ghd-overlay" onClick={() => setDetalhe(null)}>
          <div className="ghd-modal glass-panel" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Detalhes — {detalhe.pedido}</h3>
              <button className="ghd-icon-btn" onClick={() => setDetalhe(null)}><X size={18} /></button>
            </div>
            <p style={{ margin: '8px 0', fontSize: '0.85rem' }}><b>Cliente:</b> {detalhe.cliente}</p>
            <p style={{ margin: '8px 0', fontSize: '0.85rem' }}><b>Produto:</b> {detalhe.produto}</p>
            <p style={{ margin: '8px 0', fontSize: '0.85rem' }}><b>Motivo:</b> {detalhe.motivo}</p>
            <p style={{ margin: '8px 0', fontSize: '0.85rem' }}><b>Valor:</b> R$ {detalhe.valor}</p>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <b style={{ color: 'white' }}>Observações:</b><br />{detalhe.obs}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ghd-wrap { display: flex; flex-direction: column; gap: 12px; }
        .ghd-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .ghd-kpi { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .ghd-kpi div { display: flex; flex-direction: column; }
        .ghd-kpi b { font-size: 1.2rem; font-weight: 800; }
        .ghd-kpi span { font-size: 0.72rem; color: var(--text-muted); }
        .ghd-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; padding:12px 16px; }
        .ghd-search { display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:8px; padding:6px 12px; flex:1; min-width:200px; }
        .ghd-sinput { background:none; border:none; outline:none; color:white; font-size:0.85rem; flex:1; }
        .ghd-sel { background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:white; padding:7px 10px; border-radius:8px; font-size:0.82rem; outline:none; }
        .ghd-sel option { background: #1e1e2e; }
        .ghd-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid var(--border-color); background:rgba(255,255,255,0.06); color:white; font-size:0.82rem; cursor:pointer; transition:0.2s; white-space:nowrap; }
        .ghd-btn.primary { background: linear-gradient(135deg,#f59e0b,#ef4444); border-color:transparent; font-weight:600; }
        .ghd-table { width:100%; border-collapse:collapse; font-size:0.82rem; }
        .ghd-table th { text-align:left; padding:10px 12px; background:rgba(0,0,0,0.25); color:var(--text-muted); font-size:0.72rem; font-weight:700; text-transform:uppercase; white-space:nowrap; }
        .ghd-table td { padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:middle; white-space:nowrap; }
        .ghd-table tr:hover td { background:rgba(255,255,255,0.02); }
        .ghd-status-sel { background:rgba(0,0,0,0.3); border:1px solid var(--border-color); color:white; padding:4px 6px; border-radius:6px; font-size:0.75rem; outline:none; cursor:pointer; }
        .ghd-status-sel option { background:#1e1e2e; }
        .ghd-obs-btn { display:flex; align-items:center; gap:4px; background:rgba(99,102,241,0.15); border:none; color:#a5b4fc; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:0.75rem; }
        .ghd-icon-btn { background:none; border:none; color:var(--text-muted); cursor:pointer; padding:5px; border-radius:6px; display:flex; }
        .ghd-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; }
        .ghd-modal { padding:28px; width:620px; max-width:95vw; border-radius:16px; max-height:90vh; overflow-y:auto; }
        .ghd-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .ghd-full { grid-column:1/-1; }
        .ghd-field { display:flex; flex-direction:column; gap:6px; }
        .ghd-field label { font-size:0.78rem; color:var(--text-muted); font-weight:600; }
        .ghd-input { background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:white; padding:8px 12px; border-radius:8px; outline:none; font-size:0.85rem; }
        .ghd-input:focus { border-color:#f59e0b; }
        .ghd-input option { background:#1e1e2e; }
      `}</style>
    </div>
  );
}
