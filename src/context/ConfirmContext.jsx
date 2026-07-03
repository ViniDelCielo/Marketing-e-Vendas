import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, Loader2, Trash2, Check } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({ isOpen: false, options: null });
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options: {
          ...options,
          onConfirm: async () => {
            setLoading(true);
            try {
              if (options.onConfirmAsync) await options.onConfirmAsync();
              resolve(true);
            } finally {
              setLoading(false);
              setConfirmState({ isOpen: false, options: null });
            }
          },
          onCancel: () => {
            resolve(false);
            setConfirmState({ isOpen: false, options: null });
          }
        }
      });
    });
  }, []);

  const opts = confirmState.options;
  const isDanger = opts?.isDanger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState.isOpen && opts && (
        <div
          onClick={opts.onCancel}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 420,
              background: 'var(--surface, #0f172a)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              padding: '32px 28px 28px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Linha de cor no topo */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              borderRadius: '18px 18px 0 0',
              background: isDanger ? '#ef4444' : '#6366f1',
            }} />

            {/* Ícone */}
            <div style={{
              display: 'flex', justifyContent: 'center', marginBottom: 18,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDanger ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                border: `1.5px solid ${isDanger ? 'rgba(239,68,68,0.35)' : 'rgba(99,102,241,0.35)'}`,
              }}>
                <AlertCircle size={28} color={isDanger ? '#f87171' : '#818cf8'} />
              </div>
            </div>

            {/* Título */}
            <h3 style={{
              fontSize: '1.2rem', fontWeight: 700,
              color: 'var(--text-main, #f1f5f9)',
              margin: '0 0 10px',
            }}>
              {opts.title || 'Confirmação'}
            </h3>

            {/* Mensagem */}
            <p style={{
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.92rem', lineHeight: 1.6,
              margin: '0 0 26px',
              whiteSpace: 'pre-wrap',
            }}>
              {opts.message}
            </p>

            {/* Botões */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {/* Cancelar */}
              <button
                onClick={opts.onCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-muted, #94a3b8)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                {opts.cancelText || 'Cancelar'}
              </button>

              {/* Confirmar */}
              <button
                onClick={opts.onConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: isDanger ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)',
                  border: `1px solid ${isDanger ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                  color: isDanger ? '#fca5a5' : '#a5b4fc',
                  borderRadius: 10,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background .15s',
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = isDanger ? 'rgba(239,68,68,0.28)' : 'rgba(99,102,241,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDanger ? 'rgba(239,68,68,0.18)' : 'rgba(99,102,241,0.18)'; }}
              >
                {loading
                  ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  : isDanger
                    ? <Trash2 size={15} />
                    : <Check size={15} />
                }
                {!loading && (opts.confirmText || 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider');
  return context;
}
