import React, { useState, useEffect } from 'react';
import { Zap, LogIn, RefreshCw, CheckCircle, AlertCircle, Link as LinkIcon, Trash2, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const GLOBAL_CALENDAR_ID = '00000000-0000-0000-0000-000000000000';

export default function IntegracoesGlobais() {
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [integration, setIntegration] = useState(null);

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_integrations')
      .select('*')
      .eq('employee_id', GLOBAL_CALENDAR_ID)
      .eq('provider', 'google_calendar')
      .maybeSingle();
      
    if (data) {
      setIntegration(data);
    } else {
      setIntegration(null);
    }
    setLoading(false);
  };

  const handleConnectGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Configure VITE_GOOGLE_CLIENT_ID no .env e na Vercel.');
      return;
    }
    const redirectUri = window.location.origin + '/auth/google/callback';
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${GLOBAL_CALENDAR_ID}`;
    
    // Salvar que estamos no modo global para quando voltar
    localStorage.setItem('google_auth_mode', 'global');
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (confirm('Tem certeza que deseja desconectar o Google Agenda Global? Todos os eventos globais deixarão de sincronizar.')) {
      setLoading(true);
      await supabase
        .from('employee_integrations')
        .delete()
        .eq('employee_id', GLOBAL_CALENDAR_ID)
        .eq('provider', 'google_calendar');
      
      // Limpa eventos globais associados
      await supabase
        .from('google_events')
        .delete()
        .eq('employee_id', GLOBAL_CALENDAR_ID);
        
      setIntegration(null);
      setLoading(false);
    }
  };

  const forceSync = async () => {
    if (!integration) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: { employeeId: GLOBAL_CALENDAR_ID }
      });
      if (error) throw error;
      alert(`Sincronização concluída com sucesso! ${data.count} eventos encontrados.`);
      fetchIntegration();
    } catch (err) {
      console.error(err);
      alert('Erro ao forçar sincronização: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !integration) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin" style={{ marginBottom: 16 }} />
        <span>Carregando integrações...</span>
      </div>
    );
  }

  return (
    <div className="integracoes-globais glass-card" style={{ padding: 24, borderRadius: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Zap size={24} style={{ color: '#818cf8' }} />
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>Integrações Globais da Empresa</h2>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 32, lineHeight: 1.6 }}>
        Conecte as contas oficiais da ROI EXPERT aqui. Diferente das integrações pessoais, 
        estas integrações alimentam as **Agendas Globais** (ex: Sucesso do Cliente, Comercial) para que toda a equipe possa visualizar os eventos da empresa.
      </p>

      {/* Google Agenda Card */}
      <div className="integration-card" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" style={{ width: 32, height: 32 }} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Google Agenda Oficial
                {integration ? (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} /> CONECTADO
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={12} /> DESCONECTADO
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Sincronize automaticamente os eventos do calendário principal da agência com o CRM.
              </p>
              
              {integration && (
                <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <p style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><LinkIcon size={14} /> Sincronizado desde: {new Date(integration.connected_at).toLocaleDateString('pt-BR')}</p>
                  <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Última sincronização: {integration.last_sync ? new Date(integration.last_sync).toLocaleString('pt-BR') : 'Nunca'}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!integration ? (
              <button 
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                style={{ background: '#4285f4', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: '0.2s' }}
              >
                {isConnecting ? <RefreshCw size={18} className="spin" /> : <LogIn size={18} />}
                {isConnecting ? 'Conectando...' : 'Conectar Conta Google'}
              </button>
            ) : (
              <>
                <button 
                  onClick={forceSync}
                  disabled={syncing}
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '0.2s' }}
                >
                  <RefreshCw size={16} className={syncing ? "spin" : ""} />
                  {syncing ? 'Sincronizando...' : 'Forçar Sincronização'}
                </button>
                <button 
                  onClick={handleDisconnect}
                  style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '0.2s' }}
                >
                  <Trash2 size={16} /> Desconectar
                </button>
              </>
            )}
          </div>
        </div>
        
        {!integration && (
          <div style={{ marginTop: 24, padding: 12, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <ShieldAlert size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Atenção Administrador:</strong>
              Certifique-se de conectar a conta Google <strong>OFICIAL da ROI EXPERT</strong> (a conta dona do calendário "ROI EXPERT"). 
              Não conecte sua conta pessoal de funcionário aqui. O que for conectado aqui será visível por toda a equipe na Agenda Global.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
