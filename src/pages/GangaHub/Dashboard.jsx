// GangaHub/Dashboard.jsx — Visão geral do e-commerce
import { ShoppingBag, TrendingUp, Package, Truck, RotateCcw, DollarSign, Star, AlertTriangle } from 'lucide-react';

const KPI = ({ label, value, sub, color, icon }) => (
  <div className="ghd-kpi glass-panel">
    <div className="ghd-kpi-icon" style={{ background: color + '22', color }}>{icon}</div>
    <div>
      <div className="ghd-kpi-value" style={{ color }}>{value}</div>
      <div className="ghd-kpi-label">{label}</div>
      {sub && <div className="ghd-kpi-sub">{sub}</div>}
    </div>
  </div>
);

const ALERTS = [
  { msg: '3 produtos com estoque crítico (≤ 5 un.)', color: '#ef4444' },
  { msg: '2 devoluções pendentes de análise',          color: '#f59e0b' },
  { msg: 'Mercado Livre: pedido #ML-8821 atrasado',    color: '#f59e0b' },
  { msg: 'Pagamento #PAY-441 aguardando confirmação',  color: '#6366f1' },
];

const TOP_PRODUCTS = [
  { name: 'Creator Studio RGB',        sales: 142, revenue: 'R$ 42.600', plat: 'ML + TikTok' },
  { name: 'LapelWave Pro',             sales: 97,  revenue: 'R$ 19.400', plat: 'ML + Shopify' },
  { name: 'ProPrompt Teleprompter',    sales: 63,  revenue: 'R$ 15.750', plat: 'TikTok' },
  { name: 'Kit Creator AI Pro',        sales: 48,  revenue: 'R$ 28.800', plat: 'Shopify' },
  { name: 'Chroma Mini LED',           sales: 211, revenue: 'R$ 12.660', plat: 'ML + TikTok' },
];

const PLATFORM_SPLIT = [
  { name: 'Mercado Livre', pct: 48, color: '#f59e0b', revenue: 'R$ 68.400' },
  { name: 'TikTok Shop',   pct: 31, color: '#3b82f6', revenue: 'R$ 44.100' },
  { name: 'Shopify/Site',  pct: 21, color: '#10b981', revenue: 'R$ 29.900' },
];

export default function GangaHubDashboard() {
  return (
    <div className="ghd-wrap">
      {/* KPIs */}
      <div className="ghd-kpis">
        <KPI label="Faturamento Mensal"    value="R$ 142.400" sub="+18% vs mês anterior" color="#10b981" icon={<DollarSign size={22}/>} />
        <KPI label="Pedidos no Mês"        value="561"        sub="Média 18/dia"           color="#6366f1" icon={<ShoppingBag size={22}/>} />
        <KPI label="Ticket Médio"          value="R$ 253,83"  sub="Meta R$280"             color="#3b82f6" icon={<TrendingUp size={22}/>} />
        <KPI label="Produtos em Estoque"   value="1.247 un."  sub="38 SKUs ativos"         color="#f59e0b" icon={<Package size={22}/>} />
        <KPI label="Entregas em Andamento" value="86"         sub="12 atrasadas"           color="#8b5cf6" icon={<Truck size={22}/>} />
        <KPI label="Devoluções no Mês"     value="14"         sub="2,5% da base"           color="#ef4444" icon={<RotateCcw size={22}/>} />
        <KPI label="Avaliação Média"       value="4.87 ★"    sub="1.204 avaliações"       color="#f59e0b" icon={<Star size={22}/>} />
        <KPI label="Alertas Ativos"        value="4"          sub="Requer atenção"         color="#ef4444" icon={<AlertTriangle size={22}/>} />
      </div>

      <div className="ghd-row2">
        {/* Alertas */}
        <section className="glass-panel ghd-alerts">
          <div className="ghd-section-title"><AlertTriangle size={18} style={{color:'#ef4444'}}/> Alertas & Pendências</div>
          {ALERTS.map((a, i) => (
            <div key={i} className="ghd-alert-item" style={{ borderLeftColor: a.color }}>
              <span style={{ color: a.color }}>●</span> {a.msg}
            </div>
          ))}
        </section>

        {/* Split de plataformas */}
        <section className="glass-panel ghd-platforms">
          <div className="ghd-section-title"><ShoppingBag size={18} style={{color:'#6366f1'}}/> Receita por Plataforma</div>
          {PLATFORM_SPLIT.map(p => (
            <div key={p.name} className="ghd-plat-row">
              <span>{p.name}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.revenue}</span>
              <div className="ghd-bar-bg">
                <div style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
              <span style={{ color: p.color, fontSize: '0.75rem' }}>{p.pct}%</span>
            </div>
          ))}
        </section>
      </div>

      {/* Top produtos */}
      <section className="glass-panel">
        <div className="ghd-section-title"><TrendingUp size={18} style={{color:'#10b981'}}/> Top Produtos do Mês</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ghd-table">
            <thead>
              <tr>
                <th>#</th><th>Produto</th><th>Vendas</th><th>Receita</th><th>Plataformas</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PRODUCTS.map((p, i) => (
                <tr key={p.name}>
                  <td style={{ color: '#fcd34d', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.sales} un.</td>
                  <td style={{ color: '#6ee7b7', fontWeight: 700 }}>{p.revenue}</td>
                  <td><span className="ghd-tag">{p.plat}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .ghd-wrap { display: flex; flex-direction: column; gap: 14px; }
        .ghd-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .ghd-kpi { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .ghd-kpi-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ghd-kpi-value { font-size: 1.25rem; font-weight: 800; line-height: 1; }
        .ghd-kpi-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
        .ghd-kpi-sub { font-size: 0.68rem; color: var(--text-muted); opacity: 0.7; margin-top: 1px; }
        .ghd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ghd-section-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.95rem; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
        .ghd-alerts { padding: 16px; }
        .ghd-alert-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px; border-left: 3px solid; border-radius: 0 6px 6px 0; background: rgba(0,0,0,0.2); font-size: 0.83rem; }
        .ghd-platforms { padding: 16px; }
        .ghd-plat-row { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; margin-bottom: 12px; font-size: 0.84rem; }
        .ghd-bar-bg { grid-column: 1 / -1; height: 5px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
        .ghd-bar-bg > div { height: 100%; border-radius: 4px; transition: width 0.6s; }
        .ghd-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .ghd-table th { text-align: left; padding: 8px 12px; background: rgba(0,0,0,0.2); color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .ghd-table td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); }
        .ghd-table tr:hover td { background: rgba(255,255,255,0.03); }
        .ghd-tag { background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        @media(max-width:1100px){ .ghd-kpis{grid-template-columns:repeat(2,1fr);} .ghd-row2{grid-template-columns:1fr;} }
        @media(max-width:768px){ 
          .ghd-kpis{grid-template-columns:1fr;} 
          .ghd-kpi { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>
    </div>
  );
}
