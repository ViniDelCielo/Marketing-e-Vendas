const fs = require('fs');
let code = fs.readFileSync('src/layouts/MainLayout.jsx', 'utf8');

const oldBrand = `<div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M10 10H24C28.4183 10 32 13.5817 32 18C32 20.9169 30.4371 23.4687 28.0817 24.8499L34 32H28L22.6667 25H16V32H10V10ZM16 15V20H24C25.1046 20 26 19.1046 26 18C26 16.8954 25.1046 15 24 15H16Z" fill="white" />
            </svg>
          </div>
          <div>
            <span className="brand-text">ROI Expert</span>
            <span className="brand-sub">Marketing Pro</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>`;

const newBrand = `<div className="sidebar-brand" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'space-between', padding: isSidebarCollapsed ? '20px 0 16px' : '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="brand-logo" style={{ margin: isSidebarCollapsed ? '0 auto' : 0 }}>
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
          </div>
          <button className="collapse-btn desktop-only" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title="Recolher Menu" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: isSidebarCollapsed ? 'none' : 'block' }}>
            <PanelLeftClose size={18} />
          </button>
          {isSidebarCollapsed && (
            <button className="collapse-btn desktop-only collapsed-icon" onClick={() => setIsSidebarCollapsed(false)} title="Expandir Menu" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, marginTop: 16 }}>
              <PanelLeftOpen size={18} />
            </button>
          )}
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>`;

code = code.replace(oldBrand, newBrand);

const oldUserInfo = `<div className="user-info">
              <span className="user-name">{user?.name?.split(' ')[0] || 'Usuário'}</span>
              <span className="user-role" style={{ color: roleColor }}>{roleLabel.toUpperCase()}</span>
            </div>`;

const newUserInfo = `{!isSidebarCollapsed && (
              <div className="user-info">
                <span className="user-name">{user?.name?.split(' ')[0] || 'Usuário'}</span>
                <span className="user-role" style={{ color: roleColor }}>{roleLabel.toUpperCase()}</span>
              </div>
            )}`;

code = code.replace(oldUserInfo, newUserInfo);

fs.writeFileSync('src/layouts/MainLayout.jsx', code);
console.log('Fixed JSX structure');
