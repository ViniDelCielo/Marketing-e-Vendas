import { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2, AlertCircle, CheckCircle, ExternalLink, Shield, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function WhatsAppConfig() {
  const [config, setConfig] = useState({
    provider: 'evolution',
    api_url: '',
    api_key: '',
    instance_name: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [connectionState, setConnectionState] = useState('unknown'); // 'open', 'connecting', 'close', 'unknown'
  const [checkingState, setCheckingState] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'whatsapp_config')
        .single();

      if (data) {
        setConfig(data.value);
      }
    } catch (error) {
      console.error("Erro ao carregar config WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'whatsapp_config', value: config, updated_at: new Date().toISOString() });

      if (error) throw error;
      showToast('Configurações salvas com sucesso!');
      checkConnectionState();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const checkConnectionState = async () => {
    if (!config.api_url || !config.api_key || !config.instance_name) return;
    setCheckingState(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'check-status' }
      });
      if (error) throw error;
      if (data?.success) {
        setConnectionState(data.state);
        if (data.state === 'open') {
          setShowQrModal(false);
        }
      } else {
        setConnectionState('error');
      }
    } catch (err) {
      console.error("Erro ao checar status do whatsapp:", err);
      setConnectionState('error');
    } finally {
      setCheckingState(false);
    }
  };

  const generateQrCode = async () => {
    setCheckingState(true);
    setQrCode(null);
    setShowQrModal(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'get-qr' }
      });
      if (error) throw error;
      if (data?.success && data.base64) {
        setQrCode(data.base64.startsWith('data:image') ? data.base64 : `data:image/png;base64,${data.base64}`);
        setConnectionState('connecting');
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao gerar QR Code');
      }
    } catch (err) {
      showToast('Erro ao gerar QR Code: ' + err.message, 'error');
      setShowQrModal(false);
    } finally {
      setCheckingState(false);
    }
  };

  const handleLogout = async () => {
    setCheckingState(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'logout' }
      });
      if (error) throw error;
      showToast('Celular desconectado com sucesso!');
      setConnectionState('close');
    } catch (err) {
      showToast('Erro ao desconectar: ' + err.message, 'error');
    } finally {
      setCheckingState(false);
    }
  };

  useEffect(() => {
    let interval;
    if (showQrModal || connectionState === 'connecting') {
      interval = setInterval(() => {
        checkConnectionState();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQrModal, connectionState, config]);

  useEffect(() => {
    if (!loading && config.api_url && config.api_key && config.instance_name) {
      checkConnectionState();
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="whatsapp-config">
      {toast && (
        <div className={`toast-notif ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        <div className="glass-panel" style={{ padding: 32 }}>
          <h3 style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageSquare size={24} className="text-primary" /> Conectar API de WhatsApp
          </h3>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>PROVEDOR DE API</label>
                <select 
                  className="glass-input" 
                  style={{ width: '100%', padding: '12px' }}
                  value={config.provider}
                  onChange={e => setConfig({...config, provider: e.target.value})}
                >
                  <option value="evolution">Evolution API (Recomendado)</option>
                  <option value="zapi">Z-API</option>
                  <option value="twilio">Twilio (WhatsApp Business)</option>
                  <option value="custom">Webhook Personalizado</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>STATUS DO SERVIÇO</label>
                <div 
                  onClick={() => setConfig({...config, enabled: !config.enabled})}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', 
                    background: config.enabled ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${config.enabled ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 10, cursor: 'pointer', transition: '0.2s'
                  }}
                >
                  <div className={`svc-toggle-sw ${config.enabled ? 'on' : ''}`}>
                    <div className="svc-knob" />
                  </div>
                  <span style={{ fontWeight: 700, color: config.enabled ? '#34d399' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {config.enabled ? 'ATIVADO' : 'DESATIVADO'}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>URL DA API (BASE URL)</label>
              <input 
                className="glass-input" 
                style={{ width: '100%', padding: '12px' }}
                placeholder="https://api.sua-instancia.com"
                value={config.api_url}
                onChange={e => setConfig({...config, api_url: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>API KEY / GLOBAL TOKEN</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="password"
                    className="glass-input" 
                    style={{ width: '100%', padding: '12px 12px 12px 40px' }}
                    placeholder="Seu token de acesso..."
                    value={config.api_key}
                    onChange={e => setConfig({...config, api_key: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>NOME DA INSTÂNCIA</label>
                <input 
                  className="glass-input" 
                  style={{ width: '100%', padding: '12px' }}
                  placeholder="Ex: ROI_EXPERT_MAIN"
                  value={config.instance_name}
                  onChange={e => setConfig({...config, instance_name: e.target.value})}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button 
                type="submit" 
                disabled={saving}
                className="glass-btn primary" 
                style={{ width: '100%', padding: 16, fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                {saving ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
                SALVAR CONFIGURAÇÕES DE WHATSAPP
              </button>
            </div>
          </form>

          {/* ÁREA DE CONEXÃO DO CELULAR */}
          {config.api_url && config.api_key && config.instance_name && (
            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                Conexão com Celular (Evolution API)
              </h4>

              {connectionState === 'open' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(52, 211, 153, 0.1)', padding: 20, borderRadius: 12, border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <CheckCircle size={28} color="#34d399" />
                    <div>
                      <h4 style={{ margin: 0, color: '#34d399', fontSize: '1.1rem' }}>WhatsApp Conectado!</h4>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Instância <strong>{config.instance_name}</strong> está online e pronta para enviar mensagens.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    disabled={checkingState}
                    className="glass-btn" 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%' }}
                  >
                    {checkingState ? <Loader2 size={16} className="spin" /> : 'Desconectar Celular'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Sua API está salva. Clique abaixo para gerar o QR Code, depois abra o WhatsApp no seu celular e escaneie.
                  </p>
                  
                  {showQrModal && qrCode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'white', padding: 20, borderRadius: 12 }}>
                      <img src={qrCode} alt="WhatsApp QR Code" style={{ width: 240, height: 240 }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111', fontWeight: 600 }}>
                        <Loader2 size={16} className="spin" /> Aguardando você escanear...
                      </div>
                      <button 
                        onClick={() => setShowQrModal(false)}
                        style={{ border: 'none', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={generateQrCode}
                      disabled={checkingState}
                      className="glass-btn primary" 
                      style={{ background: 'var(--primary)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {checkingState ? <Loader2 size={18} className="spin" /> : 'Gerar QR Code / Conectar'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ padding: 24, background: 'rgba(99, 102, 241, 0.05)' }}>
            <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#a5b4fc' }}>
              <Settings size={18} /> Como funciona?
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Ao ativar esta integração, o sistema enviará mensagens automáticas quando:
            </p>
            <ul style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: 20, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Um material for enviado para <strong>aprovação do cliente</strong>.</li>
              <li>Uma <strong>nova reunião</strong> for agendada.</li>
              <li>Um colaborador for <strong>mencionado em uma ata</strong>.</li>
            </ul>
          </div>

          <div className="glass-panel" style={{ padding: 24 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>Guia de Integração</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Recomendamos o uso da <strong>Evolution API</strong> por ser open-source e extremamente estável.
            </p>
            <button 
              onClick={() => window.open('https://evolution-api.com/', '_blank')}
              className="glass-btn" 
              style={{ width: '100%', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Documentação Evolution <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .glass-input {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          outline: none;
          transition: 0.2s;
        }
        .glass-input:focus {
          border-color: var(--primary);
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.1);
        }
        .svc-toggle-sw {
          width: 36px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          position: relative;
          transition: 0.3s;
        }
        .svc-toggle-sw.on { background: #34d399; }
        .svc-knob {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: 0.3s;
        }
        .svc-toggle-sw.on .svc-knob { left: 19px; }
      `}</style>
    </div>
  );
}
