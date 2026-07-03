import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  ocean: {
    id: 'ocean', name: 'Ocean Blue (Padrão)',
    vars: {
      '--primary': '#3b82f6', '--primary-hover': '#2563eb',
      '--secondary': '#10b981', '--tertiary': '#a855f7',
      '--dark-bg': '#0b1120', '--panel-bg': 'rgba(15, 23, 42, 0.7)',
      '--glow-1': 'rgba(59, 130, 246, 0.15)', '--glow-2': 'rgba(16, 185, 129, 0.15)', '--glow-3': 'rgba(168, 85, 247, 0.12)'
    }
  },
  midnight: {
    id: 'midnight', name: 'Midnight Purple',
    vars: {
      '--primary': '#8b5cf6', '--primary-hover': '#7c3aed',
      '--secondary': '#f43f5e', '--tertiary': '#3b82f6',
      '--dark-bg': '#0f0728', '--panel-bg': 'rgba(18, 9, 45, 0.7)',
      '--glow-1': 'rgba(139, 92, 246, 0.15)', '--glow-2': 'rgba(244, 63, 94, 0.15)', '--glow-3': 'rgba(59, 130, 246, 0.12)'
    }
  },
  emerald: {
    id: 'emerald', name: 'Emerald Forest',
    vars: {
      '--primary': '#10b981', '--primary-hover': '#059669',
      '--secondary': '#f59e0b', '--tertiary': '#06b6d4',
      '--dark-bg': '#022c22', '--panel-bg': 'rgba(2, 44, 34, 0.65)',
      '--glow-1': 'rgba(16, 185, 129, 0.15)', '--glow-2': 'rgba(245, 158, 11, 0.15)', '--glow-3': 'rgba(6, 182, 212, 0.12)'
    }
  },
  cyberpunk: {
    id: 'cyberpunk', name: 'Cyberpunk Neon',
    vars: {
      '--primary': '#ec4899', '--primary-hover': '#db2777',
      '--secondary': '#06b6d4', '--tertiary': '#eab308',
      '--dark-bg': '#000000', '--panel-bg': 'rgba(15, 15, 15, 0.8)',
      '--glow-1': 'rgba(236, 72, 153, 0.2)', '--glow-2': 'rgba(6, 182, 212, 0.2)', '--glow-3': 'rgba(234, 179, 8, 0.15)'
    }
  },
  sunset: {
    id: 'sunset', name: 'Sunset Orange',
    vars: {
      '--primary': '#f97316', '--primary-hover': '#ea580c',
      '--secondary': '#eab308', '--tertiary': '#ec4899',
      '--dark-bg': '#1a0f00', '--panel-bg': 'rgba(26, 15, 0, 0.7)',
      '--glow-1': 'rgba(249, 115, 22, 0.15)', '--glow-2': 'rgba(234, 179, 8, 0.15)', '--glow-3': 'rgba(236, 72, 153, 0.12)'
    }
  },
  mono: {
    id: 'mono', name: 'Preto & Branco (Monocromático)',
    vars: {
      '--primary': '#ffffff', '--primary-hover': '#e2e8f0',
      '--secondary': '#94a3b8', '--tertiary': '#cbd5e1',
      '--dark-bg': '#000000', '--panel-bg': 'rgba(25, 25, 25, 0.8)',
      '--glow-1': 'rgba(255, 255, 255, 0.05)', '--glow-2': 'rgba(255, 255, 255, 0.03)', '--glow-3': 'rgba(255, 255, 255, 0.02)'
    }
  },
  whitegreen: {
    id: 'whitegreen', name: 'Branco & Verde Limão',
    vars: {
      '--primary': '#ffffff', '--primary-hover': '#e2e8f0',
      '--secondary': '#a3e635', '--tertiary': '#84cc16',
      '--dark-bg': '#091009', '--panel-bg': 'rgba(15, 22, 15, 0.75)',
      '--glow-1': 'rgba(255, 255, 255, 0.1)', '--glow-2': 'rgba(163, 230, 53, 0.15)', '--glow-3': 'rgba(132, 204, 22, 0.12)'
    }
  },
  greenwhite: {
    id: 'greenwhite', name: 'Verde Limão & Branco',
    vars: {
      '--primary': '#a3e635', '--primary-hover': '#bef264',
      '--secondary': '#ffffff', '--tertiary': '#e2e8f0',
      '--dark-bg': '#091009', '--panel-bg': 'rgba(15, 22, 15, 0.75)',
      '--glow-1': 'rgba(163, 230, 53, 0.15)', '--glow-2': 'rgba(255, 255, 255, 0.1)', '--glow-3': 'rgba(132, 204, 22, 0.12)'
    }
  },
  lightlime: {
    id: 'lightlime', name: 'Verde Limão & Colorido (Fundo Branco)',
    vars: {
      '--primary': '#22c55e', '--primary-hover': '#16a34a',
      '--secondary': '#3b82f6', '--tertiary': '#ec4899',
      '--dark-bg': '#ffffff', '--panel-bg': 'rgba(248, 250, 252, 0.75)',
      '--text-main': '#0f172a', '--text-muted': '#64748b',
      '--border-color': 'rgba(15, 23, 42, 0.08)',
      '--glow-1': 'rgba(34, 197, 94, 0.12)', '--glow-2': 'rgba(59, 130, 246, 0.08)', '--glow-3': 'rgba(236, 72, 153, 0.08)',
      '--card-bg': 'rgba(15, 23, 42, 0.02)', '--card-border': 'rgba(15, 23, 42, 0.05)',
      '--card-hover-bg': 'rgba(15, 23, 42, 0.04)', '--card-hover-border': 'rgba(15, 23, 42, 0.1)',
      '--input-bg': 'rgba(15, 23, 42, 0.04)',
      '--btn-bg': 'rgba(15, 23, 42, 0.05)', '--btn-border': 'rgba(15, 23, 42, 0.1)',
      '--btn-text': '#0f172a', '--btn-hover-bg': 'rgba(34, 197, 94, 0.15)',
      '--btn-primary-text': '#ffffff'
    }
  },
  lightlimesolid: {
    id: 'lightlimesolid', name: 'Verde Fluorescente Clean (Fundo Branco)',
    vars: {
      '--primary': '#84cc16', '--primary-hover': '#65a30d',
      '--secondary': '#475569', '--tertiary': '#64748b',
      '--dark-bg': '#ffffff', '--panel-bg': 'rgba(250, 250, 250, 0.8)',
      '--text-main': '#090d16', '--text-muted': '#52525b',
      '--border-color': 'rgba(9, 13, 22, 0.07)',
      '--glow-1': 'rgba(132, 204, 22, 0.12)', '--glow-2': 'rgba(82, 82, 91, 0.06)', '--glow-3': 'rgba(100, 116, 139, 0.06)',
      '--card-bg': 'rgba(9, 13, 22, 0.02)', '--card-border': 'rgba(9, 13, 22, 0.05)',
      '--card-hover-bg': 'rgba(9, 13, 22, 0.04)', '--card-hover-border': 'rgba(9, 13, 22, 0.1)',
      '--input-bg': 'rgba(9, 13, 22, 0.04)',
      '--btn-bg': 'rgba(9, 13, 22, 0.04)', '--btn-border': 'rgba(9, 13, 22, 0.08)',
      '--btn-text': '#090d16', '--btn-hover-bg': 'rgba(132, 204, 22, 0.15)',
      '--btn-primary-text': '#ffffff'
    }
  },
  neolime: {
    id: 'neolime', name: 'Preto, Branco & Verde Limão',
    vars: {
      '--primary': '#a3e635', '--primary-hover': '#84cc16',
      '--secondary': '#000000', '--tertiary': '#18181b',
      '--dark-bg': '#ffffff', '--panel-bg': 'rgba(255, 255, 255, 0.9)',
      '--text-main': '#000000', '--text-muted': '#3f3f46',
      '--border-color': 'rgba(0, 0, 0, 0.15)',
      '--glow-1': 'rgba(163, 230, 53, 0.12)', '--glow-2': 'rgba(0, 0, 0, 0.06)', '--glow-3': 'rgba(0, 0, 0, 0.04)',
      '--card-bg': 'rgba(0, 0, 0, 0.02)', '--card-border': 'rgba(0, 0, 0, 0.08)',
      '--card-hover-bg': 'rgba(0, 0, 0, 0.04)', '--card-hover-border': 'rgba(0, 0, 0, 0.18)',
      '--input-bg': 'rgba(0, 0, 0, 0.03)',
      '--btn-bg': 'rgba(0, 0, 0, 0.05)', '--btn-border': 'rgba(0, 0, 0, 0.15)',
      '--btn-text': '#000000', '--btn-hover-bg': 'rgba(163, 230, 53, 0.2)',
      '--btn-primary-text': '#000000'
    }
  }
};

const THEME_VARIABLES = [
  '--primary', '--primary-hover', '--secondary', '--tertiary',
  '--dark-bg', '--panel-bg', '--glow-1', '--glow-2', '--glow-3',
  '--text-main', '--text-muted', '--border-color',
  '--card-bg', '--card-border', '--card-hover-bg', '--card-hover-border',
  '--input-bg', '--btn-bg', '--btn-border', '--btn-text', '--btn-hover-bg', '--btn-primary-text'
];

export const ThemeProvider = ({ children }) => {
  const [activeThemeId, setActiveThemeId] = useState(() => {
    return localStorage.getItem('app-theme') || 'ocean';
  });

  useEffect(() => {
    const theme = THEMES[activeThemeId] || THEMES.ocean;
    const root = document.documentElement;
    THEME_VARIABLES.forEach(key => {
      root.style.removeProperty(key);
    });
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem('app-theme', activeThemeId);
  }, [activeThemeId]);

  return (
    <ThemeContext.Provider value={{ THEMES, activeThemeId, setActiveThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
