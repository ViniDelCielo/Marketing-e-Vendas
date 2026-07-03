import { useState, useEffect } from 'react';
import { Search, Plus, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Contratos = () => {
  const [subTab, setSubTab] = useState('clientes'); // clientes | colaboradores

  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Somente clientes ativos da agência (show_in_agency = true e status = Ativo)
      const { data: cData } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'Ativo')
        .order('name');

      // Somente colaboradores (tabela employees)
      const { data: eData } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      // Filtra em memória também para garantir show_in_agency = true
      if (cData) setClients(cData.filter(c => c.metadata?.show_in_agency === true));
      if (eData) setEmployees(eData);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="contratos-tabs">
      <div className="sub-tabs-header">
        <div className="sub-tab-actions">
          <button 
            className={'sub-tab-btn ' + (subTab === 'clientes' ? 'active' : '')}
            onClick={() => setSubTab('clientes')}
          >
            Contratos de Clientes
          </button>
          <button 
            className={'sub-tab-btn ' + (subTab === 'colaboradores' ? 'active' : '')}
            onClick={() => setSubTab('colaboradores')}
          >
            Contratos de Colaboradores
          </button>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input type="text" placeholder="Buscar contratos..." />
          </div>
          <button className="btn-primary">
            <Plus size={18} /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="card-panel">
        <h3 className="section-title">
          {subTab === 'clientes' ? 'Lista de Contratos - Clientes' : 'Lista de Contratos - Colaboradores'}
        </h3>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              {subTab === 'clientes' ? (
                <tr>
                  <th>Cliente</th>
                  <th>Data de Início</th>
                  <th>Valor Mensal</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              ) : (
                <tr>
                  <th>Colaborador</th>
                  <th>Data de Início</th>
                  <th>Modalidade (PJ/CLT)</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Carregando dados...</td></tr>
              ) : subTab === 'clientes' ? (
                clients.length > 0 ? clients.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>
                        {c.metadata?.display_name || c.name}
                      </span>
                    </td>
                    <td>{c.start_date || '-'}</td>
                    <td>{c.monthly_value ? `R$ ${c.monthly_value}` : '-'}</td>
                    <td><span className={"status-badge " + (c.contract_url ? "success" : "pending")}>{c.contract_url ? 'Assinado' : 'Pendente'}</span></td>
                    <td>
                      {c.contract_url ? (
                        <>
                          <a href={c.contract_url} target="_blank" rel="noopener noreferrer" className="action-icn" title="Ver Arquivo"><FileText size={16} /></a>
                          <a href={c.contract_url} download className="action-icn" title="Baixar"><Download size={16} /></a>
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                )) : <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum contrato de cliente</td></tr>
              ) : (
                employees.length > 0 ? employees.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.hired_at || '-'}</td>
                    <td>{c.position || '-'}</td>
                    <td><span className={"status-badge " + (c.contract_url ? "success" : "pending")}>{c.contract_url ? 'Assinado' : 'Pendente'}</span></td>
                    <td>
                      {c.contract_url ? (
                        <>
                          <a href={c.contract_url} target="_blank" rel="noopener noreferrer" className="action-icn" title="Ver Arquivo"><FileText size={16} /></a>
                          <a href={c.contract_url} download className="action-icn" title="Baixar"><Download size={16} /></a>
                        </>
                      ) : '-'}
                    </td>
                  </tr>
                )) : <tr><td colSpan="5" style={{ textAlign: 'center' }}>Nenhum contrato de colaborador</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .contratos-tabs {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .sub-tabs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }

        .sub-tab-actions {
          display: flex;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 4px;
          gap: 2px;
        }

        .sub-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .sub-tab-btn.active {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
        }

        .sub-tab-btn:hover:not(.active) {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
        }

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-shrink: 0;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-box input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px 8px 34px;
          color: var(--text-main);
          outline: none;
          font-size: 0.85rem;
          width: 180px;
          transition: border-color 0.2s, width 0.2s;
        }

        .search-box input:focus {
          border-color: rgba(99, 102, 241, 0.5);
          width: 220px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity 0.2s;
        }

        .btn-primary:hover { opacity: 0.9; }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .data-table th, .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          color: var(--text-main);
          font-size: 0.9rem;
        }

        .data-table th {
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .action-icn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          margin-right: 8px;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
        }

        .action-icn:hover { color: var(--primary); }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.78rem;
          font-weight: 700;
          display: inline-block;
        }

        .status-badge.success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
        .status-badge.pending { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

        @media (max-width: 768px) {
          /* Header em duas linhas no mobile */
          .sub-tabs-header {
            flex-direction: column;
            align-items: stretch;
          }

          /* Tabs ocupam toda a largura, texto menor */
          .sub-tab-actions {
            width: 100%;
            justify-content: stretch;
          }
          .sub-tab-btn {
            flex: 1;
            text-align: center;
            font-size: 0.75rem;
            padding: 7px 4px;
          }

          /* Ações em linha: busca flex-1 + botão fixo */
          .header-actions {
            width: 100%;
            justify-content: stretch;
          }
          .search-box {
            flex: 1;
          }
          .search-box input {
            width: 100%;
            min-width: 0;
          }
          .search-box input:focus {
            width: 100%;
          }

          /* Tabela com scroll local */
          .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            border-radius: 8px;
          }
          .table-responsive table {
            min-width: 480px;
          }
        }
      `}</style>
    </div>
  );
};

export default Contratos;
