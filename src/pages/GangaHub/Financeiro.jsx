// GangaHub/Financeiro.jsx — Gestão Financeira separada por plataforma
import { useState, useRef } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Download, Upload,
  ShoppingBag, CreditCard, AlertCircle, Clock, Check, X, Plus
} from 'lucide-react';

const PLATAFORMAS = ['Todas', 'Mercado Livre', 'TikTok Shop', 'Shopify/Site', 'Manual'];
const STATUS_PAG  = ['Todos', 'Pago', 'Pendente', 'Atrasado', 'Cancelado', 'Em Disputa'];
const TIPO_PAG    = ['Todos', 'Recebimento', 'Repasse', 'Devolução', 'Taxa Plataforma', 'Frete', 'Imposto'];

const MOVIMENTOS_INICIAL = [
  { id: 1,  data: '2026-03-19', descricao: 'Pedido #ML-8801 Creator Studio RGB',    plataforma: 'Mercado Livre', tipo: 'Recebimento',     valor: 349,  status: 'Pago',     pedido: 'ML-8801' },
  { id: 2,  data: '2026-03-19', descricao: 'Taxa comissão ML (11%)',                 plataforma: 'Mercado Livre', tipo: 'Taxa Plataforma', valor: -38,  status: 'Pago',     pedido: 'ML-8801' },
  { id: 3,  data: '2026-03-19', descricao: 'Pedido #TK-441 LapelWave Pro',           plataforma: 'TikTok Shop',   tipo: 'Recebimento',     valor: 199,  status: 'Pago',     pedido: 'TK-441'  },
  { id: 4,  data: '2026-03-18', descricao: 'Repasse TikTok semana 11',               plataforma: 'TikTok Shop',   tipo: 'Repasse',         valor: 2840, status: 'Pago',     pedido: '—'       },
  { id: 5,  data: '2026-03-18', descricao: 'Pedido #SH-102 Kit Creator AI Pro',     plataforma: 'Shopify/Site',  tipo: 'Recebimento',     valor: 699,  status: 'Pendente', pedido: 'SH-102'  },
  { id: 6,  data: '2026-03-18', descricao: 'Frete #ML-8800 Sedex',                  plataforma: 'Mercado Livre', tipo: 'Frete',           valor: -22,  status: 'Pago',     pedido: 'ML-8800' },
  { id: 7,  data: '2026-03-17', descricao: 'Devolução #ML-8799 Chroma Mini',        plataforma: 'Mercado Livre', tipo: 'Devolução',       valor: -79,  status: 'Pago',     pedido: 'ML-8799' },
  { id: 8,  data: '2026-03-17', descricao: 'Repasse ML quinzena 2',                 plataforma: 'Mercado Livre', tipo: 'Repasse',         valor: 4120, status: 'Pendente', pedido: '—'       },
  { id: 9,  data: '2026-03-16', descricao: 'Taxa anúncio TikTok Ads',               plataforma: 'TikTok Shop',   tipo: 'Taxa Plataforma', valor: -450, status: 'Pago',     pedido: '—'       },
  { id: 10, data: '2026-03-16', descricao: 'Pedido #SH-101 ProPrompt v2',           plataforma: 'Shopify/Site',  tipo: 'Recebimento',     valor: 289,  status: 'Pago',     pedido: 'SH-101'  },
  { id: 11, data: '2026-03-15', descricao: 'Imposto Simples Nacional Mar/26',        plataforma: 'Manual',        tipo: 'Imposto',         valor: -1200, status: 'Pendente', pedido: '—'      },
  { id: 12, data: '2026-03-15', descricao: 'Pedido #TK-440 Hollyland Lark M2',      plataforma: 'TikTok Shop',   tipo: 'Recebimento',     valor: 399,  status: 'Atrasado', pedido: 'TK-440'  },
];

const STATUS_COLORS = {
  'Pago':        { bg: 'rgba(16,185,129,0.2)',  color: '#6ee7b7', icon: <Check size={12}/> },
  'Pendente':    { bg: 'rgba(245,158,11,0.2)', color: '#fcd34d', icon: <Clock size={12}/> },
  'Atrasado':    { bg: 'rgba(239,68,68,0.2)',  color: '#fca5a5', icon: <AlertCircle size={12}/> },
  'Cancelado':   { bg: 'rgba(107,114,128,0.2)',color: '#9ca3af', icon: <X size={12}/> },
  'Em Disputa':  { bg: 'rgba(139,92,246,0.2)', color: '#c4b5fd', icon: <AlertCircle size={12}/> },
};

const PLAT_COLORS = {
  'Mercado Livre': '#f59e0b',
  'TikTok Shop':   '#3b82f6',
  'Shopify/Site':  '#10b981',
  'Manual':        '#9ca3af',
};

const EMPTY_MOV = { data: new Date().toISOString().slice(0,10), descricao: '', plataforma: 'Mercado Livre', tipo: 'Recebimento', valor: '', status: 'Pendente', pedido: '' };

export default function GangaHubFinanceiro() {
  const [movimentos, setMovimentos] = useState(MOVIMENTOS_INICIAL);
  const [filtPlat, setFiltPlat]     = useState('Todas');
  const [filtStatus, setFiltStatus] = useState('Todos');
  const [filtTipo, setFiltTipo]     = useState('Todos');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_MOV);
  const fileRef                     = useRef();

  const filtrados = movimentos.filter(m => {
    return (filtPlat === 'Todas' || m.plataforma === filtPlat) &&
           (filtStatus === 'Todos' || m.status === filtStatus) &&
           (filtTipo === 'Todos' || m.tipo === filtTipo);
  });

  const totalEntradas    = filtrados.filter(m => m.valor > 0).reduce((a, m) => a + m.valor, 0);
  const totalSaidas      = filtrados.filter(m => m.valor < 0).reduce((a, m) => a + Math.abs(m.valor), 0);
  const saldoLiquido     = totalEntradas - totalSaidas;

  const handleSave = () => {
    setMovimentos(ms => [...ms, { ...form, id: Date.now(), valor: Number(form.valor) }]);
    setShowForm(false); setForm(EMPTY_MOV);
  };

  const exportCSV = () => {
    const header = 'Data,Descricao,Plataforma,Tipo,Valor,Status,Pedido';
    const rows = movimentos.map(m =>
      `${m.data},"${m.descricao}","${m.plataforma}","${m.tipo}",${m.valor},"${m.status}","${m.pedido}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gangahub_financeiro_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  // Resumo por plataforma
  const resumoPlat = ['Mercado Livre','TikTok Shop','Shopify/Site','Manual'].map(p => {
    const movs = movimentos.filter(m => m.plataforma === p);
    const entrada = movs.filter(m => m.valor > 0).reduce((a, m) => a + m.valor, 0);
    const saida   = movs.filter(m => m.valor < 0).reduce((a, m) => a + Math.abs(m.valor), 0);
    return { plataforma: p, entrada, saida, liquido: entrada - saida };
  });

  return (
    <div className="ghf-wrap">
      {/* Resumo por plataforma */}
      <div className="ghf-plat-grid">
        {resumoPlat.map(r => (
          <div key={r.plataforma} className="glass-panel ghf-plat-card">
            <div className="ghf-plat-name" style={{ color: PLAT_COLORS[r.plataforma] }}>{r.plataforma}</div>
            <div className="ghf-plat-row"><span>Entradas</span><span style={{ color: '#6ee7b7' }}>+R$ {r.entrada.toLocaleString('pt-BR')}</span></div>
            <div className="ghf-plat-row"><span>Saídas</span><span style={{ color: '#fca5a5' }}>-R$ {r.saida.toLocaleString('pt-BR')}</span></div>
            <div className="ghf-plat-row ghf-plat-liquido"><span>Líquido</span><span style={{ color: r.liquido >= 0 ? '#6ee7b7' : '#fca5a5', fontWeight: 800 }}>R$ {r.liquido.toLocaleString('pt-BR')}</span></div>
          </div>
        ))}
      </div>

      {/* KPIs dos filtros */}
      <div className="ghf-kpis">
        <div className="glass-panel ghf-kpi"><TrendingUp size={18} style={{color:'#10b981'}}/><div><b style={{color:'#6ee7b7'}}>+R$ {totalEntradas.toLocaleString('pt-BR')}</b><span>Entradas</span></div></div>
        <div className="glass-panel ghf-kpi"><TrendingDown size={18} style={{color:'#ef4444'}}/><div><b style={{color:'#fca5a5'}}>-R$ {totalSaidas.toLocaleString('pt-BR')}</b><span>Saídas</span></div></div>
        <div className="glass-panel ghf-kpi"><DollarSign size={18} style={{color: saldoLiquido >= 0 ? '#10b981' : '#ef4444'}}/><div><b style={{color: saldoLiquido >= 0 ? '#6ee7b7' : '#fca5a5'}}>R$ {saldoLiquido.toLocaleString('pt-BR')}</b><span>Saldo Líquido</span></div></div>
        <div className="glass-panel ghf-kpi"><ShoppingBag size={18} style={{color:'#6366f1'}}/><div><b style={{color:'#a5b4fc'}}>{filtrados.length}</b><span>Registros exibidos</span></div></div>
      </div>

      {/* Toolbar */}
      <div className="ghf-toolbar glass-panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <select className="ghf-select" value={filtPlat}   onChange={e => setFiltPlat(e.target.value)}>
            {PLATAFORMAS.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="ghf-select" value={filtStatus} onChange={e => setFiltStatus(e.target.value)}>
            {STATUS_PAG.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="ghf-select" value={filtTipo}   onChange={e => setFiltTipo(e.target.value)}>
            {TIPO_PAG.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghf-btn" onClick={exportCSV}><Download size={15}/> Exportar CSV</button>
          <button className="ghf-btn primary" onClick={() => setShowForm(true)}><Plus size={15}/> Novo Lançamento</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ghf-table">
            <thead>
              <tr>
                <th>Data</th><th>Descrição</th><th>Plataforma</th><th>Tipo</th>
                <th>Valor</th><th>Status</th><th>Pedido</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(m => {
                const sc = STATUS_COLORS[m.status] || STATUS_COLORS['Pendente'];
                const pc = PLAT_COLORS[m.plataforma] || '#6366f1';
                return (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.data}</td>
                    <td style={{ fontWeight: 500 }}>{m.descricao}</td>
                    <td><span className="ghf-badge" style={{ background: pc + '22', color: pc }}>{m.plataforma}</span></td>
                    <td><span className="ghf-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>{m.tipo}</span></td>
                    <td style={{ fontWeight: 800, color: m.valor >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                      {m.valor >= 0 ? '+' : ''}R$ {m.valor.toLocaleString('pt-BR')}
                    </td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                        {sc.icon} {m.status}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>{m.pedido}</code></td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo lançamento */}
      {showForm && (
        <div className="ghf-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ghf-modal glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Novo Lançamento</h3>
              <button className="ghf-icon-btn" onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <div className="ghf-form-grid">
              <div className="ghf-field"><label>Data</label><input type="date" max="9999-12-31" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} className="ghf-input" /></div>
              <div className="ghf-field"><label>Plataforma</label>
                <select value={form.plataforma} onChange={e => setForm(f => ({...f, plataforma: e.target.value}))} className="ghf-input">
                  {PLATAFORMAS.filter(p => p !== 'Todas').map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="ghf-field ghf-full"><label>Descrição</label><input value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} className="ghf-input" /></div>
              <div className="ghf-field"><label>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))} className="ghf-input">
                  {TIPO_PAG.filter(t => t !== 'Todos').map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="ghf-field"><label>Valor (+ entrada / - saída)</label><input type="number" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} className="ghf-input" /></div>
              <div className="ghf-field"><label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="ghf-input">
                  {STATUS_PAG.filter(s => s !== 'Todos').map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="ghf-field"><label>Nº Pedido</label><input value={form.pedido} onChange={e => setForm(f => ({...f, pedido: e.target.value}))} className="ghf-input" /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="ghf-btn" onClick={() => setShowForm(false)}><X size={14}/> Cancelar</button>
              <button className="ghf-btn primary" onClick={handleSave}><Check size={14}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ghf-wrap { display: flex; flex-direction: column; gap: 12px; }
        .ghf-plat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .ghf-plat-card { padding: 14px 16px; }
        .ghf-plat-name { font-weight: 800; font-size: 0.9rem; margin-bottom: 10px; }
        .ghf-plat-row { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ghf-plat-liquido { border-top: 1px solid rgba(255,255,255,0.1); border-bottom: none; margin-top: 4px; padding-top: 8px; font-weight: 700; }
        .ghf-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .ghf-kpi { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
        .ghf-kpi div { display: flex; flex-direction: column; }
        .ghf-kpi b { font-size: 1.1rem; font-weight: 800; }
        .ghf-kpi span { font-size: 0.72rem; color: var(--text-muted); }
        .ghf-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; }
        .ghf-select { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 7px 10px; border-radius: 8px; font-size: 0.82rem; outline: none; }
        .ghf-select option { background: #1e1e2e; }
        .ghf-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.06); color: white; font-size: 0.82rem; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .ghf-btn.primary { background: linear-gradient(135deg,#f59e0b,#ef4444); border-color: transparent; font-weight: 600; }
        .ghf-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
        .ghf-table th { text-align: left; padding: 10px 12px; background: rgba(0,0,0,0.25); color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
        .ghf-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; }
        .ghf-table tr:hover td { background: rgba(255,255,255,0.02); }
        .ghf-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
        .ghf-icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 6px; display: flex; transition: 0.2s; }
        .ghf-icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .ghf-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ghf-modal { padding: 28px; width: 580px; max-width: 95vw; border-radius: 16px; }
        .ghf-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ghf-full { grid-column: 1 / -1; }
        .ghf-field { display: flex; flex-direction: column; gap: 6px; }
        .ghf-field label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .ghf-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 0.85rem; }
        .ghf-input:focus { border-color: #f59e0b; }
        .ghf-input option { background: #1e1e2e; }
        @media(max-width:900px){ .ghf-plat-grid{grid-template-columns:repeat(2,1fr);} .ghf-kpis{grid-template-columns:repeat(2,1fr);} }
      `}</style>
    </div>
  );
}
