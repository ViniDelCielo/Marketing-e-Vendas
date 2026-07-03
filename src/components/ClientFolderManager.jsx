import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronRight, MessageCircle, FileBox, 
  Loader2, Building2, Megaphone, Target, Video, 
  Camera, Palette, Users, Users2, TrendingUp, Search, X 
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import FileManager from './FileManager';
import AttachedFilesModal from './AttachedFilesModal';
import ClientPipeline from './ClientPipeline';
import HandoffInbox from './HandoffInbox';
import DepartmentPipeline from './DepartmentPipeline';
import { useClients } from '../hooks/useClients';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import ErrorBoundary from './ErrorBoundary';

// Iniciais do nome para o avatar
const getInitials = (name = '') =>
  (name || '').split(' ').slice(0, 2).map(n => n?.[0] || '').join('').toUpperCase() || '?';

const STATUS_STYLES = {
  Ativo:        { color: '#34d399' },
  Inativo:      { color: '#9ca3af' },
  Configurando: { color: '#fcd34d' },
  Suspenso:     { color: '#f87171' },
};

const DEPARTMENTS = [
  { id: 'social-media', path: '/social-media', name: 'Social Media', icon: <Megaphone size={16} /> },
  { id: 'trafego',      path: '/trafego',      name: 'Tráfego Pago', icon: <Target size={16} /> },
  { id: 'edicao',       path: '/edicao',       name: 'Edição',       icon: <Video size={16} /> },
  { id: 'captacao',     path: '/captacao',     name: 'Captação',     icon: <Camera size={16} /> },
  { id: 'design',       path: '/designer',     name: 'Design',       icon: <Palette size={16} /> },
  { id: 'crm',          path: '/crm',          name: 'CRM',          icon: <Users size={16} /> },
  { id: 'comercial',    path: '/comercial',    name: 'Comercial',    icon: <TrendingUp size={16} /> },
  { id: 'acompanhamento', path: '/sucesso-do-cliente', name: 'Sucesso do Cliente', icon: <Megaphone size={16} /> },
  { id: 'kanban',       path: '/kanban',       name: 'Gestão de Tarefas', icon: <Target size={16} /> },
  { id: 'financeiro',   path: '/financeiro',   name: 'RH e Financeiro', icon: <Video size={16} /> },
];

export default function ClientFolderManager({ title, description, children }) {
  const { clients, loading: clientsLoading } = useClients();
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [assignedClientIds, setAssignedClientIds] = useState(null); // null = ainda carregando
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('clientes'); // 'clientes' | 'pipeline'
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mapa de tab id → nome do departamento (usado para filtrar assignments)
  const currentDeptName = DEPARTMENTS.find(d => d.path === location.pathname)?.name || title;

  // Use route path to determine the active tab
  const activeTab = DEPARTMENTS.find(d => d.path === location.pathname)?.id || 'social-media';
  
  const [clientServices, setClientServices] = useState([]);
  const [counts, setCounts] = useState({});
  const [loadingServices, setLoadingServices] = useState(true);

  // --- Notification System for Chat ---
  const { messages: chatMessages } = useChat(selectedClient?.id, DEPARTMENTS.find(d => d.id === activeTab)?.name || title);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    if (!selectedClient?.id || !chatMessages || chatMessages.length === 0) {
      setHasUnreadChat(false);
      return;
    }
    
    const storageKey = `last_chat_read_${selectedClient.id}`;
    
    if (isChatOpen) {
      // If chat is open, mark the latest message as read
      const latestMsg = chatMessages[chatMessages.length - 1];
      localStorage.setItem(storageKey, latestMsg.created_at);
      setHasUnreadChat(false);
    } else {
      // If chat is closed, check if there's a message newer than the last read
      const lastReadStr = localStorage.getItem(storageKey);
      if (!lastReadStr) {
        setHasUnreadChat(true); // Never opened before but has messages
      } else {
        const lastReadTime = new Date(lastReadStr).getTime();
        const latestMsgTime = new Date(chatMessages[chatMessages.length - 1].created_at).getTime();
        setHasUnreadChat(latestMsgTime > lastReadTime);
      }
    }
  }, [chatMessages, isChatOpen, selectedClient?.id]);
  // ------------------------------------

  // Fetch all active client services to build counts and filters
  useEffect(() => {
    async function fetchAllServices() {
      setLoadingServices(true);
      try {
        const { data, error } = await supabase
          .from('client_services')
          .select('client_id, service_id')
          .eq('status', 'active');
        
        if (!error && data) {
          setClientServices(data);
          const newCounts = {};
          data.forEach(item => {
            newCounts[item.service_id] = (newCounts[item.service_id] || 0) + 1;
          });
          setCounts(newCounts);
        }
      } catch (err) {
        console.error("Erro ao buscar client_services:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchAllServices();

    // Listen for real-time changes on client_services
    const channelId = `client_services_changes_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_services' }, () => {
        fetchAllServices();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Para colaboradores (role=employee): busca os clientes atribuídos a eles neste departamento
  useEffect(() => {
    if (!user) return;
    // Admins e owners veem todos → null = sem restrição
    if (user.role === 'owner' || user.role === 'admin') {
      setAssignedClientIds(null);
      return;
    }
    // Colaboradores: filtra por employee_client_assignments
    if (user.role === 'employee' && user.employeeId) {
      let query = supabase
        .from('employee_client_assignments')
        .select('client_id')
        .eq('employee_id', user.employeeId);
        
      if (currentDeptName !== 'Sucesso do Cliente') {
         query = query.eq('department', currentDeptName);
      }

      query.then(({ data }) => {
        setAssignedClientIds(data ? data.map(a => a.client_id) : []);
      });
    } else if (user.role === 'client' && user.clientUuid) {
      // Cliente: vê apenas o seu próprio ID
      setAssignedClientIds([user.clientUuid]);
    } else {
      // Outros: sem acesso
      setAssignedClientIds([]);
    }
  }, [user, currentDeptName]);

  // Auto-select client from URL query param (?client=ID) or if it's a client user
  useEffect(() => {
    if (!clientsLoading && clients.length > 0) {
      if (user?.role === 'client' && user?.clientUuid) {
        const myClient = clients.find(c => c.id === user.clientUuid);
        if (myClient && (!selectedClient || selectedClient.id !== myClient.id)) {
          setSelectedClient(myClient);
        }
        return;
      }

      const params = new URLSearchParams(location.search);
      const clientId = params.get('client');
      if (clientId && (!selectedClient || selectedClient.id !== clientId)) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
          setSelectedClient(client);
          if (params.get('openChat') === 'true') {
            setIsChatOpen(true);
            navigate(location.pathname + '?client=' + clientId, { replace: true });
          }
        }
      } else if (selectedClient && params.get('openChat') === 'true') {
         setIsChatOpen(true);
         navigate(location.pathname + '?client=' + selectedClient.id, { replace: true });
      }
    }
  }, [location.search, clients, clientsLoading, selectedClient, user, navigate]);

  // Intercepta botão voltar mobile do MainLayout para fechar pasta ao invés de voltar aba
  useEffect(() => {
    const handleMobileBack = (e) => {
      if (selectedClient) {
        e.preventDefault();
        if (isChatOpen) {
          setIsChatOpen(false);
        } else if (isFilesModalOpen) {
          setIsFilesModalOpen(false);
        } else {
          setSelectedClient(null);
          const params = new URLSearchParams(location.search);
          if (params.has('client')) {
            params.delete('client');
            navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
          }
        }
      }
    };
    window.addEventListener('mobile-back-btn-pressed', handleMobileBack);
    return () => window.removeEventListener('mobile-back-btn-pressed', handleMobileBack);
  }, [selectedClient, isChatOpen, isFilesModalOpen, location.pathname, location.search, navigate]);

  // Filtro de clientes para os departamentos
  const filteredClients = clients.filter(client => {
    // 1. O cliente TEM que estar na base da Agência
    if (client.metadata?.show_in_agency !== true) return false;

    // 2. O cliente TEM que ter o serviço/departamento habilitado na aba Serviços (se for um departamento de serviço)
    // Departamentos que operam como serviços contratados:
    const isServiceDept = ['social-media', 'trafego', 'edicao', 'captacao', 'design'].includes(activeTab);
    if (isServiceDept && !loadingServices) {
      const hasService = clientServices.some(cs => cs.client_id === client.id && cs.service_id === activeTab);
      if (!hasService) return false;
    }

    // 3. Se assignedClientIds é null → admin/owner, vê todos (que passaram nas regras acima)
    if (assignedClientIds === null) return true;
    
    // 4. Colaborador: só vê clientes atribuídos a ele
    return assignedClientIds.includes(client.id);
  });

  // Aplica busca por texto
  const q = searchQuery.trim().toLowerCase();
  const visibleClients = q
    ? filteredClients.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.metadata?.display_name || '').toLowerCase().includes(q)
      )
    : filteredClients;

  if (selectedClient) {
    return (
      <div className="client-folder-wrapper" style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, overflow: 'hidden' }}>
        <header className="dept-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap' }}>
          {user?.role !== 'client' && (
            <button
              onClick={() => setSelectedClient(null)}
              className="back-btn glass-card"
              style={{ padding: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none', color: 'var(--text-main)', background: 'rgba(255,255,255,0.05)' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="client-header-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: selectedClient.avatar_color || '#6366f1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: '1rem',
              overflow: 'hidden'
            }}>
              {selectedClient.avatar_url ? (
                <img src={selectedClient.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(selectedClient.metadata?.display_name || selectedClient.name)
              )}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedClient.metadata?.display_name || selectedClient.name} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>— {DEPARTMENTS.find(d => d.id === activeTab)?.name || title}</span>
              </h1>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Painel Setorial
              </p>
            </div>
          </div>
          <div className="dept-action-btns" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => setIsFilesModalOpen(true)}
              className="glass-btn files-btn"
              style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '7px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              <FileBox size={16} /> <span className="files-btn-text">Arquivos Anexados</span>
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: '12px', width: '100%', minWidth: 0 }}>
          <ErrorBoundary>
            {DEPARTMENTS.find(d => d.id === activeTab)?.name && (
              <HandoffInbox client={selectedClient} currentDepartment={DEPARTMENTS.find(d => d.id === activeTab).name} />
            )}
            {typeof children === 'function' ? children(selectedClient) : children}
            <FileManager client={selectedClient} title={`Anexos e Entregáveis — ${DEPARTMENTS.find(d => d.id === activeTab)?.name || title}`} />
          </ErrorBoundary>
        </div>

        {isChatOpen && (
          <ChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            departmentName={DEPARTMENTS.find(d => d.id === activeTab)?.name || title}
            client={selectedClient}
          />
        )}

        {isFilesModalOpen && (
          <AttachedFilesModal
            isOpen={isFilesModalOpen}
            onClose={() => setIsFilesModalOpen(false)}
            departmentName={DEPARTMENTS.find(d => d.id === activeTab)?.name || title}
            client={selectedClient}
          />
        )}

        <style>{`
          @media (max-width: 600px) {
            .client-header-info { display: none !important; }
            .back-btn { display: none !important; }
            .dept-header { justify-content: flex-end !important; }
            .dept-action-btns { margin-left: 0 !important; justify-content: flex-end; }
            .files-btn-text { display: inline !important; }
            .files-btn { justify-content: center; border-radius: 12px !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="client-folder-wrapper" style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, overflow: 'hidden' }}>
        <header className="dept-header" style={{ flexShrink: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0 }}>{DEPARTMENTS.find(d => d.id === activeTab)?.name || title}</h1>
              <p style={{ margin: 0, marginTop: 4, color: 'var(--text-muted)' }}>Abaixo estão os clientes ativos vinculados a este setor.</p>
            </div>
            
            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
              <button 
                onClick={() => setActiveView('clientes')}
                style={{ 
                  background: activeView === 'clientes' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeView === 'clientes' ? '#818cf8' : 'var(--text-muted)',
                  border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <Building2 size={16} /> Pastas de Clientes
              </button>
              <button 
                onClick={() => setActiveView('pipeline')}
                style={{ 
                  background: activeView === 'pipeline' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: activeView === 'pipeline' ? '#818cf8' : 'var(--text-muted)',
                  border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <Target size={16} /> Pipeline Global
              </button>
            </div>
          </div>
          {!clientsLoading && !loadingServices && filteredClients.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '8px 16px', borderRadius: '12px' }}>
              <Users2 size={18} className="text-primary" />
              <strong style={{ color: 'var(--text-main)' }}>{visibleClients.length}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {q ? `resultado${visibleClients.length !== 1 ? 's' : ''}` : 'Clientes Ativos'}
              </span>
            </div>
          )}
        </div>

        {/* ── Barra de pesquisa ── */}
        {activeView === 'clientes' && (
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nome, empresa ou e-mail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 36px 10px 40px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </header>

      {/* ─── Área scrollável com a lista de clientes ─────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, paddingBottom: 24 }}>
        {activeView === 'pipeline' ? (
          <div style={{ width: '100%', height: '100%' }}>
            <DepartmentPipeline 
              client={{ id: 'ALL', name: 'Global' }} 
              departmentName={currentDeptName} 
              globalClients={filteredClients} 
            />
          </div>
        ) : (clientsLoading || loadingServices) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
            Carregando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <Building2 size={48} style={{ opacity: 0.3 }} />
            <p>Nenhum cliente ativo neste setor.<br />Acesse a Área Administrativa para liberar serviços.</p>
          </div>
        ) : visibleClients.length === 0 && q ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <Search size={40} style={{ opacity: 0.3 }} />
            <p>Nenhum cliente encontrado para <strong style={{ color: 'var(--text-main)' }}>"{searchQuery}"</strong></p>
          </div>
        ) : (
          <div className="folders-grid">
            {visibleClients.map(client => {
              const st = STATUS_STYLES[client.status] || STATUS_STYLES.Ativo;
              const displayName = client.metadata?.display_name || client.name;
              return (
                <div
                  key={client.id}
                  className={`folder-card ${selectedClient?.id === client.id ? 'active' : ''}`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: client.avatar_color || '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: 'white', fontSize: '1.1rem',
                    overflow: 'hidden'
                  }}>
                    {client.avatar_url ? (
                      <img src={client.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  <div className="folder-info" style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</h3>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.metadata?.display_name ? client.name : (client.segment || 'Sem empresa definida')}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                      Responsável: <strong>{client.metadata?.manager || <span style={{color: 'var(--text-muted)', fontWeight: 400}}>Não atribuído</span>}</strong>
                    </p>
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>
                      Status: <span style={{ color: st.color, fontWeight: 600 }}>{client.status}</span>
                    </p>
                  </div>
                  <div className="folder-action" style={{ opacity: 0.3, transition: '0.3s', color: 'var(--text-main)' }}>
                    <ChevronRight size={24} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .folders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          margin-top: 8px;
        }
        .folder-card {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
        }
        .folder-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.15);
          border-left-color: var(--primary);
          background: rgba(255,255,255,0.03);
        }
        .folder-card:hover .folder-action {
          opacity: 1 !important;
          transform: translateX(4px);
          color: var(--primary) !important;
        }
        .dept-tab:hover {
          background: rgba(255,255,255,0.05) !important;
          color: var(--text-main) !important;
        }
        .dept-tab.active:hover {
          background: rgba(99, 102, 241, 0.3) !important;
        }
        .back-btn:hover { background: rgba(255,255,255,0.1) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .client-header-info { display: none !important; }
          .back-btn { display: none !important; }
          .dept-header { justify-content: flex-end !important; }
          .dept-action-btns { margin-left: 0 !important; justify-content: flex-end; }
          .files-btn-text { display: inline !important; }
          .files-btn { justify-content: center; border-radius: 12px !important; }
        }
      `}</style>
      </div>
    </ErrorBoundary>
  );
}
