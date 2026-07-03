import { useState } from 'react';
import { Building2, UserCheck } from 'lucide-react';
import Clientes from './Clientes';
import Funcionarios from './Funcionarios';

const Administrativo = () => {
  const [activeTab, setActiveTab] = useState('clientes');

  const renderContent = () => {
    switch (activeTab) {
      case 'clientes':     return <Clientes />;
      case 'funcionarios': return <Funcionarios />;
      default: return <Clientes />;
    }
  };

  const tabs = [
    { id: 'clientes',     label: 'Clientes',        icon: <Building2 size={17}/> },
    { id: 'funcionarios', label: 'Colaboradores',    icon: <UserCheck size={17}/> },
  ];

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Cadastro de Clientes e Colaboradores</h1>
        <p>Área de gestão de acessos e registros internos.</p>
      </header>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>

      <style>{`
        .admin-container {
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }
        .admin-header h1 {
          margin: 0 0 4px;
          color: var(--text-main);
          font-size: 1.6rem;
          font-weight: 800;
        }
        .admin-header p { margin: 0; color: var(--text-muted); font-size: 0.88rem; }
        .admin-tabs {
          display: flex; gap: 4px;
          border-bottom: 2px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
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
          margin-bottom: -2px;
        }
        .tab-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-main); }
        .tab-btn.active {
          color: #a5b4fc;
          border-bottom-color: #6366f1;
          background: rgba(99,102,241,0.08);
        }
        .admin-content {
          flex: 1;
          overflow-y: auto;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Administrativo;
