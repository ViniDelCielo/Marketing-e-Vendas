import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function GoogleAuthCallback() {
  const [status, setStatus] = useState('processando'); // processando, sucesso, erro
  const [message, setMessage] = useState('Conectando ao Google Calendar...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const employeeId = searchParams.get('state');

        if (error) {
          throw new Error(`O Google retornou um erro: ${error}`);
        }

        if (!code || !employeeId) {
          throw new Error('Código de autorização ou ID do usuário não encontrados na URL.');
        }

        // 1. Chamar a Edge Function para trocar o código pelo Refresh Token
        const redirectUri = window.location.origin + '/auth/google/callback';
        const { data, error: funcError } = await supabase.functions.invoke('google-calendar-auth', {
          body: { code, employeeId, redirectUri }
        });

        if (funcError) throw funcError;

        if (data && data.success) {
          setStatus('sucesso');
          setMessage('Google Calendar conectado com sucesso!');
          setTimeout(() => {
            const mode = localStorage.getItem('google_auth_mode');
            if (mode === 'global') {
              localStorage.removeItem('google_auth_mode');
              navigate('/conectividade-apis');
            } else {
              navigate('/agenda-pessoal');
            }
          }, 2000);
        } else {
          throw new Error(data?.error || 'Erro desconhecido ao autenticar');
        }

      } catch (err) {
        console.error('Erro no callback do Google:', err);
        setStatus('erro');
        setMessage(err.message || 'Falha ao conectar com o Google.');
      }
    };

    processCallback();
  }, [location, navigate]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #020617)' }}>
      <div className="glass-panel" style={{ padding: 40, borderRadius: 20, textAlign: 'center', maxWidth: 400, border: '1px solid rgba(255,255,255,0.05)' }}>
        
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
          {status === 'processando' && (
            <RefreshCw size={48} style={{ color: '#818cf8', animation: 'spin 1.5s linear infinite' }} />
          )}
          {status === 'sucesso' && (
            <CheckCircle size={48} style={{ color: '#4ade80' }} />
          )}
          {status === 'erro' && (
            <AlertCircle size={48} style={{ color: '#f87171' }} />
          )}
        </div>

        <h2 style={{ margin: '0 0 10px', color: 'var(--text-main, #f1f5f9)', fontSize: '1.2rem' }}>
          Integração Google Calendar
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {message}
        </p>

        {status === 'erro' && (
          <button 
            onClick={() => navigate('/agenda-pessoal')}
            style={{ marginTop: 24, padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Voltar para Agenda Pessoal
          </button>
        )}
      </div>
    </div>
  );
}
