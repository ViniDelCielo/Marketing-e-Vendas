// GangaHub/Entregas.jsx — Controle de Entregas
import { useState } from 'react';
import { Truck, Package, MapPin, Clock, Check, AlertCircle, Search, Plus, X, Download } from 'lucide-react';

const STATUS_ENTREGA = ['Todos', 'Aguardando Postagem', 'Em Trânsito', 'Saiu para Entrega', 'Entregue', 'Tentativa Falhou', 'Devolvido'];
const TRANSPORTADORAS = ['Todas', 'Correios', 'Jadlog', 'Total Express', 'Loggi', 'Retirada no Local'];
const PLATAFORMAS_E   = ['Todas', 'Mercado Livre', 'TikTok Shop', 'Shopify/Site'];

const STATUS_CONFIG = {
  'Aguardando Postagem': { color: '#9ca3af', icon: <Clock size={12}/>,         bg: 'rgba(107,114,128,0.2)' },
  'Em Trânsito':         { color: '#3b82f6', icon: <Truck size={12}/>,         bg: 'rgba(59,130,246,0.2)' },
  'Saiu para Entrega':   { color: '#f59e0b', icon: <MapPin size={12}/>,        bg: 'rgba(245,158,11,0.2)' },
  'Entregue':            { color: '#10b981', icon: <Check size={12}/>,         bg: 'rgba(16,185,129,0.2)' },
  'Tentativa Falhou':    { color: '#ef4444', icon: <AlertCircle size={12}/>,   bg: 'rgba(239,68,68,0.2)' },
  'Devolvido':           { color: '#8b5cf6', icon: <Package size={12}/>,       bg: 'rgba(139,92,246,0.2)' },
};

const ENTREGAS_INICIAL = [
  { id: 1,  pedido: 'ML-8821', cliente: 'João Silva',       produto: 'Creator Studio RGB',     plataforma: 'Mercado Livre', status: 'Em Trânsito',         transportadora: 'Correios',     rastreio: 'BR123456789BR', data_pedido: '2026-03-17', previsao: '2026-03-21', valor: 349 },
  { id: 2,  pedido: 'TK-441',  cliente: 'Maria Costa',      produto: 'LapelWave Pro',          plataforma: 'TikTok Shop',   status: 'Saiu para Entrega',   transportadora: 'Jadlog',       rastreio: 'JD987654321BR', data_pedido: '2026-03-18', previsao: '2026-03-20', valor: 199 },
  { id: 3,  pedido: 'SH-102',  cliente: 'Pedro Mendes',     produto: 'Kit Creator AI Pro',     plataforma: 'Shopify/Site',  status: 'Aguardando Postagem', transportadora: 'Loggi',        rastreio: '—',             data_pedido: '2026-03-19', previsao: '2026-03-22', valor: 699 },
  { id: 4,  pedido: 'ML-8820', cliente: 'Ana Ferreira',     produto: 'Chroma Mini LED',        plataforma: 'Mercado Livre', status: 'Entregue',            transportadora: 'Correios',     rastreio: 'BR111222333BR', data_pedido: '2026-03-14', previsao: '2026-03-18', valor: 79  },
  { id: 5,  pedido: 'TK-440',  cliente: 'Lucas Ribeiro',    produto: 'Hollyland Lark M2',      plataforma: 'TikTok Shop',   status: 'Tentativa Falhou',    transportadora: 'Total Express',rastreio: 'TX456789BR',    data_pedido: '2026-03-15', previsao: '2026-03-19', valor: 399 },
  { id: 6,  pedido: 'SH-101',  cliente: 'Carla Souza',      produto: 'ProPrompt v2',           plataforma: 'Shopify/Site',  status: 'Entregue',            transportadora: 'Correios',     rastreio: 'BR999888777BR', data_pedido: '2026-03-13', previsao: '2026-03-17', valor: 289 },
  { id: 7,  pedido: 'ML-8819', cliente: 'Rafael Alves',     produto: 'Painel Glow PRO LED',   plataforma: 'Mercado Livre', status: 'Em Trânsito',         transportadora: 'Jadlog',       rastreio: 'JD111222BR',    data_pedido: '2026-03-16', previsao: '2026-03-20', valor: 179 },
  { id: 8,  pedido: 'ML-8818', cliente: 'Beatriz Lima',     produto: 'LapelWave Pro',          plataforma: 'Mercado Livre', status: 'Devolvido',            transportadora: 'Correios',     rastreio: 'BR444555666BR', data_pedido: '2026-03-12', previsao: '2026-03-16', valor: 199 },
];

const EMPTY_FORM = { pedido: '', cliente: '', produto: '', plataforma: 'Mercado Livre', status: 'Aguardando Postagem', transportadora: 'Correios', rastreio: '', data_pedido: new Date().toISOString().slice(0,10), previsao: '', valor: '' };

export default function GangaHubEntregas() {
  const [entregas, setEntregas]   = useState(ENTREGAS_INICIAL);
  const [busca, setBusca]         = useState('');
  const [filtStatus, setFiltStatus] = useState('Todos');
  const [filtPlat, setFiltPlat]   = useState('Todas');
  const [filtTrans, setFiltTrans] = useState('Todas');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const filtradas = entregas.filter(e =>
    (filtStatus === 'Todos' || e.status === filtStatus) &&
    (filtPlat   === 'Todas' || e.plataforma === filtPlat) &&
    (filtTrans  === 'Todas' || e.transportadora === filtTrans) &&
    (e.pedido.toLowerCase().includes(busca.toLowerCase()) ||
     e.cliente.toLowerCase().includes(busca.toLowerCase()) ||
     e.produto.toLowerCase().includes(busca.toLowerCase()))
  );

  const resumo = Object.keys(STATUS_CONFIG).map(s => ({
    status: s, count: entregas.filter(e => e.status === s).length, ...STATUS_CONFIG[s]
  }));

  const handleSave = () => {
    setEntregas(es => [...es, { ...form, id: Date.now(), valor: Number(form.valor) }]);
    setShowForm(false); setForm(EMPTY_FORM);
  };

  const updateStatus = (id, status) => setEntregas(es => es.map(e => e.id === id ? { ...e, status } : e));

  const exportCSV = () => {
    const header = 'Pedido,Cliente,Produto,Plataforma,Status,Transportadora,Rastreio,Data Pedido,Previsao,Valor';
    const rows = entregas.map(e =>
      `"${e.pedido}","${e.cliente}","${e.produto}","${e.plataforma}","${e.status}","${e.transportadora}","${e.rastreio}","${e.data_pedido}","${e.previsao}",${e.valor}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gangahub_entregas_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div className="ghen-wrap">
      {/* Resumo de status */}
      <div className="ghen-resumo">
        {resumo.map(r => (
          <div key={r.status} className={`glass-panel ghen-res-card ${filtStatus === r.status ? 'ativo' : ''}`}
               style={{ borderColor: filtStatus === r.status ? r.color : 'transparent', cursor: 'pointer' }}
               onClick={() => setFiltStatus(filtStatus === r.status ? 'Todos' : r.status)}>
            <div style={{ color: r.color, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700 }}>
              {r.icon} {r.status}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: r.color }}>{r.count}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ghen-toolbar glass-panel">
        <div className="ghen-search">
          <Search size={16} style={{color:'var(--text-muted)'}}/>
          <input placeholder="Buscar pedido, cliente ou produto..." value={busca} onChange={e => setBusca(e.target.value)} className="ghen-sinput" />
        </div>
        <select className="ghen-sel" value={filtPlat} onChange={e => setFiltPlat(e.target.value)}>
          {PLATAFORMAS_E.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="ghen-sel" value={filtTrans} onChange={e => setFiltTrans(e.target.value)}>
          {TRANSPORTADORAS.map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghen-btn" onClick={exportCSV}><Download size={15}/> Exportar</button>
          <button className="ghen-btn primary" onClick={() => setShowForm(true)}><Plus size={15}/> Nova Entrega</button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ghen-table">
            <thead>
              <tr>
                <th>Pedido</th><th>Cliente</th><th>Produto</th><th>Plataforma</th>
                <th>Status</th><th>Transportadora</th><th>Rastreio</th>
                <th>Data Pedido</th><th>Previsão</th><th>Valor</th><th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(e => {
                const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG['Aguardando Postagem'];
                return (
                  <tr key={e.id}>
                    <td><code style={{ color: '#a5b4fc', fontSize: '0.78rem' }}>{e.pedido}</code></td>
                    <td style={{ fontWeight: 600 }}>{e.cliente}</td>
                    <td style={{ fontSize: '0.82rem' }}>{e.produto}</td>
                    <td><span className="ghen-badge" style={{ background: '#f59e0b22', color: '#fcd34d' }}>{e.plataforma}</span></td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: sc.bg, color: sc.color, padding: '3px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                        {sc.icon} {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{e.transportadora}</td>
                    <td><code style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>{e.rastreio}</code></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.data_pedido}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.previsao}</td>
                    <td style={{ fontWeight: 700, color: '#6ee7b7' }}>R$ {e.valor}</td>
                    <td>
                      <select
                        value={e.status}
                        onChange={ev => updateStatus(e.id, ev.target.value)}
                        className="ghen-status-sel"
                      >
                        {STATUS_ENTREGA.filter(s => s !== 'Todos').map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Nenhuma entrega encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="ghen-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ghen-modal glass-panel">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0 }}>Nova Entrega</h3>
              <button className="ghen-icon-btn" onClick={() => setShowForm(false)}><X size={18}/></button>
            </div>
            <div className="ghen-form-grid">
              {[['Nº Pedido','pedido'],['Cliente','cliente'],['Produto','produto'],['Rastreio','rastreio'],['Data Pedido','data_pedido','date'],['Previsão Entrega','previsao','date'],['Valor (R$)','valor','number']].map(([label,key,type]) => (
                <div key={key} className="ghen-field">
                  <label>{label}</label>
                  <input type={type||'text'} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} className="ghen-input" />
                </div>
              ))}
              {[['Plataforma','plataforma',PLATAFORMAS_E.filter(p=>p!=='Todas')],['Transportadora','transportadora',TRANSPORTADORAS.filter(t=>t!=='Todas')],['Status','status',STATUS_ENTREGA.filter(s=>s!=='Todos')]].map(([label,key,opts]) => (
                <div key={key} className="ghen-field">
                  <label>{label}</label>
                  <select value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} className="ghen-input">
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button className="ghen-btn" onClick={() => setShowForm(false)}><X size={14}/> Cancelar</button>
              <button className="ghen-btn primary" onClick={handleSave}><Check size={14}/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ghen-wrap { display: flex; flex-direction: column; gap: 12px; }
        .ghen-resumo { display: grid; grid-template-columns: repeat(6,1fr); gap: 8px; }
        .ghen-res-card { padding: 12px 14px; border: 1px solid transparent; border-radius: 10px; transition: 0.2s; }
        .ghen-res-card:hover { opacity: 0.9; }
        .ghen-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; }
        .ghen-search { display: flex; align-items: Center; gap: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 12px; flex: 1; min-width: 200px; }
        .ghen-sinput { background: none; border: none; outline: none; color: white; font-size: 0.85rem; flex:1; }
        .ghen-sel { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 7px 10px; border-radius: 8px; font-size: 0.82rem; outline: none; }
        .ghen-sel option { background: #1e1e2e; }
        .ghen-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.06); color: white; font-size: 0.82rem; cursor: pointer; transition: 0.2s; white-space:nowrap; }
        .ghen-btn.primary { background: linear-gradient(135deg,#f59e0b,#ef4444); border-color: transparent; font-weight: 600; }
        .ghen-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .ghen-table th { text-align: left; padding: 10px 12px; background: rgba(0,0,0,0.25); color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
        .ghen-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; white-space: nowrap; }
        .ghen-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .ghen-status-sel { background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: white; padding: 4px 6px; border-radius: 6px; font-size: 0.75rem; outline: none; cursor: pointer; }
        .ghen-status-sel option { background: #1e1e2e; }
        .ghen-icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 6px; display: flex; transition: 0.2s; }
        .ghen-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display:flex; align-items:center; justify-content:center; }
        .ghen-modal { padding: 28px; width: 620px; max-width: 95vw; border-radius: 16px; max-height: 90vh; overflow-y: auto; }
        .ghen-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ghen-field { display: flex; flex-direction: column; gap: 6px; }
        .ghen-field label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .ghen-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 0.85rem; }
        .ghen-input:focus { border-color: #f59e0b; }
        .ghen-input option { background: #1e1e2e; }
        @media(max-width:900px){ .ghen-resumo{grid-template-columns:repeat(3,1fr);} }
      `}</style>
    </div>
  );
}
