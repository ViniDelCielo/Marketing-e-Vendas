// GangaHub/Integracoes.jsx — Conexões via API com plataformas de vendas
import { useState } from 'react';
import {
  Plug, Check, X, AlertCircle, ExternalLink, RefreshCw,
  Lock, Unlock, Zap, Globe, ShoppingCart, Play, Settings
} from 'lucide-react';

const PLATAFORMAS = [
  {
    id: 'mercadolivre',
    nome: 'Mercado Livre',
    logo: '🛒',
    cor: '#f59e0b',
    descricao: 'Integração com MercadoShops e API Marketplace. Sincronize pedidos, estoque e preços automaticamente.',
    status: 'conectado',
    vendas_mes: 'R$ 68.400',
    pedidos: 284,
    docs: 'https://developers.mercadolivre.com.br',
    scope: ['read_orders', 'write_products', 'read_payments', 'write_stock'],
    ultima_sync: '2026-03-19 20:10',
    webhook: 'https://gangahub.com.br/webhooks/ml',
  },
  {
    id: 'tiktok',
    nome: 'TikTok Shop',
    logo: '🎵',
    cor: '#3b82f6',
    descricao: 'Conecte sua loja ao TikTok Shop. Gerencie produtos, pedidos e campanhas diretamente no painel.',
    status: 'conectado',
    vendas_mes: 'R$ 44.100',
    pedidos: 178,
    docs: 'https://partner.tiktokshop.com',
    scope: ['product.read', 'order.read', 'order.write', 'finance.read'],
    ultima_sync: '2026-03-19 19:45',
    webhook: 'https://gangahub.com.br/webhooks/tiktok',
  },
  {
    id: 'shopify',
    nome: 'Shopify / Site Próprio',
    logo: '🛍️',
    cor: '#10b981',
    descricao: 'Sincronize o e-commerce Shopify com o painel. Gerencie produtos, pedidos e clientes.',
    status: 'parcial',
    vendas_mes: 'R$ 29.900',
    pedidos: 89,
    docs: 'https://shopify.dev/api',
    scope: ['read_orders', 'write_products', 'read_customers'],
    ultima_sync: '2026-03-19 18:30',
    webhook: 'https://gangahub.com.br/webhooks/shopify',
  },
  {
    id: 'aliexpress',
    nome: 'AliExpress / Fornecedores',
    logo: '🇨🇳',
    cor: '#ef4444',
    descricao: 'Conecte ao AliExpress para importar produtos da China, acompanhar embarques e pedidos de reposição.',
    status: 'desconectado',
    vendas_mes: '—',
    pedidos: 0,
    docs: 'https://portals.aliexpress.com/apply/api_apply.htm',
    scope: ['product.import', 'order.tracking', 'shipment.status'],
    ultima_sync: '—',
    webhook: '—',
  },
  {
    id: 'correios',
    nome: 'Correios API',
    logo: '📮',
    cor: '#f59e0b',
    descricao: 'Calcule fretes, rastreie encomendas e gere etiquetas automaticamente via API dos Correios.',
    status: 'conectado',
    vendas_mes: '—',
    pedidos: 0,
    docs: 'https://www.correios.com.br/atendimento/developers',
    scope: ['tracking', 'shipping.label', 'price.calculate'],
    ultima_sync: '2026-03-19 20:00',
    webhook: '—',
  },
  {
    id: 'pagseguro',
    nome: 'PagSeguro / PagBank',
    logo: '💳',
    cor: '#6366f1',
    descricao: 'Processe pagamentos, emita notificações de cobrança e concilie transações automaticamente.',
    status: 'parcial',
    vendas_mes: 'R$ 12.200',
    pedidos: 0,
    docs: 'https://dev.pagseguro.uol.com.br',
    scope: ['transactions.read', 'charge.create', 'refund.create'],
    ultima_sync: '2026-03-18 22:00',
    webhook: 'https://gangahub.com.br/webhooks/pagseguro',
  },
];

const WEBHOOKS_LOG = [
  { ts: '2026-03-19 20:13', plataforma: 'Mercado Livre', evento: 'order.created #ML-8825', status: 'ok' },
  { ts: '2026-03-19 20:10', plataforma: 'TikTok Shop',   evento: 'order.paid #TK-445',      status: 'ok' },
  { ts: '2026-03-19 19:58', plataforma: 'Shopify',       evento: 'product.updated SKU-003', status: 'ok' },
  { ts: '2026-03-19 19:45', plataforma: 'TikTok Shop',   evento: 'order.cancelled #TK-444', status: 'ok' },
  { ts: '2026-03-19 19:30', plataforma: 'Correios',      evento: 'tracking.updated BR123',  status: 'ok' },
  { ts: '2026-03-19 19:00', plataforma: 'PagSeguro',     evento: 'timeout ao processar',    status: 'erro' },
];

const StatusBadge = ({ status }) => {
  const cfg = {
    conectado:    { bg: 'rgba(16,185,129,0.2)',  color: '#6ee7b7', icon: <Check size={11}/>,       label: 'Conectado' },
    parcial:      { bg: 'rgba(245,158,11,0.2)', color: '#fcd34d', icon: <AlertCircle size={11}/>, label: 'Parcial' },
    desconectado: { bg: 'rgba(107,114,128,0.2)',color: '#9ca3af', icon: <X size={11}/>,            label: 'Desconectado' },
  }[status] || {};
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:cfg.bg, color:cfg.color, padding:'3px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const ConfigModal = ({ plat, onClose }) => {
  const [tab, setTab] = useState('config');
  const [key, setKey]     = useState('ghub_••••••••••••••••');
  const [secret, setSecret] = useState('sk_••••••••••••••••••••••••••••');
  const [syncing, setSyncing] = useState(false);

  const doSync = () => { setSyncing(true); setTimeout(() => setSyncing(false), 2000); };

  return (
    <div className="ghi-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ghi-modal glass-panel">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.8rem' }}>{plat.logo}</span>
            <div>
              <h3 style={{ margin:0 }}>{plat.nome}</h3>
              <StatusBadge status={plat.status} />
            </div>
          </div>
          <button className="ghi-icon-btn" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="ghi-tabs">
          {['config', 'scopes', 'webhook'].map(t => (
            <button key={t} className={`ghi-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'config' ? <Settings size={14}/> : t === 'scopes' ? <Lock size={14}/> : <Zap size={14}/>}
              {t === 'config' ? 'Configuração' : t === 'scopes' ? 'Permissões' : 'Webhooks'}
            </button>
          ))}
        </div>

        {tab === 'config' && (
          <div className="ghi-form">
            <div className="ghi-field"><label>API Key / Client ID</label>
              <input value={key} onChange={e => setKey(e.target.value)} className="ghi-input" />
            </div>
            <div className="ghi-field"><label>API Secret / Client Secret</label>
              <input type="password" value={secret} onChange={e => setSecret(e.target.value)} className="ghi-input" />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button className="ghi-btn" onClick={doSync} disabled={syncing}>
                <RefreshCw size={14} className={syncing ? 'spin' : ''}/> {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
              <button className="ghi-btn primary"><Check size={14}/> Salvar Credenciais</button>
              <a href={plat.docs} target="_blank" rel="noreferrer" className="ghi-btn" style={{ textDecoration:'none' }}>
                <ExternalLink size={14}/> Ver Docs
              </a>
            </div>
          </div>
        )}

        {tab === 'scopes' && (
          <div style={{marginTop:10}}>
            <p style={{fontSize:'0.83rem',color:'var(--text-muted)',marginBottom:12}}>Permissões ativas nesta integração:</p>
            {plat.scope.map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(0,0,0,0.2)', borderRadius:8, marginBottom:6, fontSize:'0.83rem' }}>
                <Check size={14} style={{color:'#6ee7b7'}}/> <code style={{color:'#a5b4fc'}}>{s}</code>
              </div>
            ))}
          </div>
        )}

        {tab === 'webhook' && (
          <div style={{marginTop:10}}>
            <p style={{fontSize:'0.83rem',color:'var(--text-muted)',marginBottom:8}}>Endpoint de recebimento de eventos:</p>
            <div style={{ background:'rgba(0,0,0,0.3)', padding:'10px 14px', borderRadius:8, display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <code style={{color:'#6ee7b7',fontSize:'0.82rem',flex:1}}>{plat.webhook}</code>
              <button className="ghi-btn" onClick={() => navigator.clipboard?.writeText(plat.webhook)} style={{padding:'4px 10px'}}>Copiar</button>
            </div>
            <p style={{fontSize:'0.83rem',color:'var(--text-muted)'}}>Última sincronização: <b style={{color:'white'}}>{plat.ultima_sync}</b></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function GangaHubIntegracoes() {
  const [platSel, setPlatSel] = useState(null);

  const conectadas   = PLATAFORMAS.filter(p => p.status === 'conectado').length;
  const parciais     = PLATAFORMAS.filter(p => p.status === 'parcial').length;
  const desconectadas = PLATAFORMAS.filter(p => p.status === 'desconectado').length;

  return (
    <div className="ghi-wrap">
      {/* Sumário */}
      <div className="ghi-summary">
        <div className="glass-panel ghi-sum"><Check size={18} style={{color:'#10b981'}}/><div><b style={{color:'#6ee7b7'}}>{conectadas}</b><span>Plataformas Ativas</span></div></div>
        <div className="glass-panel ghi-sum"><AlertCircle size={18} style={{color:'#f59e0b'}}/><div><b style={{color:'#fcd34d'}}>{parciais}</b><span>Configuração Parcial</span></div></div>
        <div className="glass-panel ghi-sum"><X size={18} style={{color:'#9ca3af'}}/><div><b style={{color:'#9ca3af'}}>{desconectadas}</b><span>Desconectadas</span></div></div>
        <div className="glass-panel ghi-sum"><Globe size={18} style={{color:'#6366f1'}}/><div><b style={{color:'#a5b4fc'}}>{PLATAFORMAS.length}</b><span>Total Integrações</span></div></div>
      </div>

      {/* Cards de plataformas */}
      <div className="ghi-grid">
        {PLATAFORMAS.map(p => (
          <div key={p.id} className="glass-panel ghi-card" style={{ borderTop: `2px solid ${p.cor}` }}>
            <div className="ghi-card-header">
              <span style={{ fontSize:'2rem' }}>{p.logo}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{p.nome}</div>
                <StatusBadge status={p.status} />
              </div>
            </div>
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'10px 0', lineHeight:1.5 }}>{p.descricao}</p>
            {p.vendas_mes !== '—' && (
              <div className="ghi-stats">
                <div><span>{p.vendas_mes}</span><small>Vendas/mês</small></div>
                <div><span>{p.pedidos}</span><small>Pedidos</small></div>
                <div><span style={{fontSize:'0.68rem'}}>{p.ultima_sync.split(' ')[1] || '—'}</span><small>Última sync</small></div>
              </div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              {p.status === 'desconectado' ? (
                <button className="ghi-btn primary" style={{flex:1}} onClick={() => setPlatSel(p)}>
                  <Plug size={14}/> Conectar
                </button>
              ) : (
                <>
                  <button className="ghi-btn" style={{flex:1}} onClick={() => setPlatSel(p)}>
                    <Settings size={14}/> Configurar
                  </button>
                  <button className="ghi-btn success">
                    <RefreshCw size={14}/> Sync
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Log de webhooks */}
      <section className="glass-panel">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, paddingBottom:10, borderBottom:'1px solid var(--border-color)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:700, fontSize:'0.95rem' }}>
            <Zap size={18} style={{color:'#6366f1'}}/> Log de Webhooks Recentes
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 0 3px rgba(16,185,129,0.3)', animation:'pulse 1.5s infinite' }}/>
            <span style={{ fontSize:'0.75rem', color:'#6ee7b7' }}>Ao vivo</span>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="ghi-log-table">
            <thead>
              <tr><th>Timestamp</th><th>Plataforma</th><th>Evento</th><th>Status</th></tr>
            </thead>
            <tbody>
              {WEBHOOKS_LOG.map((log, i) => (
                <tr key={i}>
                  <td style={{ fontFamily:'monospace', fontSize:'0.8rem', color:'var(--text-muted)' }}>{log.ts}</td>
                  <td style={{ fontSize:'0.82rem' }}>{log.plataforma}</td>
                  <td style={{ fontFamily:'monospace', fontSize:'0.8rem', color:'#a5b4fc' }}>{log.evento}</td>
                  <td>
                    {log.status === 'ok'
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(16,185,129,0.2)', color:'#6ee7b7', padding:'2px 8px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}><Check size={11}/> 200 OK</span>
                      : <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(239,68,68,0.2)', color:'#fca5a5', padding:'2px 8px', borderRadius:20, fontSize:'0.72rem', fontWeight:700 }}><X size={11}/> Erro</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {platSel && <ConfigModal plat={platSel} onClose={() => setPlatSel(null)} />}

      <style>{`
        .ghi-wrap { display: flex; flex-direction: column; gap: 14px; }
        .ghi-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .ghi-sum { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .ghi-sum div { display: flex; flex-direction: column; }
        .ghi-sum b { font-size: 1.3rem; font-weight: 800; }
        .ghi-sum span { font-size: 0.72rem; color: var(--text-muted); }
        .ghi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .ghi-card { padding: 18px; display: flex; flex-direction: column; }
        .ghi-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .ghi-stats { display: flex; gap: 16px; margin-top: 8px; }
        .ghi-stats div { display: flex; flex-direction: column; }
        .ghi-stats span { font-weight: 700; font-size: 0.9rem; }
        .ghi-stats small { font-size: 0.68rem; color: var(--text-muted); }
        .ghi-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.06); color: white; font-size: 0.82rem; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .ghi-btn:hover { background: rgba(255,255,255,0.1); }
        .ghi-btn.primary { background: linear-gradient(135deg,#f59e0b,#ef4444); border-color: transparent; font-weight: 600; }
        .ghi-btn.success { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #6ee7b7; }
        .ghi-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghi-log-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
        .ghi-log-table th { text-align: left; padding: 8px 12px; background: rgba(0,0,0,0.2); color: var(--text-muted); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
        .ghi-log-table td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ghi-log-table tr:hover td { background: rgba(255,255,255,0.02); }
        .ghi-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ghi-modal { padding: 28px; width: 520px; max-width: 95vw; border-radius: 16px; }
        .ghi-tabs { display: flex; gap: 4px; margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
        .ghi-tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; background: none; border: none; color: var(--text-muted); font-size: 0.82rem; cursor: pointer; transition: 0.2s; }
        .ghi-tab.active { background: rgba(245,158,11,0.15); color: #fcd34d; }
        .ghi-form { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
        .ghi-field { display: flex; flex-direction: column; gap: 6px; }
        .ghi-field label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .ghi-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 0.85rem; }
        .ghi-input:focus { border-color: #f59e0b; }
        .ghi-icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 6px; display: flex; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:1100px){ .ghi-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:700px){ .ghi-grid{grid-template-columns:1fr;} .ghi-summary{grid-template-columns:repeat(2,1fr);} }
      `}</style>
    </div>
  );
}
