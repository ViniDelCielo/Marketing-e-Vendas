import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Trash2, Edit, Save, X, Phone, User, Settings, Bot, ArrowLeft, Send, Play, RefreshCw, Check, CheckCircle, AlertCircle, Eye, Shield, HelpCircle, Smartphone, Wifi, Smile, Paperclip, Mic } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function CommercialConnectivity({ employees }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Modals & Selections
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // QR Code / Connection simulation states
  const [qrCode, setQrCode] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const [simulatedTime, setSimulatedTime] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    whatsapp_number: '',
    provider: 'evolution',
    api_url: '',
    api_key: '',
    instance_name: '',
    status: 'disconnected',
    assigned_employee_id: '',
    bot_enabled: false,
    bot_greeting: 'Olá! 👋 Seja bem-vindo ao departamento comercial da *ROI Expert*.\n\nComo posso ajudar você hoje? Escolha uma das opções abaixo:',
    bot_departments: [
      { id: 1, emoji: '📊', name: 'Tráfego Pago', description: 'Google Ads e Meta Ads', responseMessage: 'Perfeito! Nosso especialista em Tráfego Pago entrará em contato em breve para analisar suas campanhas. 🚀', active: true },
      { id: 2, emoji: '🎨', name: 'Design / Criativos', description: 'Artes e peças de criativos', responseMessage: 'Excelente! Vamos criar as melhores peças de design para você. Logo um designer falará com você. 🎨', active: true },
      { id: 3, emoji: '🎥', name: 'Gravação e Captação', description: 'Agendar gravação de vídeos', responseMessage: 'Perfeito! Vamos agendar a produção dos seus vídeos. Nossa equipe de captação entrará em contato. 🎥', active: true }
    ]
  });

  // Simulator chat states
  const [simMessages, setSimMessages] = useState([]);
  const [simStep, setSimStep] = useState(0); // 0: not started, 1: greeting, 2: selected option
  const [simSelectedOption, setSimSelectedOption] = useState(null);
  const simEndRef = useRef(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (isPreviewOpen) {
      resetSimulation();
    }
  }, [isPreviewOpen]);

  useEffect(() => {
    simEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'commercial_whatsapp_configs')
        .single();

      if (data?.value) {
        setConnections(data.value);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error("Erro ao carregar conexões de WhatsApp:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveConnection = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.whatsapp_number) {
      showToast("Preencha nome e número do WhatsApp", "error");
      return;
    }

    let updatedList = [];
    if (formData.id) {
      // Edit
      updatedList = connections.map(c => c.id === formData.id ? { ...c, ...formData } : c);
      showToast("Conexão atualizada!");
    } else {
      // Add new
      const newConn = {
        ...formData,
        id: Date.now().toString(),
        status: 'disconnected'
      };
      updatedList = [...connections, newConn];
      showToast("Nova conexão adicionada!");
    }

    // Save in Supabase
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commercial_whatsapp_configs',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConnections(updatedList);
      setIsEditModalOpen(false);
    } catch (err) {
      showToast("Erro ao salvar: " + err.message, "error");
    }
  };

  const handleDeleteConnection = async (id) => {
    if (!window.confirm("Deseja realmente remover esta conexão de WhatsApp?")) return;
    
    const updatedList = connections.filter(c => c.id !== id);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commercial_whatsapp_configs',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConnections(updatedList);
      showToast("Conexão removida com sucesso!");
    } catch (err) {
      showToast("Erro ao deletar: " + err.message, "error");
    }
  };

  const openAddModal = () => {
    setFormData({
      id: null,
      name: '',
      whatsapp_number: '',
      provider: 'evolution',
      api_url: '',
      api_key: '',
      instance_name: '',
      status: 'disconnected',
      assigned_employee_id: '',
      bot_enabled: false,
      bot_greeting: 'Olá! 👋 Seja bem-vindo ao departamento comercial da *ROI Expert*.\n\nComo posso ajudar você hoje? Escolha uma das opções abaixo:',
      bot_departments: [
        { id: 1, emoji: '📊', name: 'Tráfego Pago', description: 'Google Ads e Meta Ads', responseMessage: 'Perfeito! Nosso especialista em Tráfego Pago entrará em contato em breve para analisar suas campanhas. 🚀', active: true },
        { id: 2, emoji: '🎨', name: 'Design / Criativos', description: 'Artes e peças de criativos', responseMessage: 'Excelente! Vamos criar as melhores peças de design para você. Logo um designer falará com você. 🎨', active: true },
        { id: 3, emoji: '🎥', name: 'Gravação e Captação', description: 'Agendar gravação de vídeos', responseMessage: 'Perfeito! Vamos agendar a produção dos seus vídeos. Nossa equipe de captação entrará em contato. 🎥', active: true }
      ]
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (conn) => {
    setFormData(conn);
    setIsEditModalOpen(true);
  };

  const openBotModal = (conn) => {
    setFormData(conn);
    setIsBotModalOpen(true);
  };

  const handleSaveChatbot = async () => {
    const updatedList = connections.map(c => c.id === formData.id ? { ...c, bot_enabled: formData.bot_enabled, bot_greeting: formData.bot_greeting, bot_departments: formData.bot_departments } : c);
    
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commercial_whatsapp_configs',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConnections(updatedList);
      setIsBotModalOpen(false);
      showToast("Configuração do Chatbot salva!");
    } catch (err) {
      showToast("Erro ao salvar chatbot: " + err.message, "error");
    }
  };

  const startConnectionFlow = (conn) => {
    setConnectingId(conn.id);
    setQrCode(null);
    
    // Generate QR Code with fallback
    setTimeout(() => {
      const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=ROI_EXPERT_COMMERCIAL_${conn.instance_name || 'CONN'}_${Date.now()}&color=0f172a&bgcolor=FFFFFF`;
      setQrCode(qrData);
    }, 1000);
  };

  const simulateSuccessfulConnection = async (id) => {
    const updatedList = connections.map(c => c.id === id ? { ...c, status: 'connected' } : c);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commercial_whatsapp_configs',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConnections(updatedList);
      setConnectingId(null);
      setQrCode(null);
      showToast("WhatsApp Conectado com Sucesso!");
    } catch (err) {
      showToast("Erro ao conectar: " + err.message, "error");
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm("Deseja realmente desconectar este celular?")) return;
    
    const updatedList = connections.map(c => c.id === id ? { ...c, status: 'disconnected' } : c);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'commercial_whatsapp_configs',
          value: updatedList,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setConnections(updatedList);
      showToast("WhatsApp Desconectado.");
    } catch (err) {
      showToast("Erro ao desconectar: " + err.message, "error");
    }
  };

  // Bot Config Sub-methods
  const updateBotDept = (id, field, val) => {
    const updatedDepts = formData.bot_departments.map(d => d.id === id ? { ...d, [field]: val } : d);
    setFormData({ ...formData, bot_departments: updatedDepts });
  };

  const addBotDept = () => {
    const newDept = {
      id: Date.now(),
      emoji: '💬',
      name: 'Novo Departamento',
      description: 'Opção do chatbot',
      responseMessage: 'Olá! Você selecionou o novo departamento. Em breve um atendente entrará em contato.',
      active: true
    };
    setFormData({ ...formData, bot_departments: [...formData.bot_departments, newDept] });
  };

  const removeBotDept = (id) => {
    const updatedDepts = formData.bot_departments.filter(d => d.id !== id);
    setFormData({ ...formData, bot_departments: updatedDepts });
  };

  // Chat Simulator Logic
  const resetSimulation = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSimulatedTime(timeStr);
    setSimMessages([
      { id: 1, sender: 'user', content: 'Olá, gostaria de saber mais informações!', time: timeStr }
    ]);
    setSimStep(0);
    setSimSelectedOption(null);

    // After 1.5s, bot greeting
    setTimeout(() => {
      setSimStep(1);
      setSimMessages(prev => [
        ...prev,
        { id: 2, sender: 'bot', content: formData.bot_greeting, time: timeStr, isGreeting: true }
      ]);
    }, 1500);
  };

  const selectSimOption = (option) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSimSelectedOption(option);
    setSimStep(2);
    
    setSimMessages(prev => [
      ...prev,
      { id: Date.now(), sender: 'user', content: `${option.emoji} ${option.name}`, time: timeStr },
      { id: Date.now() + 1, sender: 'bot', content: option.responseMessage || `Perfeito! Estou redirecionando você para o departamento de ${option.name}.`, time: timeStr }
    ]);

    // Redirection message
    setTimeout(() => {
      const empName = employees.find(e => e.id === formData.assigned_employee_id)?.name || 'um atendente comercial';
      setSimMessages(prev => [
        ...prev,
        { id: Date.now() + 2, sender: 'system', content: `🔗 Chat transferido para ${empName}` }
      ]);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
      {toast && (
        <div className={`toast-notif ${toast.type}`} style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="glass-panel" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>Conectividade do Comercial</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Gerencie múltiplos números de WhatsApp para a equipe de vendas, configure APIs e defina chatbots exclusivos.
          </p>
        </div>
        <button onClick={openAddModal} className="glass-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontWeight: 700 }}>
          <Plus size={18} /> Adicionar Número
        </button>
      </div>

      {/* CONNECTION LIST */}
      <div className="connectivity-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
        {connections.map(conn => {
          const emp = employees.find(e => e.id === conn.assigned_employee_id);
          return (
            <div key={conn.id} className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, border: conn.status === 'connected' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.05)', background: conn.status === 'connected' ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255,255,255,0.01)', position: 'relative', transition: '0.3s' }}>
              
              {/* TOP INFO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: 'white', fontWeight: 700 }}>{conn.name}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} /> {conn.whatsapp_number}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    background: conn.status === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
                    color: conn.status === 'connected' ? '#10b981' : 'var(--text-muted)', 
                    padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: conn.status === 'connected' ? '#10b981' : '#8696a0', display: 'inline-block', boxShadow: conn.status === 'connected' ? '0 0 6px #10b981' : 'none' }}></span>
                    {conn.status === 'connected' ? 'ONLINE' : 'DESCONECTADO'}
                  </span>
                </div>
              </div>

              {/* DETAILS */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 10, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Provedor:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{conn.provider === 'evolution' ? 'Evolution API' : conn.provider === 'zapi' ? 'Z-API' : conn.provider === 'twilio' ? 'Twilio (Official)' : 'Personalizado'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Instância:</span>
                  <span style={{ color: 'white', fontFamily: 'monospace' }}>{conn.instance_name || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Atendente:</span>
                  <span style={{ color: '#a5b4fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={12} /> {emp ? emp.name : 'Não atribuído'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chatbot:</span>
                  <span style={{ 
                    color: conn.bot_enabled ? '#38bdf8' : 'var(--text-muted)', 
                    fontWeight: 700, fontSize: '0.72rem',
                    background: conn.bot_enabled ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.02)',
                    padding: '2px 8px', borderRadius: 4
                  }}>
                    {conn.bot_enabled ? 'ATIVO' : 'INATIVO'}
                  </span>
                </div>
              </div>

              {/* ACTIVE CONNECTION FLOW */}
              {connectingId === conn.id && (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', position: 'absolute', inset: 0, borderRadius: 16, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
                  {qrCode ? (
                    <>
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'white' }}>Escaneie o QR Code no seu Celular</h4>
                      <div style={{ background: 'white', padding: 12, borderRadius: 12, marginBottom: 12 }}>
                        <img src={qrCode} alt="WhatsApp QR Code" style={{ width: 140, height: 140, display: 'block' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setConnectingId(null); setQrCode(null); }} className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          Cancelar
                        </button>
                        <button onClick={() => simulateSuccessfulConnection(conn.id)} className="glass-btn primary" style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#10b981' }}>
                          Simular Sucesso
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <RefreshCw size={24} className="spin text-primary" />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Gerando código de conexão...</span>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 14 }}>
                {conn.status === 'connected' ? (
                  <button onClick={() => handleDisconnect(conn.id)} className="glass-btn" style={{ flex: 1.5, padding: '8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    Desconectar
                  </button>
                ) : (
                  <button onClick={() => startConnectionFlow(conn)} className="glass-btn primary" style={{ flex: 1.5, padding: '8px', fontSize: '0.75rem' }}>
                    Conectar
                  </button>
                )}
                
                <button onClick={() => openBotModal(conn)} className="glass-btn" title="Configurar Chatbot" style={{ flex: 1, padding: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#38bdf8' }}>
                  <Bot size={14} /> Bot
                </button>
                
                <button onClick={() => openEditModal(conn)} className="glass-btn" title="Editar Conexão" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit size={14} />
                </button>
                
                <button onClick={() => handleDeleteConnection(conn.id)} className="glass-btn" title="Remover Conexão" style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          );
        })}

        {connections.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 6px', color: 'white' }}>Nenhuma Conexão Registrada</h4>
            <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cadastre os números de celular dos seus vendedores comerciais para começar.</p>
            <button onClick={openAddModal} className="glass-btn primary" style={{ margin: '0 auto' }}>Cadastrar Primeiro Número</button>
          </div>
        )}
      </div>

      {/* EDIT / ADD MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative' }}>
            <button onClick={() => setIsEditModalOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              {formData.id ? <Edit size={20} /> : <Plus size={20} />}
              {formData.id ? 'Editar Conexão' : 'Nova Conexão WhatsApp'}
            </h3>
            
            <form onSubmit={handleSaveConnection} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Nome Identificador *</label>
                <input required placeholder="Ex: Comercial WhatsApp 1" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Número (WhatsApp) *</label>
                  <input required placeholder="Ex: 5511999999999" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.whatsapp_number} onChange={e => setFormData({ ...formData, whatsapp_number: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Provedor de API</label>
                  <select className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.provider} onChange={e => setFormData({ ...formData, provider: e.target.value })}>
                    <option value="evolution">Evolution API</option>
                    <option value="zapi">Z-API</option>
                    <option value="twilio">Twilio (Official)</option>
                    <option value="custom">Outro / Personalizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>URL Base da API</label>
                <input placeholder="Ex: https://api.sua-evolution.com" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.api_url} onChange={e => setFormData({ ...formData, api_url: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Nome da Instância</label>
                  <input placeholder="Ex: sales_insta_1" className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.instance_name} onChange={e => setFormData({ ...formData, instance_name: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>API Key / Token</label>
                  <input type="password" placeholder="Chave de segurança..." className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.api_key} onChange={e => setFormData({ ...formData, api_key: e.target.value })} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Atendente Comercial Responsável</label>
                <select className="glass-input" style={{ width: '100%', padding: '10px' }} value={formData.assigned_employee_id} onChange={e => setFormData({ ...formData, assigned_employee_id: e.target.value })}>
                  <option value="">Nenhum - Atribuição Automática</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="glass-btn primary" style={{ flex: 1 }}>Salvar Conexão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHATBOT CONFIG MODAL */}
      {isBotModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 750, height: '85vh', display: 'flex', flexDirection: 'column', padding: 24, position: 'relative' }}>
            <button onClick={() => setIsBotModalOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={20} className="text-primary" />
              Configuração do Chatbot Exclusivo - {formData.name}
            </h3>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, minHeight: 0, overflowY: 'auto', marginBottom: 20 }}>
              
              {/* LEFT: EDITING INTERFACE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 10 }}>
                
                {/* BOT TOGGLE */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Bot size={18} color="#38bdf8" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Ativar Chatbot Comercial</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Respostas automáticas para novos leads</div>
                    </div>
                  </div>
                  <label className="switch-mini" style={{ width: 40, height: 20, relative: 'true' }}>
                    <input type="checkbox" checked={formData.bot_enabled} onChange={e => setFormData({ ...formData, bot_enabled: e.target.checked })} />
                    <span className="slider-mini"></span>
                  </label>
                </div>

                {formData.bot_enabled && (
                  <>
                    {/* GREETING TEXT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>MENSAGEM DE BOAS-VINDAS</label>
                      <textarea 
                        className="glass-input" 
                        rows={4} 
                        style={{ fontSize: '0.85rem', padding: '10px' }}
                        value={formData.bot_greeting}
                        onChange={e => setFormData({ ...formData, bot_greeting: e.target.value })}
                        placeholder="Mensagem disparada quando um cliente enviar mensagem..."
                      />
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Utilize *negrito*, _itálico_ e quebras de linha para formatar.</span>
                    </div>

                    {/* FLOW BUTTONS / DEPARTMENTS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>BOTÕES E RESPOSTAS</label>
                        <button onClick={addBotDept} className="glass-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                          <Plus size={12} /> Add Opção
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {formData.bot_departments.map((dept, idx) => (
                          <div key={dept.id} style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                            <button onClick={() => removeBotDept(dept.id)} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>

                            <div style={{ display: 'flex', gap: 8, paddingRight: 24 }}>
                              <input 
                                value={dept.emoji} 
                                onChange={e => updateBotDept(dept.id, 'emoji', e.target.value)} 
                                style={{ width: 36, textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6 }} 
                                maxLength={2} 
                              />
                              <input 
                                value={dept.name} 
                                onChange={e => updateBotDept(dept.id, 'name', e.target.value)} 
                                placeholder="Nome do botão (ex: Tráfego Pago)" 
                                style={{ flex: 1, padding: '4px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, fontSize: '0.82rem' }} 
                              />
                            </div>
                            
                            <input 
                              value={dept.description} 
                              onChange={e => updateBotDept(dept.id, 'description', e.target.value)} 
                              placeholder="Descrição curta (ex: Analisar campanhas)" 
                              style={{ width: '100%', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 6, fontSize: '0.75rem' }} 
                            />

                            <textarea 
                              value={dept.responseMessage} 
                              onChange={e => updateBotDept(dept.id, 'responseMessage', e.target.value)} 
                              placeholder="Mensagem de resposta quando clicado..." 
                              rows={2}
                              style={{ width: '100%', padding: '6px 8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 6, fontSize: '0.78rem', resize: 'none' }} 
                            />
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span style={{ fontWeight: 800 }}>{idx + 1}️⃣</span> Opção {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT: LIVE SIMULATOR FOR CHATBOT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>SIMULADOR INTERATIVO</label>
                  <button onClick={resetSimulation} className="glass-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} /> Reiniciar
                  </button>
                </div>
                
                {/* PHONE CASE CONTAINER */}
                <div style={{ flex: 1, background: '#0f172a', borderRadius: 20, border: '4px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                  
                  {/* NOTCH */}
                  <div style={{ width: 100, height: 16, background: '#334155', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }}></div>
                    <div style={{ width: 20, height: 2, borderRadius: 1, background: '#111' }}></div>
                  </div>

                  {/* PHONE HEADER */}
                  <div style={{ background: '#202c33', padding: '22px 12px 8px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #2a3942', zIndex: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '0.65rem' }}>
                      {formData.name ? formData.name[0].toUpperCase() : 'W'}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1 }}>{formData.name || 'WhatsApp Comercial'}</div>
                      <div style={{ color: '#8696a0', fontSize: '0.58rem', marginTop: 2 }}>{formData.whatsapp_number || 'online'}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '1px 6px', borderRadius: 4, fontSize: '0.55rem', fontWeight: 800 }}>CHATBOT</span>
                  </div>

                  {/* PHONE CHAT BODY */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23182229\' fill-opacity=\'0.25\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '60px 60px', backgroundAttachment: 'local' }}>
                    {simMessages.map(msg => (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : msg.sender === 'system' ? 'center' : 'flex-start' }}>
                        {msg.sender === 'system' ? (
                          <div style={{ background: '#111b21', color: '#8696a0', padding: '4px 10px', borderRadius: 6, fontSize: '0.62rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', margin: '4px 0' }}>
                            {msg.content}
                          </div>
                        ) : (
                          <div style={{ 
                            background: msg.sender === 'user' ? '#005c4b' : '#202c33', 
                            color: 'white', 
                            padding: '6px 10px 4px', 
                            borderRadius: 8, 
                            borderBottomRightRadius: msg.sender === 'user' ? 2 : 8,
                            borderBottomLeftRadius: msg.sender === 'bot' ? 2 : 8,
                            maxWidth: '85%',
                            fontSize: '0.78rem',
                            position: 'relative'
                          }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{msg.content}</p>
                            
                            {/* Option buttons inside greeting */}
                            {msg.isGreeting && formData.bot_enabled && simStep === 1 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                {formData.bot_departments.filter(d => d.active).map(opt => (
                                  <button 
                                    key={opt.id}
                                    onClick={() => selectSimOption(opt)}
                                    style={{ background: 'rgba(255,255,255,0.08)', hover: { background: 'rgba(255,255,255,0.15)' }, border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '6px 10px', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                                  >
                                    <span>{opt.emoji}</span> {opt.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            <span style={{ fontSize: '0.55rem', color: '#8696a0', float: 'right', marginTop: 4, marginLeft: 16 }}>{msg.time}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {simStep === 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ background: '#202c33', padding: '8px 12px', borderRadius: 8, borderBottomLeftRadius: 2, display: 'flex', gap: 4 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8696a0', animation: 'bounce 1s infinite' }}></span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8696a0', animation: 'bounce 1s infinite 0.2s' }}></span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8696a0', animation: 'bounce 1s infinite 0.4s' }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={simEndRef} />
                  </div>

                  {/* PHONE INPUT BAR */}
                  <div style={{ background: '#202c33', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #2a3942' }}>
                    <Smile size={16} color="#8696a0" />
                    <Paperclip size={16} color="#8696a0" />
                    <div style={{ flex: 1, background: '#2a3942', borderRadius: 12, padding: '4px 10px', color: '#8696a0', fontSize: '0.72rem' }}>
                      Digite uma mensagem
                    </div>
                    <Mic size={16} color="#8696a0" />
                  </div>

                </div>

              </div>

            </div>

            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
              <button type="button" onClick={() => setIsBotModalOpen(false)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleSaveChatbot} className="glass-btn primary" style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={18} /> Salvar Configurações do Chatbot
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .switch-mini {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 18px;
        }
        .switch-mini input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider-mini {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: rgba(255,255,255,0.1);
          transition: .4s;
          border-radius: 18px;
        }
        .slider-mini:before {
          position: absolute;
          content: "";
          height: 12px;
          width: 12px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider-mini {
          background-color: #38bdf8;
        }
        input:checked + .slider-mini:before {
          transform: translateX(18px);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
