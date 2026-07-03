import { Paintbrush, LayoutTemplate, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Aparencia() {
  const { THEMES, activeThemeId, setActiveThemeId } = useTheme();

  return (
    <div className="aparencia-container">
      <header className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1><Paintbrush size={26} style={{ verticalAlign: 'middle', marginRight: 10 }} />Aparência e Temas</h1>
          <p>Personalize as cores, fundos e o estilo visual do sistema.</p>
        </div>
      </header>

      <section className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Palette size={20} /> Escolha um Estilo (Padrões Modernos)
        </h3>
        
        <div className="themes-grid">
          {Object.values(THEMES).map(theme => {
            const isActive = activeThemeId === theme.id;
            const pColor = theme.vars['--primary'];
            const darkBg = theme.vars['--dark-bg'];
            return (
              <div 
                key={theme.id}
                className={`theme-card ${isActive ? 'active' : ''}`}
                onClick={() => setActiveThemeId(theme.id)}
                style={{ borderColor: isActive ? pColor : 'rgba(255,255,255,0.05)' }}
              >
                <div className="theme-preview" style={{ background: darkBg }}>
                  <div className="preview-glow" style={{ background: theme.vars['--glow-1'] }}></div>
                  <div className="preview-sidebar" style={{ background: theme.vars['--panel-bg'] }}></div>
                  <div className="preview-content">
                    <div className="preview-box" style={{ background: pColor }}></div>
                    <div className="preview-line" style={{ background: 'rgba(255,255,255,0.2)' }}></div>
                    <div className="preview-line" style={{ width: '60%', background: 'rgba(255,255,255,0.1)' }}></div>
                  </div>
                </div>
                <div className="theme-info">
                  <strong>{theme.name}</strong>
                  {isActive && <span className="active-badge" style={{ color: pColor, background: theme.vars['--glow-1'] }}>Selecionado</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        .themes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .theme-card {
          background: rgba(255,255,255,0.02);
          border: 2px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.2s;
        }
        .theme-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border-color: rgba(255,255,255,0.15);
        }
        .theme-card.active {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .theme-preview {
          height: 140px;
          position: relative;
          display: flex;
          padding: 16px;
          gap: 12px;
          overflow: hidden;
          background-size: cover;
        }
        .preview-glow {
          position: absolute;
          top: -20px; left: -20px; width: 100px; height: 100px;
          border-radius: 50%; filter: blur(20px);
        }
        .preview-sidebar {
          width: 40px; height: 100%; border-radius: 8px;
          z-index: 1; border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(4px);
        }
        .preview-content {
          flex: 1; display: flex; flex-direction: column; gap: 8px; z-index: 1;
        }
        .preview-box {
          height: 40px; border-radius: 8px; width: 100%;
        }
        .preview-line {
          height: 8px; border-radius: 4px; width: 100%;
        }
        .theme-info {
          padding: 16px;
          display: flex; justify-content: space-between; align-items: center;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .theme-info strong {
          color: var(--text-main); font-size: 0.95rem;
        }
        .active-badge {
          font-size: 0.75rem; padding: 4px 8px; border-radius: 12px; font-weight: 600;
        }
      `}</style>
    </div>
  );
}
