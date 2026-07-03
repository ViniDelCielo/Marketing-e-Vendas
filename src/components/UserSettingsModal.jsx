import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { subscribeToPush } from '../services/pushService';
import { 
  X, Shield, CreditCard, Video, Mic, MapPin, Bell, Lock, Mail, RefreshCw, CheckCircle, AlertTriangle, Camera, User, Phone, Save 
} from 'lucide-react';
import PhotoUpload from './PhotoUpload';

export default function UserSettingsModal({ onClose, user }) {
  const [activeTab, setActiveTab] = useState('acesso');
  const [clientData, setClientData] = useState(null);
  
  // Estados para permissões
  const [notifPerm, setNotifPerm] = useState('default');
  const [camPerm, setCamPerm] = useState('prompt');
  const [micPerm, setMicPerm] = useState('prompt');
  const [locPerm, setLocPerm] = useState('prompt');

  // Estados para alteração de senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });

  const isClient = user?.role === 'client';

  // Employee profile editing
  const [empData, setEmpData] = useState(null);
  const [empForm, setEmpForm] = useState({ name: '', phone: '', position: '', avatar_url: null });
  const [empSaving, setEmpSaving] = useState(false);
  const [empMessage, setEmpMessage] = useState({ text: '', type: '' });

  // Buscar dados do cliente (plano)
  useEffect(() => {
    if (isClient && user?.clientUuid) {
      supabase.from('clients')
        .select('*')
        .eq('id', user.clientUuid)
        .single()
        .then(({ data }) => {
          if (data) setClientData(data);
        });
    }
  }, [user, isClient]);

  // Fetch employee data for profile editing
  useEffect(() => {
    if (user?.employeeId) {
      supabase.from('employees')
        .select('id, name, phone, position, department, avatar_url, avatar_color')
        .eq('id', user.employeeId)
        .single()
        .then(({ data }) => {
          if (data) {
            setEmpData(data);
            setEmpForm({
              name: data.name || '',
              phone: data.phone || '',
              position: data.position || '',
              avatar_url: data.avatar_url || null
            });
          }
        });
    }
  }, [user?.employeeId]);

  // Função para verificar o status atual das permissões no navegador
  const checkPermissions = async () => {
    // 1. Notificações
    setNotifPerm(Notification.permission);

    // 2. Câmera, Microfone e Localização usando a Permissions API
    if (navigator.permissions) {
      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' });
        setLocPerm(geo.state);
        geo.onchange = () => setLocPerm(geo.state);
      } catch (e) { console.warn(e); }

      try {
        const cam = await navigator.permissions.query({ name: 'camera' });
        setCamPerm(cam.state);
        cam.onchange = () => setCamPerm(cam.state);
      } catch (e) { console.warn(e); }

      try {
        const mic = await navigator.permissions.query({ name: 'microphone' });
        setMicPerm(mic.state);
        mic.onchange = () => setMicPerm(mic.state);
      } catch (e) { console.warn(e); }
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  // Handlers para solicitar permissões
  const requestNotificationPermission = async () => {
    const res = await subscribeToPush();
    if (res === 'granted') {
      new Notification('Notificações Ativas!', {
        body: 'Você receberá os alertas do ROI Expert neste dispositivo.',
        icon: '/favicon.svg'
      });
    }
    checkPermissions();
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Para a câmera imediatamente após conseguir permissão
      stream.getTracks().forEach(track => track.stop());
      checkPermissions();
    } catch (err) {
      console.warn('Câmera negada ou indisponível:', err);
      setCamPerm('denied');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      checkPermissions();
    } catch (err) {
      console.warn('Microfone negado ou indisponível:', err);
      setMicPerm('denied');
    }
  };

  const requestLocationPermission = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Localização permitida:', pos);
        checkPermissions();
      },
      (err) => {
        console.warn('Localização negada:', err);
        setLocPerm('denied');
      }
    );
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setPassMessage({ text: 'Por favor, insira a nova senha.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMessage({ text: 'A senha deve conter pelo menos 6 caracteres.', type: 'error' });
      return;
    }

    setPassLoading(true);
    setPassMessage({ text: '', type: '' });

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPassLoading(false);
    if (error) {
      setPassMessage({ text: 'Erro ao atualizar senha: ' + error.message, type: 'error' });
    } else {
      setPassMessage({ text: 'Senha atualizada com sucesso! ✅', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.employeeId) return;
    setEmpSaving(true);
    setEmpMessage({ text: '', type: '' });
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: empForm.name,
          phone: empForm.phone,
          position: empForm.position,
          avatar_url: empForm.avatar_url
        })
        .eq('id', user.employeeId);
      if (error) throw error;

      // Also update the profile name
      await supabase.from('profiles').update({ name: empForm.name }).eq('employee_id', user.employeeId);

      setEmpMessage({ text: 'Dados atualizados com sucesso! ✅', type: 'success' });
    } catch (err) {
      setEmpMessage({ text: 'Erro ao salvar: ' + err.message, type: 'error' });
    } finally {
      setEmpSaving(false);
    }
  };

  const renderPermissionBadge = (state) => {
    if (state === 'granted') {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Permitido</span>;
    }
    if (state === 'denied') {
      return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Bloqueado</span>;
    }
    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Não Solicitado</span>;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }} onClick={onClose}>
      
      <div 
        onClick={e => e.stopPropagation()} 
        className="glass-panel"
        style={{
          width: '100%', maxWidth: 720, height: 600, borderRadius: 24, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} style={{ color: 'var(--primary)' }} />
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>Configurações de Conta e Segurança</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={22} />
          </button>
        </div>

        {/* Body Container */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          
          {/* Sidebar Tabs */}
          <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 4, padding: '16px 8px' }}>
            <button 
              onClick={() => setActiveTab('acesso')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left',
                background: activeTab === 'acesso' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'acesso' ? 'white' : 'var(--text-muted)',
                transition: '0.2s'
              }}
            >
              <Lock size={16} /> Meu Acesso
            </button>

            {isClient && (
              <button 
                onClick={() => setActiveTab('plano')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left',
                  background: activeTab === 'plano' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'plano' ? 'white' : 'var(--text-muted)',
                  transition: '0.2s'
                }}
              >
                <CreditCard size={16} /> Meu Plano
              </button>
            )}

            <button 
              onClick={() => setActiveTab('permissoes')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left',
                background: activeTab === 'permissoes' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'permissoes' ? 'white' : 'var(--text-muted)',
                transition: '0.2s'
              }}
            >
              <Video size={16} /> Permissões
            </button>
          </div>

          {/* Content Panel */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: 'rgba(0,0,0,0.05)' }}>
            
            {/* Tab: Acesso */}
            {activeTab === 'acesso' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Employee Profile Section */}
                {user?.employeeId && empData && (
                  <div>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={16} style={{ color: 'var(--primary)' }} /> Meus Dados Pessoais
                    </h3>

                    {/* Avatar + Form */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                      {/* Photo */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <PhotoUpload
                          currentUrl={empForm.avatar_url}
                          fallbackColor={empData.avatar_color || '#6366f1'}
                          fallbackText={(empForm.name || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                          type="employee"
                          entityId={empData.id}
                          onUpload={(url) => setEmpForm(f => ({ ...f, avatar_url: url }))}
                          size={80}
                          shape="circle"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Clique para alterar</span>
                      </div>

                      {/* Fields */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Nome Completo</label>
                          <input
                            value={empForm.name}
                            onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))}
                            className="glass-input"
                            style={{ width: '100%', fontSize: '0.85rem' }}
                            placeholder="Seu nome completo"
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Telefone</label>
                            <input
                              value={empForm.phone}
                              onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                              className="glass-input"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Cargo</label>
                            <input
                              value={empForm.position}
                              onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))}
                              className="glass-input"
                              style={{ width: '100%', fontSize: '0.85rem' }}
                              placeholder="Ex: Social Media"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {empMessage.text && (
                      <div style={{
                        marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8,
                        background: empMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: empMessage.type === 'success' ? '#34d399' : '#f87171',
                        border: `1px solid ${empMessage.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                      }}>
                        {empMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                        {empMessage.text}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={empSaving}
                      className="glass-btn primary"
                      style={{ marginTop: 12, padding: '8px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.82rem' }}
                    >
                      {empSaving ? <RefreshCw size={14} className="spin" /> : <><Save size={14} /> Salvar Dados</>}
                    </button>
                  </div>
                )}

                <div style={{ borderTop: user?.employeeId ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: user?.employeeId ? 20 : 0 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: 'white' }}>Credenciais de Acesso</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                    <Mail size={18} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>E-mail da Conta</div>
                      <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 500 }}>{user?.email}</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'white' }}>Alterar Senha</h3>
                  <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Crie uma nova senha forte para proteger seu acesso.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Nova Senha</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        placeholder="Mínimo 6 dígitos" 
                        className="glass-input" 
                        style={{ width: '100%', fontSize: '0.85rem' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Confirmar Nova Senha</label>
                      <input 
                        type="password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        placeholder="Repita a nova senha" 
                        className="glass-input" 
                        style={{ width: '100%', fontSize: '0.85rem' }} 
                      />
                    </div>
                  </div>

                  {passMessage.text && (
                    <div style={{ 
                      padding: '10px 14px', borderRadius: 8, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 8,
                      background: passMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: passMessage.type === 'success' ? '#34d399' : '#f87171',
                      border: `1px solid ${passMessage.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                    }}>
                      {passMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                      {passMessage.text}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="glass-btn primary" 
                    disabled={passLoading}
                    style={{ padding: '10px 20px', borderRadius: 10, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.82rem', marginTop: 8 }}
                  >
                    {passLoading ? <RefreshCw size={14} className="spin" /> : 'Atualizar Senha'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Plano */}
            {activeTab === 'plano' && isClient && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Assinatura & Plano Contratado</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                  <div style={{ padding: 20, background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plano Atual</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{clientData?.metadata?.plan_name || 'Plano ROI Elite'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Acesso total ao painel de aprovações de mídias, captação, tráfego pago, chat com equipe e relatórios em tempo real.</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status do Plano</span>
                      <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: 700 }}>● {clientData?.status || 'Ativo'}</span>
                    </div>

                    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Suporte e Acompanhamento</span>
                      <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>{clientData?.metadata?.support_tier || 'Suporte VIP Individual'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} style={{ color: '#34d399' }} /> Para alterar seu plano ou ver faturas, entre em contato diretamente pelo chat de atendimento.
                </div>
              </div>
            )}

            {/* Tab: Permissões */}
            {activeTab === 'permissoes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Permissões do Navegador</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ative o acesso a recursos do seu navegador para obter o máximo desempenho da plataforma.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {/* Card: Notificações */}
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: 10, borderRadius: 10 }}>
                        <Bell size={18} />
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'white' }}>Notificações Push</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alertas de mensagens, handoffs e prazos.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {renderPermissionBadge(notifPerm)}
                      <button 
                        onClick={requestNotificationPermission}
                        disabled={notifPerm === 'granted'}
                        className="glass-btn primary small"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, fontWeight: 700 }}
                      >
                        {notifPerm === 'granted' ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {/* Card: Câmera */}
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 10 }}>
                        <Video size={18} />
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'white' }}>Câmera</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Para chamadas de vídeo e gravação de briefings.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {renderPermissionBadge(camPerm)}
                      <button 
                        onClick={requestCameraPermission}
                        disabled={camPerm === 'granted'}
                        className="glass-btn primary small"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, fontWeight: 700 }}
                      >
                        {camPerm === 'granted' ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {/* Card: Microfone */}
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: 10, borderRadius: 10 }}>
                        <Mic size={18} />
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'white' }}>Microfone</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Para reuniões de briefing integradas no painel.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {renderPermissionBadge(micPerm)}
                      <button 
                        onClick={requestMicrophonePermission}
                        disabled={micPerm === 'granted'}
                        className="glass-btn primary small"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, fontWeight: 700 }}
                      >
                        {micPerm === 'granted' ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>

                  {/* Card: Localização */}
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 10 }}>
                        <MapPin size={18} />
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: 'white' }}>Localização</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Para registrar o fuso horário e segurança de login.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {renderPermissionBadge(locPerm)}
                      <button 
                        onClick={requestLocationPermission}
                        disabled={locPerm === 'granted'}
                        className="glass-btn primary small"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, fontWeight: 700 }}
                      >
                        {locPerm === 'granted' ? 'Ativo' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
