const fs = require('fs');
let code = fs.readFileSync('src/layouts/MainLayout.jsx', 'utf8');

code = code.replace(
  "Menu, X, Package, Settings, Bell, HelpCircle, Cloud, Calendar\n} from 'lucide-react';",
  "Menu, X, Package, Settings, Bell, HelpCircle, Cloud, Calendar, PanelLeftClose, PanelLeftOpen\n} from 'lucide-react';"
);

code = code.replace(
  "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);",
  "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);"
);

code = code.replace(
  "<aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>",
  "<aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>"
);

code = code.replace(
  '<div className="sidebar-brand">\n          <div className="brand-logo">',
  '<div className="sidebar-brand" style={{ justifyContent: isSidebarCollapsed ? \'center\' : \'space-between\', padding: isSidebarCollapsed ? \'20px 0 16px\' : \'20px 20px 16px\' }}>\n          <div style={{ display: \'flex\', alignItems: \'center\', gap: 12 }}>\n            <div className="brand-logo" style={{ margin: isSidebarCollapsed ? \'0 auto\' : 0 }}>'
);

code = code.replace(
  '          <div>\n            <span className="brand-text">ROI Expert</span>\n            <span className="brand-sub">Marketing Pro</span>\n          </div>\n          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>\n            <X size={20} />\n          </button>\n        </div>',
  `          {!isSidebarCollapsed && (
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
        </div>`
);

code = code.replace(
  '<span>{item.name}</span>',
  '{!isSidebarCollapsed && <span>{item.name}</span>}'
);

code = code.replace(
  '<div className="sidebar-footer">',
  '<div className="sidebar-footer" style={{ flexDirection: isSidebarCollapsed ? \'column\' : \'row\', justifyContent: isSidebarCollapsed ? \'center\' : \'space-between\', padding: isSidebarCollapsed ? \'16px 0\' : \'16px\' }}>'
);
code = code.replace(
  '<div className="user-profile">',
  '<div className="user-profile" style={{ justifyContent: isSidebarCollapsed ? \'center\' : \'flex-start\', margin: isSidebarCollapsed ? \'0 auto\' : 0 }}>'
);
code = code.replace(
  '<div className="user-info">\n              <span className="user-name">{user?.name?.split(\' \')[0] || \'Usuário\'}</span>\n              <span className="user-role" style={{ color: roleColor }}>{roleLabel.toUpperCase()}</span>\n            </div>',
  `{!isSidebarCollapsed && (
              <div className="user-info">
                <span className="user-name">{user?.name?.split(' ')[0] || 'Usuário'}</span>
                <span className="user-role" style={{ color: roleColor }}>{roleLabel.toUpperCase()}</span>
              </div>
            )}`
);
code = code.replace(
  '<button onClick={logout} className="logout-btn" title="Sair">',
  '<button onClick={logout} className="logout-btn" title="Sair" style={{ margin: isSidebarCollapsed ? \'12px auto 0\' : 0 }}>'
);

code = code.replace(
  '.sidebar {\n          width: 220px;\n          display: flex;\n          flex-direction: column;\n          height: 100%;\n          border-radius: 16px;\n          flex-shrink: 0;\n        }',
  '.sidebar {\n          width: 220px;\n          display: flex;\n          flex-direction: column;\n          height: 100%;\n          border-radius: 16px;\n          flex-shrink: 0;\n          transition: width 0.3s ease;\n        }\n        .sidebar.collapsed { width: 72px; }'
);
code = code.replace(
  '.sidebar-brand {\n          display: flex;\n          align-items: center;\n          gap: 12px;\n          padding: 20px 20px 16px;\n          border-bottom: 1px solid var(--border-color);\n        }',
  '.sidebar-brand {\n          display: flex;\n          align-items: center;\n          gap: 12px;\n          padding: 20px 20px 16px;\n          border-bottom: 1px solid var(--border-color);\n          flex-direction: row;\n        }\n        .sidebar.collapsed .sidebar-brand { flex-direction: column; padding: 20px 0 16px; }'
);
code = code.replace(
  '.sidebar-nav {\n          flex: 1;\n          padding: 16px 12px;\n          display: flex; flex-direction: column; gap: 4px;\n          overflow-y: auto;\n        }',
  '.sidebar-nav {\n          flex: 1;\n          padding: 16px 12px;\n          display: flex; flex-direction: column; gap: 4px;\n          overflow-y: auto;\n          overflow-x: hidden;\n        }\n        .sidebar.collapsed .sidebar-nav { padding: 16px 8px; }'
);
code = code.replace(
  '.nav-item {\n          display: flex; align-items: center; gap: 10px;\n          padding: 8px 12px;\n          text-decoration: none;\n          color: var(--text-muted);\n          border-radius: 8px;\n          transition: all 0.2s;\n          font-size: 0.82rem;\n          font-weight: 500;\n        }',
  '.nav-item {\n          display: flex; align-items: center; gap: 10px;\n          padding: 8px 12px;\n          text-decoration: none;\n          color: var(--text-muted);\n          border-radius: 8px;\n          transition: all 0.2s;\n          font-size: 0.82rem;\n          font-weight: 500;\n          white-space: nowrap;\n        }\n        .sidebar.collapsed .nav-item { padding: 10px; justify-content: center; }'
);
code = code.replace(
  '.nav-item.active {\n          background: rgba(99, 102, 241, 0.15);\n          color: #a5b4fc;\n          border-left: 3px solid #6366f1;\n          padding-left: 11px;\n        }',
  '.nav-item.active {\n          background: rgba(99, 102, 241, 0.15);\n          color: #a5b4fc;\n          border-left: 3px solid #6366f1;\n          padding-left: 11px;\n        }\n        .sidebar.collapsed .nav-item.active { border-left: none; background: rgba(99, 102, 241, 0.2); padding-left: 10px; }'
);
code = code.replace(
  '.nav-header {\n          font-size: 0.65rem;\n          font-weight: 800;\n          color: var(--text-muted);\n          padding: 16px 12px 6px;\n          letter-spacing: 0.08em;\n          text-transform: uppercase;\n          opacity: 0.6;\n        }',
  '.nav-header {\n          font-size: 0.65rem;\n          font-weight: 800;\n          color: var(--text-muted);\n          padding: 16px 12px 6px;\n          letter-spacing: 0.08em;\n          text-transform: uppercase;\n          opacity: 0.6;\n        }\n        .sidebar.collapsed .nav-header { text-align: center; padding: 16px 0 6px; font-size: 0.5rem; letter-spacing: 0; }'
);
code = code.replace(
  '        }\n      `}</style>',
  '          .footer-content p { font-size: 0.65rem; }\n        }\n        .desktop-only { display: block; }\n        @media (max-width: 1024px) { .desktop-only { display: none !important; } }\n      `}</style>'
);

fs.writeFileSync('src/layouts/MainLayout.jsx', code);
console.log('Success');
