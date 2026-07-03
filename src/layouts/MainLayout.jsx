import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Megaphone, Target, Video, Camera,
  Palette, Users, TrendingUp, Headphones, LogOut,
  Kanban, DollarSign, MessageSquare, Shield, Paintbrush,
  Menu, X, Package, Settings, Bell, HelpCircle, Cloud, Calendar, CalendarDays, PanelLeftClose, PanelLeftOpen,
  Globe, Tv, UserCheck, Trash2, ShieldCheck, ArrowLeft, ClipboardList, Compass
} from 'lucide-react';
import HelpCenter from '../components/HelpCenter';
import TrainingEbook from '../components/ebook/TrainingEbook';
import PushPermissionBanner from '../components/PushPermissionBanner';
import UserSettingsModal from '../components/UserSettingsModal';
import { sendPushToCurrentUser, getNotificationPermission, subscribeToPush } from '../services/pushService';

// Mapa de todos os itens de navegação com o service_id correspondente
const ALL_NAV = [
  { type: 'header', name: 'VISÃO GERAL' },
  { name: 'Painel Geral', path: '/', icon: <LayoutDashboard size={18} />, service: null, ownerOnly: false },
  { name: 'Kanban Global', path: '/kanban', icon: <Kanban size={18} />, service: null, managerAccessible: true, employeeOnly: true },

  { type: 'header', name: 'DEPARTAMENTOS' },
  { name: 'Prospecção Ativa', path: '/prospeccao-ativa', icon: <Compass size={18} />, service: 'prospeccao-ativa', ownerOnly: false },
  { name: 'Captação', path: '/captacao', icon: <Camera size={18} />, service: 'captacao', ownerOnly: false },
  { name: 'Edição', path: '/edicao', icon: <Video size={18} />, service: 'edicao', ownerOnly: false },
  { name: 'Social Media', path: '/social-media', icon: <Megaphone size={18} />, service: 'social-media', ownerOnly: false },
  { name: 'Design', path: '/design', icon: <Palette size={18} />, service: 'design', ownerOnly: false },
  { name: 'CRM', path: '/crm', icon: <Users size={18} />, service: 'crm', ownerOnly: false, employeeOnly: true },
  { name: 'Comercial', path: '/comercial', icon: <TrendingUp size={18} />, service: 'comercial', ownerOnly: false, employeeOnly: true },
  { name: 'Sucesso do Cliente', path: '/sucesso-do-cliente', icon: <Headphones size={18} />, service: 'acompanhamento', ownerOnly: false, employeeOnly: true },
  { name: 'Tráfego Pago', path: '/trafego', icon: <Target size={18} />, service: 'trafego', ownerOnly: false },
  { name: 'Ganga Hub', path: '/ganga-hub', icon: <Package size={18} />, service: 'ganga-hub', ownerOnly: false, employeeOnly: true },
  { name: 'RH e Financeiro', path: '/financeiro', icon: <DollarSign size={18} />, service: 'financeiro', ownerOnly: false },

  { type: 'header', name: 'GESTÃO', managerOnly: true, employeeOnly: true },
  { name: 'Configurações Gerais', path: '/configuracoes', icon: <Settings size={18} />, service: null, managerAccessible: true, employeeOnly: true },
  { name: 'Cadastro de Clientes e Colaboradores', path: '/administrativo', icon: <UserCheck size={18} />, service: null, managerAccessible: true, employeeOnly: true },
  { name: 'Conectividade de APIs', path: '/conectividade-apis', icon: <Cloud size={18} />, service: null, ownerOnly: true, employeeOnly: true },
  { name: 'Conectividade Global', path: '/conectividade', icon: <Globe size={18} />, service: null, ownerOnly: true, employeeOnly: true },
  { name: 'Agenda Global',   path: '/agenda-global',   icon: <Calendar size={18} />,     service: null, ownerOnly: false },
  { name: 'Programação', path: '/tarefas-feitas', icon: <ClipboardList size={18} />, service: null, ownerOnly: true, employeeOnly: true },

  { type: 'header', name: 'USUÁRIO' },
  { name: 'Chat Interno', path: '/chat-interno', icon: <MessageSquare size={18} />, service: null, ownerOnly: false, employeeOnly: true },
  { name: 'Chat Clientes', path: '/admin-chats', icon: <MessageSquare size={18} />, service: null, ownerOnly: false, employeeOnly: true },
  { name: 'Agenda Pessoal', path: '/agenda-pessoal', icon: <CalendarDays size={18} />, service: null, ownerOnly: false, employeeOnly: true },
  { name: 'Portal de Aprovações', path: '/meu-portal', icon: <ShieldCheck size={18} />, service: null, ownerOnly: false },
  { name: 'Chat com a Agência', path: '/meu-chat', icon: <MessageSquare size={18} />, service: null, ownerOnly: false, clientOnly: true },
  { name: 'Aparência e Temas', path: '/aparencia', icon: <Paintbrush size={18} />, service: null, ownerOnly: false },
];
const ROLE_COLORS = {
  owner: '#10b981',
  admin: '#6366f1',
  employee: '#3b82f6',
  client: '#f59e0b',
};

const TopNotifications = ({ user, hasService, isOwnerOrAdmin, navigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const loadNotifs = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_cleared', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const handleNotificationClick = async (notif) => {
    // 1. Marca como lida e limpa da visualização do sino
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, is_cleared: true })
      .eq('id', notif.id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }

    setIsOpen(false);

    // 2. Executa redirecionamento
    if (notif.metadata?.url) {
      navigate(notif.metadata.url);
      return;
    }

    // Redirecionamentos de fallback
    if (notif.type === 'chat') {
      if (user?.role === 'client') {
        navigate('/meu-chat');
      } else if (notif.metadata?.p2p) {
        navigate(`/chat-interno?client=${notif.metadata.sender_employee_id || ''}`);
      } else {
        navigate(`/admin-chats?client=${notif.related_id || ''}`);
      }
    } else if (notif.type === 'task' || notif.type === 'sla' || notif.type === 'handoff') {
      const destPath = notif.metadata?.destPath || '/';
      navigate(`${destPath}?client=${notif.metadata?.client_id || ''}`);
    } else if (notif.type === 'client_status') {
      navigate('/administrativo');
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    loadNotifs();

    // Escuta em tempo real notificações direcionadas para o usuário logado
    const channel = supabase
      .channel('user_notifications_realtime_' + user.id)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        loadNotifs();

        // Mostra notificação local do navegador se o site estiver aberto e tiver permissão
        if (payload.eventType === 'INSERT') {
          const notif = payload.new;
          if (notif && getNotificationPermission() === 'granted') {
            const nativeNotif = new Notification(notif.title, {
              body: notif.description,
              icon: '/favicon.svg'
            });
            nativeNotif.onclick = () => {
              window.focus();
              handleNotificationClick(notif);
            };
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const unreadNotifs = notifications.filter(n => !n.is_read);
  const hasUnread = unreadNotifs.length > 0;
  const hasNotifs = notifications.length > 0;

  const clearAllNotifs = async (e) => {
    e.stopPropagation();
    if (!user?.id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_cleared: true, is_read: true })
      .eq('user_id', user.id)
      .eq('is_cleared', false);

    if (!error) {
      setNotifications([]);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-color)',
          color: hasUnread ? '#fbbf24' : 'var(--text-muted)',
          padding: '8px 14px',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: '0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <Bell size={20} fill={hasUnread ? '#fbbf24' : 'transparent'} />
        {hasUnread && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef4444', color: 'white',
            fontSize: '10px', height: 16, width: 16,
            borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {unreadNotifs.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="glass-panel" style={{
          position: 'absolute', top: '120%', right: 0, width: 320,
          zIndex: 1000, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: 12, border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Notificações <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 6 }}>Ações Pendentes</span></span>
            {hasNotifs && (
              <button
                onClick={clearAllNotifs}
                style={{
                  background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px',
                  borderRadius: 4, transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
                title="Limpar todas as notificações"
              >
                <Trash2 size={16} />
              </button>
            )}
          </h3>
          <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
            {!hasNotifs ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Tudo em dia! Sem pendências.</p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: 'flex', flexDirection: 'column', padding: '10px 12px',
                  background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                  borderLeft: `3px solid ${n.type === 'sla' || n.type === 'client_status' ? '#f59e0b' : '#3b82f6'}`,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  opacity: n.is_read ? 0.6 : 1
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)' }}
              >
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />}
                  {n.title}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{n.description}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, alignSelf: 'flex-end' }}>
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MainLayout = () => {
  const { user, hasService, roleLabel, logout, isGestor } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isEbookOpen, setIsEbookOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isComercialExpanded, setIsComercialExpanded] = useState(window.location.pathname.startsWith('/comercial'));
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/comercial')) {
      setIsComercialExpanded(true);
    }
  }, [location.pathname]);

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  // Registrar silenciosamente o push no banco de dados se a permissão já foi concedida no navegador
  useEffect(() => {
    if (user?.id && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPush().catch(err => console.warn('[Push] Auto-subscribe error:', err));
    }
  }, [user?.id]);

  const isClient = user?.role === 'client';

  // Filtra itens visíveis: ownerOnly só para owner/admin, employeeOnly oculto para clientes, demais por serviço
  const visibleItems = ALL_NAV.filter(item => {
    // Oculta itens exclusivos de funcionários para clientes
    if (item.employeeOnly && isClient) return false;
    
    // Oculta itens exclusivos de clientes para funcionários
    if (item.clientOnly && !isClient) return false;

    if (item.type === 'header') {
      if (item.managerOnly) return isOwnerOrAdmin || isGestor();
      return true;
    }
    if (item.ownerOnly) return isOwnerOrAdmin;
    if (item.managerAccessible) return isOwnerOrAdmin || isGestor();
    if (!item.service) return true;
    return hasService(item.service);
  });

  // Para clientes: mostrar apenas uma seção simplificada no header 'USUÁRIO'
  // (já filtrado pelo employeeOnly acima)

  const roleColor = ROLE_COLORS[user?.role] || '#6366f1';
  const firstLetter = (user?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand" style={{
          justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
          padding: isSidebarCollapsed ? '8px 0 8px 12px' : '20px 20px 16px',
          borderBottom: isSidebarCollapsed ? 'none' : '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: isSidebarCollapsed ? 14 : 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isSidebarCollapsed ? 14 : 12 }}>
            <div className="brand-logo" style={{ margin: 0 }}>
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <path d="M10 10H24C28.4183 10 32 13.5817 32 18C32 20.9169 30.4371 23.4687 28.0817 24.8499L34 32H28L22.6667 25H16V32H10V10ZM16 15V20H24C25.1046 20 26 19.1046 26 18C26 16.8954 25.1046 15 24 15H16Z" fill="white" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <span className="brand-text">ROI Expert</span>
                <span className="brand-sub">Marketing Pro</span>
              </div>
            )}
            {isSidebarCollapsed && (
              <button className="collapse-btn desktop-only collapsed-icon" onClick={() => setIsSidebarCollapsed(false)} title="Expandir Menu" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
                <PanelLeftOpen size={18} />
              </button>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button className="collapse-btn desktop-only" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Recolher Menu" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
              <PanelLeftClose size={18} />
            </button>
          )}
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <nav className="sidebar-nav">
            {visibleItems.map((item, idx) => {
              if (item.type === 'header') {
                return (
                  <div key={`header-${idx}`} className="nav-header">
                    {item.name}
                  </div>
                );
              }
              if (item.name === 'Comercial') {
                const isComercialActive = location.pathname.startsWith('/comercial');
                return (
                  <div key={item.path} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div 
                      onClick={() => {
                        setIsComercialExpanded(!isComercialExpanded);
                        navigate('/comercial?tab=dashboard');
                      }}
                      className={`nav-item ${isComercialActive ? 'active' : ''}`}
                      style={{ cursor: 'pointer', justifyContent: 'space-between', display: 'flex', alignItems: 'center', width: '100%' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.icon}
                        <span>{item.name}</span>
                      </div>
                      <span style={{ fontSize: '8px', transition: '0.2s', transform: isComercialExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--text-muted)' }}>▶</span>
                    </div>
                    
                    {isComercialExpanded && (
                      <div className="sub-menu" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 20, marginTop: 4, borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: 16 }}>
                        <NavLink 
                          onClick={() => setIsMobileMenuOpen(false)}
                          to="/comercial?tab=crm_roi" 
                          className={() => 'nav-item' + (isComercialActive && location.search.includes('tab=crm_roi') ? ' active' : '')}
                          style={{ fontSize: '0.75rem', padding: '6px 10px', borderLeft: 'none' }}
                        >
                          👥 CRM Comercial
                        </NavLink>
                        <NavLink 
                          onClick={() => setIsMobileMenuOpen(false)}
                          to="/comercial?tab=dashboard" 
                          className={() => 'nav-item' + (isComercialActive && (location.search.includes('tab=dashboard') || !location.search.includes('tab=')) ? ' active' : '')}
                          style={{ fontSize: '0.75rem', padding: '6px 10px', borderLeft: 'none' }}
                        >
                          📊 Hub Comercial e Vendas
                        </NavLink>
                        <NavLink 
                          onClick={() => setIsMobileMenuOpen(false)}
                          to="/comercial?tab=conectividade" 
                          className={() => 'nav-item' + (isComercialActive && location.search.includes('tab=conectividade') ? ' active' : '')}
                          style={{ fontSize: '0.75rem', padding: '6px 10px', borderLeft: 'none' }}
                        >
                          🔌 Conectividade Comercial
                        </NavLink>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <NavLink
                  onClick={() => setIsMobileMenuOpen(false)}
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        )}

        {!isSidebarCollapsed && (
          <div className="sidebar-footer" style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '16px' }}>
            <div className="user-profile" style={{ justifyContent: 'flex-start', margin: 0 }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ background: roleColor }}>{firstLetter}</div>
              )}
              <div className="user-info">
                <span className="user-name">{user?.name?.split(' ')[0] || 'Usuário'}</span>
                <span className="user-role" style={{ color: roleColor }}>{roleLabel.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row', marginTop: 0 }}>
              <button 
                onClick={() => setIsSettingsOpen(true)} 
                className="settings-btn" 
                title="Configurações"
                style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={logout} 
                className="logout-btn" 
                title="Sair"
                style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Content Area */}
      <main className="main-content">
        <header className="topbar glass-panel" style={{ paddingLeft: isSidebarCollapsed ? '98px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <button className="mobile-back-btn" onClick={() => {
              const event = new CustomEvent('mobile-back-btn-pressed', { cancelable: true });
              window.dispatchEvent(event);
              if (!event.defaultPrevented) {
                navigate(-1);
              }
            }}>
              <ArrowLeft size={20} />
            </button>
            <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="topbar-avatar" />
              ) : (
                <div className="topbar-avatar" style={{ background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                  {firstLetter}
                </div>
              )}
              <h2 className="topbar-greeting">
                <span className="greeting-text">Bem-vindo de volta, </span>
                <strong>{user?.name?.split(' ')[0]}</strong>
              </h2>
            </div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setIsEbookOpen(true)}
              className="glass-btn primary small topbar-btn"
              style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: 700 }}
            >
              <HelpCircle size={18} /> <span className="btn-text">Manual</span>
            </button>
            <button
              onClick={() => setIsHelpOpen(true)}
              className="glass-btn primary small topbar-btn"
              style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}
            >
              <HelpCircle size={18} /> <span className="btn-text">Ajuda</span>
            </button>
            <TopNotifications
              user={user}
              hasService={hasService}
              isOwnerOrAdmin={isOwnerOrAdmin}
              navigate={navigate}
            />
          </div>
        </header>

        <div className="page-container glass-panel">
          <Outlet />
        </div>

        <HelpCenter isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        <TrainingEbook isOpen={isEbookOpen} onClose={() => setIsEbookOpen(false)} />
        <PushPermissionBanner />
        {isSettingsOpen && (
          <UserSettingsModal onClose={() => setIsSettingsOpen(false)} user={user} />
        )}

        <footer className="footer-bar glass-panel">
          <div className="footer-content">
            <p>&copy; {new Date().getFullYear()} ROI Expert • Criado por Gerson Barbosa • (11) 99114-1179 • v1.0.0</p>
            <div className="status-tag">
              <span className="dot"></span>
              <span>Servidor Ativo</span>
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        .app-container {
          display: flex;
          padding: 8px;
          gap: 8px;
          background-color: var(--dark-bg);
          height: 100vh;
          box-sizing: border-box;
          overflow: hidden;
        }
        .sidebar {\n          width: 220px;\n          display: flex;\n          flex-direction: column;\n          height: 100%;\n          border-radius: 16px;\n          flex-shrink: 0;\n          transition: width 0.3s ease, height 0.3s ease, position 0.3s ease, top 0.3s ease, left 0.3s ease;\n        }\n        .sidebar.collapsed {\n          position: absolute;\n          top: 8px;\n          left: 8px;\n          width: 92px;\n          height: 56px;\n          z-index: 999;\n          overflow: hidden;\n          background: transparent !important;\n          border: none !important;\n          box-shadow: none !important;\n          backdrop-filter: none !important;\n          -webkit-backdrop-filter: none !important;\n        }\n        .sidebar-brand {\n          display: flex;\n          align-items: center;\n          gap: 12px;\n          padding: 20px 20px 16px;\n          border-bottom: 1px solid var(--border-color);\n          flex-direction: row;\n        }\n        .sidebar.collapsed .sidebar-brand { padding: 8px 0px 8px 12px; }
        .brand-logo {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .brand-text { font-weight: 700; font-size: 0.95rem; color: var(--text-main); display: block; }
        .brand-sub  { font-size: 0.7rem; color: var(--text-muted); }
        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex; flex-direction: column; gap: 4px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }
        .sidebar.collapsed .sidebar-nav { padding: 16px 8px; }
        .nav-item {\n          display: flex; align-items: center; gap: 10px;\n          padding: 8px 12px;\n          text-decoration: none;\n          color: var(--text-muted);\n          border-radius: 8px;\n          transition: all 0.2s;\n          font-size: 0.82rem;\n          font-weight: 500;\n          white-space: nowrap;\n        }\n        .sidebar.collapsed .nav-item { padding: 10px; justify-content: center; }
        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-main);
        }
        .nav-item.active {\n          background: rgba(99, 102, 241, 0.15);\n          color: #a5b4fc;\n          border-left: 3px solid #6366f1;\n          padding-left: 11px;\n        }\n        .sidebar.collapsed .nav-item.active { border-left: none; background: rgba(99, 102, 241, 0.2); padding-left: 10px; }
        .nav-header {\n          font-size: 0.65rem;\n          font-weight: 800;\n          color: var(--text-muted);\n          padding: 16px 12px 6px;\n          letter-spacing: 0.08em;\n          text-transform: uppercase;\n          opacity: 0.6;\n        }\n        .sidebar.collapsed .nav-header { text-align: center; padding: 16px 0 6px; font-size: 0.5rem; letter-spacing: 0; }
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .user-profile { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: white; font-size: 0.9rem; flex-shrink: 0;
        }
        .user-info { display: flex; flex-direction: column; min-width: 0; }
        .user-name {
          font-size: 0.85rem; font-weight: 600; color: var(--text-main);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-role { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; }
        .logout-btn {
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          padding: 8px; border-radius: 8px; transition: 0.2s;
          display: flex; align-items: center;
          flex-shrink: 0;
        }
        .logout-btn:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; }
        .settings-btn {
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          padding: 8px; border-radius: 8px; transition: 0.2s;
          display: flex; align-items: center;
          flex-shrink: 0;
        }
        .settings-btn:hover { background: rgba(99, 102, 241, 0.1); color: #a5b4fc; }
        .main-content {
          flex: 1; display: flex; flex-direction: column; 
          gap: 8px; height: 100%; min-width: 0; overflow: hidden;
        }
        .topbar {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          border-radius: 12px;
          flex: none;
          position: relative;
          z-index: 50;
          transition: padding-left 0.3s ease;
        }
        .topbar h2 { margin: 0; font-size: 0.95rem; font-weight: 400; }
        .topbar h2 strong { font-weight: 700; }
        .topbar-actions { display: flex; gap: 12px; }
        .topbar-actions button {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 8px 14px;
          border-radius: 20px;
          cursor: pointer;
          transition: 0.2s;
        }
        .topbar-actions button:hover { background: rgba(255,255,255,0.1); }
        .page-container {
          flex: 1; border-radius: 12px;
          display: flex; flex-direction: column;
          overflow-y: auto;
          min-height: 0;
          position: relative;
          padding: 16px 20px 80px; /* Padding generoso no rodapé para evitar cortes em qualquer dispositivo */
        }
        
        .footer-bar {
          padding: 10px 24px;
          border-radius: 12px;
          flex: none;
          margin-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.05);
          z-index: 10;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer-content p {
          margin: 0;
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .status-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.65rem;
          color: #10b981;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(16, 185, 129, 0.1);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.9); }
        }

        .mobile-menu-btn, .mobile-close-btn, .mobile-back-btn { display: none; }
        .topbar-left { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
        .topbar-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .topbar-greeting { margin: 0; font-size: 0.95rem; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media (max-width: 768px) {
          .mobile-menu-btn, .mobile-back-btn {
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2);
            color: var(--text-main); border-radius: 8px; padding: 6px; cursor: pointer;
          }
          .mobile-close-btn {
            display: flex; margin-left: auto;
            background: none; border: none; color: var(--text-muted); padding: 4px;
            cursor: pointer;
          }
          .sidebar {
            position: fixed;
            top: 0; left: -320px;
            height: 100vh;
            width: 250px;
            z-index: 1000;
            transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--dark-bg);
            border-radius: 0 16px 16px 0;
            box-shadow: none;
            border-right: 1px solid var(--border-color);
          }
          .sidebar.open {
            left: 0;
            box-shadow: 10px 0 30px rgba(0,0,0,0.5);
          }
          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            z-index: 999;
            opacity: 0;
            animation: fadeIn 0.3s forwards;
          }
          @keyframes fadeIn { to { opacity: 1; } }
          
          /* Ajustes finos do Topbar no Mobile */
          .topbar { padding: 8px 12px; gap: 8px; }
          .greeting-text { display: none; }
          .topbar-greeting { font-size: 0.9rem; white-space: normal !important; }
          .topbar-actions { gap: 4px; flex-wrap: nowrap; flex-shrink: 0; }
          .btn-text { display: none; }
          .topbar-btn { padding: 6px 8px !important; border-radius: 8px !important; }
          
          .footer-content p { font-size: 0.65rem; }
        }

        .nav-item { white-space: nowrap; overflow: hidden; }

      `}</style>
    </div>
  );
};

export default MainLayout;
