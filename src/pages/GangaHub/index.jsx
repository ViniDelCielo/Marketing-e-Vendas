import { useState } from 'react';
import GangaHubDashboard  from './Dashboard';
import GangaHubEstoque    from './Estoque';
import GangaHubFinanceiro from './Financeiro';
import GangaHubEntregas   from './Entregas';
import GangaHubDevolucoes from './Devolucoes';
import GangaHubIntegracoes from './Integracoes';
import GangaHubRelatorios  from './Relatorios';
import {
  LayoutDashboard, Package, DollarSign, Truck,
  RotateCcw, Plug, ChevronRight, FileText
} from 'lucide-react';

const TABS = [
  { id: 'dashboard',    label: 'Visão Geral',         icon: <LayoutDashboard size={16} />, component: GangaHubDashboard  },
  { id: 'estoque',      label: 'Estoque',              icon: <Package size={16} />,         component: GangaHubEstoque    },
  { id: 'financeiro',   label: 'Financeiro',           icon: <DollarSign size={16} />,      component: GangaHubFinanceiro },
  { id: 'entregas',     label: 'Entregas',             icon: <Truck size={16} />,           component: GangaHubEntregas   },
  { id: 'devolucoes',   label: 'Devoluções',           icon: <RotateCcw size={16} />,       component: GangaHubDevolucoes },
  { id: 'integracoes',  label: 'Integrações & APIs',   icon: <Plug size={16} />,            component: GangaHubIntegracoes },
  { id: 'relatorios',   label: 'Relatórios',           icon: <FileText size={16} />,        component: GangaHubRelatorios },
];

const GangaHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const Active = TABS.find(t => t.id === activeTab)?.component || GangaHubDashboard;

  return (
    <div className="gh-root">
      {/* ── Header da seção ── */}
      <div className="gh-header glass-panel">
        <div className="gh-brand">
          <div className="gh-logo">
            <span>G</span>
          </div>
          <div>
            <h1 className="gh-title">Ganga Hub</h1>
            <p className="gh-subtitle">Gestão Completa de E-commerce • Produtos da China</p>
          </div>
        </div>
        <div className="gh-breadcrumb">
          <span>Ganga Hub</span>
          <ChevronRight size={14} />
          <span style={{ color: '#a5b4fc' }}>{TABS.find(t => t.id === activeTab)?.label}</span>
        </div>
      </div>

      {/* ── Sub-navegação ── */}
      <div className="gh-tabnav glass-panel">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`gh-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Conteúdo da aba ── */}
      <div className="gh-content">
        <Active />
      </div>

      <style>{`
        .gh-root {
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          overflow-y: auto;
          padding-bottom: 16px;
        }
        .gh-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          flex-shrink: 0;
        }
        .gh-brand { display: flex; align-items: center; gap: 14px; }
        .gh-logo {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; font-weight: 900; color: white;
          flex-shrink: 0;
        }
        .gh-title { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text-main); }
        .gh-subtitle { margin: 0; font-size: 0.75rem; color: var(--text-muted); }
        .gh-breadcrumb {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; color: var(--text-muted);
        }
        .gh-tabnav {
          display: flex; gap: 4px; padding: 8px 12px;
          overflow-x: auto; flex-shrink: 0;
        }
        .gh-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 8px;
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 0.82rem;
          font-weight: 500; white-space: nowrap; flex-shrink: 0;
          transition: all 0.2s;
        }
        .gh-tab:hover { background: rgba(255,255,255,0.06); color: var(--text-main); }
        .gh-tab.active {
          background: rgba(245,158,11,0.15);
          color: #fcd34d;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .gh-content { flex: 1; }
        
        @media (max-width: 768px) {
          .gh-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .gh-breadcrumb { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
};

export default GangaHub;
