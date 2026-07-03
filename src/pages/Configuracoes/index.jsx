import { useState } from 'react';
import { Settings, Users, Building2, Clock, BarChart2, Paintbrush, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Funcionarios from '../Administrativo/Funcionarios';
import Clientes from '../Administrativo/Clientes';
import ClientSLAs from './ClientSLAs';
import ManagerArea from './ManagerArea';

export default function Configuracoes() {
  const { user, isGestor, hasService } = useAuth();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';
  const canManageLogins = isAdmin || user?.can_manage_logins || hasService('financeiro');
  const isAnyGestor = isGestor();
  
  const isFinanceiroOnly = !isAdmin && !isAnyGestor && hasService('financeiro');

  const [activeTab, setActiveTab] = useState(isFinanceiroOnly ? 'colaboradores' : 'gestor');
  const [editMode, setEditMode]   = useState(null); // { type: 'employee' | 'client', data: any }

  const handleStartEdit = (type, data) => {
    setEditMode({ type, data });
    setActiveTab('editar');
  };

  const handleCancelEdit = () => {
    const prevTab = editMode?.type === 'employee' ? 'colaboradores' : 'clientes';
    setEditMode(null);
    setActiveTab(prevTab);
  };

  // Garantir que temos o perfil antes de renderizar os controles dependentes de role
  if (!user || !user.role) {
    return (
      <div className="loading-state">
        <Loader2 size={32} className="spin" />
        <span>Carregando permissões...</span>
      </div>
    );
  }

  return (
    <div className="configuracoes-page">
      <header className="page-header">
        <div>
          <h1><Settings size={28} style={{ verticalAlign: 'middle', marginRight: 10 }} /> Configurações Gerais</h1>
          <p>Central de configurações: gerencie acessos, prazos e personalize a aparência do sistema.</p>
        </div>
      </header>

      <nav className="main-config-nav">
        {!isFinanceiroOnly && (
          <>
            <button 
              className={`nav-tab ${activeTab === 'gestor' ? 'active' : ''}`}
              onClick={() => { setActiveTab('gestor'); setEditMode(null); }}
            >
              <BarChart2 size={18} /> <span>Área do Gestor</span>
            </button>

            <button 
              className={`nav-tab ${activeTab === 'slas' ? 'active' : ''}`}
              onClick={() => { setActiveTab('slas'); setEditMode(null); }}
            >
              <Clock size={18} /> <span>Prazos e SLAs</span>
            </button>


          </>
        )}

        {canManageLogins && (
          <>
            <button 
              className={`nav-tab ${activeTab === 'colaboradores' ? 'active' : ''}`}
              onClick={() => { setActiveTab('colaboradores'); setEditMode(null); }}
            >
              <Users size={18} /> <span>Colaboradores</span>
            </button>

            <button 
              className={`nav-tab ${activeTab === 'clientes' ? 'active' : ''}`}
              onClick={() => { setActiveTab('clientes'); setEditMode(null); }}
            >
              <Building2 size={18} /> <span>Clientes</span>
            </button>
          </>
        )}
        
        {editMode && (
          <button 
            className="nav-tab editing"
            onClick={() => setActiveTab('editar')}
          >
            <Settings size={18} className="spin" /> 
            <span>Editando</span>
          </button>
        )}
      </nav>

      <div className="config-content">
        {activeTab === 'gestor' && (
          <ManagerArea />
        )}
        {activeTab === 'colaboradores' && (
          <Funcionarios 
            inConfigMode={true} 
            onExternalEdit={(emp) => handleStartEdit('employee', emp)} 
          />
        )}
        {activeTab === 'clientes' && (
          <Clientes 
            inConfigMode={true} 
            onExternalEdit={(cli) => handleStartEdit('client', cli)} 
          />
        )}
        {activeTab === 'slas' && (
          <ClientSLAs />
        )}

        {activeTab === 'editar' && editMode && (
          <div className="edit-view-container glass-card">
            {editMode.type === 'employee' ? (
              <Funcionarios 
                inConfigMode={true} 
                initialEditMode={editMode.data} 
                onCloseEdit={handleCancelEdit}
              />
            ) : (
              <Clientes 
                inConfigMode={true} 
                initialEditMode={editMode.data} 
                onCloseEdit={handleCancelEdit}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        .configuracoes-page {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          min-height: 100%;
        }
        .page-header h1 {
          margin: 0 0 6px;
          font-size: 1.85rem;
          color: var(--text-main);
          font-weight: 800;
          display: flex;
          align-items: center;
        }
        .page-header p {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .main-config-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .nav-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: var(--text-muted);
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-tab:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-main);
          transform: translateY(-2px);
        }

        .nav-tab.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          color: #a5b4fc;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
        }

        .nav-tab.editing {
          background: rgba(245, 158, 11, 0.1);
          border-color: #f59e0b;
          color: #fcd34d;
        }

        .edit-view-container {
          padding: 24px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .config-content {
          animation: fadeIn 0.3s ease;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Adjustments for nested padding inside tabs */
        .config-content .func-page,
        .config-content .clientes-page {
          padding: 0 !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 16px;
          color: var(--text-muted);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
