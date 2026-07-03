/**
 * PushPermissionBanner.jsx
 * Banner elegante exibido automaticamente para solicitar permissão
 * de notificações push nativas ao usuário.
 *
 * Comportamento:
 *  - Aparece 3 segundos após o usuário logar (se permissão ainda não foi concedida)
 *  - Se o usuário clicar "Agora não", não aparece por 7 dias
 *  - Se o usuário clicar "Ativar", chama subscribeToPush()
 *  - Não aparece se o browser não suporta Web Push
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Smartphone } from 'lucide-react';
import {
  isPushSupported,
  subscribeToPush,
  getNotificationPermission,
} from '../services/pushService';

const SNOOZE_KEY = 'push_banner_snoozed_until';
const SNOOZE_DAYS = 7;
const SHOW_DELAY_MS = 3000; // 3 segundos após montar

export default function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'denied' | 'error'
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Verificações antes de mostrar o banner
    if (!isPushSupported()) return;
    if (getNotificationPermission() === 'granted') return;
    if (getNotificationPermission() === 'denied') return; // Já negou pelo browser — não insistir

    // Verificar snooze
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && Date.now() < parseInt(snoozedUntil, 10)) return;

    // Mostrar após delay
    const timer = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setAnimate(true), 50); // Trigger animation
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    const result = await subscribeToPush();
    setLoading(false);

    if (result === 'granted') {
      setStatus('success');
    } else if (result === 'denied') {
      setStatus('denied');
    } else {
      setStatus('error');
    }

    // Fechar após 3s
    setTimeout(() => handleClose(), 3000);
  };

  const handleSnooze = () => {
    const snoozeUntil = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(snoozeUntil));
    handleClose();
  };

  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => setVisible(false), 400);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(120px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes slideOutDown {
          from { transform: translateY(0);    opacity: 1; }
          to   { transform: translateY(120px); opacity: 0; }
        }
        .push-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(120px);
          z-index: 99999;
          width: min(480px, calc(100vw - 32px));
          opacity: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
        }
        .push-banner.visible {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        .push-banner-inner {
          background: linear-gradient(135deg, rgba(30, 30, 50, 0.97) 0%, rgba(20, 20, 40, 0.98) 100%);
          border: 1px solid rgba(99, 102, 241, 0.35);
          border-radius: 18px;
          padding: 20px 22px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          box-shadow:
            0 25px 60px rgba(0,0,0,0.6),
            0 0 0 1px rgba(99,102,241,0.1),
            inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
        }
        .push-banner-icon {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          animation: pulse-icon 2s infinite;
        }
        @keyframes pulse-icon {
          0%, 100% { box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
          50%       { box-shadow: 0 4px 30px rgba(99,102,241,0.7); }
        }
        .push-banner-content {
          flex: 1;
          min-width: 0;
        }
        .push-banner-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .push-banner-desc {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0 0 16px;
          line-height: 1.5;
        }
        .push-banner-devices {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 0.75rem;
          color: #64748b;
        }
        .push-banner-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .push-btn-activate {
          padding: 9px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }
        .push-btn-activate:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.5);
        }
        .push-btn-activate:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        .push-btn-snooze {
          padding: 9px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #94a3b8;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .push-btn-snooze:hover {
          background: rgba(255,255,255,0.1);
          color: #e2e8f0;
        }
        .push-close-btn {
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 2px;
          border-radius: 6px;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .push-close-btn:hover { color: #94a3b8; }
        .push-status-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 500;
        }
        .push-status-success {
          background: rgba(16,185,129,0.15);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.25);
        }
        .push-status-denied {
          background: rgba(239,68,68,0.12);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.2);
        }
        .push-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className={`push-banner ${animate ? 'visible' : ''}`}>
        <div className="push-banner-inner">
          {/* Ícone */}
          <div className="push-banner-icon">
            <Bell size={22} color="white" />
          </div>

          {/* Conteúdo */}
          <div className="push-banner-content">
            <p className="push-banner-title">🔔 Ative as Notificações Push</p>
            <p className="push-banner-desc">
              Receba alertas de novas mensagens, aprovações de clientes e SLAs atrasados
              diretamente no seu dispositivo — mesmo com a plataforma fechada.
            </p>

            <div className="push-banner-devices">
              <Smartphone size={12} />
              <span>Funciona em PC, tablet e celular Android</span>
            </div>

            {/* Botões ou status */}
            {!status ? (
              <div className="push-banner-actions">
                <button
                  className="push-btn-activate"
                  onClick={handleActivate}
                  disabled={loading}
                >
                  {loading ? (
                    <><div className="push-spinner" /> Ativando...</>
                  ) : (
                    <><Bell size={14} /> Ativar Notificações</>
                  )}
                </button>
                <button className="push-btn-snooze" onClick={handleSnooze}>
                  Agora não
                </button>
              </div>
            ) : (
              <div className={`push-status-msg ${status === 'success' ? 'push-status-success' : 'push-status-denied'}`}>
                {status === 'success' && <><Bell size={14} /> Notificações ativadas com sucesso! ✅</>}
                {status === 'denied' && <><BellOff size={14} /> Permissão negada. Você pode ativar depois nas configurações do browser.</>}
                {status === 'error' && <><BellOff size={14} /> Erro ao ativar. Tente novamente mais tarde.</>}
              </div>
            )}
          </div>

          {/* Fechar */}
          <button className="push-close-btn" onClick={handleSnooze} title="Fechar">
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
