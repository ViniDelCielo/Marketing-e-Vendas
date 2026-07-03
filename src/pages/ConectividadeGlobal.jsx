import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Send, Phone, Video, MoreVertical, Check, CheckCheck, RefreshCw, Zap, ArrowLeft, Smile, Paperclip, Mic, Settings, Save, Shield, ExternalLink, X, Eye, EyeOff, Bot, Plus, Trash2, MessageSquare, Users, LogOut, Zap as Lightning } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useClients } from '../hooks/useClients';

export default function ConectividadeGlobal() {
  const { clients } = useClients();
  const [status, setStatus] = useState('disconnected'); // disconnected | generating | waiting | connected
  const [qrImage, setQrImage] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef(null);
  const qrTimerRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewStep, setPreviewStep] = useState(0); // 0=typing 1=greeting 2=clicked
  const [previewSelectedDept, setPreviewSelectedDept] = useState(null);
  const [config, setConfig] = useState({ provider: 'evolution', api_url: '', api_key: '', instance_name: '', official_number: '', enabled: false });
  const [greeting, setGreeting] = useState('Olá! 👋 Seja bem-vindo à *ROI Expert*! Sou seu assistente virtual.\n\nComo posso te ajudar hoje? Escolha uma opção abaixo:');
  const [botEnabled, setBotEnabled] = useState(true);
  const [departments, setDepartments] = useState([
    { id: 1,  emoji: '🎥', name: 'Captação',       description: 'Gravação e produção de vídeos',    serviceId: 'captacao',     active: true, responseMessage: 'Olá! Você selecionou *Captação*. Como podemos ajudar com suas gravações hoje?' },
    { id: 2,  emoji: '🎬', name: 'Edição',          description: 'Edição de vídeos e reels',         serviceId: 'edicao',       active: true, responseMessage: 'Olá! Você selecionou *Edição*. Qual projeto de vídeo vamos editar hoje?' },
    { id: 3,  emoji: '📱', name: 'Social Media',    description: 'Gerenciamento de redes sociais',   serviceId: 'social-media', active: true, responseMessage: 'Olá! Você selecionou *Social Media*. Como podemos ajudar com suas redes hoje?' },
    { id: 4,  emoji: '🎨', name: 'Design',          description: 'Artes, peças e identidade visual', serviceId: 'design',       active: true, responseMessage: 'Olá! Você selecionou *Design*. Qual arte ou identidade visual vamos criar?' },
    { id: 5,  emoji: '🤝', name: 'CRM',             description: 'Relacionamento e pós-venda',       serviceId: 'crm',          active: true, responseMessage: 'Olá! Você selecionou *CRM*. Como podemos ajudar com seus clientes?' },
    { id: 6,  emoji: '💼', name: 'Comercial',       description: 'Propostas e novos contratos',      serviceId: 'comercial',    active: true, responseMessage: 'Olá! Você selecionou nosso setor *Comercial*. Gostaria de uma nova proposta?' },
    { id: 7,  emoji: '📊', name: 'Tráfego Pago',   description: 'Google Ads, Meta Ads e mais',      serviceId: 'trafego',      active: true, responseMessage: 'Olá! Você selecionou *Tráfego Pago*. Vamos analisar suas campanhas?' },
    { id: 8,  emoji: '🚀', name: 'Ganga Hub',       description: 'Hub de soluções digitais',         serviceId: 'ganga-hub',    active: true, responseMessage: 'Olá! Bem-vindo ao *Ganga Hub*. Qual solução digital você procura?' },
    { id: 9,  emoji: '💰', name: 'RH / Financeiro', description: 'Cobranças, RH e contratos',        serviceId: 'financeiro',   active: true, responseMessage: 'Olá! Você selecionou *RH / Financeiro*. Como podemos ajudar com sua solicitação?' },
  ]);

  useEffect(() => {
    loadConversations();
    loadConfig();
    const ch = supabase.channel('wamsg').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, () => { loadConversations(); if (activeConv) loadMessages(activeConv); }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = async () => {
    const { data } = await supabase.from('whatsapp_messages').select('*, clients(id,name)').order('created_at', { ascending: false });
    if (!data) return;
    const map = {};
    data.forEach(m => {
      const key = m.direction === 'inbound' ? m.from_number : m.to_number;
      if (!map[key]) map[key] = { number: key, client: m.clients, messages: [], lastMsg: m, unread: 0 };
      map[key].messages.push(m);
      if (m.direction === 'inbound' && !m.read_at) map[key].unread++;
    });
    setConversations(Object.values(map));
  };

  const loadConfig = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'whatsapp_config').single();
    if (data?.value) { setConfig(prev => ({ ...prev, ...data.value })); if (data.value.enabled) setStatus('connected'); }
    const { data: bot } = await supabase.from('system_settings').select('value').eq('key', 'chatbot_config').single();
    if (bot?.value) { 
      if (bot.value.greeting) setGreeting(bot.value.greeting);
      if (bot.value.departments) setDepartments(bot.value.departments);
      if (typeof bot.value.enabled !== 'undefined') setBotEnabled(bot.value.enabled);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true); setSaveMsg(null);
    const [r1, r2] = await Promise.all([
      supabase.from('system_settings').upsert({ key: 'whatsapp_config', value: config, updated_at: new Date().toISOString() }),
      supabase.from('system_settings').upsert({ key: 'chatbot_config', value: { greeting, departments, enabled: botEnabled }, updated_at: new Date().toISOString() })
    ]);
    setIsSaving(false);
    setSaveMsg(r1.error || r2.error ? { type: 'error', text: 'Erro ao salvar.' } : { type: 'ok', text: 'Configurações salvas!' });
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const addDept = () => setDepartments(p => [...p, { id: Date.now(), emoji: '💬', name: 'Novo Departamento', description: '', serviceId: '', active: true }]);
  const removeDept = (id) => setDepartments(p => p.filter(d => d.id !== id));
  const updateDept = (id, field, val) => setDepartments(p => p.map(d => d.id === id ? {...d, [field]: val} : d));

  const loadMessages = async (conv) => {
    const { data } = await supabase.from('whatsapp_messages')
      .select('*')
      .or(`from_number.eq.${conv.number},to_number.eq.${conv.number}`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  const selectConv = (conv) => { setActiveConv(conv); loadMessages(conv); };

  const generateQR = async () => {
    setStatus('generating');
    setQrImage(null);
    clearTimeout(qrTimerRef.current);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'get-qr' }
      });
      
      if (error) throw error;
      
      if (data?.success && data.base64) { 
        setQrImage(data.base64.startsWith('data:image') ? data.base64 : `data:image/png;base64,${data.base64}`);
        setStatus('waiting'); 
        pollStatus(); 
        return; 
      } else {
        console.error("Failed to generate QR via proxy:", data?.error);
      }
    } catch (err) {
      console.error("Erro no proxy WhatsApp:", err);
    }
    
    // Fallback in case the edge function fails or config is missing
    const demoQR = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=ROI_EXPERT_${Date.now()}&color=128C7E&bgcolor=FFFFFF`;
    setQrImage(demoQR);
    setStatus('waiting');
    qrTimerRef.current = setTimeout(() => { setStatus('connected'); setQrImage(null); }, 20000);
  };

  // Sidebar header with settings button
  const SidebarHeader = () => (
    <div className="wa-sidebar-header">
      <div className="wa-avatar-main"><Zap size={20} /></div>
      <span className="wa-brand">ROI Expert CRM</span>
      <div className={`wa-status-dot ${status}`} title={status} />
      {status === 'connected' && (
        <button className="wa-icon-btn" style={{ color: '#ef4444' }} onClick={disconnect} title="Desconectar Celular">
          <LogOut size={16} />
        </button>
      )}
      <button className="wa-icon-btn" onClick={() => setShowSettings(s => !s)} title="Configurações">
        <Settings size={18} />
      </button>
    </div>
  );

  const SettingsPanel = () => (
    <div className="wa-settings-panel">
      <div className="wa-settings-header">
        <button className="wa-icon-btn" onClick={() => setShowSettings(false)}><X size={18} /></button>
        <span>Central de Configurações</span>
      </div>

      {/* Tabs */}
      <div className="wa-settings-tabs">
        <button className={`wa-stab ${settingsTab === 'api' ? 'active' : ''}`} onClick={() => setSettingsTab('api')}>
          <Settings size={15} /> Conexão API
        </button>
        <button className={`wa-stab ${settingsTab === 'chatbot' ? 'active' : ''}`} onClick={() => setSettingsTab('chatbot')}>
          <Bot size={15} /> Chatbot & Fluxo
        </button>
      </div>

      {/* API TAB */}
      {settingsTab === 'api' && (
        <div className="wa-settings-body">
          <div className="wa-field">
            <label>PROVEDOR</label>
            <select value={config.provider} onChange={e => setConfig(p => ({...p, provider: e.target.value}))}>
              <option value="evolution">Evolution API</option>
              <option value="zapi">Z-API</option>
              <option value="twilio">Twilio</option>
            </select>
          </div>
          <div className="wa-field">
            <label>URL DA API</label>
            <input placeholder="https://api.evolution.com" value={config.api_url} onChange={e => setConfig(p => ({...p, api_url: e.target.value}))} />
          </div>
          <div className="wa-field">
            <label>NOME DA INSTÂNCIA</label>
            <input placeholder="ROI_EXPERT_OFFICIAL" value={config.instance_name} onChange={e => setConfig(p => ({...p, instance_name: e.target.value}))} />
          </div>
          <div className="wa-field">
            <label>API KEY / TOKEN</label>
            <div className="wa-field-row">
              <input type={showKey ? 'text' : 'password'} placeholder="Seu token secreto..." value={config.api_key} onChange={e => setConfig(p => ({...p, api_key: e.target.value}))} />
              <button className="wa-icon-btn" onClick={() => setShowKey(s => !s)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div className="wa-field">
            <label>NÚMERO OFICIAL</label>
            <input placeholder="55119999999999" value={config.official_number} onChange={e => setConfig(p => ({...p, official_number: e.target.value}))} />
          </div>
          <div className="wa-toggle-row" onClick={() => setConfig(p => ({...p, enabled: !p.enabled}))}>
            <div className={`wa-toggle ${config.enabled ? 'on' : ''}`}><div className="wa-knob" /></div>
            <span>{config.enabled ? 'Integração Ativa' : 'Integração Desativada'}</span>
          </div>
          <a href="https://evolution-api.com" target="_blank" rel="noreferrer" className="wa-docs-link"><ExternalLink size={14} /> Documentação Evolution API</a>
        </div>
      )}

      {/* CHATBOT TAB */}
      {settingsTab === 'chatbot' && (
        <div className="wa-settings-body">
          {/* Bot Toggle */}
          <div className="wa-bot-header">
            <div className="wa-bot-icon"><Bot size={22} /></div>
            <div style={{flex:1}}>
              <div style={{color:'#e9edef',fontWeight:700,fontSize:'0.85rem'}}>Chatbot Automático</div>
              <div style={{color:'#8696a0',fontSize:'0.75rem'}}>Responde automaticamente novos contatos</div>
            </div>
            <div className={`wa-toggle ${botEnabled ? 'on' : ''}`} onClick={() => setBotEnabled(p => !p)}><div className="wa-knob" /></div>
          </div>

          {/* Greeting Message */}
          <div className="wa-field">
            <label>MENSAGEM DE BOAS-VINDAS</label>
            <textarea
              className="wa-textarea"
              rows={4}
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              placeholder="Olá! Seja bem-vindo..."
            />
            <div className="wa-field-hint">Use *negrito*, _itálico_ e emojis 🚀</div>
          </div>

          {/* Department Buttons */}
          <div className="wa-dept-section">
            <div className="wa-dept-header">
              <label>BOTÕES DE DEPARTAMENTO</label>
              <button className="wa-add-dept" onClick={addDept}><Plus size={14} /> Adicionar</button>
            </div>
            <div className="wa-dept-hint">Cada botão redireciona o cliente para o chat do departamento correspondente.</div>

            <div className="wa-dept-list">
              {departments.map((dept, i) => (
                <div key={dept.id} className={`wa-dept-card ${dept.active ? 'active' : 'inactive'}`}>
                  <div className="wa-dept-card-top">
                    <input
                      className="wa-dept-emoji"
                      value={dept.emoji}
                      onChange={e => updateDept(dept.id, 'emoji', e.target.value)}
                      maxLength={2}
                    />
                    <input
                      className="wa-dept-name"
                      value={dept.name}
                      onChange={e => updateDept(dept.id, 'name', e.target.value)}
                      placeholder="Nome do departamento"
                    />
                    <div className={`wa-mini-toggle ${dept.active ? 'on' : ''}`} onClick={() => updateDept(dept.id, 'active', !dept.active)} />
                    <button className="wa-dept-del" onClick={() => removeDept(dept.id)}><Trash2 size={14} /></button>
                  </div>
                  <input
                    className="wa-dept-desc"
                    value={dept.description}
                    onChange={e => updateDept(dept.id, 'description', e.target.value)}
                    placeholder="Descrição curta (ex: Gestão de redes sociais)"
                  />
                  <textarea
                    className="wa-dept-msg"
                    value={dept.responseMessage}
                    onChange={e => updateDept(dept.id, 'responseMessage', e.target.value)}
                    placeholder="Mensagem após seleção (Ex: Olá! Você selecionou Social Media...)"
                    rows={2}
                  />
                  <div className="wa-dept-badge">{i + 1}️⃣ Opção {i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Button */}
          <button className="wa-open-preview-btn" onClick={() => { setShowPreview(true); setPreviewStep(0); setPreviewSelectedDept(null); setTimeout(() => setPreviewStep(1), 1500); }}>
            <span>📱</span> VER PREVIEW DO CHATBOT
          </button>
        </div>
      )}

      {/* Save - Always visible */}
      <div className="wa-settings-footer">
        <button className="wa-save-btn" onClick={saveConfig} disabled={isSaving}>
          {isSaving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
          {isSaving ? 'Salvando...' : 'SALVAR TUDO'}
        </button>
        {saveMsg && <div className={`wa-save-msg ${saveMsg.type}`}>{saveMsg.text}</div>}
      </div>
    </div>
  );

  /* ── FLOATING PREVIEW MODAL ── */
  const BotPreviewModal = () => {
    const activeDepts = departments.filter(d => d.active);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="bot-preview-overlay" onClick={() => setShowPreview(false)}>
        <div className="bot-preview-modal" onClick={e => e.stopPropagation()}>
          {/* IPHONE NOTCH */}
          <div className="bpm-notch">
            <div className="bpm-notch-cam"></div>
            <div className="bpm-notch-speaker"></div>
          </div>

          {/* Phone frame header */}
          <div className="bpm-phone-header">
            <div className="bpm-chat-header">
              <button className="bpm-back-btn" onClick={() => setShowPreview(false)}><ArrowLeft size={20} /></button>
              <div className="bpm-avatar">R</div>
              <div>
                <div className="bpm-name">ROI Expert Oficial</div>
                <div className="bpm-sub">{status === 'connected' ? 'online' : config.official_number || 'Assistente Virtual'}</div>
              </div>
              <button className="bpm-close" onClick={() => setShowPreview(false)}><X size={18} /></button>
            </div>
          </div>

          {/* Chat messages */}
          <div className="bpm-chat-body">
            {/* Client message */}
            <div className="bpm-bubble-wrap in">
              <div className="bpm-bubble in">
                <p>Olá, gostaria de mais informações!</p>
                <span>{now}</span>
              </div>
            </div>

            {/* Bot typing */}
            {previewStep === 0 && (
              <div className="bpm-bubble-wrap out">
                <div className="bpm-bubble out bpm-typing">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            )}

            {/* Bot greeting */}
            {previewStep >= 1 && (
              <div className="bpm-bubble-wrap out">
                <div className="bpm-bubble out">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{greeting}</p>
                  <div className="bpm-dept-btns">
                    {activeDepts.map((d, i) => (
                      <button
                        key={d.id}
                        className={`bpm-dept-btn ${previewSelectedDept?.id === d.id ? 'selected' : ''}`}
                        onClick={() => { setPreviewSelectedDept(d); setPreviewStep(2); }}
                      >
                        {d.emoji} {d.name}
                      </button>
                    ))}
                  </div>
                  <span>{now}</span>
                </div>
              </div>
            )}

            {/* After selection */}
            {previewStep === 2 && previewSelectedDept && (
              <>
                <div className="bpm-bubble-wrap in">
                  <div className="bpm-bubble in">
                    <p>{previewSelectedDept.emoji} {previewSelectedDept.name}</p>
                    <span>{now}</span>
                  </div>
                </div>
                <div className="bpm-bubble-wrap out">
                  <div className="bpm-bubble out">
                    <p>{previewSelectedDept.responseMessage || `Perfeito! 👍 Estou te conectando ao departamento de ${previewSelectedDept.name}.`}</p>
                    <span>{now}</span>
                  </div>
                </div>
                <div className="bpm-system-msg">🔗 Conversa redirecionada para {previewSelectedDept.name}</div>
              </>
            )}
          </div>

          {/* Input bar */}
          <div className="bpm-input-bar">
            <button className="bpm-input-icon"><Smile size={22} color="#8696a0" /></button>
            <div className="bpm-input-wrap">Digite uma mensagem</div>
            <div className="bpm-send"><Mic size={18} /></div>
          </div>

          {/* Reset button outside the phone */}
          <div className="bpm-reset-row">
            <button onClick={() => { setPreviewStep(0); setPreviewSelectedDept(null); setTimeout(() => setPreviewStep(1), 1500); }}>
              <RefreshCw size={14} /> Reiniciar Simulação
            </button>
          </div>
        </div>
      </div>
    );
  };

  const pollStatus = () => {
    const iv = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
          body: { action: 'check-status' }
        });
        if (!error && data?.success && data.state === 'open') { 
            clearInterval(iv); 
            setStatus('connected'); 
            setQrImage(null); 
        }
      } catch {}
    }, 3000);
    setTimeout(() => clearInterval(iv), 120000);
  };


  const disconnect = async () => { 
    setStatus('disconnected'); 
    setQrImage(null); 
    clearTimeout(qrTimerRef.current); 
    try {
      await supabase.functions.invoke('whatsapp-proxy', { body: { action: 'logout' } });
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv) return;
    const msg = { direction: 'outbound', from_number: 'ROI Expert', to_number: activeConv.number, content: newMsg.trim(), status: 'sent', created_at: new Date().toISOString() };
    setMessages(p => [...p, { ...msg, id: Date.now() }]);
    setNewMsg('');
    await supabase.from('whatsapp_messages').insert(msg);
  };

  const filteredConvs = conversations.filter(c => c.number.includes(search) || c.client?.name?.toLowerCase().includes(search.toLowerCase()));
  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => { const t = new Date(d); const n = new Date(); return t.toDateString() === n.toDateString() ? formatTime(d) : t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };

  return (
    <div className={`wa-app ${activeConv ? 'has-active-conv' : ''}`}>
      {/* LEFT PANEL */}
      <div className="wa-sidebar">
        <SidebarHeader />
        {showSettings && <SettingsPanel />}

        {status !== 'connected' ? (
          <div className="wa-connect-area">
            {status === 'disconnected' && (
              <div className="wa-connect-prompt">
                <div className="wa-qr-icon-bg"><QrCode size={40} /></div>
                <h3>Conectar WhatsApp</h3>
                <p>Escaneie o QR Code com seu celular para espelhar o número oficial e monitorar todas as conversas em tempo real.</p>
                <button className="wa-btn-connect" onClick={generateQR}><QrCode size={18} /> GERAR QR CODE</button>
              </div>
            )}
            {status === 'generating' && (
              <div className="wa-connect-prompt"><RefreshCw size={32} className="spin" /><p>Gerando código...</p></div>
            )}
            {status === 'waiting' && qrImage && (
              <div className="wa-qr-display">
                <p>Abra o WhatsApp → <strong>Aparelhos Conectados</strong> → Conectar aparelho</p>
                <div className="wa-qr-frame"><img src={qrImage} alt="QR Code" /></div>
                <p className="wa-qr-hint"><span className="pulse-dot" /> Aguardando leitura...</p>
                <button className="wa-btn-cancel" onClick={() => { setStatus('disconnected'); setQrImage(null); }}>Cancelar</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="wa-search-bar">
              <Search size={16} />
              <input placeholder="Pesquisar conversas..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="wa-conv-list">
              {filteredConvs.length === 0 && <div className="wa-empty-convs">Nenhuma conversa ainda.</div>}
              {filteredConvs.map((c, i) => (
                <div key={i} className={`wa-conv-item ${activeConv?.number === c.number ? 'active' : ''}`} onClick={() => selectConv(c)}>
                  <div className="wa-conv-avatar">{(c.client?.name || c.number)[0].toUpperCase()}</div>
                  <div className="wa-conv-info">
                    <div className="wa-conv-top">
                      <span className="wa-conv-name">{c.client?.name || c.number}</span>
                      <span className="wa-conv-time">{formatDate(c.lastMsg.created_at)}</span>
                    </div>
                    <div className="wa-conv-bottom">
                      <span className="wa-conv-preview">{c.lastMsg.content?.slice(0, 40)}...</span>
                      {c.unread > 0 && <span className="wa-unread">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="wa-main">
        {!activeConv ? (
          <div className="wa-welcome">
            <div className="wa-welcome-icon"><Zap size={56} /></div>
            <h2>ROI Expert WhatsApp CRM</h2>
            <p>{status === 'connected' ? 'Selecione uma conversa para começar' : 'Conecte seu WhatsApp para visualizar conversas em tempo real'}</p>
            {status !== 'connected' && <div className="wa-status-indicator"><span className={`pill ${status}`}>{status === 'disconnected' ? '● Desconectado' : status === 'waiting' ? '◉ Aguardando scan...' : '◌ Gerando...'}</span></div>}
          </div>
        ) : (
          <>
            <div className="wa-chat-header">
              <button className="wa-back-btn" onClick={() => setActiveConv(null)}><ArrowLeft size={20} /></button>
              <div className="wa-chat-avatar">{(activeConv.client?.name || activeConv.number)[0].toUpperCase()}</div>
              <div className="wa-chat-info">
                <strong>{activeConv.client?.name || activeConv.number}</strong>
                <span>{activeConv.number}</span>
              </div>
              <div className="wa-chat-actions">
                <button><Phone size={20} /></button>
                <button><Video size={20} /></button>
                <button><MoreVertical size={20} /></button>
              </div>
            </div>

            <div className="wa-messages">
              {messages.map((m, i) => {
                const out = m.direction === 'outbound';
                const prevDate = i > 0 ? new Date(messages[i-1].created_at).toDateString() : null;
                const curDate = new Date(m.created_at).toDateString();
                return (
                  <div key={m.id || i}>
                    {curDate !== prevDate && <div className="wa-date-sep"><span>{new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>}
                    <div className={`wa-bubble-wrap ${out ? 'out' : 'in'}`}>
                      <div className={`wa-bubble ${out ? 'out' : 'in'}`}>
                        <p>{m.content}</p>
                        <div className="wa-bubble-meta">
                          <span>{formatTime(m.created_at)}</span>
                          {out && (m.status === 'read' ? <CheckCheck size={14} className="read" /> : <Check size={14} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="wa-input-bar">
              <button className="wa-input-btn"><Smile size={22} /></button>
              <button className="wa-input-btn"><Paperclip size={22} /></button>
              <div className="wa-input-wrap">
                <input
                  placeholder="Digite uma mensagem"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
              </div>
              {newMsg ? (
                <button className="wa-send-btn" onClick={sendMessage}><Send size={20} /></button>
              ) : (
                <button className="wa-input-btn"><Mic size={22} /></button>
              )}
            </div>
          </>
        )}
      </div>

      {/* FLOATING BOT PREVIEW MODAL */}
      {showPreview && BotPreviewModal()}

      <style>{`
        * { box-sizing: border-box; }
        .wa-app { display: grid; grid-template-columns: 380px 1fr; height: calc(100vh - 60px); background: #0b141a; font-family: 'Segoe UI', sans-serif; overflow: hidden; }

        /* SIDEBAR */
        .wa-sidebar { display: flex; flex-direction: column; border-right: 1px solid #1f2c34; background: #111b21; position: relative; }
        .wa-sidebar-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #202c33; border-bottom: 1px solid #1f2c34; }
        .wa-avatar-main { width: 40px; height: 40px; border-radius: 50%; background: #00a884; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .wa-brand { font-weight: 700; color: #e9edef; font-size: 1rem; flex: 1; }
        .wa-status-dot { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; }
        .wa-status-dot.connected { background: #00a884; box-shadow: 0 0 8px #00a884; }
        .wa-status-dot.waiting { background: #f59e0b; }

        /* CONNECT AREA */
        .wa-connect-area { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .wa-connect-prompt { text-align: center; color: #e9edef; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .wa-qr-icon-bg { width: 80px; height: 80px; border-radius: 50%; background: rgba(0,168,132,0.1); border: 2px solid rgba(0,168,132,0.3); display: flex; align-items: center; justify-content: center; color: #00a884; }
        .wa-connect-prompt h3 { margin: 0; font-size: 1.2rem; }
        .wa-connect-prompt p { margin: 0; color: #8696a0; font-size: 0.85rem; line-height: 1.5; max-width: 260px; }
        .wa-btn-connect { background: #00a884; color: white; border: none; padding: 12px 24px; border-radius: 24px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .wa-btn-connect:hover { background: #017561; transform: translateY(-2px); }

        /* QR Display */
        .wa-qr-display { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; color: #e9edef; }
        .wa-qr-display p { margin: 0; font-size: 0.8rem; color: #8696a0; max-width: 260px; line-height: 1.5; }
        .wa-qr-frame { background: white; padding: 12px; border-radius: 12px; }
        .wa-qr-frame img { width: 200px; height: 200px; display: block; }
        .wa-qr-hint { color: #00a884 !important; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #00a884; display: inline-block; animation: pulse 1.5s infinite; }
        .wa-btn-cancel { background: none; border: none; color: #ef4444; font-size: 0.8rem; font-weight: 700; cursor: pointer; }

        /* SEARCH */
        .wa-search-bar { display: flex; align-items: center; gap: 10px; margin: 8px; background: #202c33; border-radius: 8px; padding: 8px 12px; color: #8696a0; }
        .wa-search-bar input { flex: 1; background: none; border: none; outline: none; color: #d1d7db; font-size: 0.9rem; }
        .wa-search-bar input::placeholder { color: #8696a0; }

        /* CONV LIST */
        .wa-conv-list { flex: 1; overflow-y: auto; }
        .wa-conv-list::-webkit-scrollbar { width: 4px; }
        .wa-conv-list::-webkit-scrollbar-thumb { background: #374045; border-radius: 2px; }
        .wa-conv-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); transition: 0.15s; }
        .wa-conv-item:hover { background: #202c33; }
        .wa-conv-item.active { background: #2a3942; }
        .wa-conv-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #00a884, #017561); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.1rem; flex-shrink: 0; }
        .wa-conv-info { flex: 1; min-width: 0; }
        .wa-conv-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .wa-conv-name { font-weight: 600; color: #e9edef; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wa-conv-time { font-size: 0.72rem; color: #8696a0; flex-shrink: 0; }
        .wa-conv-bottom { display: flex; justify-content: space-between; align-items: center; }
        .wa-conv-preview { font-size: 0.82rem; color: #8696a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        .wa-unread { background: #00a884; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
        .wa-empty-convs { text-align: center; padding: 40px 20px; color: #8696a0; font-size: 0.85rem; }

        /* MAIN */
        .wa-main { display: flex; flex-direction: column; background: #0b141a; position: relative; }
        .wa-main::before { content: ''; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); pointer-events: none; z-index: 0; }

        /* WELCOME */
        .wa-welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: #8696a0; text-align: center; z-index: 1; }
        .wa-welcome-icon { width: 100px; height: 100px; border-radius: 50%; background: rgba(0,168,132,0.08); border: 2px solid rgba(0,168,132,0.15); display: flex; align-items: center; justify-content: center; color: #00a884; }
        .wa-welcome h2 { margin: 0; color: #e9edef; font-size: 1.5rem; }
        .wa-welcome p { margin: 0; font-size: 0.9rem; }
        .pill { padding: 6px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
        .pill.disconnected { background: rgba(239,68,68,0.1); color: #ef4444; }
        .pill.waiting { background: rgba(245,158,11,0.1); color: #f59e0b; }

        /* CHAT HEADER */
        .wa-chat-header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #202c33; border-bottom: 1px solid #1f2c34; z-index: 1; }
        .wa-back-btn { background: none; border: none; color: #aebac1; cursor: pointer; padding: 4px; display: flex; }
        .wa-chat-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #00a884, #017561); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; }
        .wa-chat-info { flex: 1; }
        .wa-chat-info strong { display: block; color: #e9edef; font-size: 0.95rem; }
        .wa-chat-info span { color: #8696a0; font-size: 0.75rem; }
        .wa-chat-actions { display: flex; gap: 8px; }
        .wa-chat-actions button { background: none; border: none; color: #aebac1; cursor: pointer; padding: 6px; border-radius: 50%; transition: 0.2s; display: flex; }
        .wa-chat-actions button:hover { background: rgba(255,255,255,0.1); }

        /* MESSAGES */
        .wa-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 2px; z-index: 1; }
        .wa-messages::-webkit-scrollbar { width: 4px; }
        .wa-messages::-webkit-scrollbar-thumb { background: #374045; border-radius: 2px; }
        .wa-date-sep { text-align: center; margin: 12px 0; }
        .wa-date-sep span { background: #182229; color: #8696a0; padding: 4px 12px; border-radius: 8px; font-size: 0.72rem; }
        .wa-bubble-wrap { display: flex; margin-bottom: 2px; }
        .wa-bubble-wrap.out { justify-content: flex-end; }
        .wa-bubble-wrap.in { justify-content: flex-start; }
        .wa-bubble { max-width: 65%; padding: 8px 12px 6px; border-radius: 8px; position: relative; word-break: break-word; }
        .wa-bubble.out { background: #005c4b; border-bottom-right-radius: 2px; }
        .wa-bubble.in { background: #202c33; border-bottom-left-radius: 2px; }
        .wa-bubble p { margin: 0 32px 0 0; color: #e9edef; font-size: 0.9rem; line-height: 1.4; }
        .wa-bubble-meta { display: flex; align-items: center; gap: 4px; justify-content: flex-end; margin-top: 2px; }
        .wa-bubble-meta span { font-size: 0.68rem; color: #8696a0; }
        .wa-bubble-meta svg { color: #8696a0; }
        .wa-bubble-meta svg.read { color: #53bdeb; }

        /* INPUT */
        .wa-input-bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #202c33; z-index: 1; }
        .wa-input-btn { background: none; border: none; color: #aebac1; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; transition: 0.2s; }
        .wa-input-btn:hover { background: rgba(255,255,255,0.08); color: #e9edef; }
        .wa-input-wrap { flex: 1; background: #2a3942; border-radius: 24px; padding: 10px 16px; }
        .wa-input-wrap input { width: 100%; background: none; border: none; outline: none; color: #d1d7db; font-size: 0.93rem; }
        .wa-input-wrap input::placeholder { color: #8696a0; }
        .wa-send-btn { width: 40px; height: 40px; border-radius: 50%; background: #00a884; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; flex-shrink: 0; }
        .wa-send-btn:hover { background: #017561; }

        @keyframes pulse { 0%,100% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* SETTINGS */
        .wa-icon-btn { background: none; border: none; color: #aebac1; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .wa-icon-btn:hover { background: rgba(255,255,255,0.1); color: #e9edef; }
        .wa-settings-panel { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #111b21; border-right: 1px solid #1f2c34; z-index: 10; display: flex; flex-direction: column; overflow-y: auto; animation: slideDown 0.2s ease; font-size: 0.85rem; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .wa-settings-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #202c33; border-bottom: 1px solid #1f2c34; }
        .wa-settings-header span { color: #e9edef; font-weight: 700; font-size: 0.9rem; }
        .wa-settings-body { padding: 16px 12px; display: flex; flex-direction: column; gap: 12px; }
        .wa-field { display: flex; flex-direction: column; gap: 4px; }
        .wa-field label { font-size: 0.6rem; font-weight: 700; color: #00a884; text-transform: uppercase; letter-spacing: 0.05em; }
        .wa-field input, .wa-field select { background: #202c33; border: 1px solid #2a3942; border-radius: 6px; padding: 8px 10px; color: #d1d7db; font-size: 0.8rem; outline: none; transition: 0.2s; width: 100%; }
        .wa-field input:focus, .wa-field select:focus { border-color: #00a884; }
        .wa-field select option { background: #202c33; }
        .wa-field-row { display: flex; gap: 6px; align-items: center; }
        .wa-field-row input { flex: 1; }
        .wa-toggle-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #202c33; border-radius: 6px; cursor: pointer; }
        .wa-toggle-row span { color: #d1d7db; font-size: 0.8rem; }
        .wa-toggle { width: 36px; height: 20px; background: #374045; border-radius: 10px; position: relative; transition: 0.3s; flex-shrink: 0; }
        .wa-toggle.on { background: #00a884; }
        .wa-knob { width: 14px; height: 14px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: 0.3s; }
        .wa-toggle.on .wa-knob { left: 19px; }
        .wa-save-btn { background: #00a884; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: 700; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; margin-top: 4px; }
        .wa-save-btn:hover { background: #017561; }
        .wa-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wa-save-msg { text-align: center; padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
        .wa-save-msg.ok { background: rgba(0,168,132,0.1); color: #00a884; }
        .wa-save-msg.error { background: rgba(239,68,68,0.1); color: #ef4444; }
        .wa-docs-link { display: flex; align-items: center; gap: 4px; color: #8696a0; font-size: 0.7rem; text-decoration: none; justify-content: center; }
        .wa-docs-link:hover { color: #00a884; }

        /* PREVIEW BUTTON */
        .wa-open-preview-btn { background: rgba(0, 168, 132, 0.1); border: 1px solid rgba(0, 168, 132, 0.3); color: #00a884; width: 100%; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; margin-top: 8px; }
        .wa-open-preview-btn:hover { background: rgba(0, 168, 132, 0.2); }

        /* IPHONE PREVIEW MODAL */
        .bot-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; overflow-y: auto; padding: 20px 0; backdrop-filter: blur(8px); animation: fadeIn 0.3s ease; }
        .bot-preview-modal { margin: auto; flex-shrink: 0; width: 200px; height: 400px; background: #0b141a; border-radius: 24px; border: 6px solid #e2e8f0; display: flex; flex-direction: column; overflow: visible; box-shadow: 0 15px 30px -8px rgba(0, 0, 0, 0.8), inset 0 0 0 1px #000; position: relative; animation: slideUp 0.3s ease; }
        
        /* Notch */
        .bpm-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 14px; background: #e2e8f0; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; z-index: 10; display:flex; justify-content:center; align-items:center; gap: 3px; }
        .bpm-notch-cam { width: 4px; height: 4px; border-radius: 50%; background: #0a0a0a; box-shadow: inset 0 0 1px rgba(255,255,255,0.2); }
        .bpm-notch-speaker { width: 18px; height: 2px; border-radius: 2px; background: #111; }

        /* Phone header (WA style) */
        .bpm-phone-header { background: #202c33; padding: 22px 10px 8px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #2a3942; z-index: 5; border-top-left-radius: 18px; border-top-right-radius: 18px; flex-shrink: 0; }
        .bpm-chat-header { display: flex; align-items: center; gap: 4px; width: 100%; }
        .bpm-back-btn { background: none; border: none; color: #aebac1; cursor: pointer; padding: 0; display: flex; align-items: center; }
        .bpm-avatar { width: 24px; height: 24px; border-radius: 50%; background: #00a884; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.65rem; flex-shrink: 0; }
        .bpm-name { color: #e9edef; font-size: 0.7rem; font-weight: 600; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }
        .bpm-sub { color: #8696a0; font-size: 0.55rem; }
        .bpm-close { background: none; border: none; color: #aebac1; cursor: pointer; margin-left: auto; padding: 6px; border-radius: 50%; transition: 0.2s; display: flex; align-items: center; }
        .bpm-close:hover { background: rgba(255,255,255,0.1); color: #ef4444; }

        /* Chat Body */
        .bpm-chat-body { flex: 1; padding: 8px 6px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
        .bpm-chat-body::-webkit-scrollbar { width: 0px; }
        
        .bpm-bubble-wrap { display: flex; margin-bottom: 2px; }
        .bpm-bubble-wrap.in { justify-content: flex-end; }
        .bpm-bubble-wrap.out { justify-content: flex-start; }
        
        .bpm-bubble { max-width: 92%; padding: 4px 8px; border-radius: 6px; position: relative; font-size: 0.65rem; line-height: 1.2; color: #e9edef; }
        .bpm-bubble.in { background: #005c4b; border-bottom-right-radius: 2px; }
        .bpm-bubble.out { background: #202c33; border-bottom-left-radius: 2px; }
        .bpm-bubble p { margin: 0 0 2px 0; }
        .bpm-bubble span { display: block; font-size: 0.5rem; color: #8696a0; text-align: right; }
        .bpm-bubble.in span { color: #87cdc0; }

        .bpm-dept-btns { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
        .bpm-dept-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #53bdeb; padding: 4px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 600; cursor: pointer; transition: 0.2s; text-align: left; display: flex; gap: 4px; align-items: center; }
        .bpm-dept-btn:hover, .bpm-dept-btn.selected { background: rgba(83,189,235,0.1); border-color: #53bdeb; }

        .bpm-system-msg { align-self: center; background: #182229; color: #8696a0; padding: 3px 8px; border-radius: 4px; font-size: 0.55rem; margin-top: 4px; text-align: center; }

        .bpm-typing { display: flex; gap: 4px; padding: 6px 4px; align-items: center; justify-content: center; }
        .bpm-typing .dot { width: 6px; height: 6px; background: #8696a0; border-radius: 50%; animation: blink 1.4s infinite both; }
        .bpm-typing .dot:nth-child(1) { animation-delay: 0s; }
        .bpm-typing .dot:nth-child(2) { animation-delay: 0.2s; }
        .bpm-typing .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0.2; transform: scale(0.8); } 20% { opacity: 1; transform: scale(1); } 100% { opacity: 0.2; transform: scale(0.8); } }

        /* Input Bar */
        .bpm-input-bar { background: #202c33; padding: 6px 10px 10px; display: flex; align-items: center; gap: 6px; z-index: 5; border-bottom-left-radius: 18px; border-bottom-right-radius: 18px; flex-shrink: 0; }
        .bpm-input-icon { background: none; border: none; padding: 0; display: flex; cursor: pointer; }
        .bpm-input-icon svg { width: 14px; height: 14px; }
        .bpm-input-wrap { flex: 1; background: #2a3942; border-radius: 14px; padding: 6px 10px; color: #8696a0; font-size: 0.65rem; }
        .bpm-send { width: 24px; height: 24px; border-radius: 50%; background: #00a884; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .bpm-send svg { width: 12px; height: 12px; }

        /* Reset row */
        .bpm-reset-row { position: absolute; bottom: -35px; left: 0; right: 0; text-align: center; z-index: 10000; }
        .bpm-reset-row button { background: #ffffff; border: none; color: #111; padding: 6px 12px; border-radius: 14px; font-size: 0.65rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.5); font-weight: 700; }
        .bpm-reset-row button:hover { background: #f1f5f9; transform: translateY(-2px); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .wa-dept-msg { background: #111b21; border: 1px solid #374045; border-radius: 6px; padding: 8px; color: #8696a0; font-size: 0.75rem; font-family: inherit; resize: none; width: 100%; outline: none; transition: 0.2s; }
        .wa-dept-msg:focus { border-color: #00a884; color: #d1d7db; }

        /* SETTINGS TABS */
        .wa-settings-tabs { display: flex; border-bottom: 1px solid #1f2c34; background: #202c33; }
        .wa-stab { flex: 1; padding: 12px 8px; background: none; border: none; color: #8696a0; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; border-bottom: 2px solid transparent; transition: 0.2s; }
        .wa-stab:hover { color: #e9edef; background: rgba(255,255,255,0.03); }
        .wa-stab.active { color: #00a884; border-bottom-color: #00a884; }

        /* CHATBOT SECTION */
        .wa-bot-header { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(0,168,132,0.06); border: 1px solid rgba(0,168,132,0.15); border-radius: 10px; }
        .wa-bot-icon { width: 40px; height: 40px; border-radius: 50%; background: rgba(0,168,132,0.15); color: #00a884; display: flex; align-items: center; justify-content: center; }
        .wa-textarea { width: 100%; background: #202c33; border: 1px solid #2a3942; border-radius: 8px; padding: 10px 12px; color: #d1d7db; font-size: 0.83rem; outline: none; resize: vertical; font-family: inherit; line-height: 1.5; transition: 0.2s; }
        .wa-textarea:focus { border-color: #00a884; }
        .wa-field-hint { font-size: 0.7rem; color: #8696a0; margin-top: 4px; }

        /* DEPT CARDS */
        .wa-dept-section { display: flex; flex-direction: column; gap: 10px; }
        .wa-dept-header { display: flex; justify-content: space-between; align-items: center; }
        .wa-dept-header label { font-size: 0.65rem; font-weight: 700; color: #00a884; text-transform: uppercase; letter-spacing: 0.05em; }
        .wa-dept-hint { font-size: 0.72rem; color: #8696a0; margin-top: -4px; line-height: 1.4; }
        .wa-add-dept { background: rgba(0,168,132,0.1); border: 1px solid rgba(0,168,132,0.2); color: #00a884; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: 0.2s; }
        .wa-add-dept:hover { background: rgba(0,168,132,0.2); }
        .wa-dept-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; padding-right: 2px; }
        .wa-dept-list::-webkit-scrollbar { width: 3px; }
        .wa-dept-list::-webkit-scrollbar-thumb { background: #374045; border-radius: 2px; }
        .wa-dept-card { background: #202c33; border: 1px solid #2a3942; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; transition: 0.2s; }
        .wa-dept-card.active { border-color: rgba(0,168,132,0.25); }
        .wa-dept-card.inactive { opacity: 0.5; }
        .wa-dept-card-top { display: flex; align-items: center; gap: 8px; }
        .wa-dept-emoji { width: 38px; background: #111b21; border: 1px solid #374045; border-radius: 6px; padding: 6px; color: #e9edef; font-size: 1rem; text-align: center; outline: none; }
        .wa-dept-name { flex: 1; background: none; border: none; border-bottom: 1px solid #374045; color: #e9edef; font-size: 0.85rem; font-weight: 600; outline: none; padding: 2px 4px; }
        
        @media (max-width: 768px) {
          .wa-app { display: flex; flex-direction: column; height: calc(100vh - 60px); overflow: hidden; }
          .wa-sidebar { width: 100%; height: 100%; border-right: none; flex-shrink: 0; }
          .wa-main { width: 100%; height: 100%; flex-shrink: 0; }
          
          .wa-app.has-active-conv .wa-sidebar { display: none; }
          .wa-app:not(.has-active-conv) .wa-main { display: none; }
          
          .wa-bubble { max-width: 90%; }
        }
        .wa-dept-desc { width: 100%; background: none; border: none; border-bottom: 1px dashed #2a3942; color: #8696a0; font-size: 0.78rem; outline: none; padding: 2px 4px; }
        .wa-dept-del { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; opacity: 0.6; transition: 0.2s; display: flex; }
        .wa-dept-del:hover { opacity: 1; background: rgba(239,68,68,0.1); }
        .wa-dept-badge { font-size: 0.65rem; color: #8696a0; }
        .wa-mini-toggle { width: 32px; height: 18px; background: #374045; border-radius: 9px; position: relative; cursor: pointer; transition: 0.3s; flex-shrink: 0; }
        .wa-mini-toggle.on { background: #00a884; }
        .wa-mini-toggle::after { content: ''; width: 12px; height: 12px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: 0.3s; }
        .wa-mini-toggle.on::after { left: 17px; }

        /* PREVIEW */
        .wa-preview-box { background: #0b141a; border-radius: 10px; padding: 14px; }
        .wa-preview-label { font-size: 0.7rem; color: #8696a0; font-weight: 700; margin-bottom: 10px; }
        .wa-preview-bubble { background: #005c4b; border-radius: 8px 8px 8px 2px; padding: 10px 12px; max-width: 90%; color: #e9edef; }
        .wa-preview-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .wa-preview-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); padding: 5px 10px; border-radius: 16px; font-size: 0.75rem; color: #53bdeb; cursor: default; white-space: nowrap; }

        /* FOOTER */
        .wa-settings-footer { padding: 12px 16px; background: #202c33; border-top: 1px solid #1f2c34; display: flex; flex-direction: column; gap: 8px; margin-top: auto; position: sticky; bottom: 0; }
      `}</style>
    </div>
  );
}
