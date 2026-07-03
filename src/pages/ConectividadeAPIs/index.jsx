import { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2, AlertCircle, CheckCircle, ExternalLink, Shield, Settings, CreditCard, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import WhatsAppConfig from './WhatsAppConfig';
import GoogleCalendarConfig from './GoogleCalendarConfig';

export default function ApiConnectivities() {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [asaasConfig, setAsaasConfig] = useState({ token: '', env: 'production' });
  const [savingAsaas, setSavingAsaas] = useState(false);

  const [driveConfig, setDriveConfig] = useState({ folder_id: '', enabled: false });
  const [savingDrive, setSavingDrive] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      // Fetch Asaas
      const { data: asaasData } = await supabase.from('system_settings').select('value').eq('key', 'asaas_api_key').single();
      if (asaasData?.value) {
        setAsaasConfig({ token: asaasData.value.token || '', env: asaasData.value.env || 'production' });
      }

      // Fetch Google Drive
      const { data: driveData } = await supabase.from('system_settings').select('value').eq('key', 'google_drive_config').single();
      if (driveData?.value) {
        setDriveConfig({ folder_id: driveData.value.folder_id || '', enabled: driveData.value.enabled || false });
      }

    } catch (error) {
      console.error("Erro ao carregar configurações de API:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveAsaas = async (e) => {
    e.preventDefault();
    setSavingAsaas(true);
    try {
      const { error } = await supabase.from('system_settings').upsert(
        { key: 'asaas_api_key', value: { token: asaasConfig.token.trim(), env: asaasConfig.env }, updated_at: new Date() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      showToast('Configurações do Asaas salvas com sucesso!');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingAsaas(false);
    }
  };

  const handleSaveDrive = async (e) => {
    e.preventDefault();
    setSavingDrive(true);
    try {
      const { error } = await supabase.from('system_settings').upsert(
        { key: 'google_drive_config', value: driveConfig, updated_at: new Date() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      showToast('Configurações do Google Drive salvas com sucesso!');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSavingDrive(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Carregando conectividades...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header className="page-header" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.85rem', color: 'var(--text-main)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Settings size={28} /> Conectividade de APIs
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Central de conexões da agência. Gerencie credenciais do Asaas, integrações do Google Drive e WhatsApp.
        </p>
      </header>

      <div className="api-connectivities" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {toast && (
        <div className={`toast-notif ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ASAAS SECTION */}
      <div className="glass-panel" style={{ padding: 32 }}>
        <h3 style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CreditCard size={24} className="text-primary" /> Gateway de Pagamento (Asaas)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Configure a chave da API do Asaas para automatizar a sincronização de clientes e faturas em tempo real na aba Financeiro.
        </p>

        <form onSubmit={handleSaveAsaas} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 20, alignItems: 'end' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>AMBIENTE</label>
            <select 
              className="glass-input" 
              style={{ width: '100%', padding: '12px' }}
              value={asaasConfig.env}
              onChange={e => setAsaasConfig({...asaasConfig, env: e.target.value})}
            >
              <option value="production">Produção (Real)</option>
              <option value="sandbox">Sandbox (Teste)</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>API KEY (TOKEN)</label>
            <div style={{ position: 'relative' }}>
              <Shield size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password"
                className="glass-input" 
                style={{ width: '100%', padding: '12px 12px 12px 40px' }}
                placeholder="$aact_..."
                value={asaasConfig.token}
                onChange={e => setAsaasConfig({...asaasConfig, token: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={savingAsaas}
            className="glass-btn primary" 
            style={{ padding: '12px 24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, height: '44px' }}
          >
            {savingAsaas ? <Loader2 size={18} className="spin" /> : <Save size={18} />} SALVAR
          </button>
        </form>
      </div>

      {/* GOOGLE DRIVE SECTION */}
      <div className="glass-panel" style={{ padding: 32 }}>
        <h3 style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Cloud size={24} className="text-primary" /> Armazenamento (Google Drive)
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Centralize os arquivos dos clientes conectando a pasta principal da agência no Google Drive.
        </p>

        <form onSubmit={handleSaveDrive} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 20, alignItems: 'end' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>STATUS DO MÓDULO</label>
            <div 
              onClick={() => setDriveConfig({...driveConfig, enabled: !driveConfig.enabled})}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', 
                background: driveConfig.enabled ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${driveConfig.enabled ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 10, cursor: 'pointer', transition: '0.2s', height: '44px'
              }}
            >
              <div className={`svc-toggle-sw ${driveConfig.enabled ? 'on' : ''}`}>
                <div className="svc-knob" />
              </div>
              <span style={{ fontWeight: 700, color: driveConfig.enabled ? '#34d399' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                {driveConfig.enabled ? 'ATIVADO' : 'DESATIVADO'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, display: 'block' }}>ID DA PASTA ROOT DO DRIVE</label>
            <input 
              className="glass-input" 
              style={{ width: '100%', padding: '12px' }}
              placeholder="Ex: 1A2b3C4d5E6f7G8h9I..."
              value={driveConfig.folder_id}
              onChange={e => setDriveConfig({...driveConfig, folder_id: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={savingDrive}
            className="glass-btn primary" 
            style={{ padding: '12px 24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, height: '44px' }}
          >
            {savingDrive ? <Loader2 size={18} className="spin" /> : <Save size={18} />} SALVAR
          </button>
        </form>
      </div>

      {/* WHATSAPP (EXISTING COMPONENT) */}
      <WhatsAppConfig inline />

      {/* GOOGLE CALENDAR GLOBAL */}
      <GoogleCalendarConfig />

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
    </div>
  );
}
