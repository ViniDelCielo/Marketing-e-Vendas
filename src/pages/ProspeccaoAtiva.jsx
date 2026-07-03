import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Target, ChevronDown, ChevronUp, ChevronRight, Link2, GitFork, BarChart3,
  Calendar, Layers, List, Sparkles, Cpu, Zap, Search, Plus,
  Trash2, Edit2, Play, AlertCircle, CheckCircle2, ArrowRight,
  Save, MessageSquare, Send, Bot, RefreshCw, Star, Info,
  Sliders, Maximize2, Minimize2, ArrowUp, ArrowDown, Check, MoreHorizontal, X,
  Wifi, Smartphone, Smile, Paperclip, Compass, Mic, StopCircle, MicOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── AudioPlayer Component (estilo WhatsApp) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function AudioPlayer({ src, isMe, compact = false }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // Gera waveform estática uma vez por src
  const bars = useMemo(() => {
    const seed = src ? src.length : 42;
    return Array.from({ length: compact ? 20 : 28 }, (_, i) => {
      const x = Math.sin(seed + i * 2.3) * 0.5 + 0.5;
      return 0.25 + x * 0.75;
    });
  }, [src, compact]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const activeColor = isMe ? '#53d4a9' : '#00a884';
  const dimColor = isMe ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.18)';
  const btnSize = compact ? 26 : 32;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 8, minWidth: compact ? 150 : 200 }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTime(audioRef.current.currentTime);
          setProgress(audioRef.current.duration ? audioRef.current.currentTime / audioRef.current.duration : 0);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
      />
      <button
        onClick={toggle}
        title={playing ? 'Pausar' : 'Reproduzir'}
        style={{
          background: isMe ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)',
          border: 'none', borderRadius: '50%',
          width: btnSize, height: btnSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#e9edef', flexShrink: 0,
          fontSize: compact ? 10 : 13
        }}
      >
        {playing ? '⏸' : '▶'}
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: compact ? 16 : 22 }}>
          {bars.map((h, i) => {
            const filled = progress * bars.length > i;
            return (
              <div key={i} style={{
                width: compact ? 1.5 : 2,
                height: `${h * 100}%`,
                background: filled ? activeColor : dimColor,
                borderRadius: 1,
                transition: 'background 0.15s'
              }} />
            );
          })}
        </div>
        {/* Duração */}
        <span style={{ fontSize: compact ? '0.52rem' : '0.62rem', color: '#8696a0' }}>
          {formatTime(playing ? currentTime : duration)}
        </span>
      </div>
    </div>
  );
}
// ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


export default function ProspeccaoAtiva() {
  // Estado para controlar quais seções estão expandidas
  const [expanded, setExpanded] = useState({
    integracoes: false,
    pipelines: false,
    insights: false,
    listas: false,
    automacoes: false,
    insights_relatorios: false,
    automacoes_modelos: false,
  });

  // Estado para controlar qual sub-item está selecionado
  const [selected, setSelected] = useState('pipelines/todos-os-leads');
  // Alterna o estado de expansão de uma seção
  const toggleExpand = (key, e) => {
    if (e) e.stopPropagation();
    setExpanded(prev => {
      const nextVal = !prev[key];
      if (key === 'pipelines' && !nextVal) {
        setPipelineMenuOpen(false);
        setIsAddingPipeline(false);
      }
      return { ...prev, [key]: nextVal };
    });
  };

  // Renderiza a setinha de expansão
  const renderCaret = (key) => (
    <button
      onClick={(e) => toggleExpand(key, e)}
      style={{
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 4,
        borderRadius: 4,
        transition: 'all 0.2s',
      }}
      onMouseOver={e => e.currentTarget.style.color = '#f1f5f9'}
      onMouseOut={e => e.currentTarget.style.color = '#64748b'}
    >
      {expanded[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  // Estados locais para interatividades dentro das páginas do workspace
  const [instagramConnected, setInstagramConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pipelinesList, setPipelinesList] = useState([]);
  const [pipelineColumnsMap, setPipelineColumnsMap] = useState({});
  const [pipelineMenuOpen, setPipelineMenuOpen] = useState(false);
  const [isAddingPipeline, setIsAddingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [isReorderingModalOpen, setIsReorderingModalOpen] = useState(false);
  const [tempPipelines, setTempPipelines] = useState([]);
  const [draggedPipeIndex, setDraggedPipeIndex] = useState(null);
  const [activePipeOptionsId, setActivePipeOptionsId] = useState(null);
  const [renamingPipeId, setRenamingPipeId] = useState(null);
  const [renamingPipeName, setRenamingPipeName] = useState('');
  const [isPipelineExpanded, setIsPipelineExpanded] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState([]);
  const [pipelineViewMode, setPipelineViewMode] = useState('kanban');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isAddSubFunnelModalOpen, setIsAddSubFunnelModalOpen] = useState(false);
  const [newSubFunnelName, setNewSubFunnelName] = useState('');
  // Controla quais pipelines têm os sub-funis expandidos na sidebar
  const [sidebarExpandedPipes, setSidebarExpandedPipes] = useState({});
  const toggleSidebarSubFunnels = (pipeId) => {
    setSidebarExpandedPipes(prev => ({ ...prev, [pipeId]: !prev[pipeId] }));
  };
  const [editingColumnsPipelineId, setEditingColumnsPipelineId] = useState(null);

  // ─── Drag-Scroll com Inércia (Efeito Gelo) ─────────────────────────────────
  // Funciona para QUALQUER kanban container — funis e sub-funis.
  // Cada container recebe sua própria closure de estado, sem ref global.
  const createDragScrollHandlers = () => {
    let _isDown = false;
    let _startX = 0;
    let _scrollLeft = 0;
    let _velocity = 0;
    let _lastX = 0;
    let _lastTime = 0;
    let _rafId = null;
    let _el = null;

    const onMouseDown = (e) => {
      if (e.target.closest('button') || e.target.closest('input') ||
        e.target.closest('select') || e.target.closest('textarea')) return;
      _el = e.currentTarget;
      _isDown = true;
      _startX = e.clientX - _el.offsetLeft;
      _scrollLeft = _el.scrollLeft;
      _lastX = e.clientX;
      _lastTime = Date.now();
      _velocity = 0;
      _el.style.cursor = 'grabbing';
      if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    };

    const onMouseMove = (e) => {
      if (!_isDown || !_el) return;
      e.preventDefault();
      const x = e.clientX - _el.offsetLeft;
      _el.scrollLeft = _scrollLeft - (x - _startX);
      const now = Date.now();
      const dt = now - _lastTime;
      if (dt > 0) _velocity = (e.clientX - _lastX) / dt;
      _lastX = e.clientX;
      _lastTime = now;
    };

    const _release = () => {
      if (!_isDown || !_el) return;
      _isDown = false;
      _el.style.cursor = 'grab';
      const momentumScroll = () => {
        if (Math.abs(_velocity) > 0.05 && _el) {
          _el.scrollLeft -= _velocity * 16;
          _velocity *= 0.94; // fricção suave — efeito gelo
          _rafId = requestAnimationFrame(momentumScroll);
        } else {
          _rafId = null;
        }
      };
      if (Math.abs(_velocity) > 0.05) _rafId = requestAnimationFrame(momentumScroll);
    };

    const onMouseUp = _release;
    const onMouseLeave = _release;

    return { onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
  };

  // Map estável de handlers por kanban (criado uma vez por sub-funil id)
  const dragHandlersMapRef = useRef({});
  const getDragHandlers = (subId) => {
    if (!dragHandlersMapRef.current[subId]) {
      dragHandlersMapRef.current[subId] = createDragScrollHandlers();
    }
    return dragHandlersMapRef.current[subId];
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Estados para a modal de "+ Novo Lead"
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    title: 'Lead #Novo',
    venda: '0',
    tipoCliente: 'Selecione',
    setorCliente: 'Selecione',
    orcamento: '',
    metodoPagamento: 'Selecione',
    objetivoCliente: '',
    motivoPerda: 'Selecione',
    numeroContrato: '',
    dataContrato: '',
    pagamento: 'Selecione',
    noteText: '',
    funilEtapa: 'Nova Consulta',
    subFunnelId: '',
    tags: [],

    // Contato
    empresaContato: '',
    telComercialContato: '',
    emailComercialContato: '',
    posicaoContato: '',

    // Empresa
    telComercialEmpresa: '',
    emailComercialEmpresa: '',
    siteEmpresa: '',
    enderecoEmpresa: ''
  });
  const [showNewLeadContact, setShowNewLeadContact] = useState(false);
  const [showNewLeadCompany, setShowNewLeadCompany] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [activeNewLeadTab, setActiveNewLeadTab] = useState('Principal');
  const [activeNewLeadDropdown, setActiveNewLeadDropdown] = useState(null);

  // Estados para edição de tags da modal de novo lead
  const [tagInput, setTagInput] = useState('');
  const [isEditingTags, setIsEditingTags] = useState(false);

  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 150 });
  const handleDropdownClick = (id, e) => {
    e.stopPropagation();
    if (activeNewLeadDropdown === id) {
      setActiveNewLeadDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
      setActiveNewLeadDropdown(id);
    }
  };

  const selectedPipeline = pipelinesList.find(p => `pipelines/${p.id}` === selected);
  const isKanbanPipelineSelected = selectedPipeline && selectedPipeline.type === 'kanban';
  const [whatsappNumbers, setWhatsappNumbers] = useState([
    { id: '1', name: 'Comercial Principal', phone: '+55 (11) 99999-9999', status: 'Conectado' },
    { id: '2', name: 'Prospecção Lojas', phone: '+55 (11) 98888-8888', status: 'Aguardando QR Code' }
  ]);

  // Estados do Celularzinho Lateral (Passo 1)
  const [selectedWaSession, setSelectedWaSession] = useState(null);
  const [selectedChatLead, setSelectedChatLead] = useState(null);
  const [simulatedCellMessages, setSimulatedCellMessages] = useState({
    // Pre-populate some mockup chat bubbles for visual aesthetics
    'default': [
      { sender: 'lead', text: 'Olá, gostaria de saber mais sobre as soluções da ROI Expert.', time: '10:14' },
      { sender: 'me', text: 'Olá! Claro. Qual o principal desafio da sua empresa hoje em tráfego pago?', time: '10:15' },
      { sender: 'lead', text: 'Estamos investindo no Google Ads, mas o custo por lead está muito alto.', time: '10:18' }
    ]
  });
  const [cellMessageInput, setCellMessageInput] = useState('');
  const [newWaName, setNewWaName] = useState('');
  const [newWaPhone, setNewWaPhone] = useState('');
  const [activeQrCodeId, setActiveQrCodeId] = useState(null);
  const [simulatingConnection, setSimulatingConnection] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [phoneExpanded, setPhoneExpanded] = useState(false);
  const [confirmDeleteWa, setConfirmDeleteWa] = useState(null); // session object to confirm deletion


  // Real Local Server WhatsApp states
  const [realQrCode, setRealQrCode] = useState(null);
  const [qrExpired, setQrExpired] = useState(false);       // QR expirado — mostra overlay
  const [qrRefreshing, setQrRefreshing] = useState(false); // Aguardando novo QR
  const [waServerStatus, setWaServerStatus] = useState('disconnected');
  const [waChats, setWaChats] = useState([]);
  const [waMessages, setWaMessages] = useState([]);
  // Ref para auto-scroll até a última mensagem
  const messagesEndRef = useRef(null);
  const messagesEndRef2 = useRef(null);

  // ─── Estado de Gravação de Áudio ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  // ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const [chatbotActive, setChatbotActive] = useState(true);
  const [chatbotTestInput, setChatbotTestInput] = useState('');
  const [chatbotMessages, setChatbotMessages] = useState([
    { sender: 'bot', text: 'Olá! Sou seu Agente de IA Prospecção. Como posso ajudar nas suas abordagens hoje?' }
  ]);
  const [leads, setLeads] = useState([]);
  // Mensagens não lidas por lead (badge nos cards do Kanban)
  const [leadUnreadCounts, setLeadUnreadCounts] = useState({}); // { [leadId]: number }
  // Fotos de perfil do WhatsApp por leadId
  const [leadProfilePics, setLeadProfilePics] = useState({}); // { [leadId]: url | null }
  // Notificações de leads novos vindos do WhatsApp (número desconhecido)
  const [incomingLeadNotifs, setIncomingLeadNotifs] = useState([]); // [{ chatId, phone, rawPhone, name, message }]
  const [chosenPipelineForNotif, setChosenPipelineForNotif] = useState(''); // pipeline escolhido no modal

  // Fecha o dropdown dos 3 pontinhos ao clicar fora
  useEffect(() => {
    if (!activePipeOptionsId) return;
    const handler = (e) => {
      // Fecha se o clique não foi dentro de um elemento com data-pipe-menu
      if (!e.target.closest('[data-pipe-menu]')) {
        setActivePipeOptionsId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activePipeOptionsId]);

  // Efeito 1: Polling do QR Code e status de conexão da API
  useEffect(() => {

    if (!activeQrCodeId) {
      setRealQrCode(null);
      setQrExpired(false);
      setQrRefreshing(false);
      setWaServerStatus('disconnected');
      return;
    }

    let qrExpiryTimer = null;
    let cancelled = false;

    const startConnection = async () => {
      setQrExpired(false);
      setQrRefreshing(true);
      try {
        // 1. Verifica o status atual ANTES de criar nova sessão
        const statusRes = await fetch('http://localhost:3001/api/whatsapp/status');
        const statusData = await statusRes.json();

        // Se já está conectado, atualiza e encerra
        if (statusData.status === 'connected') {
          setWaServerStatus('connected');
          setQrRefreshing(false);
          return;
        }

        // Se já tem QR ativo no servidor, usa esse (não reinicia!)
        if (statusData.qr) {
          setRealQrCode(statusData.qr);
          setWaServerStatus(statusData.status);
          setQrRefreshing(false);
          // Inicia timer de expiração (30s para dar tempo de scanear)
          if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
          qrExpiryTimer = setTimeout(() => { if (!cancelled) setQrExpired(true); }, 30000);
          return;
        }

        // Se está iniciando (connecting), aguarda sem reiniciar
        if (statusData.status === 'connecting') {
          setWaServerStatus('connecting');
          setQrRefreshing(false);
          return;
        }

        // Só cria nova sessão se realmente não há nada ativo
        const res = await fetch('http://localhost:3001/api/whatsapp/new-session', { method: 'POST' });
        const data = await res.json();
        if (cancelled) return;
        if (data.qr) {
          setRealQrCode(data.qr);
          setQrExpired(false);
          // Timer de 30s para o QR expirar
          if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
          qrExpiryTimer = setTimeout(() => { if (!cancelled) setQrExpired(true); }, 30000);
        }
        setWaServerStatus(data.status);
      } catch (err) {
        console.error("Erro ao iniciar sessão WhatsApp:", err);
      } finally {
        if (!cancelled) setQrRefreshing(false);
      }
    };

    startConnection();

    // Polling a cada 3s — menos agressivo para não interferir na conexão
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch('http://localhost:3001/api/whatsapp/status');
        const data = await res.json();
        if (cancelled) return;
        setWaServerStatus(data.status);

        // Se chegou QR novo (rotação automática do Baileys), atualiza
        if (data.qr) {
          setRealQrCode(prev => {
            // Só reinicia timer se o QR mudou
            if (prev !== data.qr) {
              if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
              qrExpiryTimer = setTimeout(() => { if (!cancelled) setQrExpired(true); }, 30000);
            }
            return data.qr;
          });
          setQrExpired(false);
          setQrRefreshing(false);
        }

        // Conectou! Atualiza banco e encerra polling
        if (data.status === 'connected') {
          const phoneVal = data.phone ? `+${data.phone}` : 'Conectado';
          try {
            await supabase
              .from('crm_whatsapp_sessions')
              .update({ status: 'Conectado', phone: phoneVal })
              .eq('id', activeQrCodeId);
          } catch (err) { }

          setWhatsappNumbers(prev => prev.map(w => w.id === activeQrCodeId ? { ...w, status: 'Conectado', phone: phoneVal } : w));

          setSelectedWaSession(prev => {
            if (activeQrCodeId) {
              const matched = whatsappNumbers.find(w => w.id === activeQrCodeId);
              if (matched) return { ...matched, status: 'Conectado', phone: phoneVal };
            }
            return prev;
          });
          setSelectedChatLead(null);

          clearInterval(interval);
          setActiveQrCodeId(null);
        }
      } catch (err) {
        console.error("Erro no polling de status:", err);
      }
    }, 3000); // 3s — menos agressivo

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (qrExpiryTimer) clearTimeout(qrExpiryTimer);
    };
  }, [activeQrCodeId]);

  // Gera novo QR quando o atual expira (usuário clica em ↻)
  const handleRefreshQr = async () => {
    if (qrRefreshing) return;
    setQrRefreshing(true);
    setQrExpired(false);
    setRealQrCode(null);
    try {
      const res = await fetch('http://localhost:3001/api/whatsapp/new-session', { method: 'POST' });
      const data = await res.json();
      if (data.qr) {
        setRealQrCode(data.qr);
        setQrExpired(false);
      }
      setWaServerStatus(data.status);
    } catch (err) {
      console.error('Erro ao regenerar QR:', err);
    } finally {
      setQrRefreshing(false);
    }
  };

  const [profilePicsStore, setProfilePicsStore] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({}); // { [chatId]: number }
  const selectedChatLeadRef = useRef(null); // ref para acesso dentro do SSE sem re-criar listener

  // Mantém o ref atualizado quando selectedChatLead muda
  useEffect(() => {
    selectedChatLeadRef.current = selectedChatLead;
  }, [selectedChatLead]);

  useEffect(() => {
    if (!selectedWaSession || selectedWaSession.status !== 'Conectado') {
      setWaChats([]);
      return;
    }

    const loadChats = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/whatsapp/chats');
        const data = await res.json();
        setWaChats(data);
        const pics = {};
        data.forEach(c => { if (c.profilePic) pics[c.id] = c.profilePic; });
        if (Object.keys(pics).length > 0) {
          setProfilePicsStore(prev => ({ ...prev, ...pics }));
        }
      } catch (err) { }
    };

    // Carga inicial de chats
    loadChats();
    // Fallback poll a cada 30s (caso SSE caia)
    const chatsInterval = setInterval(loadChats, 30000);

    // ─── SSE: conexão em tempo real ───────────────────────────────────────────
    let eventSource = null;
    let sseRetryTimer = null;

    const connectSSE = () => {
      if (eventSource) eventSource.close();
      eventSource = new EventSource('http://localhost:3001/api/whatsapp/events');

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === 'new_message') {
            const { chatId, message, chat } = data;
            const currentChat = selectedChatLeadRef.current;
            const isCurrentChat = currentChat && (currentChat.id === chatId || currentChat.phone === chatId?.split('@')[0]);

            // Atualiza mensagens se o chat estiver aberto
            if (isCurrentChat) {
              setWaMessages(prev => {
                // Evita duplicatas
                const exists = prev.some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
                if (exists) return prev;
                return [...prev, message];
              });
            } else if (!message.sender || message.sender !== 'me') {
              // Incrementa contador de não lidas para outros chats (só mensagens recebidas)
              setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
            }

            // Move o chat para o topo da lista com a nova mensagem
            setWaChats(prev => {
              const idx = prev.findIndex(c => c.id === chatId);
              const updatedChat = idx !== -1
                ? { ...prev[idx], lastMessage: message.text, lastTime: message.time }
                : { id: chatId, name: chat?.name || chatId, phone: chatId?.split('@')[0], lastMessage: message.text, lastTime: message.time, profilePic: chat?.profilePic || null, status: 'Real' };
              const filtered = prev.filter(c => c.id !== chatId);
              return [updatedChat, ...filtered]; // move para o topo
            });

            // Salva foto de perfil se veio junto
            if (chat?.profilePic) {
              setProfilePicsStore(prev => ({ ...prev, [chatId]: chat.profilePic }));
            }
          }

          // Lead desconhecido: número novo enviou mensagem
          if (data.type === 'lead_new') {
            const { chatId, phone, rawPhone, name, message, chat } = data;
            const currentChat = selectedChatLeadRef.current;
            const isCurrentChat = currentChat && (currentChat.id === chatId || currentChat.phone === chatId?.split('@')[0]);

            // ✅ FIX: Atualiza mensagens se o chat estiver aberto
            if (isCurrentChat) {
              setWaMessages(prev => {
                const exists = prev.some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
                if (exists) return prev;
                return [...prev, message];
              });
            } else {
              // ✅ FIX: Incrementa badge de não lida no celularzinho
              setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
            }

            setIncomingLeadNotifs(prev => {
              // evita duplicata do mesmo chatId
              if (prev.some(n => n.chatId === chatId)) return prev;
              return [...prev, { chatId, phone, rawPhone, name, message, chat }];
            });
            // Atualiza lista de chats do WhatsApp (move para o topo)
            setWaChats(prev => {
              const idx = prev.findIndex(c => c.id === chatId);
              const updatedChat = idx !== -1
                ? { ...prev[idx], lastMessage: message.text, lastTime: message.time }
                : { id: chatId, name: name || phone, phone: rawPhone, lastMessage: message.text, lastTime: message.time, profilePic: chat?.profilePic || null, status: 'Real' };
              const filtered = prev.filter(c => c.id !== chatId);
              return [updatedChat, ...filtered];
            });
            // Salva foto de perfil se veio
            if (chat?.profilePic) {
              setProfilePicsStore(prev => ({ ...prev, [chatId]: chat.profilePic }));
            }
          }

          // Mensagem de lead já cadastrado
          if (data.type === 'known_message') {
            const { chatId, leadId, leadName, message, chat } = data;
            const currentChat = selectedChatLeadRef.current;
            const isCurrentChat = currentChat && (currentChat.id === chatId || currentChat.phone === chatId?.split('@')[0]);

            // ✅ FIX: Atualiza mensagens se o chat estiver aberto
            if (isCurrentChat) {
              setWaMessages(prev => {
                const exists = prev.some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
                if (exists) return prev;
                return [...prev, message];
              });
            } else {
              // ✅ FIX: Incrementa badge de não lida no celularzinho
              setUnreadCounts(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
            }

            // Atualiza chat na lista do celularzinho (move para o topo)
            setWaChats(prev => {
              const idx = prev.findIndex(c => c.id === chatId);
              const updatedChat = idx !== -1
                ? { ...prev[idx], lastMessage: message.text, lastTime: message.time }
                : { id: chatId, name: leadName || chatId, phone: chatId?.split('@')[0], lastMessage: message.text, lastTime: message.time, profilePic: chat?.profilePic || null, status: 'Real' };
              const filtered = prev.filter(c => c.id !== chatId);
              return [updatedChat, ...filtered];
            });
            // 📦 Incrementa badge no card do lead no Kanban
            setLeadUnreadCounts(prev => ({
              ...prev,
              [leadId]: (prev[leadId] || 0) + 1
            }));
            // 🖼️ Atualiza foto de perfil se o servidor enviou
            if (chat?.profilePic && leadId) {
              setLeadProfilePics(prev => ({ ...prev, [leadId]: chat.profilePic }));
            }
          }

          // ⚡ QR Code pronto: exibe instantaneamente sem esperar polling
          if (data.type === 'qr_code' && data.qr) {
            setRealQrCode(data.qr);
            setQrExpired(false);
            setQrRefreshing(false);
          }

          // ⚡ WhatsApp conectou: atualiza status sem esperar polling
          if (data.type === 'wa_connected') {
            setWaServerStatus('connected');
            setRealQrCode(null);
            setQrExpired(false);
            setQrRefreshing(false);
          }

        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSource = null;
        // Reconecta após 5s
        sseRetryTimer = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();
    // ──────────────────────────────────────────────────────────────────────────

    return () => {
      clearInterval(chatsInterval);
      if (eventSource) eventSource.close();
      if (sseRetryTimer) clearTimeout(sseRetryTimer);
    };
  }, [selectedWaSession]);

  // Limpa unread ao abrir um chat
  useEffect(() => {
    if (selectedChatLead?.id) {
      setUnreadCounts(prev => ({ ...prev, [selectedChatLead.id]: 0 }));
    }
  }, [selectedChatLead]);

  // ───── SISTEMA DE TAGS DE FUNIL NO CHAT ────────────────────────────────────
  // Map: chatId (JID) → { lead, pipeline } | null
  const [chatLeadMap, setChatLeadMap] = useState({});
  // Estado do popover seletor de funil
  const [pipelineSelectorOpen, setPipelineSelectorOpen] = useState(null); // chatId ou null
  const [pipelineSelectorLoading, setPipelineSelectorLoading] = useState(false);

  // Normaliza um número de telefone para apenas dígitos (sem código de país opcional)
  const normalizePhone = (raw) => {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    // Remove código do país 55 se começar com ele e tiver mais de 11 dígitos
    if (digits.startsWith('55') && digits.length > 11) return digits.slice(2);
    return digits;
  };

  // Formata o número de telefone no padrão brasileiro
  const formatPhone = (raw) => {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) {
      const ddd = digits.substring(2, 4);
      const number = digits.substring(4);
      if (number.length === 9) {
        return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
      }
      return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
    }
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return raw;
  };

  // Verifica se dois números de telefone correspondem ao mesmo contato
  const phonesMatch = (phone1, phone2) => {
    const a = normalizePhone(phone1);
    const b = normalizePhone(phone2);
    if (!a || !b) return false;
    // Comparação direta
    if (a === b) return true;
    // Considera versão com/sem dígito 9 (ex: 11999994810 vs 1199994810)
    const aShort = a.length === 11 ? a.slice(0, 2) + a.slice(3) : a;
    const bShort = b.length === 11 ? b.slice(0, 2) + b.slice(3) : b;
    return aShort === bShort || aShort === b || bShort === a;
  };

  // Batch query: mapeia cada chat do WhatsApp para seu lead/pipeline no CRM
  useEffect(() => {
    if (!waChats.length || !leads.length) return;

    const map = {};
    for (const chat of waChats) {
      const chatPhone = normalizePhone(chat.phone || chat.id?.split('@')[0]);
      // Encontra TODOS os leads que correspondem a este número
      const matchingLeads = leads.filter(lead => phonesMatch(lead.phone || lead.telComercialContato || lead.details?.phone, chatPhone));
      if (matchingLeads.length === 0) {
        map[chat.id] = null; // sem funil
      } else {
        // Ordena por pipeline_id (não nulo primeiro), pega o principal
        const sorted = [...matchingLeads].sort((a, b) => {
          if (a.pipeline_id && !b.pipeline_id) return -1;
          if (!a.pipeline_id && b.pipeline_id) return 1;
          return 0;
        });
        const primaryLead = sorted[0];
        const pipeline = pipelinesList.find(p => p.id === primaryLead.pipeline_id);
        map[chat.id] = {
          lead: primaryLead,
          pipeline: pipeline || null,
          allLeads: sorted // todos os leads vinculados a este número
        };
      }
    }
    setChatLeadMap(map);
  }, [waChats, leads, pipelinesList]);

  // Ação: Adicionar contato ao funil (cria novo Lead ou move existente)
  const handleAddToPipeline = async (chat, pipelineId) => {
    const phone = chat.phone || normalizePhone(chat.id?.split('@')[0]);

    // 1️⃣ Proibir duplicatas: verifica se o número já existe nos leads do CRM
    const existingLead = leads.find(l => phonesMatch(l.phone || l.telComercialContato || l.details?.phone, phone));
    if (existingLead) {
      // Se já existe, move o lead para o funil em vez de criar um duplicado
      await handleMovePipeline(existingLead, pipelineId, chat.id);
      return;
    }

    setPipelineSelectorLoading(true);
    try {
      // 2️⃣ Hierarquia de nomes:
      // Se chat.name existe e não é igual ao número ou não começa com +, usa ele. Caso contrário, usa o telefone formatado.
      const rawName = chat.name || '';
      const isJustNumber = rawName.replace(/\D/g, '') === phone || rawName.startsWith('+');
      const name = (rawName && !isJustNumber) ? rawName : formatPhone(phone);

      const firstColumnName = (pipelineColumnsMap[pipelineId] && pipelineColumnsMap[pipelineId].length > 0)
        ? pipelineColumnsMap[pipelineId][0]
        : 'Nova Consulta';

      const newLeadId = Date.now().toString();
      const newLead = {
        id: newLeadId,
        pipeline_id: pipelineId,
        name,
        company: '',
        source: 'WhatsApp',
        status: firstColumnName, // Salva o status correspondente à primeira etapa do funil selecionado
        venda: 0,
        tags: [],
        details: { phone } // Salva o telefone no details (JSONB) para compatibilidade
      };

      const { data, error } = await supabase.from('crm_leads').insert(newLead).select().single();
      if (!error && data) {
        const mappedLead = {
          ...data,
          id: data.id,
          pipelineId: data.pipeline_id,
          phone,
          ...(data.details || {})
        };
        setLeads(prev => [mappedLead, ...prev]);
        const pipeline = pipelinesList.find(p => p.id === pipelineId);
        setChatLeadMap(prev => ({
          ...prev,
          [chat.id]: { lead: mappedLead, pipeline, allLeads: [mappedLead] }
        }));
      } else {
        console.error('Erro ao adicionar lead ao funil:', error?.message);
      }
    } finally {
      setPipelineSelectorLoading(false);
      setPipelineSelectorOpen(null);
    }
  };

  // Ação: Mover lead para outro funil
  const handleMovePipeline = async (lead, newPipelineId, chatId) => {
    setPipelineSelectorLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({ pipeline_id: newPipelineId })
        .eq('id', lead.id);
      if (!error) {
        const updatedLead = { ...lead, pipeline_id: newPipelineId, pipelineId: newPipelineId };
        setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
        const pipeline = pipelinesList.find(p => p.id === newPipelineId);
        setChatLeadMap(prev => ({
          ...prev,
          [chatId]: { lead: updatedLead, pipeline, allLeads: [updatedLead] }
        }));
      }
    } finally {
      setPipelineSelectorLoading(false);
      setPipelineSelectorOpen(null);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // Efeito 3: Carregar mensagens do chat selecionado (poll leve de 10s + SSE cuida das novas)
  useEffect(() => {
    if (!selectedChatLead || !selectedWaSession) {
      setWaMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const phone = selectedChatLead.phone || selectedChatLead.id;
        const res = await fetch(`http://localhost:3001/api/whatsapp/messages?chatId=${phone}`);
        const data = await res.json();
        setWaMessages(data);
      } catch (err) { }
    };

    loadMessages();
    // Fallback poll a cada 10s — SSE cuida das atualizações em tempo real
    const interval = setInterval(loadMessages, 10000);

    return () => clearInterval(interval);
  }, [selectedChatLead, selectedWaSession]);

  // Auto-scroll para última mensagem sempre que as mensagens mudam ou chat muda
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (messagesEndRef2.current) {
      messagesEndRef2.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [waMessages, selectedChatLead]);

  // Estados para edição/visualização de detalhes de um lead existente
  const [selectedLead, setSelectedLead] = useState(null);
  const [editLeadForm, setEditLeadForm] = useState(null);
  const [activeLeadTab, setActiveLeadTab] = useState('geral');
  const [isEditingLeadTags, setIsEditingLeadTags] = useState(false);
  const [leadTagInput, setLeadTagInput] = useState('');
  // Chat do Lead (painel direito)
  const [leadMessages, setLeadMessages] = useState([]);
  const [leadMessageInput, setLeadMessageInput] = useState('');
  const [leadMsgTab, setLeadMsgTab] = useState('note'); // 'note' | 'whatsapp'
  const [leadMsgSaving, setLeadMsgSaving] = useState(false);
  const [leadChatLoading, setLeadChatLoading] = useState(false);
  const [waServerOnline, setWaServerOnline] = useState(false); // servidor WA online?
  const leadChatEndRef = useRef(null);
  const selectedLeadRef = useRef(null);

  // Mantém ref sincronizada com selectedLead
  useEffect(() => { selectedLeadRef.current = selectedLead; }, [selectedLead]);

  useEffect(() => {
    if (selectedLead) {
      setEditLeadForm({
        name: selectedLead.name || '',
        company: selectedLead.company || '',
        source: selectedLead.source || '',
        status: selectedLead.status || '',
        venda: selectedLead.venda || 0,
        tags: selectedLead.tags || [],
        pipeline_id: selectedLead.pipeline_id || 'funil',

        // details
        tipoCliente: selectedLead.tipoCliente || 'Selecione',
        setorCliente: selectedLead.setorCliente || 'Selecione',
        orcamento: selectedLead.orcamento || '',
        metodoPagamento: selectedLead.metodoPagamento || 'Selecione',
        objetivoCliente: selectedLead.objetivoCliente || '',
        motivoPerda: selectedLead.motivoPerda || 'Selecione',
        numeroContrato: selectedLead.numeroContrato || '',
        dataContrato: selectedLead.dataContrato || '',
        pagamento: selectedLead.pagamento || 'Selecione',
        noteText: selectedLead.noteText || '',
        empresaContato: selectedLead.empresaContato || '',
        telComercialContato: selectedLead.telComercialContato || '',
        emailComercialContato: selectedLead.emailComercialContato || '',
        posicaoContato: selectedLead.posicaoContato || '',
        telComercialEmpresa: selectedLead.telComercialEmpresa || '',
        emailComercialEmpresa: selectedLead.emailComercialEmpresa || '',
        siteEmpresa: selectedLead.siteEmpresa || '',
        enderecoEmpresa: selectedLead.enderecoEmpresa || ''
      });
      setActiveLeadTab('geral');
      setIsEditingLeadTags(false);
      setLeadTagInput('');
      setLeadMessages([]);
      setLeadMessageInput('');
      setLeadMsgTab('note');
    } else {
      setEditLeadForm(null);
    }
  }, [selectedLead]);

  const handleSaveLeadDetails = async () => {
    if (!selectedLead || !editLeadForm) return;

    const updatedLeadData = {
      name: editLeadForm.name,
      company: editLeadForm.company,
      source: editLeadForm.source,
      status: editLeadForm.status,
      pipeline_id: editLeadForm.pipeline_id,
      venda: Number(editLeadForm.venda) || 0,
      tags: editLeadForm.tags,
      details: {
        tipoCliente: editLeadForm.tipoCliente,
        setorCliente: editLeadForm.setorCliente,
        orcamento: editLeadForm.orcamento,
        metodoPagamento: editLeadForm.metodoPagamento,
        objetivoCliente: editLeadForm.objetivoCliente,
        motivoPerda: editLeadForm.motivoPerda,
        numeroContrato: editLeadForm.numeroContrato,
        dataContrato: editLeadForm.dataContrato,
        pagamento: editLeadForm.pagamento,
        noteText: editLeadForm.noteText,
        empresaContato: editLeadForm.empresaContato,
        telComercialContato: editLeadForm.telComercialContato,
        emailComercialContato: editLeadForm.emailComercialContato,
        posicaoContato: editLeadForm.posicaoContato,
        telComercialEmpresa: editLeadForm.telComercialEmpresa,
        emailComercialEmpresa: editLeadForm.emailComercialEmpresa,
        siteEmpresa: editLeadForm.siteEmpresa,
        enderecoEmpresa: editLeadForm.enderecoEmpresa,
        responsible: editLeadForm.responsible
      }
    };

    const { data, error } = await supabase
      .from('crm_leads')
      .update(updatedLeadData)
      .eq('id', selectedLead.id)
      .select()
      .single();

    if (!error && data) {
      // Atualiza o card localmente — status novo = move de coluna imediatamente
      const updatedLead = {
        ...selectedLead,
        ...data,
        pipelineId: data.pipeline_id,
        status: data.status,
        pipeline_id: data.pipeline_id,
        ...(data.details || {})
      };
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
      // Fecha o modal após salvar
      setSelectedLead(null);
    } else {
      console.error('Erro ao atualizar detalhes do lead:', error?.message);
    }
  };


  // Carrega mensagens do lead ao abrir modal — mescla Supabase + histórico WhatsApp do servidor
  useEffect(() => {
    if (!selectedLead) return;
    let cancelled = false;
    const loadLeadMessages = async () => {
      setLeadChatLoading(true);
      try {
        // 1. Busca mensagens do Supabase
        const { data: dbMsgs } = await supabase
          .from('crm_lead_messages')
          .select('*')
          .eq('lead_id', selectedLead.id)
          .order('created_at', { ascending: true });

        // 2. Tenta buscar histórico WhatsApp do servidor local
        const phone = (selectedLead.details?.phone || selectedLead.telComercialContato || '').replace(/\D/g, '');
        let waMsgs = [];
        if (phone) {
          try {
            const res = await fetch(`http://localhost:3001/api/whatsapp/messages?chatId=${phone}`, { signal: AbortSignal.timeout(2000) });
            if (res.ok) {
              const waData = await res.json();
              setWaServerOnline(true);
              // Converte formato do servidor para formato do Supabase
              waMsgs = waData.map(m => ({
                id: `wa-${m.timestamp || Math.random()}`,
                lead_id: selectedLead.id,
                sender: m.sender === 'me' ? 'me' : 'lead',
                text: m.text,
                type: 'whatsapp',
                created_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
                _source: 'wa_server'
              }));
            }
          } catch (e) {
            setWaServerOnline(false);
          }
        }

        if (cancelled) return;

        // 3. Mescla e deduplica por texto + timestamp aproximado
        const allMsgs = [...(dbMsgs || []), ...waMsgs];
        // Remove duplicatas: mensagem WhatsApp já persistida no Supabase
        const dbWaTexts = new Set((dbMsgs || []).filter(m => m.type === 'whatsapp').map(m => m.text?.trim()));
        const merged = [
          ...(dbMsgs || []),
          ...waMsgs.filter(m => !dbWaTexts.has(m.text?.trim()))
        ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        setLeadMessages(merged);
      } catch (e) {
        console.error('Erro ao carregar mensagens:', e);
      } finally {
        if (!cancelled) setLeadChatLoading(false);
      }
    };
    loadLeadMessages();
    return () => { cancelled = true; };
  }, [selectedLead?.id]);

  // Auto-scroll quando chegam mensagens novas no chat do lead
  useEffect(() => {
    if (leadChatEndRef.current) {
      leadChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [leadMessages]);

  const handleSendLeadMessage = async () => {
    if (!leadMessageInput.trim() || !selectedLead) return;
    const text = leadMessageInput.trim();
    const type = leadMsgTab; // 'note' | 'whatsapp'

    // ✅ Optimistic UI: mostra a mensagem e limpa o input IMEDIATAMENTE
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      lead_id: selectedLead.id,
      sender: 'me',
      text,
      type,
      created_at: new Date().toISOString(),
    };
    setLeadMessages(prev => [...prev, optimisticMsg]);
    setLeadMessageInput('');
    setLeadMsgSaving(true);

    try {
      // Persiste no Supabase em background
      const { data: msgData, error: msgErr } = await supabase
        .from('crm_lead_messages')
        .insert({ lead_id: selectedLead.id, sender: 'me', text, type })
        .select()
        .single();

      if (!msgErr && msgData) {
        // Substitui a mensagem otimista pelo registro real do banco
        setLeadMessages(prev => prev.map(m => m.id === optimisticMsg.id ? msgData : m));
      }

      // Envia pelo WhatsApp em background (não bloqueia)
      if (type === 'whatsapp') {
        const phone = (editLeadForm?.details?.phone || editLeadForm?.telComercialContato || '').replace(/\D/g, '');
        if (phone && selectedLead?.id) {
          fetch('http://localhost:3001/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message: text, leadId: selectedLead.id })
          }).catch(() => {}); // silencia erro se servidor offline
        }
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
    } finally {
      setLeadMsgSaving(false);
    }
  };

  const handleSendCellMessage = async () => {
    if (!cellMessageInput.trim() || !selectedChatLead) return;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const text = cellMessageInput.trim();
    const newMessage = { sender: 'me', text, time, timestamp: Date.now() / 1000 };
    const leadPhone = selectedChatLead.phone || selectedChatLead.id;
    const isMock = selectedChatLead.status === 'Mock' || !selectedChatLead.status;

    if (!isMock) {
      // ✅ Optimistic UI: exibe a mensagem e limpa o input IMEDIATAMENTE (0ms)
      setWaMessages(prev => [...prev, newMessage]);
      setCellMessageInput('');

      // Envia em background — não bloqueia a UI
      fetch('http://localhost:3001/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: leadPhone, message: text })
      }).catch(err => console.error('Erro ao enviar mensagem real:', err));
    } else {
      const leadId = selectedChatLead.id;
      setSimulatedCellMessages(prev => {
        const currentList = prev[leadId] || prev['default'] || [];
        return {
          ...prev,
          [leadId]: [...currentList, newMessage]
        };
      });
      setCellMessageInput('');

      // Simulação de auto-resposta mágica em 1.5 segundos
      setTimeout(() => {
        const replyTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const replies = [
          "Show de bola! Vou conversar com minha equipe sobre isso.",
          "Excelente. Qual o próximo passo para fecharmos a parceria?",
          "Qual o valor aproximado desse setup de tráfego pago?",
          "Consigo falar com você por ligação hoje no final da tarde?",
          "Beleza, vou dar uma olhada no material que você me enviou!"
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const leadReply = { sender: 'lead', text: randomReply, time: replyTime };
        setSimulatedCellMessages(prev => {
          const currentList = prev[leadId] || prev['default'] || [];
          return {
            ...prev,
            [leadId]: [...currentList, leadReply]
          };
        });
      }, 1500);
    }
  };

  // \u2500\u2500\u2500 Grava\u00e7\u00e3o de \u00c1udio (MediaRecorder API) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const sendAudioMessage = (blob, mimeType) => {
    const leadPhone = selectedChatLead?.phone || selectedChatLead?.id;
    if (!leadPhone || !blob) return;

    // Optimistic UI: mostra bolha de \u00e1udio imediatamente (URL local do blob)
    const localUrl = URL.createObjectURL(blob);
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setWaMessages(prev => [...prev, { sender: 'me', text: '\ud83c\udfa4 \u00c1udio', time, audioUrl: localUrl, timestamp: Date.now() / 1000 }]);

    // Converte para base64 e envia em background
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      fetch('http://localhost:3001/api/whatsapp/send-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: leadPhone, audioBase64: base64, mimeType })
      }).catch(err => console.error('Erro ao enviar \u00e1udio:', err));
    };
    reader.readAsDataURL(blob);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > 0) sendAudioMessage(blob, mimeType);
      };

      mediaRecorder.start(100); // coleta chunks a cada 100ms
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Erro ao acessar microfone:', e);
      alert('N\u00e3o foi poss\u00edvel acessar o microfone. Verifique as permiss\u00f5es do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      // Remove os handlers antes de parar para evitar o envio
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    recordedChunksRef.current = [];
  };

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60);
    return `${m}:${(secs % 60).toString().padStart(2, '0')}`;
  };
  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500


  const loadCRMData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pipelines
      let { data: dbPipelines, error: pError } = await supabase
        .from('crm_pipelines')
        .select('*')
        .order('order_index', { ascending: true });

      if (pError) throw pError;

      // Auto-healing: Ensure both 'funil' and 'todos-os-leads' exist in dbPipelines
      let needsRefetch = false;

      if (!dbPipelines || !dbPipelines.some(p => p.id === 'funil')) {
        await supabase
          .from('crm_pipelines')
          .insert({ id: 'funil', name: 'Funil de Vendas', type: 'kanban', order_index: 0 });
        needsRefetch = true;
      }

      if (!dbPipelines || !dbPipelines.some(p => p.id === 'todos-os-leads')) {
        await supabase
          .from('crm_pipelines')
          .insert({ id: 'todos-os-leads', name: 'Todos os Leads', type: 'list', order_index: 1 });
        needsRefetch = true;
      }

      if (needsRefetch) {
        let { data: refetchedPipes, error: refetchErr } = await supabase
          .from('crm_pipelines')
          .select('*')
          .order('order_index', { ascending: true });
        if (!refetchErr && refetchedPipes) {
          dbPipelines = refetchedPipes;
        }
      }

      // 2. Fetch Columns
      let { data: dbColumns, error: cError } = await supabase
        .from('crm_pipeline_columns')
        .select('*')
        .order('position', { ascending: true });

      if (cError) throw cError;

      // Ensure 'funil' has its default columns if none exist
      const funilCols = dbColumns ? dbColumns.filter(c => c.pipeline_id === 'funil') : [];
      if (funilCols.length === 0) {
        const defaultCols = ['Nova Consulta', 'Qualificado', 'Chamada Agendada', 'Preparando Proposta', 'Proposta Enviada', 'Acompanhamento', 'Negociação', 'Fatura Enviada'];
        const colInserts = defaultCols.map((c, i) => ({
          pipeline_id: 'funil',
          name: c,
          position: i
        }));
        await supabase.from('crm_pipeline_columns').insert(colInserts);

        let { data: refetchedCols, error: refetchColsErr } = await supabase
          .from('crm_pipeline_columns')
          .select('*')
          .order('position', { ascending: true });
        if (!refetchColsErr && refetchedCols) {
          dbColumns = refetchedCols;
        }
      }

      // 3. Fetch Leads
      let { data: dbLeads, error: lError } = await supabase
        .from('crm_leads')
        .select('*');

      if (lError) throw lError;

      // Set initial states from loaded DB data immediately
      setPipelinesList(dbPipelines || []);

      const initialColsMap = {};
      (dbPipelines || []).forEach(p => {
        initialColsMap[p.id] = (dbColumns || [])
          .filter(c => c.pipeline_id === p.id)
          .map(c => c.name);
      });
      setPipelineColumnsMap(initialColsMap);

      setLeads((dbLeads || []).map(l => ({
        ...l,
        id: l.id,
        pipelineId: l.pipeline_id,
        ...(l.details || {})
      })));

      // Busca fotos de perfil do WhatsApp em background (sem bloquear UI)
      setTimeout(async () => {
        const leadsWithPhone = (dbLeads || []).filter(l => {
          const phone = (l.details?.phone || '').replace(/\D/g, '');
          return phone.length >= 10;
        });
        if (leadsWithPhone.length === 0) return;

        const pics = {};
        // Busca em lotes de 5 para não sobrecarregar o servidor
        for (let i = 0; i < leadsWithPhone.length; i += 5) {
          const batch = leadsWithPhone.slice(i, i + 5);
          await Promise.allSettled(batch.map(async (lead) => {
            const phone = (lead.details?.phone || '').replace(/\D/g, '');
            const jid = `${phone}@s.whatsapp.net`;
            try {
              const res = await fetch(
                `http://localhost:3001/api/whatsapp/profile-pic?jid=${encodeURIComponent(jid)}`,
                { signal: AbortSignal.timeout(3000) }
              );
              if (res.ok) {
                const data = await res.json();
                if (data.url) pics[lead.id] = data.url;
              }
            } catch (e) { /* servidor offline ou sem foto */ }
          }));
          // Pequena pausa entre lotes
          if (i + 5 < leadsWithPhone.length) await new Promise(r => setTimeout(r, 300));
        }
        if (Object.keys(pics).length > 0) {
          setLeadProfilePics(prev => ({ ...prev, ...pics }));
        }
      }, 2000); // aguarda 2s após carregar para não competir com outros fetches

      // Check if we need to migrate from localStorage (isolated in a try-catch block to prevent page crash)
      try {
        const localPipes = localStorage.getItem('roi_pipelines_list');
        const localCols = localStorage.getItem('roi_pipeline_columns_map');
        const localLeads = localStorage.getItem('roi_leads');

        if (localPipes || localCols || localLeads) {
          console.log('Dados locais detectados. Iniciando migração para o Supabase...');
          let migratedPipes = [...(dbPipelines || [])];
          let migratedCols = [...(dbColumns || [])];
          let migratedLeads = [...(dbLeads || [])];

          const parsedLocalPipes = localPipes ? JSON.parse(localPipes) : [];
          const parsedLocalCols = localCols ? JSON.parse(localCols) : {};
          const parsedLocalLeads = localLeads ? JSON.parse(localLeads) : [];

          // Migrate Pipelines
          for (const pipe of parsedLocalPipes) {
            if (pipe && pipe.id && !migratedPipes.some(p => p.id === pipe.id)) {
              const { data: newP, error } = await supabase
                .from('crm_pipelines')
                .insert({ id: pipe.id, name: pipe.name || 'Funil', type: pipe.type || 'kanban' })
                .select()
                .single();
              if (!error && newP) migratedPipes.push(newP);
            }
          }

          // Migrate Columns
          for (const pipeId in parsedLocalCols) {
            const colsList = parsedLocalCols[pipeId] || [];
            const dbColsForPipe = migratedCols.filter(c => c.pipeline_id === pipeId);
            if (dbColsForPipe.length === 0) {
              for (let i = 0; i < colsList.length; i++) {
                if (colsList[i]) {
                  const { data: newC, error } = await supabase
                    .from('crm_pipeline_columns')
                    .insert({ pipeline_id: pipeId, name: colsList[i], position: i })
                    .select()
                    .single();
                  if (!error && newC) migratedCols.push(newC);
                }
              }
            }
          }

          // Migrate Leads
          for (const lead of parsedLocalLeads) {
            if (lead && lead.id && !migratedLeads.some(l => l.id === lead.id.toString() || l.id === lead.id)) {
              const leadPipelineId = lead.pipelineId || 'funil';
              const { data: newL, error } = await supabase
                .from('crm_leads')
                .insert({
                  id: lead.id.toString(),
                  pipeline_id: leadPipelineId,
                  name: lead.name || 'Sem Nome',
                  company: lead.company || '',
                  source: lead.source || '',
                  status: lead.status || 'Novo',
                  venda: Number(lead.venda) || 0,
                  tags: lead.tags || [],
                  details: {
                    tipoCliente: lead.tipoCliente || 'Selecione',
                    setorCliente: lead.setorCliente || 'Selecione',
                    orcamento: lead.orcamento || '',
                    metodoPagamento: lead.metodoPagamento || 'Selecione',
                    objetivoCliente: lead.objetivoCliente || '',
                    motivoPerda: lead.motivoPerda || 'Selecione',
                    numeroContrato: lead.numeroContrato || '',
                    dataContrato: lead.dataContrato || '',
                    pagamento: lead.pagamento || 'Selecione',
                    noteText: lead.noteText || '',
                    empresaContato: lead.empresaContato || '',
                    telComercialContato: lead.telComercialContato || '',
                    emailComercialContato: lead.emailComercialContato || '',
                    posicaoContato: lead.posicaoContato || '',
                    telComercialEmpresa: lead.telComercialEmpresa || '',
                    emailComercialEmpresa: lead.emailComercialEmpresa || '',
                    siteEmpresa: lead.siteEmpresa || '',
                    enderecoEmpresa: lead.enderecoEmpresa || ''
                  }
                })
                .select()
                .single();
              if (!error && newL) migratedLeads.push(newL);
            }
          }

          localStorage.removeItem('roi_pipelines_list');
          localStorage.removeItem('roi_pipeline_columns_map');
          localStorage.removeItem('roi_leads');

          // Refetch to guarantee perfect synchronization
          let { data: finalPipes } = await supabase
            .from('crm_pipelines')
            .select('*')
            .order('order_index', { ascending: true });

          let { data: finalCols } = await supabase
            .from('crm_pipeline_columns')
            .select('*')
            .order('position', { ascending: true });

          let { data: finalLeads } = await supabase
            .from('crm_leads')
            .select('*');

          setPipelinesList(finalPipes || migratedPipes);

          const newColsMap = {};
          (finalPipes || migratedPipes).forEach(p => {
            newColsMap[p.id] = (finalCols || migratedCols)
              .filter(c => c.pipeline_id === p.id)
              .map(c => c.name);
          });
          setPipelineColumnsMap(newColsMap);
          setLeads((finalLeads || migratedLeads).map(l => ({
            ...l,
            id: l.id,
            pipelineId: l.pipeline_id,
            ...(l.details || {})
          })));
        }
      } catch (migrationErr) {
        console.error('Falha ao rodar migração de localStorage:', migrationErr);
      }
      // 4. Fetch WhatsApp Sessions from crm_whatsapp_sessions
      try {
        const { data: dbSessions, error: wError } = await supabase
          .from('crm_whatsapp_sessions')
          .select('*')
          .order('created_at', { ascending: true });

        if (!wError && dbSessions && dbSessions.length > 0) {
          setWhatsappNumbers(dbSessions);
          const firstConn = dbSessions.find(s => s.status === 'Conectado');
          if (firstConn) {
            setSelectedWaSession(firstConn);
          }

          // Auto-heal "Carregando..." or null phone numbers if connected on backend
          (async () => {
            try {
              const checkRes = await fetch('http://localhost:3001/api/whatsapp/status');
              const checkData = await checkRes.json();
              if (checkData.status === 'connected' && checkData.phone) {
                const phoneVal = `+${checkData.phone}`;
                const missingPhoneSession = dbSessions.find(s => s.status === 'Conectado' && (s.phone === 'Carregando...' || !s.phone || s.phone === 'Conectado'));
                if (missingPhoneSession) {
                  await supabase
                    .from('crm_whatsapp_sessions')
                    .update({ phone: phoneVal })
                    .eq('id', missingPhoneSession.id);

                  setWhatsappNumbers(prev => prev.map(w => w.id === missingPhoneSession.id ? { ...w, phone: phoneVal } : w));
                  setSelectedWaSession(prev => prev && prev.id === missingPhoneSession.id ? { ...prev, phone: phoneVal } : prev);
                }
              }
            } catch (err) { }
          })();
        } else if (!dbSessions || dbSessions.length === 0) {
          // If table is empty, auto-select mock connected session
          setSelectedWaSession({ id: '1', name: 'Comercial Principal', phone: '+55 (11) 99999-9999', status: 'Conectado' });
        }
      } catch (waErr) {
        console.warn("Tabela crm_whatsapp_sessions não encontrada. Usando mock local.", waErr);
        setSelectedWaSession({ id: '1', name: 'Comercial Principal', phone: '+55 (11) 99999-9999', status: 'Conectado' });
      }
    } catch (err) {
      console.error('Erro ao carregar dados do CRM do Supabase:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCRMData();
  }, []);

  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('Instagram');
  const [searchTerm, setSearchTerm] = useState('');
  const [roiInvest, setRoiInvest] = useState(1500);
  const [roiSales, setRoiSales] = useState(6800);
  const [roiLeads, setRoiLeads] = useState(120);

  // Manipulador de adição de leads
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLeadName || !newLeadCompany) return;
    const newId = Date.now().toString();
    const cleanName = newLeadName.trim();
    const cleanCompany = newLeadCompany.trim();
    const pipelineId = selectedPipeline?.id || 'funil';
    const defaultStatus = 'Novo';

    const newL = {
      id: newId,
      pipeline_id: pipelineId,
      name: cleanName,
      company: cleanCompany,
      source: newLeadSource,
      status: defaultStatus,
      venda: 0,
      tags: [],
      details: {}
    };

    const { data, error } = await supabase
      .from('crm_leads')
      .insert(newL)
      .select()
      .single();

    if (!error && data) {
      setLeads([{
        ...data,
        pipelineId: data.pipeline_id,
        id: data.id
      }, ...leads]);
      setNewLeadName('');
      setNewLeadCompany('');
    } else {
      console.error('Erro ao adicionar lead:', error?.message);
    }
  };

  const handleDeleteLead = async (leadId) => {
    const { error } = await supabase
      .from('crm_leads')
      .delete()
      .eq('id', leadId.toString());

    if (!error) {
      setLeads(prev => prev.filter(x => x.id !== leadId));
    } else {
      console.error('Erro ao deletar lead:', error.message);
    }
  };

  const handleSaveNewPipeline = async () => {
    if (!newPipelineName.trim()) return;
    const cleanName = newPipelineName.trim();
    const newId = 'pipeline-' + Date.now();

    const { error: pError } = await supabase
      .from('crm_pipelines')
      .insert({ id: newId, name: cleanName, type: 'kanban' });

    if (pError) {
      console.error('Erro ao salvar pipeline:', pError.message);
      return;
    }

    const defaultCols = [
      'Nova Consulta',
      'Qualificado',
      'Chamada Agendada',
      'Preparando Proposta',
      'Proposta Enviada',
      'Acompanhamento',
      'Negociação',
      'Fatura Enviada'
    ];
    const colInserts = defaultCols.map((c, i) => ({
      pipeline_id: newId,
      name: c,
      position: i
    }));

    const { error: cError } = await supabase
      .from('crm_pipeline_columns')
      .insert(colInserts);

    if (cError) {
      console.error('Erro ao salvar colunas:', cError.message);
      return;
    }

    await loadCRMData();
    setIsAddingPipeline(false);
    setSelected(`pipelines/${newId}`);
  };

  const handleSaveRenamePipeline = async (pipeId) => {
    if (!renamingPipeName.trim()) return;
    const cleanName = renamingPipeName.trim();

    const { error } = await supabase
      .from('crm_pipelines')
      .update({ name: cleanName })
      .eq('id', pipeId);

    if (!error) {
      setPipelinesList(prev => prev.map(p => p.id === pipeId ? { ...p, name: cleanName } : p));
      setRenamingPipeId(null);
    } else {
      console.error('Erro ao renomear pipeline:', error.message);
    }
  };

  const handleDeletePipeline = async (pipeId, pipeName) => {
    if (pipeId === 'funil' || pipeId === 'todos-os-leads') {
      alert('Este funil padrão não pode ser excluído!');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja deletar o funil "${pipeName}"? Todos os leads deste funil serão desvinculados.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('crm_pipelines')
        .delete()
        .eq('id', pipeId);

      if (!error) {
        await loadCRMData();
        if (selected === `pipelines/${pipeId}`) {
          setSelected('pipelines/todos-os-leads');
        }
      } else {
        console.error('Erro ao deletar pipeline:', error.message);
      }
    } catch (err) {
      console.error('Falha ao excluir pipeline:', err);
    }
  };

  const handleAddSubFunnel = async (newSubName) => {
    if (!newSubName || !newSubName.trim() || !selectedPipeline) return;
    const cleanName = newSubName.trim();

    try {
      setLoading(true);
      const parentId = selectedPipeline.id;

      // Get sub-funnels for this parent
      const existingSubs = pipelinesList.filter(p => p.parent_id === parentId);

      // If first sub-funnel, we must migrate existing parent columns & leads to a default sub-funnel
      if (existingSubs.length === 0) {
        const defaultSubId = `${parentId}-principal-${Date.now()}`;

        // 1. Create original main funnel as sub-funnel
        const { error: err1 } = await supabase
          .from('crm_pipelines')
          .insert({
            id: defaultSubId,
            name: selectedPipeline.name,
            type: 'kanban',
            parent_id: parentId,
            order_index: 0
          });
        if (err1) throw err1;

        // 2. Migrate columns from parent to default sub-funnel
        const { error: err2 } = await supabase
          .from('crm_pipeline_columns')
          .update({ pipeline_id: defaultSubId })
          .eq('pipeline_id', parentId);
        if (err2) throw err2;

        // 3. Migrate leads from parent to default sub-funnel
        const { error: err3 } = await supabase
          .from('crm_leads')
          .update({ pipeline_id: defaultSubId })
          .eq('pipeline_id', parentId);
        if (err3) throw err3;
      }

      // Now, create the new sub-funnel
      const newSubId = `subfunil-${Date.now()}`;
      const newOrderIndex = existingSubs.length === 0 ? 1 : existingSubs.length;

      const { error: errSub } = await supabase
        .from('crm_pipelines')
        .insert({
          id: newSubId,
          name: cleanName,
          type: 'kanban',
          parent_id: parentId,
          order_index: newOrderIndex
        });
      if (errSub) throw errSub;

      // Create default columns for the new sub-funnel
      const defaultCols = ['Nova Consulta', 'Qualificado', 'Chamada Agendada', 'Preparando Proposta', 'Proposta Enviada'];
      const colInserts = defaultCols.map((c, i) => ({
        pipeline_id: newSubId,
        name: c,
        position: i
      }));
      const { error: errCols } = await supabase
        .from('crm_pipeline_columns')
        .insert(colInserts);
      if (errCols) throw errCols;

      // Reload CRM data to refresh UI state in place
      await loadCRMData();
      setIsAddSubFunnelModalOpen(false);
      setNewSubFunnelName('');
    } catch (err) {
      console.error("Erro ao adicionar sub-funil:", err);
      alert("Erro ao adicionar sub-funil: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simulador de chatbot
  const handleSendTestMessage = (e) => {
    e.preventDefault();
    if (!chatbotTestInput.trim()) return;
    const userMsg = { sender: 'user', text: chatbotTestInput };
    setChatbotMessages(prev => [...prev, userMsg]);
    const input = chatbotTestInput;
    setChatbotTestInput('');

    setTimeout(() => {
      let botText = 'Entendi! Posso analisar o perfil desse lead ou agendar uma resposta automática.';
      if (input.toLowerCase().includes('olá') || input.toLowerCase().includes('oi')) {
        botText = 'Olá! Qual o segmento do lead que você gostaria de prospectar agora?';
      } else if (input.toLowerCase().includes('funil') || input.toLowerCase().includes('leads')) {
        botText = 'Posso puxar a lista de novos leads do Instagram ou atualizar o status no seu Funil de Vendas.';
      } else if (input.toLowerCase().includes('segmento') || input.toLowerCase().includes('lista')) {
        botText = 'Perfeito. Segmentar leads por nicho aumenta em até 40% a taxa de resposta na prospecção.';
      }
      setChatbotMessages(prev => [...prev, { sender: 'bot', text: botText }]);
    }, 800);
  };

  // Filtro de leads
  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ROI Calculado
  const roiValue = roiInvest > 0 ? ((roiSales - roiInvest) / roiInvest) * 100 : 0;
  const cpl = roiLeads > 0 ? roiInvest / roiLeads : 0;

  // Estilos compartilhados
  const CARD_SIDEBAR = {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const CARD_SIDEBAR_HEADER = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
  };

  const CARD_TITLE_BOX = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.84rem',
    fontWeight: 700,
    color: '#e2e8f0',
  };

  const SUB_ITEM_LIST = {
    display: 'flex',
    flexDirection: 'column',
    padding: '6px',
    gap: 2,
  };

  const getSubItemStyle = (key) => {
    const isSel = selected === key;
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderRadius: 8,
      fontSize: '0.8rem',
      fontWeight: isSel ? 700 : 500,
      color: isSel ? '#2563eb' : '#94a3b8',
      background: isSel ? 'rgba(37,99,235,0.1)' : 'transparent',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'left',
      border: 'none',
      width: '100%',
      justifyContent: 'flex-start',
    };
  };

  const renderPipelineFunil = (pipeline) => {
    if (!pipeline) return null;

    // Get sub-funnels for this parent pipeline
    const subFunnels = pipelinesList.filter(p => p.parent_id === pipeline.id);
    const hasSubFunnels = subFunnels.length > 0;

    // Retrieve all leads belonging to this pipeline OR any of its sub-funnels
    const allLeadsForPipeline = leads.filter(l => {
      if (l.pipelineId === pipeline.id) return true;
      if (!l.pipelineId && pipeline.id === 'funil') return true;
      if (hasSubFunnels && subFunnels.some(sf => sf.id === l.pipelineId)) return true;
      return false;
    });

    const searchedPipelineLeadsGlobal = allLeadsForPipeline.filter(l =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalValue = allLeadsForPipeline.reduce((sum, l) => sum + (Number(l.venda) || 0), 0);
    const formattedTotalValue = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const activeSubFunnels = hasSubFunnels ? subFunnels : [pipeline];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1, height: '100%', minHeight: 0 }}>
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 {pipeline.name}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Acompanhe o status e a evolução dos leads ativos.</p>
          </div>
          <button
            onClick={() => setIsPipelineExpanded(!isPipelineExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: isPipelineExpanded ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
              color: isPipelineExpanded ? '#ef4444' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              if (isPipelineExpanded) {
                e.currentTarget.style.background = 'rgba(239,68,68,0.25)';
              } else {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = '#f1f5f9';
              }
            }}
            onMouseOut={e => {
              if (isPipelineExpanded) {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
              } else {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.color = '#94a3b8';
              }
            }}
          >
            {isPipelineExpanded ? (
              <>
                <Minimize2 size={13} /> Fechar
              </>
            ) : (
              <>
                <Maximize2 size={13} /> Expandir
              </>
            )}
          </button>
        </div>

        {/* BARRA DE FILTROS E AÇÕES */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 10,
          padding: '8px 12px',
          flexWrap: 'wrap',
          gap: 12
        }}>
          {/* Lado Esquerdo: Modo de Visão e Filtros */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
            {/* Seletores de Visibilidade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 3, borderRadius: 6 }}>
              <button
                onClick={() => setPipelineViewMode('kanban')}
                style={{
                  background: pipelineViewMode === 'kanban' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  color: pipelineViewMode === 'kanban' ? '#3b82f6' : '#64748b',
                  padding: '6px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Colunas Verticais (Kanban)"
              >
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, width: 10, justifyContent: 'center' }}>
                  <div style={{ width: 2, height: 12, background: 'currentColor', borderRadius: 0.5 }} />
                  <div style={{ width: 2, height: 9, background: 'currentColor', borderRadius: 0.5 }} />
                  <div style={{ width: 2, height: 6, background: 'currentColor', borderRadius: 0.5 }} />
                </div>
              </button>
              <button
                onClick={() => setPipelineViewMode('list')}
                style={{
                  background: pipelineViewMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  color: pipelineViewMode === 'list' ? '#3b82f6' : '#64748b',
                  padding: '6px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Ver em Linhas (Tabela)"
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: 12, height: 11, justifyContent: 'center' }}>
                  <div style={{ height: 2, width: 12, background: 'currentColor', borderRadius: 0.5 }} />
                  <div style={{ height: 2, width: 12, background: 'currentColor', borderRadius: 0.5 }} />
                  <div style={{ height: 2, width: 12, background: 'currentColor', borderRadius: 0.5 }} />
                </div>
              </button>
            </div>

            {/* Separador */}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

            {/* Campo de Busca e Filtro */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 8,
              padding: '6px 12px',
              flex: 1,
              maxWidth: 900,
              gap: 12,
              position: 'relative'
            }}>
              {/* Filtros Dropdown Button */}
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                style={{
                  background: '#d9f99d',
                  color: '#3f6212',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Leads ativos
              </button>

              {/* Input de Busca Real */}
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Busca e filtro"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  outline: 'none',
                  flex: 1
                }}
              />

              {/* Resumo de Leads no filtro */}
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {searchedPipelineLeadsGlobal.length} leads: {formattedTotalValue}
              </span>

              {/* 3 pontinhos adicionais */}
              <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <MoreHorizontal size={14} />
              </button>

              {/* Dropdown de Filtros */}
              {isFilterDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 38,
                  left: 0,
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  padding: '6px',
                  zIndex: 999,
                  minWidth: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  {['Leads ativos', 'Meus leads', 'Leads ganhos', 'Leads perdidos', 'Leads sem Tarefas', 'Leads com Tarefas Atras...'].map((filt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsFilterDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: filt === 'Leads ativos' ? 'rgba(255,255,255,0.06)' : 'transparent',
                        color: filt === 'Leads ativos' ? '#3b82f6' : '#e2e8f0',
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = filt === 'Leads ativos' ? 'rgba(255,255,255,0.06)' : 'transparent'}
                    >
                      {idx === 4 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />}
                      {idx === 5 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                      <span>{filt}</span>
                      {filt === 'Leads ativos' && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>✏️</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* BOTÃO + ADICIONAR FUNIL */}
            <button
              onClick={() => setIsAddSubFunnelModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'rgba(56, 189, 248, 0.08)',
                color: '#38bdf8',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)';
                e.currentTarget.style.border = '1px solid rgba(56, 189, 248, 0.5)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)';
                e.currentTarget.style.border = '1px solid rgba(56, 189, 248, 0.3)';
              }}
            >
              + Adicionar Funil &gt;
            </button>

            <button
              onClick={() => { }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'white',
                color: '#0f172a',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              <Zap size={12} style={{ color: '#eab308', fill: '#eab308' }} />
              AUTOMATIZE
            </button>

            <button
              onClick={() => {
                // Pre-select the first sub-funnel in the modal if sub-funnels exist
                const firstSub = subFunnels[0];
                setNewLeadForm(prev => ({
                  ...prev,
                  subFunnelId: firstSub ? firstSub.id : pipeline.id,
                  funilEtapa: firstSub
                    ? (pipelineColumnsMap[firstSub.id]?.[0] || 'Nova Consulta')
                    : (pipelineColumnsMap[pipeline.id]?.[0] || 'Nova Consulta')
                }));
                setIsNewLeadModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
            >
              + NOVO LEAD
            </button>
          </div>
        </div>

        {/* CONTAINER DOS SUB-FUNIS EMPILHADOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }} className="custom-blue-scrollbar">
          {activeSubFunnels.map((sub, idxSub) => {
            const currentCols = pipelineColumnsMap[sub.id] || ['Novo', 'Em Contato', 'Reunião Agendada', 'Negócio Fechado'];
            const subLeads = leads.filter(l => l.pipelineId === sub.id || (!l.pipelineId && sub.id === 'funil'));
            const searchedSubLeads = subLeads.filter(l =>
              l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              l.company.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const subValue = subLeads.reduce((sum, l) => sum + (Number(l.venda) || 0), 0);
            const formattedSubValue = subValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const isMultiple = activeSubFunnels.length > 1;
            const boardHeight = isMultiple ? 340 : 500;

            return (
              <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* SUB-HEADER (only shown if there are multiple sub-funnels) */}
                {hasSubFunnels && (() => {
                  // Paleta de cores por posição do sub-funil
                  const subColors = [
                    { bar: '#3b82f6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', icon: '🔵' },
                    { bar: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.15)', icon: '🟣' },
                    { bar: '#10b981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', icon: '🟢' },
                    { bar: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', icon: '🟡' },
                    { bar: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)', icon: '🔴' },
                    { bar: '#06b6d4', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.15)', icon: '🩵' },
                  ];
                  const colorIdx = idxSub % subColors.length;
                  const col = subColors[colorIdx];
                  return (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px 10px 0',
                      background: col.bg,
                      border: `1px solid ${col.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {/* Barra lateral colorida */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: col.bar, borderRadius: '10px 0 0 10px' }} />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20 }}>
                        {/* Número do sub-funil */}
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: col.bar,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: 'white',
                          flexShrink: 0,
                        }}>
                          {idxSub + 1}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <strong style={{ fontSize: '0.86rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {sub.name}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            {searchedSubLeads.length} leads • {formattedSubValue}
                          </span>
                        </div>

                        {/* Botão: Ajustar colunas */}
                        <button
                          onClick={() => { setTempColumns([...currentCols]); setEditingColumnsPipelineId(sub.id); setIsColumnModalOpen(true); }}
                          title="Ajustar Colunas do Sub-funil"
                          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${col.border}`, borderRadius: 6, color: '#94a3b8', padding: '4px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', transition: '0.15s', marginLeft: 4 }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f1f5f9'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                          <Sliders size={11} />
                          <span>Colunas</span>
                        </button>
                      </div>

                      {/* Botão: Excluir sub-funil */}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Deseja mesmo excluir o sub-funil "${sub.name}"? Os leads serão mantidos, mas desvinculados.`)) return;
                          try {
                            await supabase.from('crm_pipelines').delete().eq('id', sub.id);
                            await loadCRMData();
                          } catch (err) {
                            console.error('Erro ao excluir sub-funil:', err);
                          }
                        }}
                        title="Excluir Sub-Funil"
                        style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, color: '#ef4444', padding: '4px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', transition: '0.15s', marginRight: 4 }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; }}
                      >
                        <Trash2 size={11} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  );
                })()}

                {/* TABULEIRO DO SUB-FUNIL */}
                {/* MODO KANBAN (COLUNAS VERTICAIS) */}
                {pipelineViewMode === 'kanban' && (() => {
                  const dh = getDragHandlers(sub.id);
                  return (
                    <div
                      className="custom-blue-scrollbar"
                      onMouseDown={dh.onMouseDown}
                      onMouseMove={dh.onMouseMove}
                      onMouseUp={dh.onMouseUp}
                      onMouseLeave={dh.onMouseLeave}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 12,
                        overflowX: 'auto',
                        paddingBottom: 12,
                        userSelect: 'none',
                        scrollBehavior: 'auto',
                        cursor: 'grab',
                      }}
                    >
                      {currentCols.map(col => {
                        const colLeads = searchedSubLeads.filter(l => l.status === col);
                        return (
                          <div
                            key={col}
                            style={{
                              background: '#0d1421',
                              borderRadius: 10,
                              padding: 12,
                              border: '1px solid rgba(255,255,255,0.07)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              minHeight: boardHeight,
                              height: boardHeight,
                              flex: '1 0 280px',
                              minWidth: 280
                            }}
                          >
                            {(() => {
                              const colTotal = colLeads.reduce((sum, l) => sum + (Number(l.venda) || 0), 0);
                              const colTotalFmt = colTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
                              return (
                                <div style={{ paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <strong style={{ fontSize: '0.78rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</strong>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{colLeads.length}</span>
                                  </div>
                                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 500 }}>
                                    {colTotalFmt}
                                  </span>
                                </div>
                              );
                            })()}
                            <div className="custom-blue-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 2 }}>
                              {colLeads.map(l => {
                                  // Formata hora de criação
                                  const createdAt = l.created_at ? new Date(l.created_at) : null;
                                  const timeLabel = createdAt ? createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                                  const dateLabel = createdAt ? (() => {
                                    const today = new Date();
                                    const diff = Math.floor((today - createdAt) / 86400000);
                                    if (diff === 0) return 'Hoje';
                                    if (diff === 1) return 'Ontem';
                                    return createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                  })() : '';

                                  // Gera ID numérico curto do lead
                                  const leadNumId = l.id ? String(l.id).replace(/\D/g, '').slice(-8).padStart(8, '0') : '00000000';

                                  return (
                                    <div
                                      key={l.id}
                                      onClick={() => {
                                        setSelectedLead(l);
                                        // Zera badge de mensagens não lidas ao abrir o lead
                                        if (leadUnreadCounts[l.id]) {
                                          setLeadUnreadCounts(prev => ({ ...prev, [l.id]: 0 }));
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(15, 23, 42, 0.65)',
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: 10,
                                        padding: '10px 12px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        alignItems: 'flex-start',
                                      }}
                                      onMouseOver={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0,0,0,0.45)';
                                        e.currentTarget.style.border = '1px solid rgba(56,189,248,0.25)';
                                        e.currentTarget.style.background = 'rgba(15,23,42,0.85)';
                                      }}
                                      onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.2)';
                                        e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)';
                                        e.currentTarget.style.background = 'rgba(15,23,42,0.65)';
                                      }}
                                    >
                                      {/* AVATAR — foto WhatsApp ou silhueta + badge de mensagens */}
                                      <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <div style={{
                                          width: 38, height: 38, borderRadius: '50%',
                                          background: leadUnreadCounts[l.id] > 0
                                            ? 'rgba(37,211,102,0.12)'
                                            : 'rgba(255,255,255,0.06)',
                                          border: leadUnreadCounts[l.id] > 0
                                            ? '1px solid rgba(37,211,102,0.4)'
                                            : (leadProfilePics[l.id] ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.08)'),
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          overflow: 'hidden',
                                          transition: 'all 0.2s'
                                        }}>
                                          {leadProfilePics[l.id] ? (
                                            <img
                                              src={leadProfilePics[l.id]}
                                              alt={l.name}
                                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                              onError={e => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                              }}
                                            />
                                          ) : null}
                                          {/* Fallback SVG — sempre presente, oculto quando há foto */}
                                          <svg
                                            width="22" height="22" viewBox="0 0 24 24" fill="none"
                                            style={{ display: leadProfilePics[l.id] ? 'none' : 'block' }}
                                          >
                                            <circle cx="12" cy="7" r="4" fill={leadUnreadCounts[l.id] > 0 ? '#25d366' : '#64748b'}/>
                                            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={leadUnreadCounts[l.id] > 0 ? '#25d366' : '#64748b'}/>
                                          </svg>
                                        </div>
                                        {/* Balãozinho de mensagem não lida */}
                                        {leadUnreadCounts[l.id] > 0 && (
                                          <div style={{
                                            position: 'absolute', top: -4, right: -4,
                                            minWidth: 18, height: 18,
                                            background: '#25d366',
                                            borderRadius: 9,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                                            padding: '0 4px',
                                            boxShadow: '0 0 0 2px #080e1a',
                                            animation: 'badgePop 0.3s ease',
                                            zIndex: 2
                                          }}>
                                            <style>{`@keyframes badgePop{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
                                            {leadUnreadCounts[l.id] > 99 ? '99+' : leadUnreadCounts[l.id]}
                                          </div>
                                        )}
                                      </div>

                                      {/* CONTEÚDO PRINCIPAL */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>

                                        {/* Linha 1: Nome + hora + botão delete */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f1f5f9', lineHeight: 1.2, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {l.name}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                            {dateLabel && (
                                              <span style={{ fontSize: '0.62rem', color: '#475569', whiteSpace: 'nowrap' }}>
                                                {dateLabel} {timeLabel}
                                              </span>
                                            )}
                                            <button
                                              onClick={e => { e.stopPropagation(); if (confirm(`Remover "${l.name}"?`)) handleDeleteLead(l.id); }}
                                              style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                              onMouseOut={e => e.currentTarget.style.color = '#334155'}
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Linha 2: ID do lead em ciano */}
                                        <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.02em' }}>
                                          Lead #{leadNumId}
                                        </span>

                                        {/* Linha 3: Responsável pelo atendimento */}
                                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                          {l.responsible || l.company || 'Sem responsável'}
                                        </span>

                                        {/* Linha 4: Tags */}
                                        {l.tags && l.tags.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                                            {l.tags.slice(0, 3).map(t => (
                                              <span key={t} style={{
                                                fontSize: '0.62rem', color: '#7dd3fc',
                                                background: 'rgba(56,189,248,0.08)',
                                                border: '1px solid rgba(56,189,248,0.18)',
                                                borderRadius: 4, padding: '1px 5px', fontWeight: 500
                                              }}>
                                                {t}
                                              </span>
                                            ))}
                                            {l.tags.length > 3 && (
                                              <span style={{ fontSize: '0.62rem', color: '#475569', padding: '1px 4px' }}>
                                                +{l.tags.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* MODO LISTA (LINHAS/TABELA) */}
                {pipelineViewMode === 'list' && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 10,
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', color: '#e2e8f0', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>LEAD TÍTULO</th>
                          <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>CONTATO PRINCIPAL</th>
                          <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>EMPRESA DO CONTATO</th>
                          <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>ETAPA DO LEAD</th>
                          <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>VENDA, R$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchedSubLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                              Nenhum lead encontrado neste funil.
                            </td>
                          </tr>
                        ) : (
                          searchedSubLeads.map(l => (
                            <tr key={l.id} onClick={() => { setSelectedLead(l); if (leadUnreadCounts[l.id]) setLeadUnreadCounts(prev => ({ ...prev, [l.id]: 0 })); }} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: leadUnreadCounts[l.id] > 0 ? 'rgba(37,211,102,0.04)' : 'transparent' }}>
                              <td style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: 600 }}>Prospect - {l.name}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span>{l.name}</span>
                                  {leadUnreadCounts[l.id] > 0 && (
                                    <span style={{ background: '#25d366', color: '#fff', borderRadius: 10, fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      💬 {leadUnreadCounts[l.id]}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{l.company}</td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  color: '#cbd5e1',
                                  fontWeight: 600,
                                  textTransform: 'uppercase'
                                }}>
                                  {l.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>R$ {l.venda || 0}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, minHeight: 'calc(100vh - 120px)', alignItems: 'flex-start' }}>

      {/* ── MODAL: NOVA MENSAGEM DE NÚMERO DESCONHECIDO ─────────────────────── */}
      {incomingLeadNotifs.length > 0 && (() => {
        const notif = incomingLeadNotifs[0]; // mostra um por vez
        return (
          <div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9999,
            background: 'linear-gradient(135deg, #0f2231 0%, #0d1421 100%)',
            border: '1px solid #38bdf8',
            borderRadius: 14, padding: '18px 20px', width: 340,
            boxShadow: '0 8px 32px rgba(56,189,248,0.18)',
            animation: 'slideInRight 0.3s ease'
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#25d366,#128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💬</div>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.92rem' }}>Nova mensagem WhatsApp</div>
                <div style={{ color: '#38bdf8', fontSize: '0.8rem' }}>{notif.name || notif.phone}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
              "{notif.message?.text?.substring(0, 80)}{notif.message?.text?.length > 80 ? '...' : ''}"
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>Adicionar ao funil:</div>
              <select
                value={chosenPipelineForNotif}
                onChange={e => setChosenPipelineForNotif(e.target.value)}
                style={{ width: '100%', background: '#0d1421', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 10px', fontSize: '0.83rem' }}
              >
                <option value="">-- Selecionar funil --</option>
                {pipelinesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (!chosenPipelineForNotif) return;
                  const pipeline = pipelinesList.find(p => p.id === chosenPipelineForNotif);
                  const cols = pipelineColumnsMap[chosenPipelineForNotif] || [];
                  const firstCol = cols[0] || 'Nova Consulta';
                  const { data: newLead } = await supabase.from('crm_leads').insert({
                    name: notif.name || notif.phone,
                    company: '',
                    source: 'WhatsApp',
                    status: firstCol,
                    pipeline_id: chosenPipelineForNotif,
                    details: { phone: notif.rawPhone }
                  }).select().single();
                  if (newLead) {
                    setLeads(prev => [...prev, newLead]);
                    // Persiste a mensagem recebida
                    await supabase.from('crm_lead_messages').insert({ lead_id: newLead.id, sender: 'lead', text: notif.message?.text || '', type: 'whatsapp' });
                    // Recarrega cache de leads no servidor
                    fetch('http://localhost:3001/api/whatsapp/reload-leads', { method: 'POST' }).catch(() => {});
                  }
                  setIncomingLeadNotifs(prev => prev.filter(n => n.chatId !== notif.chatId));
                  setChosenPipelineForNotif('');
                }}
                disabled={!chosenPipelineForNotif}
                style={{ flex: 1, background: chosenPipelineForNotif ? '#38bdf8' : 'rgba(255,255,255,0.07)', color: chosenPipelineForNotif ? '#0d1421' : '#64748b', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 700, fontSize: '0.83rem', cursor: chosenPipelineForNotif ? 'pointer' : 'not-allowed' }}
              >
                ✅ Adicionar Lead
              </button>
              <button
                onClick={() => { setIncomingLeadNotifs(prev => prev.filter(n => n.chatId !== notif.chatId)); setChosenPipelineForNotif(''); }}
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: '0.83rem', cursor: 'pointer' }}
              >
                Ignorar
              </button>
            </div>
            {incomingLeadNotifs.length > 1 && (
              <div style={{ marginTop: 8, textAlign: 'center', color: '#64748b', fontSize: '0.73rem' }}>
                +{incomingLeadNotifs.length - 1} mensagem(s) aguardando
              </div>
            )}
          </div>
        );
      })()}

      {/* ── SINO DE NOTIFICAÇÕES WhatsApp ────────────────────────────────────── */}
      {(() => {
        const totalKnown = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
        const totalLeadMsgs = Object.values(leadUnreadCounts).reduce((a, b) => a + b, 0);
        const totalPending = incomingLeadNotifs.length;
        const totalBadge = totalKnown + totalPending + totalLeadMsgs;
        if (totalBadge === 0) return null;
        return (
          <div style={{
            position: 'fixed',
            top: incomingLeadNotifs.length > 0 ? 398 : 24,
            right: 24, zIndex: 9997,
            background: '#0d1421',
            border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 12, padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'top 0.3s ease'
          }}>
            <span style={{ fontSize: '1rem' }}>🔔</span>
            <span style={{ color: '#f1f5f9', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              {totalPending > 0 && <span style={{ color: '#38bdf8' }}>+{totalPending} novo{totalPending !== 1 ? 's' : ''}</span>}
              {totalLeadMsgs > 0 && <>
                {totalPending > 0 && <span style={{ color: '#334155' }}>·</span>}
                <span style={{ color: '#25d366' }}>
                  💬 {totalLeadMsgs}
                </span>
              </>}
              {totalKnown > 0 && <>
                {(totalPending > 0 || totalLeadMsgs > 0) && <span style={{ color: '#334155' }}>·</span>}
                <span style={{ color: '#fbbf24' }}>{totalKnown} n/l</span>
              </>}
            </span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: totalLeadMsgs > 0 ? '#25d366' : '#f87171', animation: 'bellPulse 1.4s infinite' }} />
            <style>{`@keyframes bellPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}`}</style>
          </div>
        );
      })()}

      {/* PAINEL LATERAL ESQUERDO (DE CARDS) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Integrações */}
        <div style={CARD_SIDEBAR}>
          <div style={CARD_SIDEBAR_HEADER} onClick={(e) => toggleExpand('integracoes', e)}>
            <div style={CARD_TITLE_BOX}>
              <Link2 size={15} style={{ color: '#38bdf8' }} />
              <span>Integrações</span>
            </div>
            {renderCaret('integracoes')}
          </div>
          {expanded.integracoes && (
            <div style={SUB_ITEM_LIST}>
              {['instagram', 'whatsapp', 'facebook', 'tiktok'].map(platform => {
                const labelMap = {
                  instagram: 'Instagram',
                  whatsapp: 'WhatsApp Business',
                  facebook: 'Facebook',
                  tiktok: 'TikTok'
                };
                return (
                  <button
                    key={platform}
                    onClick={() => setSelected(`integracoes/${platform}`)}
                    style={getSubItemStyle(`integracoes/${platform}`)}
                  >
                    {labelMap[platform]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pipelines */}
        <div style={{ ...CARD_SIDEBAR, position: 'relative', overflow: 'visible' }}>
          <div style={CARD_SIDEBAR_HEADER} onClick={(e) => toggleExpand('pipelines', e)}>
            <div style={CARD_TITLE_BOX}>
              <GitFork size={15} style={{ color: '#818cf8' }} />
              <span>Pipelines</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {expanded.pipelines && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPipelineMenuOpen(!pipelineMenuOpen);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                  title="Opções de Pipelines"
                >
                  <MoreHorizontal size={14} />
                </button>
              )}

              {renderCaret('pipelines')}
            </div>
          </div>

          {/* Menu Dropdown de Opções */}
          {pipelineMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 36,
              right: 12,
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              padding: '4px',
              zIndex: 999,
              minWidth: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <button
                onClick={() => {
                  setIsAddingPipeline(true);
                  setPipelineMenuOpen(false);
                  setNewPipelineName('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={13} style={{ color: '#10b981' }} />
                <span>Adicionar funil de vendas</span>
              </button>
              <button
                onClick={() => {
                  setIsReorderingModalOpen(true);
                  setPipelineMenuOpen(false);
                  setTempPipelines([...pipelinesList]);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <Edit2 size={13} style={{ color: '#3b82f6' }} />
                <span>Reordenar pipelines</span>
              </button>
            </div>
          )}

          {expanded.pipelines && (
            <div style={SUB_ITEM_LIST}>
              {/* Form Inline para Adicionar Funil */}
              {isAddingPipeline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
                  <input
                    autoFocus
                    value={newPipelineName}
                    onChange={e => setNewPipelineName(e.target.value)}
                    placeholder="Nome da pipeline..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #2563eb',
                      color: '#f1f5f9',
                      fontSize: '0.78rem',
                      outline: 'none',
                      padding: '2px 0'
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveNewPipeline();
                      if (e.key === 'Escape') setIsAddingPipeline(false);
                    }}
                  />
                  <button
                    onClick={handleSaveNewPipeline}
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 2 }}
                    title="Salvar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setIsAddingPipeline(false)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Lista de Pipelines Dinâmicas */}
              {pipelinesList.filter(p => !p.parent_id).map(pipe => {
                const route = `pipelines/${pipe.id}`;
                const isSel = selected === route;
                const isKanban = pipe.type === 'kanban';

                if (renamingPipeId === pipe.id) {
                  return (
                    <div key={pipe.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, margin: '2px 0' }}>
                      <input
                        autoFocus
                        value={renamingPipeName}
                        onChange={e => setRenamingPipeName(e.target.value)}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid #2563eb',
                          color: '#f1f5f9',
                          fontSize: '0.78rem',
                          outline: 'none',
                          padding: '2px 0'
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRenamePipeline(pipe.id);
                          if (e.key === 'Escape') setRenamingPipeId(null);
                        }}
                      />
                      <button
                        onClick={() => handleSaveRenamePipeline(pipe.id)}
                        style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 2 }}
                        title="Salvar"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setRenamingPipeId(null)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                        title="Cancelar"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                }

                const btnStyle = getSubItemStyle(route);

                // Sub-funis deste pipeline
                const pipeSubFunnels = pipelinesList.filter(p => p.parent_id === pipe.id);
                const hasSubFunnels = pipeSubFunnels.length > 0;
                const isSubExpanded = !!sidebarExpandedPipes[pipe.id];

                return (
                  <div key={pipe.id} style={{ display: 'flex', flexDirection: 'column', width: '100%', margin: '2px 0' }}>

                    {/* ROW PRINCIPAL DO PIPELINE */}
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        borderRadius: 8,
                        background: isSel ? 'rgba(37,99,235,0.1)' : 'transparent',
                        paddingRight: 4,
                      }}
                    >
                      <button
                        onClick={() => setSelected(route)}
                        style={{
                          ...btnStyle,
                          background: 'transparent',
                          flex: 1
                        }}
                      >
                        {pipe.name}
                      </button>

                      {/* Botão > para expandir sub-funis */}
                      {hasSubFunnels && (
                        <button
                          onClick={() => toggleSidebarSubFunnels(pipe.id)}
                          title={isSubExpanded ? 'Recolher sub-funis' : 'Ver sub-funis'}
                          style={{
                            background: isSubExpanded ? 'rgba(59,130,246,0.12)' : 'none',
                            border: isSubExpanded ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                            borderRadius: 5,
                            color: isSubExpanded ? '#60a5fa' : '#475569',
                            cursor: 'pointer',
                            padding: '3px 5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            transition: 'all 0.15s',
                            marginRight: 2,
                            lineHeight: 1,
                          }}
                          onMouseOver={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                          onMouseOut={e => {
                            if (!isSubExpanded) {
                              e.currentTarget.style.color = '#475569';
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.borderColor = 'transparent';
                            } else {
                              e.currentTarget.style.color = '#60a5fa';
                            }
                          }}
                        >
                          {isSubExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </button>
                      )}

                      {isKanban && (
                        <div data-pipe-menu style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            data-pipe-menu
                            onClick={() => {
                              setActivePipeOptionsId(activePipeOptionsId === pipe.id ? null : pipe.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isSel ? '#2563eb' : '#64748b',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = 'none'}
                          >
                            <MoreHorizontal size={12} />
                          </button>

                          {/* Dropdown de Opções do Pipeline específico */}
                          {activePipeOptionsId === pipe.id && (
                            <div data-pipe-menu style={{
                              position: 'absolute',
                              top: 30,
                              right: 4,
                              background: '#0f172a',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                              padding: '4px',
                              zIndex: 999,
                              minWidth: 120,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2
                            }}>
                              <button
                                onClick={() => {
                                  alert('Em breve você poderá automatizar o envio de mensagens, segmentações e IA para esta pipeline!');
                                  setActivePipeOptionsId(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.74rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Zap size={11} style={{ color: '#10b981' }} />
                                <span>Automatizar</span>
                              </button>

                              <button
                                onClick={() => { setRenamingPipeId(pipe.id); setRenamingPipeName(pipe.name); setActivePipeOptionsId(null); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#e2e8f0', fontSize: '0.74rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Edit2 size={11} style={{ color: '#3b82f6' }} />
                                <span>Renomear</span>
                              </button>

                              {pipe.id !== 'funil' && pipe.id !== 'todos-os-leads' && (
                                <button
                                  onClick={() => { handleDeletePipeline(pipe.id, pipe.name); setActivePipeOptionsId(null); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.74rem', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Trash2 size={11} style={{ color: '#ef4444' }} />
                                  <span>Deletar</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SUB-FUNIS NA SIDEBAR (expandidos com >) */}
                    {hasSubFunnels && isSubExpanded && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        paddingLeft: 16,
                        borderLeft: '1.5px solid rgba(59,130,246,0.2)',
                        marginLeft: 10,
                        marginTop: 2,
                        gap: 1,
                      }}>
                        {pipeSubFunnels.map((sub, sIdx) => {
                          const subColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
                          const dotColor = subColors[sIdx % subColors.length];
                          const subRoute = `pipelines/${pipe.id}`; // clica no pai para ver o kanban com sub-funis
                          return (
                            <div
                              key={sub.id}
                              onClick={() => setSelected(subRoute)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 8px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background: 'transparent',
                                transition: 'background 0.15s',
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 4px ${dotColor}55` }} />
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Insights */}
        <div style={CARD_SIDEBAR}>
          <div style={CARD_SIDEBAR_HEADER} onClick={(e) => toggleExpand('insights', e)}>
            <div style={CARD_TITLE_BOX}>
              <BarChart3 size={15} style={{ color: '#fb7185' }} />
              <span>Insights</span>
            </div>
            {renderCaret('insights')}
          </div>
          {expanded.insights && (
            <div style={SUB_ITEM_LIST}>
              <button onClick={() => setSelected('insights/painel')} style={getSubItemStyle('insights/painel')}>
                Painel
              </button>
              <button onClick={() => setSelected('insights/roi')} style={getSubItemStyle('insights/roi')}>
                ROI
              </button>
              <button onClick={() => setSelected('insights/ganhos-perdas')} style={getSubItemStyle('insights/ganhos-perdas')}>
                Ganhos e Perdas
              </button>
              <button onClick={() => setSelected('insights/registro')} style={getSubItemStyle('insights/registro')}>
                Registro de Atividades
              </button>

              {/* Relatórios nested */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div
                  onClick={(e) => toggleExpand('insights_relatorios', e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    color: selected.startsWith('insights/relatorios') ? '#2563eb' : '#94a3b8',
                    cursor: 'pointer',
                    background: selected.startsWith('insights/relatorios') ? 'rgba(37,99,235,0.05)' : 'transparent',
                    fontWeight: selected.startsWith('insights/relatorios') ? 700 : 500
                  }}
                >
                  <span>Relatórios</span>
                  {expanded.insights_relatorios ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </div>
                {expanded.insights_relatorios && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 12, marginTop: 2 }}>
                    {['consolidados', 'atividades', 'chamadas', 'objetivos'].map(rep => {
                      const labelMap = {
                        consolidados: 'Consolidados',
                        atividades: 'Atividades',
                        chamadas: 'Chamadas',
                        objetivos: 'Objetivos'
                      };
                      return (
                        <button
                          key={rep}
                          onClick={() => setSelected(`insights/relatorios/${rep}`)}
                          style={getSubItemStyle(`insights/relatorios/${rep}`)}
                        >
                          &bull; {labelMap[rep]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Calendário (flat) */}
        <button
          onClick={() => setSelected('calendario')}
          style={{
            ...CARD_SIDEBAR,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
            color: selected === 'calendario' ? '#2563eb' : '#e2e8f0',
            background: selected === 'calendario' ? 'rgba(37,99,235,0.08)' : '#0f172a',
            border: selected === 'calendario' ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <Calendar size={15} style={{ color: '#22c55e' }} />
          <span>Calendário</span>
        </button>

        {/* Segmento (flat) */}
        <button
          onClick={() => setSelected('segmento')}
          style={{
            ...CARD_SIDEBAR,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
            color: selected === 'segmento' ? '#2563eb' : '#e2e8f0',
            background: selected === 'segmento' ? 'rgba(37,99,235,0.08)' : '#0f172a',
            border: selected === 'segmento' ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <Layers size={15} style={{ color: '#eab308' }} />
          <span>Segmento</span>
        </button>

        {/* Listas */}
        <div style={CARD_SIDEBAR}>
          <div style={CARD_SIDEBAR_HEADER} onClick={(e) => toggleExpand('listas', e)}>
            <div style={CARD_TITLE_BOX}>
              <List size={15} style={{ color: '#22d3ee' }} />
              <span>Listas</span>
            </div>
            {renderCaret('listas')}
          </div>
          {expanded.listas && (
            <div style={SUB_ITEM_LIST}>
              {['contatos', 'empresas', 'contatos-empresas', 'midia', 'produtos'].map(lst => {
                const labelMap = {
                  contatos: 'Contatos',
                  empresas: 'Empresas',
                  'contatos-empresas': 'Contatos e Empresas',
                  midia: 'Mídia',
                  produtos: 'Produtos'
                };
                return (
                  <button
                    key={lst}
                    onClick={() => setSelected(`listas/${lst}`)}
                    style={getSubItemStyle(`listas/${lst}`)}
                  >
                    {labelMap[lst]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Agentes de IA (flat) */}
        <button
          onClick={() => setSelected('agentes-ia')}
          style={{
            ...CARD_SIDEBAR,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 10,
            padding: '12px 14px',
            cursor: 'pointer',
            textAlign: 'left',
            color: selected === 'agentes-ia' ? '#2563eb' : '#e2e8f0',
            background: selected === 'agentes-ia' ? 'rgba(37,99,235,0.08)' : '#0f172a',
            border: selected === 'agentes-ia' ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.84rem',
            fontWeight: 700,
          }}
        >
          <Sparkles size={15} style={{ color: '#a855f7' }} />
          <span>Agentes de IA</span>
        </button>

        {/* Automações */}
        <div style={CARD_SIDEBAR}>
          <div style={CARD_SIDEBAR_HEADER} onClick={(e) => toggleExpand('automacoes', e)}>
            <div style={CARD_TITLE_BOX}>
              <Zap size={15} style={{ color: '#a7f3d0' }} />
              <span>Automações</span>
            </div>
            {renderCaret('automacoes')}
          </div>
          {expanded.automacoes && (
            <div style={SUB_ITEM_LIST}>
              <button onClick={() => setSelected('automacoes/bots')} style={getSubItemStyle('automacoes/bots')}>
                Bots
              </button>

              {/* Modelos nested */}
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div
                  onClick={(e) => toggleExpand('automacoes_modelos', e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    color: selected.startsWith('automacoes/modelos') ? '#2563eb' : '#94a3b8',
                    cursor: 'pointer',
                    background: selected.startsWith('automacoes/modelos') ? 'rgba(37,99,235,0.05)' : 'transparent',
                    fontWeight: selected.startsWith('automacoes/modelos') ? 700 : 500
                  }}
                >
                  <span>Modelos</span>
                  {expanded.automacoes_modelos ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </div>
                {expanded.automacoes_modelos && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 12, marginTop: 2 }}>
                    {['chat', 'email'].map(mod => {
                      const labelMap = {
                        chat: 'Chat',
                        email: 'E-mail'
                      };
                      return (
                        <button
                          key={mod}
                          onClick={() => setSelected(`automacoes/modelos/${mod}`)}
                          style={getSubItemStyle(`automacoes/modelos/${mod}`)}
                        >
                          &bull; {labelMap[mod]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button onClick={() => setSelected('automacoes/transmissao')} style={getSubItemStyle('automacoes/transmissao')}>
                Transmissão
              </button>
            </div>
          )}
        </div>

      </div>

      {/* PAINEL CENTRAL DE CONTEÚDO (WORKSPACE DINÂMICO) */}
      <div className="glass-panel" style={{ padding: 24, borderRadius: 14, minHeight: 600, display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)' }}>

        {/* INSTAGRAM INTEGRATION */}
        {selected === 'integracoes/instagram' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📸 Integração Instagram Direct</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Conecte sua conta do Instagram para automatizar respostas diretas e extrair leads.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: instagramConnected ? '#10b981' : '#ef4444' }}>
                  {instagramConnected ? 'Status: Conectado' : 'Status: Desconectado'}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Conta integrada: @roiexpert_pro</p>
              </div>
              <button
                onClick={() => setInstagramConnected(!instagramConnected)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: instagramConnected ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: instagramConnected ? '#ef4444' : '#10b981',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem'
                }}
              >
                {instagramConnected ? 'Desconectar' : 'Conectar Conta'}
              </button>
            </div>
          </div>
        )}

        {/* WHATSAPP INTEGRATION */}
        {selected === 'integracoes/whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>💬 Múltiplas Conexões WhatsApp</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Conecte e gerencie mais de um número de WhatsApp simultaneamente para dividir a carga de prospecção.</p>
            </div>

            {!selectedWaSession ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'flex-start' }}>

                {/* CARD 1: WhatsApp Web */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link2 size={22} style={{ color: '#10b981' }} />
                    <strong style={{ fontSize: '1.05rem', color: '#f1f5f9' }}>Conectar Número WhatsApp Web</strong>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Conecte o seu celular escaneando o QR Code na tela. Rápido, prático e sem custos extras.
                  </p>

                  <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />

                  {/* Seção: Instâncias Sincronizadas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>
                        Instâncias Sincronizadas ({whatsappNumbers.length})
                      </span>

                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, showAddInstance: !prev.showAddInstance }))}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#e2e8f0',
                          transition: '0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Input e Formulário de Registrar Novo WhatsApp (se expandido) */}
                    {expanded.showAddInstance && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: '0.67rem', color: '#94a3b8', fontWeight: 600 }}>Identificador (ex: Comercial 2)</label>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input
                              value={newWaName}
                              onChange={e => setNewWaName(e.target.value)}
                              placeholder="Nome do dispositivo..."
                              style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.82rem', outline: 'none' }}
                            />
                            <button
                              onClick={async () => {
                                if (!newWaName) return;

                                const newSession = {
                                  name: newWaName,
                                  phone: 'Carregando...',
                                  status: 'Aguardando QR Code'
                                };

                                let createdId = Date.now().toString();
                                try {
                                  const { data, error } = await supabase
                                    .from('crm_whatsapp_sessions')
                                    .insert(newSession)
                                    .select()
                                    .single();
                                  if (!error && data) {
                                    setWhatsappNumbers([...whatsappNumbers, data]);
                                    createdId = data.id;
                                  } else {
                                    setWhatsappNumbers([...whatsappNumbers, { ...newSession, id: createdId }]);
                                  }
                                } catch (err) {
                                  setWhatsappNumbers([...whatsappNumbers, { ...newSession, id: createdId }]);
                                }

                                setNewWaName('');
                                setActiveQrCodeId(createdId);
                              }}
                              style={{ background: '#2563eb', border: 'none', borderRadius: 6, padding: '0 12px', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                            >
                              Gerar Conexão QR
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QR Code exibido na tela logo abaixo se houver um activeQrCodeId ativo */}
                    {activeQrCodeId && (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>Autenticação QR Code</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {realQrCode && (
                              <button
                                onClick={() => setQrExpanded(true)}
                                title="Expandir QR Code"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '3px 7px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <Maximize2 size={11} /> Expandir
                              </button>
                            )}
                            <button onClick={() => { setActiveQrCodeId(null); setRealQrCode(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.74rem' }}>Cancelar</button>
                          </div>
                        </div>

                        {/* Container do QR */}
                        <div style={{ position: 'relative', width: 140, height: 140 }}>
                          {/* QR Image — sempre presente quando há código */}
                          <div
                            style={{
                              background: '#f1f5f9', padding: 10, borderRadius: 8,
                              width: '100%', height: '100%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              overflow: 'hidden',
                              cursor: (realQrCode && !qrExpired) ? 'pointer' : 'default',
                              filter: qrExpired ? 'blur(6px) brightness(0.5)' : 'none',
                              transition: 'filter 0.4s ease',
                              userSelect: 'none'
                            }}
                            onClick={() => realQrCode && !qrExpired && setQrExpanded(true)}
                          >
                            {realQrCode ? (
                              <img src={realQrCode} alt="WhatsApp QR Code" style={{ width: 120, height: 120, display: 'block' }} />
                            ) : waServerStatus === 'connecting' ? (
                              /* Celular escaneou — aguardando confirmação */
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(37,211,102,0.2)', border: '2px solid #25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bellPulse 1.2s ease infinite' }}>
                                  <span style={{ fontSize: '1.1rem' }}>📱</span>
                                </div>
                                <span style={{ fontSize: '0.58rem', color: '#25d366', fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>Conectando...<br/>Confirme no celular</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <RefreshCw size={24} style={{ color: '#2563eb', animation: qrRefreshing ? 'pgSpin 0.7s linear infinite' : 'none' }} />
                                <span style={{ fontSize: '0.6rem', color: '#0f172a', fontWeight: 800 }}>
                                  {qrRefreshing ? 'Gerando...' : 'Iniciando...'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Overlay de QR expirado */}
                          {qrExpired && (
                            <div
                              style={{
                                position: 'absolute', inset: 0, borderRadius: 8,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 8, zIndex: 10,
                                background: 'rgba(0,0,0,0.15)',
                                cursor: 'pointer'
                              }}
                              onClick={handleRefreshQr}
                              title="Clique para gerar novo QR Code"
                            >
                              <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'rgba(15,23,42,0.85)',
                                border: '2px solid rgba(56,189,248,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                transition: 'transform 0.15s',
                              }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                <RefreshCw size={22} style={{ color: '#38bdf8' }} />
                              </div>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', textAlign: 'center', lineHeight: 1.3 }}>
                                QR expirado<br/>Clique para renovar
                              </span>
                            </div>
                          )}

                          {/* Spinner enquanto regenera */}
                          {qrRefreshing && !qrExpired && (
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: 8,
                              background: 'rgba(8,14,26,0.7)',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: 8
                            }}>
                              <RefreshCw size={22} style={{ color: '#38bdf8', animation: 'pgSpin 0.7s linear infinite' }} />
                              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>Gerando QR...</span>
                            </div>
                          )}
                        </div>

                        <span style={{ fontSize: '0.7rem', textAlign: 'center',
                          color: waServerStatus === 'connecting' ? '#25d366' : qrExpired ? '#f87171' : '#94a3b8'
                        }}>
                          {waServerStatus === 'connecting' && !realQrCode
                            ? '✅ QR lido! Aguardando autenticação no celular...'
                            : qrExpired
                              ? '⚠️ QR expirado — clique em ↻ para renovar'
                              : 'Abra o WhatsApp > Dispositivos Conectados e aponte para a tela.'}
                        </span>
                      </div>
                    )}

                    {/* Modal Expandido do QR Code */}
                    {qrExpanded && realQrCode && createPortal(
                      <div
                        onClick={() => setQrExpanded(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}
                      >
                        <div style={{ position: 'relative', background: 'white', padding: 24, borderRadius: 16, boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                          {/* QR grande com blur quando expirado */}
                          <img
                            src={realQrCode}
                            alt="WhatsApp QR Code"
                            style={{ width: 300, height: 300, display: 'block', filter: qrExpired ? 'blur(10px) brightness(0.4)' : 'none', transition: 'filter 0.4s ease' }}
                          />
                          {/* Overlay expirado no modal grande */}
                          {qrExpired && (
                            <div
                              style={{ position: 'absolute', inset: 24, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, cursor: 'pointer' }}
                              onClick={() => { handleRefreshQr(); setQrExpanded(false); }}
                            >
                              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(15,23,42,0.9)', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                                <RefreshCw size={34} style={{ color: '#38bdf8' }} />
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>QR Code Expirado</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Clique para gerar um novo</div>
                              </div>
                            </div>
                          )}
                        </div>
                        <span style={{ color: qrExpired ? '#f87171' : '#94a3b8', fontSize: '0.85rem' }}>
                          {qrExpired ? '⚠️ QR expirado — clique no ↻ para gerar novo' : 'Abra o WhatsApp → Dispositivos Conectados → Apontar câmera aqui'}
                        </span>
                        <button onClick={() => setQrExpanded(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                          <Minimize2 size={14} style={{ display: 'inline', marginRight: 6 }} />Fechar
                        </button>
                      </div>,
                      document.body
                    )}

                    {/* Lista de sessões registradas no Card 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {whatsappNumbers.length === 0 ? (
                        <span style={{ fontSize: '0.76rem', color: '#64748b', textAlign: 'center', padding: '10px 0' }}>Nenhuma instância registrada.</span>
                      ) : (
                        whatsappNumbers.map(wa => (
                          <div
                            key={wa.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: 'rgba(255,255,255,0.01)',
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.04)'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#cbd5e1' }}>{wa.name}</span>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 10, color: wa.status === 'Conectado' ? '#10b981' : '#f59e0b', background: wa.status === 'Conectado' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                                  {wa.status}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{wa.phone}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {wa.status === 'Conectado' ? (
                                <button
                                  onClick={() => {
                                    setSelectedWaSession(wa);
                                    setSelectedChatLead(null);
                                  }}
                                  style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                                >
                                  Ver Celular
                                </button>
                              ) : (
                                !activeQrCodeId && (
                                  <button
                                    onClick={() => setActiveQrCodeId(wa.id)}
                                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.22)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(245,158,11,0.15)'}
                                  >
                                    Conectar
                                  </button>
                                )
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteWa(wa);
                                }}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                                onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                </div>

                {/* CARD 2: API Oficial */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Cpu size={22} style={{ color: '#3b82f6' }} />
                    <strong style={{ fontSize: '1.05rem', color: '#f1f5f9' }}>Conectar Número com API Oficial (Meta)</strong>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Conecte a conta comercial do WhatsApp Business Cloud API (Meta). Perfeito para disparos automatizados e templates homologados.
                  </p>

                  <span style={{ fontSize: '0.7rem', color: '#eab308', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: 6, width: 'fit-content', fontWeight: 700, marginTop: 4 }}>
                    Etapa 2 - Em Desenvolvimento
                  </span>
                </div>

              </div>
            ) : (
              /* Se selecionou uma sessão conectada, mostra o celularzinho de espelhamento */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'flex-start' }}>

                {/* Coluna Esquerda: Informações e voltar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <button
                    onClick={() => setSelectedWaSession(null)}
                    style={{
                      width: 'fit-content',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#cbd5e1',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 600,
                      transition: '0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    &lt; Voltar para Painel de Conexões
                  </button>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <strong style={{ fontSize: '0.9rem', color: '#f1f5f9' }}>Dispositivo Ativo Sincronizado</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}><strong>Identificador:</strong> {selectedWaSession.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}><strong>Número do Celular:</strong> {selectedWaSession.phone}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: 4, width: 'fit-content', fontWeight: 600, marginTop: 4 }}>
                      Sessão Ativa com Espelhamento
                    </span>
                  </div>
                </div>

                {/* COLUNA DIREITA: CELULARZINHO LATERAL (MOCKUP) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Espelhamento Ativo (Live)</span>
                    <button
                      onClick={() => setPhoneExpanded(true)}
                      title="Expandir espelhamento"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 9px', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    >
                      <Maximize2 size={12} /> Expandir
                    </button>
                  </div>

                  {/* O Celularzinho */}
                  <div style={{
                    width: 320,
                    height: 520,
                    background: '#090d16',
                    border: '10px solid #1e293b',
                    borderRadius: 32,
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {/* Dynamic Island / Notch */}
                    <div style={{
                      width: 90,
                      height: 18,
                      background: '#1e293b',
                      borderBottomLeftRadius: 10,
                      borderBottomRightRadius: 10,
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 9999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0f172a' }} />
                    </div>

                    {/* Celular Header / Barra de Status */}
                    <div style={{ height: 26, padding: '4px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b141a', color: 'white', fontSize: '0.66rem', zIndex: 999 }}>
                      <span>11:42</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Wifi size={10} />
                        <Smartphone size={10} />
                        <div style={{ width: 14, height: 8, border: '1px solid white', borderRadius: 2, padding: '0.5px', display: 'flex' }}>
                          <div style={{ width: '100%', height: '100%', background: '#10b981' }} />
                        </div>
                      </div>
                    </div>

                    {/* Tela interna do Celular */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a', overflow: 'hidden', minHeight: 0 }}>

                      {/* Sub-Header do Chat/WhatsApp — sempre fixo no topo, flex-shrink:0 */}
                      {!selectedChatLead ? (
                        /* Cabeçalho da Lista de Chats */
                        <div style={{ padding: '10px 14px', background: '#1f2c34', color: 'white', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>WhatsApp Web</span>
                            <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>{selectedWaSession.name}</span>
                          </div>
                          <div style={{ background: '#2a3942', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Search size={10} />
                            <span>Pesquisar conversas...</span>
                          </div>
                        </div>
                      ) : (
                        /* Cabeçalho do Chat Ativo — fixo e sempre visível */
                        <div style={{ padding: '8px 12px', background: '#1f2c34', color: 'white', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 10 }}>
                          <button
                            onClick={() => setSelectedChatLead(null)}
                            style={{ cursor: 'pointer', fontSize: '0.72rem', color: '#00a884', fontWeight: 'bold', paddingRight: 4, background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M15 18l-6-6 6-6" stroke="#00a884" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Voltar
                          </button>

                          {/* Avatar */}
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem', flexShrink: 0, overflow: 'hidden' }}>
                            {(() => {
                              const picUrl = profilePicsStore[selectedChatLead.id] || selectedChatLead.profilePic || null;
                              return picUrl
                                ? <img src={picUrl} alt={selectedChatLead.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                                : <span>{selectedChatLead.name ? selectedChatLead.name[0].toUpperCase() : 'L'}</span>;
                            })()}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#e2e8f0' }}>
                              {selectedChatLead.name || selectedChatLead.phone || 'Contato'}
                            </span>
                            <span style={{ fontSize: '0.58rem', color: '#8696a0' }}>Online</span>
                          </div>

                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                        </div>
                      )}

                      {/* Conteúdo Central da Tela */}
                      {!selectedChatLead ? (
                        /* LISTA DE CHATS DOS LEADS */
                        <div
                          className="custom-blue-scrollbar"
                          style={{ flex: 1, overflowY: 'scroll', minHeight: 0, overscrollBehavior: 'contain' }}
                        >
                          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.64rem', color: '#8696a0', fontWeight: 700, textTransform: 'uppercase' }}>
                            Conversas Recentes
                          </div>

                          {(() => {
                            const chatListToRender = waChats.length > 0 ? waChats : leads.map(l => ({
                              id: l.phone || l.id,
                              name: l.name,
                              phone: l.phone || '',
                              status: 'Mock'
                            }));

                            if (chatListToRender.length === 0) {
                              return (
                                <div style={{ padding: 20, textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                                  Nenhum lead ou conversa encontrada.
                                </div>
                              );
                            }

                            return chatListToRender.map(chat => {
                              const isMock = chat.status === 'Mock';
                              // Real chat: use server's lastMessage/time; Mock: use simulatedMessages
                              const messages = isMock
                                ? (simulatedCellMessages[chat.id] || simulatedCellMessages['default'])
                                : null;
                              const lastMsg = isMock
                                ? (messages[messages.length - 1]?.text || 'Nenhuma mensagem recente')
                                : (chat.lastMessage || 'Clique para ver mensagens');
                              const time = isMock
                                ? (messages[messages.length - 1]?.time || '10:00')
                                : (chat.time || '10:00');
                              const picUrl = profilePicsStore[chat.id] || chat.profilePic || null;
                              const leadInfo = chatLeadMap[chat.id];
                              const displayName = leadInfo?.lead?.name || chat.name || chat.phone || chat.id;

                              return (
                                <div
                                  key={chat.id}
                                  onClick={() => setSelectedChatLead(chat)}
                                  style={{
                                    display: 'flex',
                                    gap: 10,
                                    padding: '10px 14px',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    transition: '0.2s',
                                    alignItems: 'center'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {/* Avatar com foto de perfil real */}
                                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: isMock ? '#475569' : '#005c4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.74rem', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                                    {picUrl ? (
                                      <img src={picUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    ) : (
                                      <span>{displayName[0]?.toUpperCase() || 'L'}</span>
                                    )}
                                  </div>

                                  {/* Infos do Chat */}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: unreadCounts[chat.id] > 0 ? '#00a884' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {displayName}
                                      </span>
                                      <span style={{ fontSize: '0.6rem', color: unreadCounts[chat.id] > 0 ? '#00a884' : '#8696a0' }}>{time}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.66rem', color: '#8696a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                        {lastMsg}
                                      </span>
                                      {unreadCounts[chat.id] > 0 && (
                                        <span style={{ background: '#00a884', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: '0.58rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', flexShrink: 0, marginLeft: 4 }}>
                                          {unreadCounts[chat.id]}
                                        </span>
                                      )}
                                    </div>

                                    {/* ── Tag de Funil ── */}
                                    {(() => {
                                      const hasPipeline = leadInfo?.pipeline;
                                      const isLoading = !(chat.id in chatLeadMap) && leads.length > 0;
                                      if (isLoading) return null;
                                      return (
                                        <div style={{ position: 'relative' }}>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setPipelineSelectorOpen(prev => prev === chat.id ? null : chat.id);
                                            }}
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: 3,
                                              padding: '1px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                              fontSize: '0.55rem', fontWeight: 600,
                                              background: hasPipeline ? 'rgba(0,92,75,0.4)' : 'rgba(71,85,105,0.35)',
                                              color: hasPipeline ? '#00d4a0' : '#94a3b8',
                                              transition: '0.15s'
                                            }}
                                          >
                                            {hasPipeline ? '📂' : '⊕'} {hasPipeline ? leadInfo.pipeline.name : 'Sem Funil'} ▾
                                          </button>

                                          {/* Popover Seletor */}
                                          {pipelineSelectorOpen === chat.id && (
                                            <div
                                              onClick={e => e.stopPropagation()}
                                              style={{
                                                position: 'absolute', left: 0, top: '110%', zIndex: 9999,
                                                background: '#1e2a32', border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 10, padding: 12, minWidth: 220,
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                                              }}
                                            >
                                              {hasPipeline ? (
                                                <>
                                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 8 }}>
                                                    📂 <strong style={{ color: '#e2e8f0' }}>{leadInfo.pipeline.name}</strong>
                                                    <div style={{ color: '#64748b', fontSize: '0.62rem', marginTop: 2 }}>
                                                      Lead: {leadInfo.lead.name} • {leadInfo.lead.status}
                                                    </div>
                                                  </div>
                                                  <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 6 }}>Mover para:</div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                                                    {pipelinesList.filter(p => p.id !== leadInfo.lead.pipeline_id && p.id !== 'todos-os-leads').map(p => (
                                                      <button key={p.id} onClick={() => handleMovePipeline(leadInfo.lead, p.id, chat.id)}
                                                        disabled={pipelineSelectorLoading}
                                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '5px 8px', color: '#cbd5e1', fontSize: '0.65rem', cursor: 'pointer', textAlign: 'left' }}>
                                                        ↪ {p.name}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </>
                                              ) : (
                                                <>
                                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 8 }}>
                                                    ⊕ <strong style={{ color: '#e2e8f0' }}>Adicionar ao Funil</strong>
                                                    <div style={{ color: '#64748b', fontSize: '0.62rem', marginTop: 2 }}>
                                                      {displayName} não está em nenhum funil
                                                    </div>
                                                  </div>
                                                  <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 6 }}>Selecione um funil:</div>
                                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                                                    {pipelinesList.filter(p => p.id !== 'todos-os-leads').map(p => (
                                                      <button key={p.id} onClick={() => handleAddToPipeline(chat, p.id)}
                                                        disabled={pipelineSelectorLoading}
                                                        style={{ background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.2)', borderRadius: 6, padding: '6px 8px', color: '#00d4a0', fontSize: '0.65rem', cursor: 'pointer', textAlign: 'left' }}>
                                                        📂 {p.name}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </>
                                              )}
                                              <button onClick={() => setPipelineSelectorOpen(null)}
                                                style={{ marginTop: 6, width: '100%', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.6rem', cursor: 'pointer', padding: '3px' }}>
                                                Fechar
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {/* ──────────── */}

                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        /* CHAT ATIVO COM O LEAD SELECIONADO */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

                          {/* ── Banner de Funil (mini) ── */}
                          {(() => {
                            const leadInfo = chatLeadMap[selectedChatLead?.id];
                            const hasPipeline = leadInfo?.pipeline;
                            const chatId = selectedChatLead?.id;
                            return (
                              <div style={{ position: 'relative', background: '#0d1b21', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {hasPipeline ? (
                                  <button onClick={e => { e.stopPropagation(); setPipelineSelectorOpen(prev => prev === `mini-${chatId}` ? null : `mini-${chatId}`); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(0,92,75,0.35)', border: '1px solid rgba(0,212,160,0.2)', borderRadius: 20, padding: '2px 8px', color: '#00d4a0', fontSize: '0.56rem', fontWeight: 600, cursor: 'pointer' }}>
                                    📂 {leadInfo.pipeline.name} ▾
                                  </button>
                                ) : (
                                  <>
                                    <span style={{ fontSize: '0.56rem', color: '#64748b', flex: 1 }}>⊕ Sem funil</span>
                                    <button onClick={e => { e.stopPropagation(); setPipelineSelectorOpen(prev => prev === `mini-${chatId}` ? null : `mini-${chatId}`); }}
                                      style={{ background: 'rgba(0,168,132,0.12)', border: '1px solid rgba(0,168,132,0.25)', borderRadius: 20, padding: '2px 7px', color: '#00d4a0', fontSize: '0.56rem', cursor: 'pointer' }}>
                                      + Funil
                                    </button>
                                  </>
                                )}
                                {pipelineSelectorOpen === `mini-${chatId}` && (
                                  <div onClick={e => e.stopPropagation()}
                                    style={{ position: 'absolute', left: 8, top: '110%', zIndex: 9999, background: '#1e2a32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    {hasPipeline ? (
                                      <>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 6 }}>Mover para:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                                          {pipelinesList.filter(p => p.id !== leadInfo.lead.pipeline_id && p.id !== 'todos-os-leads').map(p => (
                                            <button key={p.id} onClick={() => handleMovePipeline(leadInfo.lead, p.id, chatId)}
                                              disabled={pipelineSelectorLoading}
                                              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '5px 8px', color: '#cbd5e1', fontSize: '0.62rem', cursor: 'pointer', textAlign: 'left' }}>
                                              ↪ {p.name}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div style={{ fontSize: '0.62rem', color: '#64748b', marginBottom: 6 }}>Adicionar ao funil:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
                                          {pipelinesList.filter(p => p.id !== 'todos-os-leads').map(p => (
                                            <button key={p.id} onClick={() => handleAddToPipeline(selectedChatLead, p.id)}
                                              disabled={pipelineSelectorLoading}
                                              style={{ background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.2)', borderRadius: 6, padding: '5px 8px', color: '#00d4a0', fontSize: '0.62rem', cursor: 'pointer', textAlign: 'left' }}>
                                              📂 {p.name}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    <button onClick={() => setPipelineSelectorOpen(null)}
                                      style={{ marginTop: 5, width: '100%', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.58rem', cursor: 'pointer' }}>
                                      Fechar
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {/* ──────────────── */}

                          {/* Janela de Mensagens */}
                          <div
                            className="custom-blue-scrollbar"
                            style={{
                              flex: 1,
                              overflowY: 'auto',
                              padding: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              background: '#0b141a'
                            }}
                          >
                            {(() => {
                              const activeMessages = selectedChatLead.status !== 'Mock'
                                ? waMessages
                                : (simulatedCellMessages[selectedChatLead.id] || simulatedCellMessages['default']);

                              if (activeMessages.length === 0) {
                                return (
                                  <div style={{ padding: 20, textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                                    Nenhuma mensagem nesta conversa.
                                  </div>
                                );
                              }

                              return activeMessages.map((m, idx) => {
                                const isMe = m.sender === 'me';
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                                      background: isMe ? '#005c4b' : '#202c33',
                                      color: '#e9edef',
                                      padding: m.audioUrl ? '6px 8px' : '6px 10px',
                                      borderRadius: 8,
                                      maxWidth: '85%',
                                      fontSize: '0.7rem',
                                      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 2
                                    }}
                                  >
                                    {m.audioUrl
                                      ? <AudioPlayer src={m.audioUrl} isMe={isMe} compact />
                                      : <span>{m.text}</span>
                                    }
                                    <span style={{ alignSelf: 'flex-end', fontSize: '0.54rem', color: '#8696a0' }}>{m.time}</span>
                                  </div>
                                );
                              });
                            })()}
                            {/* Âncora para auto-scroll até a última mensagem */}
                            <div ref={messagesEndRef} style={{ height: 0 }} />
                          </div>

                          {/* Campo de Entrada de Mensagens (WhatsApp Footer) */}
                          <div style={{ padding: '6px 8px', background: '#1f2c34', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isRecording ? (
                              // ─── UI de Gravação ───
                              <>
                                <button onClick={cancelRecording} title="Cancelar" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 2 }}>
                                  <X size={14} />
                                </button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#2a3942', borderRadius: 6, padding: '4px 8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                                  <span style={{ fontSize: '0.68rem', color: '#e9edef' }}>{formatRecordingTime(recordingTime)}</span>
                                  <span style={{ fontSize: '0.6rem', color: '#8696a0' }}>Gravando...</span>
                                </div>
                                <button onClick={stopRecording} title="Enviar" style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                                  <Send size={10} />
                                </button>
                              </>
                            ) : (
                              // ─── UI Normal ───
                              <>
                                <Smile size={14} style={{ color: '#8696a0', cursor: 'pointer' }} />
                                <input
                                  type="text"
                                  value={cellMessageInput}
                                  onChange={e => setCellMessageInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSendCellMessage(); }}
                                  placeholder="Mensagem..."
                                  style={{ flex: 1, padding: '5px 10px', background: '#2a3942', border: 'none', borderRadius: 6, color: '#e9edef', fontSize: '0.7rem', outline: 'none' }}
                                />
                                {cellMessageInput.trim() ? (
                                  <button onClick={handleSendCellMessage} style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                                    <Send size={10} />
                                  </button>
                                ) : (
                                  <button onClick={startRecording} title="Gravar áudio" style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                                    <Mic size={10} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Modal Expandido do Celularzinho (WhatsApp Web Style) */}
        {phoneExpanded && selectedWaSession && createPortal(
          <div
            style={{ position: 'fixed', inset: 0, background: '#111b21', zIndex: 99998, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header */}
            <div style={{ height: 56, background: '#1f2c34', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>
                  {selectedWaSession.name?.[0] || 'W'}
                </div>
                <div>
                  <div style={{ color: '#e9edef', fontWeight: 700, fontSize: '0.95rem' }}>WhatsApp Web — {selectedWaSession.name}</div>
                  <div style={{ color: '#8696a0', fontSize: '0.75rem' }}>{selectedWaSession.phone}</div>
                </div>
              </div>
              <button
                onClick={() => { setPhoneExpanded(false); }}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e9edef', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <Minimize2 size={14} /> Minimizar
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Sidebar de Chats */}
              <div style={{ width: 360, background: '#111b21', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
                {/* Busca */}
                <div style={{ padding: '12px 16px', background: '#1f2c34' }}>
                  <div style={{ background: '#2a3942', borderRadius: 8, padding: '7px 14px', fontSize: '0.82rem', color: '#8696a0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={13} />
                    <span>Pesquisar ou começar nova conversa</span>
                  </div>
                </div>
                {/* Lista de Chats */}
                <div className="custom-blue-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                  {(() => {
                    const chatListToRender = waChats.length > 0 ? waChats : leads.map(l => ({ id: l.phone || l.id, name: l.name, phone: l.phone || '', status: 'Mock' }));
                    return chatListToRender.map(chat => {
                      const isMock = chat.status === 'Mock';
                      const messages = isMock ? (simulatedCellMessages[chat.id] || simulatedCellMessages['default']) : null;
                      const lastMsg = isMock
                        ? (messages[messages.length - 1]?.text || 'Nenhuma mensagem')
                        : (chat.lastMessage || 'Clique para ver mensagens');
                      const time = isMock
                        ? (messages[messages.length - 1]?.time || '10:00')
                        : (chat.time || '10:00');
                      const isActive = selectedChatLead?.id === chat.id;
                      const picUrl = profilePicsStore[chat.id] || chat.profilePic || null;
                      const leadInfo = chatLeadMap[chat.id];
                      const displayName = leadInfo?.lead?.name || chat.name || chat.phone || chat.id;
                      return (
                        <div
                          key={chat.id}
                          onClick={() => setSelectedChatLead(chat)}
                          style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', transition: '0.15s', alignItems: 'center' }}
                          onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* Avatar with real profile pic */}
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: isMock ? '#475569' : '#005c4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', flexShrink: 0, overflow: 'hidden' }}>
                            {picUrl ? (
                              <img src={picUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <span>{displayName[0]?.toUpperCase() || 'L'}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
                              <span style={{ fontSize: '0.7rem', color: '#8696a0', flexShrink: 0 }}>{time}</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#8696a0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{lastMsg}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Área de Chat */}
              {selectedChatLead ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
                  {/* Chat Header */}
                  <div style={{ height: 56, background: '#1f2c34', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#005c4b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', overflow: 'hidden', flexShrink: 0 }}>
                      {(profilePicsStore[selectedChatLead.id] || selectedChatLead.profilePic) ? (
                        <img src={profilePicsStore[selectedChatLead.id] || selectedChatLead.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        <span>{(selectedChatLead.name || selectedChatLead.phone || 'L')[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div style={{ color: '#e9edef', fontWeight: 700, fontSize: '0.92rem' }}>
                        {chatLeadMap[selectedChatLead.id]?.lead?.name || selectedChatLead.name || selectedChatLead.phone}
                      </div>
                      <div style={{ color: '#8696a0', fontSize: '0.72rem' }}>Online</div>
                    </div>
                  </div>

                  {/* ── Banner de Funil no Chat Expandido ── */}
                  {(() => {
                    const leadInfo = chatLeadMap[selectedChatLead?.id];
                    const hasPipeline = leadInfo?.pipeline;
                    const chatId = selectedChatLead?.id;
                    const displayName = selectedChatLead?.name || selectedChatLead?.phone || '';
                    return (
                      <div style={{ position: 'relative', background: '#162026', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {hasPipeline ? (
                          <>
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Funil:</span>
                            <button
                              onClick={e => { e.stopPropagation(); setPipelineSelectorOpen(prev => prev === `exp-${chatId}` ? null : `exp-${chatId}`); }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,92,75,0.35)', border: '1px solid rgba(0,212,160,0.25)', borderRadius: 20, padding: '3px 10px', color: '#00d4a0', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              📂 {leadInfo.pipeline.name} ▾
                            </button>
                            <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 4 }}>
                              Lead: {leadInfo.lead.name} • {leadInfo.lead.status}
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', flex: 1 }}>
                              ⊕ Este contato não está em nenhum funil
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setPipelineSelectorOpen(prev => prev === `exp-${chatId}` ? null : `exp-${chatId}`); }}
                              style={{ background: 'rgba(0,168,132,0.15)', border: '1px solid rgba(0,168,132,0.3)', borderRadius: 20, padding: '3px 12px', color: '#00d4a0', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              + Adicionar ao Funil
                            </button>
                          </>
                        )}

                        {/* Popover do banner expandido */}
                        {pipelineSelectorOpen === `exp-${chatId}` && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{ position: 'absolute', left: 20, top: '110%', zIndex: 9999, background: '#1e2a32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, minWidth: 260, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                          >
                            {hasPipeline ? (
                              <>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>
                                  📂 <strong style={{ color: '#e2e8f0' }}>{leadInfo.pipeline.name}</strong>
                                  <div style={{ color: '#64748b', fontSize: '0.66rem', marginTop: 3 }}>
                                    Lead: {leadInfo.lead.name} • Status: {leadInfo.lead.status}
                                  </div>
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#64748b', marginBottom: 8 }}>Mover para outro funil:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 160, overflowY: 'auto' }}>
                                  {pipelinesList.filter(p => p.id !== leadInfo.lead.pipeline_id && p.id !== 'todos-os-leads').map(p => (
                                    <button key={p.id} onClick={() => handleMovePipeline(leadInfo.lead, p.id, chatId)}
                                      disabled={pipelineSelectorLoading}
                                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 7, padding: '7px 10px', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left' }}>
                                      ↪ {p.name}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginBottom: 4 }}>⊕ Adicionar ao Funil</div>
                                <div style={{ color: '#64748b', fontSize: '0.66rem', marginBottom: 10 }}>
                                  {displayName} não está em nenhum funil.<br />Selecione um funil para criar o Lead:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                                  {pipelinesList.filter(p => p.id !== 'todos-os-leads').map(p => (
                                    <button key={p.id} onClick={() => handleAddToPipeline(selectedChatLead, p.id)}
                                      disabled={pipelineSelectorLoading}
                                      style={{ background: 'rgba(0,168,132,0.1)', border: '1px solid rgba(0,168,132,0.2)', borderRadius: 7, padding: '7px 10px', color: '#00d4a0', fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left' }}>
                                      📂 {p.name}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                            <button onClick={() => setPipelineSelectorOpen(null)}
                              style={{ marginTop: 8, width: '100%', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.64rem', cursor: 'pointer', padding: '4px' }}>
                              Fechar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* ──────────────────────────────────────── */}

                  {/* Messages */}
                  <div className="custom-blue-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px 80px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(() => {
                      const activeMessages = selectedChatLead.status !== 'Mock' ? waMessages : (simulatedCellMessages[selectedChatLead.id] || simulatedCellMessages['default']);
                      if (activeMessages.length === 0) return <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginTop: 40 }}>Nenhuma mensagem nesta conversa.</div>;
                      return activeMessages.map((m, idx) => {
                        const isMe = m.sender === 'me';
                        return (
                          <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', background: isMe ? '#005c4b' : '#202c33', color: '#e9edef', padding: m.audioUrl ? '8px 12px' : '8px 14px', borderRadius: 10, maxWidth: '60%', fontSize: '0.88rem', boxShadow: '0 1px 1px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {m.audioUrl
                              ? <AudioPlayer src={m.audioUrl} isMe={isMe} />
                              : <span>{m.text}</span>
                            }
                            <span style={{ alignSelf: 'flex-end', fontSize: '0.68rem', color: '#8696a0' }}>{m.time}</span>
                          </div>
                        );
                      });
                    })()}
                    {/* Âncora para auto-scroll até a última mensagem */}
                    <div ref={messagesEndRef2} style={{ height: 0 }} />
                  </div>

                  {/* Footer input */}
                  <div style={{ padding: '10px 20px', background: '#1f2c34', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isRecording ? (
                      // ─── UI de Gravação ───
                      <>
                        <button onClick={cancelRecording} title="Cancelar" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8 }}>
                          <X size={18} />
                        </button>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#2a3942', borderRadius: 10, padding: '10px 16px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.9rem', color: '#e9edef', fontWeight: 500 }}>{formatRecordingTime(recordingTime)}</span>
                          <span style={{ fontSize: '0.78rem', color: '#8696a0' }}>Gravando áudio...</span>
                        </div>
                        <button onClick={stopRecording} title="Enviar" style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                          <Send size={18} />
                        </button>
                      </>
                    ) : (
                      // ─── UI Normal ───
                      <>
                        <Smile size={22} style={{ color: '#8696a0', cursor: 'pointer' }} />
                        <Paperclip size={20} style={{ color: '#8696a0', cursor: 'pointer' }} />
                        <input
                          type="text"
                          value={cellMessageInput}
                          onChange={e => setCellMessageInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendCellMessage(); }}
                          placeholder="Digite uma mensagem"
                          style={{ flex: 1, padding: '10px 16px', background: '#2a3942', border: 'none', borderRadius: 10, color: '#e9edef', fontSize: '0.88rem', outline: 'none' }}
                        />
                        {cellMessageInput.trim() ? (
                          <button onClick={handleSendCellMessage} style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <Send size={16} />
                          </button>
                        ) : (
                          <button onClick={startRecording} title="Gravar áudio" style={{ background: '#00a884', border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <Mic size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#8696a0' }}>
                  <Smartphone size={64} style={{ opacity: 0.2 }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', color: '#e9edef', fontWeight: 600, marginBottom: 6 }}>WhatsApp Web</div>
                    <div style={{ fontSize: '0.85rem' }}>Selecione uma conversa para começar</div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* FACEBOOK & TIKTOK INTEGRATION */}
        {selected.startsWith('integracoes/') && selected !== 'integracoes/instagram' && selected !== 'integracoes/whatsapp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', textTransform: 'capitalize' }}>🔗 Integração {selected.split('/')[1]}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Importação direta de leads das campanhas de formulário de {selected.split('/')[1]}.</p>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Conexão API em modo de espera. Insira os tokens de acesso ou integre via Conectividade de APIs.</p>
            <button style={{ alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>Configurar Chaves Webhook</button>
          </div>
        )}

        {/* PIPELINE - FUNIL DE VENDAS (KANBAN DINÂMICO) */}
        {isKanbanPipelineSelected && !isPipelineExpanded && (
          <div className="glass-panel" style={{ padding: 24, borderRadius: 14, display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
            {renderPipelineFunil(selectedPipeline)}
          </div>
        )}

        {/* PIPELINES - TODOS OS LEADS */}
        {selected === 'pipelines/todos-os-leads' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📋 Todos os Leads Prospectados</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Gerenciamento unificado e rastreamento de contatos.</p>
              </div>
            </div>

            {/* Busca + Adicionar Lead */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar leads..."
                    style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '10px 12px', color: '#64748b' }}>Lead / Empresa</th>
                        <th style={{ padding: '10px 12px', color: '#64748b' }}>Origem</th>
                        <th style={{ padding: '10px 12px', color: '#64748b' }}>Status</th>
                        <th style={{ padding: '10px 12px', color: '#64748b' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{l.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.company}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: 10 }}>{l.source}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '0.7rem', color: l.status === 'Novo' ? '#10b981' : l.status === 'Em Contato' ? '#fbbf24' : '#64748b', background: l.status === 'Novo' ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: 10 }}>{l.status}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja mesmo remover o lead "${l.name}"?`)) {
                                  handleDeleteLead(l.id);
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulário Novo Lead */}
              <form onSubmit={handleAddLead} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <strong style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>Capturar Novo Lead</strong>
                <div>
                  <label style={{ fontSize: '0.67rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Nome</label>
                  <input
                    value={newLeadName}
                    onChange={e => setNewLeadName(e.target.value)}
                    placeholder="Nome do contato..."
                    style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.78rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.67rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Empresa</label>
                  <input
                    value={newLeadCompany}
                    onChange={e => setNewLeadCompany(e.target.value)}
                    placeholder="Empresa..."
                    style={{ width: '100%', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.78rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.67rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Canal</label>
                  <select
                    value={newLeadSource}
                    onChange={e => setNewLeadSource(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.78rem', outline: 'none' }}
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                  </select>
                </div>
                <button type="submit" style={{ width: '100%', padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.2s', marginTop: 4 }}>
                  Adicionar Lead
                </button>
              </form>
            </div>
          </div>
        )}

        {/* INSIGHTS - PAINEL */}
        {selected === 'insights/painel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📈 Painel de Insights</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Estatísticas globais de conversão do canal ativo.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Total de Leads</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>452</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Taxa de Resposta</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>32.4%</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Reuniões Agendadas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#eab308', marginTop: 4 }}>48</div>
              </div>
            </div>
          </div>
        )}

        {/* INSIGHTS - ROI */}
        {selected === 'insights/roi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>💰 Calculadora de ROI e Custo</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Analise o retorno sobre o investimento das prospecções.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Investimento (R$)</label>
                  <input
                    type="number"
                    value={roiInvest}
                    onChange={e => setRoiInvest(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Faturamento Comercial (R$)</label>
                  <input
                    type="number"
                    value={roiSales}
                    onChange={e => setRoiSales(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Quantidade de Leads</label>
                  <input
                    type="number"
                    value={roiLeads}
                    onChange={e => setRoiLeads(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ background: 'rgba(37,99,235,0.03)', padding: 16, borderRadius: 10, border: '1px solid rgba(37,99,235,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Retorno sobre Investimento (ROI)</span>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: roiValue >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
                    {roiValue.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Custo por Lead (CPL)</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9', marginTop: 4 }}>
                    R$ {cpl.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSIGHTS - GANHOS E PERDAS */}
        {selected === 'insights/ganhos-perdas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>⚖️ Distribuição de Ganhos e Perdas</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Razões comuns para encerramento de negociações.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                  <span style={{ color: '#10b981' }}>Ganhos (Fechado)</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 700 }}>64%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#10b981', width: '64%' }} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                  <span style={{ color: '#ef4444' }}>Perdas (Sem Resposta / Sem Fit)</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 700 }}>36%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#ef4444', width: '36%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSIGHTS - REGISTRO DE ATIVIDADES */}
        {selected === 'insights/registro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📝 Registro Geral de Atividades</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Histórico em tempo real das ações de prospecção.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { time: '15:20', text: '🤖 Agente IA enviou mensagem de abordagem para lucas_silva@ig' },
                { time: '14:45', text: '👤 Vinicius atualizou status do lead Juliana Castro para "Em Contato"' },
                { time: '13:00', text: '📥 Novo lead capturado via Instagram webhook (@roiexpert_pro)' },
                { time: '11:15', text: '🔗 Integração do WhatsApp reconfigurada com sucesso' },
              ].map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 6 }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{act.time}</span>
                  <span style={{ color: '#e2e8f0' }}>{act.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INSIGHTS - RELATÓRIOS NESTED */}
        {selected.startsWith('insights/relatorios/') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', textTransform: 'capitalize' }}>📄 Relatório de {selected.split('/').pop()}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Filtre e faça o download dos dados consolidados.</p>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Os relatórios de prospecção são gerados no fechamento do dia. O último relatório consolidado contém os dados coletados das plataformas integradas.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 14px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Baixar CSV</button>
              <button style={{ padding: '8px 14px', borderRadius: 6, background: '#2563eb', border: 'none', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Exportar PDF</button>
            </div>
          </div>
        )}

        {/* CALENDÁRIO */}
        {selected === 'calendario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>📅 Calendário de Abordagens</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Organização diária e agendamentos de retornos de prospecção.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, paddingBottom: 6 }}>{d}</div>
              ))}
              {Array.from({ length: 31 }, (_, i) => {
                const isToday = i + 1 === new Date().getDate();
                return (
                  <div key={i} style={{ height: 42, background: isToday ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isToday ? '#2563eb' : 'rgba(255,255,255,0.04)'}`, borderRadius: 6, padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.7rem', color: isToday ? '#3b82f6' : '#64748b', fontWeight: isToday ? 800 : 500 }}>{i + 1}</span>
                    {i === 15 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', alignSelf: 'center' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEGMENTO */}
        {selected === 'segmento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>🎯 Segmentação de Público Alvo</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Navegue e crie listas de contatos com base em nichos comerciais.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { title: 'Clínicas Odontológicas', size: '124 empresas', desc: 'Foco em implantes e estética.' },
                { title: 'Academias & Box Crossfit', size: '89 empresas', desc: 'Foco em captação de alunos.' },
                { title: 'Lojas de E-commerce', size: '210 contatos', desc: 'Foco em dropshipping e marcas locais.' },
                { title: 'Imobiliárias Regionais', size: '54 empresas', desc: 'Foco em lançamentos imobiliários.' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{s.title}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>{s.size}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTAS */}
        {selected.startsWith('listas/') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', textTransform: 'capitalize' }}>🗂️ Lista de {selected.split('/')[1].replace('-', ' e ')}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Gerenciamento e organização de bancos de dados importados.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Última atualização: hoje às 12:40</span>
                <button style={{ padding: '6px 12px', borderRadius: 6, background: '#2563eb', border: 'none', color: 'white', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer' }}>Importar Lista (.csv)</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>Sua base de dados de {selected.split('/')[1]} está sincronizada. Nenhuma pendência encontrada.</p>
            </div>
          </div>
        )}

        {/* AGENTES DE IA */}
        {selected === 'agentes-ia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9' }}>🤖 Agentes de IA Prospecção</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure as regras e treine o bot de automação do Instagram e WhatsApp.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>

              {/* Painel Configuração */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>Agente de Abordagem Direct</strong>
                    <button
                      onClick={() => setChatbotActive(!chatbotActive)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: 'none',
                        background: chatbotActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: chatbotActive ? '#10b981' : '#ef4444',
                        fontWeight: 700,
                        fontSize: '0.67rem',
                        cursor: 'pointer'
                      }}
                    >
                      {chatbotActive ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: 4 }}>Instruções do Sistema (Prompt)</label>
                    <textarea
                      defaultValue="Você é um assistente comercial da ROI Expert. Aborde os leads com educação, entenda se precisam de marketing e sugira uma chamada."
                      style={{ width: '100%', padding: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', resize: 'none', height: 70 }}
                    />
                  </div>
                  <button style={{ width: '100%', padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f1f5f9', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>Salvar Configurações</button>
                </div>
              </div>

              {/* Chat Simulator */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', flexDirection: 'column', height: 320, overflow: 'hidden' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>Simulador de Conversa</div>
                <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatbotMessages.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? '#2563eb' : 'rgba(255,255,255,0.05)', color: '#f1f5f9', padding: '6px 10px', borderRadius: 8, fontSize: '0.76rem', maxWidth: '80%' }}>
                      {msg.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendTestMessage} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', padding: 6, background: '#090d16' }}>
                  <input
                    value={chatbotTestInput}
                    onChange={e => setChatbotTestInput(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.78rem', padding: '6px 8px', outline: 'none' }}
                  />
                  <button type="submit" style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '6px' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* AUTOMAÇÕES - BOTS & TRANSMISSÃO */}
        {selected.startsWith('automacoes/') && !selected.startsWith('automacoes/modelos/') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', textTransform: 'capitalize' }}>🤖 Automações - {selected.split('/').pop()}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Configure os gatilhos e fluxos automáticos.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
              <strong style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>Campanha Ativa</strong>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 12px' }}>Envio agendado de mensagens de abordagem para novos leads.</p>
              <button style={{ padding: '8px 14px', borderRadius: 6, background: '#2563eb', border: 'none', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>Nova Campanha de Transmissão</button>
            </div>
          </div>
        )}

        {/* AUTOMAÇÕES - MODELOS */}
        {selected.startsWith('automacoes/modelos/') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f1f5f9', textTransform: 'capitalize' }}>📝 Modelos - {selected.split('/').pop()}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Gerencie seus templates de prospecção.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: '#0f172a', padding: 10, borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#e2e8f0', marginBottom: 4 }}>Template Abordagem Padrão</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>"Olá, [Nome]! Vi seu perfil da [Empresa] e achei sensacional o trabalho..."</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* PORTAL DE EXPANSÃO TELA CHEIA DA PIPELINE */}
      {isPipelineExpanded && isKanbanPipelineSelected && createPortal(
        <div className="kanban-fullscreen-wrapper">
          <div className="glass-panel" style={{ padding: 24, borderRadius: 14, display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)', height: '100%', width: '100%' }}>
            {renderPipelineFunil(selectedPipeline)}
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* MODAL DE CONFIRMAÇÃO DE REMOÇÃO DE WHATSAPP */}
      {confirmDeleteWa && createPortal(
        <div
          onClick={() => setConfirmDeleteWa(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: 28, width: 380, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}
          >
            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Remover "{confirmDeleteWa.name}"?</span>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Esta sessão será removida da lista. A conexão local será encerrada e as credenciais apagadas.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDeleteWa(null)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: '0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const wa = confirmDeleteWa;
                  // 1. Fecha modal IMEDIATAMENTE — UI não trava
                  setConfirmDeleteWa(null);
                  // 2. Remove da lista local imediatamente (UX instantânea)
                  setWhatsappNumbers(prev => prev.filter(x => x.id !== wa.id));
                  if (activeQrCodeId === wa.id) setActiveQrCodeId(null);
                  if (selectedWaSession?.id === wa.id) setSelectedWaSession(null);
                  // 3. Remove do banco e do servidor em paralelo (fire-and-forget)
                  supabase.from('crm_whatsapp_sessions').delete().eq('id', wa.id).then(() => { }).catch(() => { });
                  fetch('http://localhost:3001/api/whatsapp/logout', { method: 'POST' }).then(() => { }).catch(() => { });
                }}
                style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.85)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: '0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = '#ef4444'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.85)'}
              >
                Sim, remover
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE AJUSTAR COLUNAS (K KANBAN) */}
      {isColumnModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 450, padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setIsColumnModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} style={{ color: '#2563eb' }} /> Ajustar Colunas - Funil de Prospecção
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
              Personalize as colunas do seu Kanban. Se renomear uma coluna, os leads existentes nela serão migradas automaticamente. Se excluir uma coluna, os leads correspondentes serão movidos para a primeira coluna.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {tempColumns.map((colName, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#334155', fontSize: '0.8rem', cursor: 'default', userSelect: 'none' }}>&#8942;&#8942;</span>
                  <input
                    value={colName}
                    onChange={(e) => {
                      const next = [...tempColumns];
                      next[index] = e.target.value;
                      setTempColumns(next);
                    }}
                    style={{ flex: 1, padding: '6px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#f1f5f9', fontSize: '0.8rem', outline: 'none' }}
                  />

                  {/* Reordenar para Cima */}
                  <button
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...tempColumns];
                      const tmp = next[index];
                      next[index] = next[index - 1];
                      next[index - 1] = tmp;
                      setTempColumns(next);
                    }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', borderRadius: 6, padding: '4px 6px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <ArrowUp size={11} />
                  </button>

                  {/* Reordenar para Baixo */}
                  <button
                    disabled={index === tempColumns.length - 1}
                    onClick={() => {
                      const next = [...tempColumns];
                      const tmp = next[index];
                      next[index] = next[index + 1];
                      next[index + 1] = tmp;
                      setTempColumns(next);
                    }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', borderRadius: 6, padding: '4px 6px', cursor: index === tempColumns.length - 1 ? 'not-allowed' : 'pointer', opacity: index === tempColumns.length - 1 ? 0.3 : 1 }}
                  >
                    <ArrowDown size={11} />
                  </button>

                  {/* Excluir Coluna */}
                  <button
                    disabled={tempColumns.length <= 1}
                    onClick={() => {
                      setTempColumns(tempColumns.filter((_, idx) => idx !== index));
                    }}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: tempColumns.length <= 1 ? 'not-allowed' : 'pointer', padding: 6, opacity: tempColumns.length <= 1 ? 0.3 : 1 }}
                    onMouseOver={e => { if (tempColumns.length > 1) e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={e => { if (tempColumns.length > 1) e.currentTarget.style.color = '#64748b'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setTempColumns([...tempColumns, `Nova Coluna ${tempColumns.length + 1}`])}
              style={{ padding: '8px', border: '1.5px dashed rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Plus size={12} /> Adicionar Coluna
            </button>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const filteredTemp = tempColumns.filter(c => c.trim() !== '');
                  if (filteredTemp.length === 0) return;

                  const pipeId = editingColumnsPipelineId || selectedPipeline?.id || 'funil';
                  const currentCols = pipelineColumnsMap[pipeId] || ['Novo', 'Em Contato', 'Reunião Agendada', 'Negócio Fechado'];

                  // Migrar leads das colunas antigas para as novas/primeira
                  const nextLeads = leads.map(l => {
                    if (l.pipelineId !== pipeId) return l;
                    const oldIndex = currentCols.indexOf(l.status);
                    if (oldIndex !== -1) {
                      const targetName = filteredTemp[oldIndex];
                      if (targetName) {
                        return { ...l, status: targetName };
                      }
                    }
                    return { ...l, status: filteredTemp[0] };
                  });

                  try {
                    // 1. Delete old columns
                    await supabase
                      .from('crm_pipeline_columns')
                      .delete()
                      .eq('pipeline_id', pipeId);

                    // 2. Insert new columns
                    const colInserts = filteredTemp.map((name, i) => ({
                      pipeline_id: pipeId,
                      name,
                      position: i
                    }));
                    await supabase
                      .from('crm_pipeline_columns')
                      .insert(colInserts);

                    // 3. Update leads status in Supabase
                    for (const lead of nextLeads) {
                      if (lead.pipelineId === pipeId) {
                        await supabase
                          .from('crm_leads')
                          .update({ status: lead.status })
                          .eq('id', lead.id);
                      }
                    }

                    setLeads(nextLeads);
                    setPipelineColumnsMap(prev => ({
                      ...prev,
                      [pipeId]: filteredTemp
                    }));
                    setIsColumnModalOpen(false);
                  } catch (err) {
                    console.error('Erro ao salvar alteração de colunas no Supabase:', err.message);
                  }
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* MODAL DE REORDENAR PIPELINES */}
      {isReorderingModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 450, padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f1f5f9' }}>Reordenar pipelines</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setIsReorderingModalOpen(false)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    try {
                      for (let i = 0; i < tempPipelines.length; i++) {
                        await supabase
                          .from('crm_pipelines')
                          .update({ order_index: i })
                          .eq('id', tempPipelines[i].id);
                      }
                      setPipelinesList(tempPipelines);
                      setIsReorderingModalOpen(false);
                    } catch (err) {
                      console.error('Erro ao reordenar pipelines no Supabase:', err.message);
                    }
                  }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Salvar
                </button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
              Arraste pipelines e reordene para todos os usuários da sua área de trabalho. Observação: o 1º pipeline será atribuído como principal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {tempPipelines.map((pipe, index) => (
                <div
                  key={pipe.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedPipeIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDragEnter={() => {
                    if (draggedPipeIndex !== null && draggedPipeIndex !== index) {
                      const updated = [...tempPipelines];
                      const draggedPipe = updated[draggedPipeIndex];
                      updated.splice(draggedPipeIndex, 1);
                      updated.splice(index, 0, draggedPipe);
                      setDraggedPipeIndex(index);
                      setTempPipelines(updated);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedPipeIndex(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: draggedPipeIndex === index ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    cursor: 'grab',
                    opacity: draggedPipeIndex === index ? 0.4 : 1,
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ color: '#475569', fontSize: '0.9rem', cursor: 'grab', userSelect: 'none' }}>&#8942;&#8942;</span>
                  <span style={{ fontSize: '0.84rem', color: '#f1f5f9', fontWeight: 600 }}>{pipe.name}</span>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...tempPipelines];
                        const tmp = next[index];
                        next[index] = next[index - 1];
                        next[index - 1] = tmp;
                        setTempPipelines(next);
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      disabled={index === tempPipelines.length - 1}
                      onClick={() => {
                        const next = [...tempPipelines];
                        const tmp = next[index];
                        next[index] = next[index + 1];
                        next[index + 1] = tmp;
                        setTempPipelines(next);
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: index === tempPipelines.length - 1 ? 'not-allowed' : 'pointer', opacity: index === tempPipelines.length - 1 ? 0.3 : 1 }}
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           MODAL DE ADICIONAR SUB-FUNIL
      ═══════════════════════════════════════════════════════════════════ */}
      {isAddSubFunnelModalOpen && createPortal(
        <div
          onClick={() => { setIsAddSubFunnelModalOpen(false); setNewSubFunnelName(''); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 520,
              background: 'linear-gradient(135deg, #0f172a 0%, #0b1120 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 16,
              boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header do modal */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(59,130,246,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Layers size={17} style={{ color: '#3b82f6' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                    + Novo Sub-Funil
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Adicionado abaixo de: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{selectedPipeline?.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddSubFunnelModalOpen(false); setNewSubFunnelName(''); }}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, transition: '0.15s' }}
                onMouseOver={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do modal */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Campo: Nome do Sub-Funil */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Nome do Sub-Funil
                </label>
                <input
                  autoFocus
                  value={newSubFunnelName}
                  onChange={e => setNewSubFunnelName(e.target.value)}
                  placeholder="Ex: Pós-Vendas, Recompra, Disparo..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newSubFunnelName.trim()) handleAddSubFunnel(newSubFunnelName);
                    if (e.key === 'Escape') { setIsAddSubFunnelModalOpen(false); setNewSubFunnelName(''); }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: '#f1f5f9',
                    fontSize: '0.95rem',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(59,130,246,0.25)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Sugestões rápidas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Sugestões Rápidas
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { label: 'Pós-Vendas', icon: '🤝' },
                    { label: 'Recompra', icon: '🔄' },
                    { label: 'Disparo', icon: '🚀' },
                    { label: 'Onboarding', icon: '✅' },
                    { label: 'Indicações', icon: '⭐' },
                    { label: 'Upsell', icon: '📈' },
                    { label: 'Reativação', icon: '💡' },
                    { label: 'Cobranças', icon: '💰' },
                  ].map(({ label, icon }) => (
                    <button
                      key={label}
                      onClick={() => setNewSubFunnelName(label)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        borderRadius: 20,
                        border: newSubFunnelName === label
                          ? '1px solid rgba(59,130,246,0.6)'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: newSubFunnelName === label
                          ? 'rgba(59,130,246,0.15)'
                          : 'rgba(255,255,255,0.03)',
                        color: newSubFunnelName === label ? '#60a5fa' : '#94a3b8',
                        fontSize: '0.76rem',
                        fontWeight: newSubFunnelName === label ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={e => {
                        if (newSubFunnelName !== label) {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                          e.currentTarget.style.color = '#e2e8f0';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }
                      }}
                      onMouseOut={e => {
                        if (newSubFunnelName !== label) {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }
                      }}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info sobre colunas padrão */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                background: 'rgba(56,189,248,0.04)',
                border: '1px solid rgba(56,189,248,0.1)',
                borderRadius: 8,
              }}>
                <Info size={14} style={{ color: '#38bdf8', flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5 }}>
                  O sub-funil será criado com as colunas padrão:{' '}
                  <span style={{ color: '#94a3b8' }}>Nova Consulta · Qualificado · Chamada Agendada · Preparando Proposta · Proposta Enviada</span>.
                  Você poderá personalizá-las depois clicando em{' '}
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Colunas</span> no cabeçalho.
                </p>
              </div>
            </div>

            {/* Footer com botões */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: 'rgba(0,0,0,0.15)',
            }}>
              <button
                onClick={() => { setIsAddSubFunnelModalOpen(false); setNewSubFunnelName(''); }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAddSubFunnel(newSubFunnelName)}
                disabled={!newSubFunnelName.trim() || loading}
                style={{
                  padding: '9px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: newSubFunnelName.trim()
                    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                    : 'rgba(59,130,246,0.2)',
                  color: newSubFunnelName.trim() ? 'white' : '#64748b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: newSubFunnelName.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: newSubFunnelName.trim() ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                }}
                onMouseOver={e => {
                  if (newSubFunnelName.trim() && !loading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #2563eb)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = newSubFunnelName.trim()
                    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                    : 'rgba(59,130,246,0.2)';
                  e.currentTarget.style.boxShadow = newSubFunnelName.trim() ? '0 4px 14px rgba(37,99,235,0.35)' : 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading ? (
                  <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Criando...</>
                ) : (
                  <><Plus size={14} /> Criar Sub-Funil</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* MODAL DE NOVO LEAD */}
      {isNewLeadModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 1100, height: '85vh', borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', overflow: 'hidden', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
            {/* PAINEL ESQUERDO: Form Fields */}
            <div style={{ width: '40%', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>

              {/* Header do form */}
              <div style={{ padding: '16px 20px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span onClick={() => setIsNewLeadModalOpen(false)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>&lt;</span>
                    <input
                      value={newLeadForm.title}
                      onChange={e => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                      style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none', width: '180px' }}
                    />
                  </div>
                  <span
                    onClick={() => setIsNewLeadModalOpen(false)}
                    style={{ cursor: 'pointer', color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 'normal', transition: 'color 0.2s', padding: '4px' }}
                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.color = '#f1f5f9'}
                  >
                    X
                  </span>
                </div>

                {/* Botão de adicionar tag ou Input de Tags */}
                {!isEditingTags && newLeadForm.tags.length === 0 ? (
                  <button
                    onClick={() => setIsEditingTags(true)}
                    style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: '#94a3b8', fontSize: '0.66rem', fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    # ADICIONAR TAGS
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', alignSelf: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, borderBottom: '1px solid #38bdf8', paddingBottom: 6 }}>
                      {newLeadForm.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 4,
                            padding: '2px 8px',
                            color: '#e2e8f0',
                            fontSize: '0.74rem'
                          }}
                        >
                          <span>{tag}</span>
                          <span
                            onClick={() => {
                              const nextTags = newLeadForm.tags.filter(t => t !== tag);
                              setNewLeadForm({ ...newLeadForm, tags: nextTags });
                              if (nextTags.length === 0 && tagInput.trim() === '') {
                                setIsEditingTags(false);
                              }
                            }}
                            style={{ cursor: 'pointer', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block', padding: '0 2px' }}
                          >
                            x
                          </span>
                        </span>
                      ))}

                      <input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onBlur={() => {
                          if (tagInput.trim() === '' && newLeadForm.tags.length === 0) {
                            setIsEditingTags(false);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const cleanTag = tagInput.trim();
                            if (cleanTag && !newLeadForm.tags.includes(cleanTag)) {
                              setNewLeadForm({ ...newLeadForm, tags: [...newLeadForm.tags, cleanTag] });
                              setTagInput('');
                            }
                          } else if (e.key === 'Backspace' && tagInput === '' && newLeadForm.tags.length > 0) {
                            const nextTags = [...newLeadForm.tags];
                            nextTags.pop();
                            setNewLeadForm({ ...newLeadForm, tags: nextTags });
                            if (nextTags.length === 0) {
                              setIsEditingTags(false);
                            }
                          }
                        }}
                        placeholder={newLeadForm.tags.length === 0 ? "Escreva a tag..." : ""}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#f1f5f9',
                          fontSize: '0.8rem',
                          flex: 1,
                          minWidth: '80px',
                          padding: 0
                        }}
                        autoFocus
                      />
                    </div>

                    {/* Sugestão de criar tag */}
                    {tagInput.trim() !== '' && (
                      <div
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          const cleanTag = tagInput.trim();
                          if (cleanTag && !newLeadForm.tags.includes(cleanTag)) {
                            setNewLeadForm({ ...newLeadForm, tags: [...newLeadForm.tags, cleanTag] });
                            setTagInput('');
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          background: '#f1f5f9',
                          color: '#0f172a',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                          zIndex: 9999999,
                          marginTop: 4,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 500
                        }}
                      >
                        <span style={{ fontSize: '1rem', color: '#64748b' }}>↵</span>
                        <span>criar tag</span>
                        <span style={{ background: 'rgba(15,23,42,0.06)', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 4, padding: '2px 6px', fontSize: '0.74rem', color: '#1e293b' }}>
                          {tagInput.trim()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Seletor de Pipeline */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  {(() => {
                    const subFunnels = pipelinesList.filter(p => p.parent_id === selectedPipeline?.id);
                    const hasSubFunnels = subFunnels.length > 0;
                    return (
                      <>
                        {hasSubFunnels && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#64748b', position: 'relative' }}>
                            <span>Sub-funil</span>
                            <button
                              type="button"
                              onClick={(e) => handleDropdownClick('subFunilSelect', e)}
                              style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.78rem', outline: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <span>{pipelinesList.find(p => p.id === newLeadForm.subFunnelId)?.name || 'Selecione'}</span>
                              <ChevronDown size={12} style={{ color: '#818cf8' }} />
                            </button>
                            {activeNewLeadDropdown === 'subFunilSelect' && createPortal(
                              <div className="custom-blue-scrollbar" style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, maxHeight: '200px', overflowY: 'auto' }}>
                                {subFunnels.map(sf => (
                                  <button
                                    key={sf.id}
                                    type="button"
                                    onClick={() => {
                                      const sfCols = pipelineColumnsMap[sf.id] || ['Nova Consulta'];
                                      setNewLeadForm({
                                        ...newLeadForm,
                                        subFunnelId: sf.id,
                                        funilEtapa: sfCols[0]
                                      });
                                      setActiveNewLeadDropdown(null);
                                    }}
                                    style={{ background: newLeadForm.subFunnelId === sf.id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseOut={e => e.currentTarget.style.background = newLeadForm.subFunnelId === sf.id ? 'rgba(255,255,255,0.06)' : 'transparent'}
                                  >
                                    {sf.name}
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#64748b', position: 'relative' }}>
                          <span>Funil etapa</span>
                          <button
                            type="button"
                            onClick={(e) => handleDropdownClick('funilVendas', e)}
                            style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', outline: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>{newLeadForm.funilEtapa}</span>
                            <ChevronDown size={12} style={{ color: '#38bdf8' }} />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>

              </div>

              {/* Abas */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', gap: 16 }}>
                {['Principal', 'Configurações'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveNewLeadTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: activeNewLeadTab === tab ? '2px solid #a855f7' : '2px solid transparent',
                      color: activeNewLeadTab === tab ? '#a855f7' : '#64748b',
                      padding: '8px 4px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Lista Scrollable de Campos */}
              <div
                onScroll={() => setActiveNewLeadDropdown(null)}
                style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
              >

                {/* Campo: Usuário Responsável */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Usuário responsável</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <span style={{ color: '#f1f5f9', fontWeight: 500, width: '150px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Vinícius Del Cielo</span>
                </div>

                {/* Campo: Venda */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Venda</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px' }}>
                    <span style={{ color: '#94a3b8', display: 'inline-block', whiteSpace: 'nowrap', flexShrink: 0 }}>R$</span>
                    <input
                      type="number"
                      value={newLeadForm.venda}
                      onChange={e => setNewLeadForm({ ...newLeadForm, venda: e.target.value })}
                      style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', width: '100%', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Campo: Tipo de cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Tipo de cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button
                      onClick={(e) => handleDropdownClick('tipoCliente', e)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{newLeadForm.tipoCliente}</span>
                      <ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'tipoCliente' && createPortal(
                      <div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {['Selecione', 'Individual', 'Pessoa jurídica'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setNewLeadForm({ ...newLeadForm, tipoCliente: opt }); setActiveNewLeadDropdown(null); }}
                            style={{ background: newLeadForm.tipoCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = newLeadForm.tipoCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Campo: Setor do cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Setor do cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button
                      onClick={(e) => handleDropdownClick('setorCliente', e)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{newLeadForm.setorCliente}</span>
                      <ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'setorCliente' && createPortal(
                      <div className="custom-blue-scrollbar" style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, maxHeight: '200px', overflowY: 'auto' }}>
                        {[
                          'Selecione',
                          'Varejo e e-commerce',
                          'Saúde e bem-estar',
                          'Turismo',
                          'Criador de conteúdo',
                          'Mercado Imobiliário',
                          'Serviços digitais e de TI',
                          'Educação',
                          'Serviços jurídicos e consultoria',
                          'Finanças e seguros',
                          'Serviços de alimentação',
                          'Transporte',
                          'Manufatura/Indústria',
                          'Automotivo',
                          'Telecomunicações',
                          'Governamental',
                          'Organizações sem fins lucrativos',
                          'Serviços ao consumidor'
                        ].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setNewLeadForm({ ...newLeadForm, setorCliente: opt }); setActiveNewLeadDropdown(null); }}
                            style={{ background: newLeadForm.setorCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = newLeadForm.setorCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Campo: Orçamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Orçamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <input
                    value={newLeadForm.orcamento}
                    onChange={e => setNewLeadForm({ ...newLeadForm, orcamento: e.target.value })}
                    placeholder="..."
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }}
                  />
                </div>

                {/* Campo: Método de pagamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Método de pagamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button
                      onClick={(e) => handleDropdownClick('metodoPagamento', e)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{newLeadForm.metodoPagamento}</span>
                      <ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'metodoPagamento' && createPortal(
                      <div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {['Selecione', 'Cartão de Crédito', 'Boleto Bancário', 'Pix', 'Transferência'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setNewLeadForm({ ...newLeadForm, metodoPagamento: opt }); setActiveNewLeadDropdown(null); }}
                            style={{ background: newLeadForm.metodoPagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = newLeadForm.metodoPagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Campo: Objetivo do cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Objetivo do cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <input
                    value={newLeadForm.objetivoCliente}
                    onChange={e => setNewLeadForm({ ...newLeadForm, objetivoCliente: e.target.value })}
                    placeholder="..."
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }}
                  />
                </div>

                {/* Campo: Motivo de perda */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Motivo de perda</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button
                      onClick={(e) => handleDropdownClick('motivoPerda', e)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{newLeadForm.motivoPerda}</span>
                      <ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'motivoPerda' && createPortal(
                      <div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {[
                          'Selecione',
                          'Questões de preço',
                          'Questões de qualidade',
                          'Mudança de ideia',
                          'Sem resposta',
                          'Spam'
                        ].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setNewLeadForm({ ...newLeadForm, motivoPerda: opt }); setActiveNewLeadDropdown(null); }}
                            style={{ background: newLeadForm.motivoPerda === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = newLeadForm.motivoPerda === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Campo: Número de contrato */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Número de contrato</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <input
                    value={newLeadForm.numeroContrato}
                    onChange={e => setNewLeadForm({ ...newLeadForm, numeroContrato: e.target.value })}
                    placeholder="..."
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }}
                  />
                </div>

                {/* Campo: Data de contrato */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Data de contrato</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <input
                    type="date"
                    value={newLeadForm.dataContrato}
                    onChange={e => setNewLeadForm({ ...newLeadForm, dataContrato: e.target.value })}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '150px' }}
                  />
                </div>

                {/* Campo: Pagamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Pagamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button
                      onClick={(e) => handleDropdownClick('pagamento', e)}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span>{newLeadForm.pagamento}</span>
                      <ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'pagamento' && createPortal(
                      <div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                        {['Selecione', 'À vista', 'Parcelado'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => { setNewLeadForm({ ...newLeadForm, pagamento: opt }); setActiveNewLeadDropdown(null); }}
                            style={{ background: newLeadForm.pagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = newLeadForm.pagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Campo: Arquivo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Arquivo</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                  <label style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer', justifySelf: 'start' }}>
                    Fazer upload
                    <input type="file" style={{ display: 'none' }} />
                  </label>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

                {/* BLOCO EXPANSÍVEL: + Adicionar Contato */}
                {!showNewLeadContact ? (
                  <button
                    onClick={() => setShowNewLeadContact(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>+</span> Adicionar contato
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Contato</strong>
                      <span onClick={() => setShowNewLeadContact(false)} style={{ fontSize: '0.74rem', color: '#ef4444', cursor: 'pointer' }}>cancelar</span>
                    </div>
                    {/* Empresa */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Empresa</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.empresaContato}
                        onChange={e => setNewLeadForm({ ...newLeadForm, empresaContato: e.target.value })}
                        placeholder="Nome da empresa"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Tel Comercial */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Tel. comercial</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.telComercialContato}
                        onChange={e => setNewLeadForm({ ...newLeadForm, telComercialContato: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Email Comercial */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>E-mail comercial</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.emailComercialContato}
                        onChange={e => setNewLeadForm({ ...newLeadForm, emailComercialContato: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Posição */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Posição</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.posicaoContato}
                        onChange={e => setNewLeadForm({ ...newLeadForm, posicaoContato: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                  </div>
                )}

                {/* BLOCO EXPANSÍVEL: + Adicionar Empresa */}
                {!showNewLeadCompany ? (
                  <button
                    onClick={() => setShowNewLeadCompany(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>+</span> Adicionar empresa
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Empresa</strong>
                      <span onClick={() => setShowNewLeadCompany(false)} style={{ fontSize: '0.74rem', color: '#ef4444', cursor: 'pointer' }}>cancelar</span>
                    </div>
                    {/* Tel Comercial */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Tel. comercial</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.telComercialEmpresa}
                        onChange={e => setNewLeadForm({ ...newLeadForm, telComercialEmpresa: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Email Comercial */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>E-mail comercial</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.emailComercialEmpresa}
                        onChange={e => setNewLeadForm({ ...newLeadForm, emailComercialEmpresa: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Site */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Site</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.siteEmpresa}
                        onChange={e => setNewLeadForm({ ...newLeadForm, siteEmpresa: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                    {/* Endereço */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                      <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Endereço</span>
                      <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }}></div>
                      <input
                        value={newLeadForm.enderecoEmpresa}
                        onChange={e => setNewLeadForm({ ...newLeadForm, enderecoEmpresa: e.target.value })}
                        placeholder="..."
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PAINEL DIREITO: Timeline e Notes Area */}
            <div style={{ width: '60%', display: 'flex', flexDirection: 'column', height: '100%', background: '#0b1120' }}>

              {/* Timeline feed central (vazio por enquanto) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: '#475569', fontSize: '2.5rem' }}>💬</div>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.84rem' }}>Nenhuma atividade registrada ainda para este lead.</p>
              </div>

              {/* Bloco inferior de composição de Nota */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <textarea
                    placeholder="Nota: digite aqui"
                    value={newLeadForm.noteText}
                    onChange={e => setNewLeadForm({ ...newLeadForm, noteText: e.target.value })}
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                      padding: 12,
                      color: '#f1f5f9',
                      fontSize: '0.84rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                  {/* Icones de teclado/clipe à direita */}
                  <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 10, color: '#64748b', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.1rem' }}>⌨️</span>
                    <span style={{ fontSize: '1.1rem' }}>📎</span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
                  <button
                    onClick={async () => {
                      const pipelineId = newLeadForm.subFunnelId || selectedPipeline?.id || 'funil';
                      const cols = pipelineColumnsMap[pipelineId] || ['Novo', 'Em Contato', 'Reunião Agendada', 'Negócio Fechado'];
                      const defaultStatus = cols[0] || 'Novo';
                      const newId = Date.now().toString();

                      const newL = {
                        id: newId,
                        pipeline_id: pipelineId,
                        name: newLeadForm.title || 'Novo Lead',
                        company: newLeadForm.empresaContato || 'Sem Empresa',
                        source: newLeadForm.tipoCliente !== 'Selecione' ? newLeadForm.tipoCliente : 'Adicionado Manual',
                        status: newLeadForm.funilEtapa || defaultStatus,
                        venda: Number(newLeadForm.venda) || 0,
                        tags: [...newLeadForm.tags],
                        details: {
                          tipoCliente: newLeadForm.tipoCliente,
                          setorCliente: newLeadForm.setorCliente,
                          orcamento: newLeadForm.orcamento,
                          metodoPagamento: newLeadForm.metodoPagamento,
                          objetivoCliente: newLeadForm.objetivoCliente,
                          motivoPerda: newLeadForm.motivoPerda,
                          numeroContrato: newLeadForm.numeroContrato,
                          dataContrato: newLeadForm.dataContrato,
                          pagamento: newLeadForm.pagamento,
                          noteText: newLeadForm.noteText,
                          empresaContato: newLeadForm.empresaContato,
                          telComercialContato: newLeadForm.telComercialContato,
                          emailComercialContato: newLeadForm.emailComercialContato,
                          posicaoContato: newLeadForm.posicaoContato,
                          telComercialEmpresa: newLeadForm.telComercialEmpresa,
                          emailComercialEmpresa: newLeadForm.emailComercialEmpresa,
                          siteEmpresa: newLeadForm.siteEmpresa,
                          enderecoEmpresa: newLeadForm.enderecoEmpresa
                        }
                      };

                      const { data, error } = await supabase
                        .from('crm_leads')
                        .insert(newL)
                        .select()
                        .single();

                      if (!error && data) {
                        setLeads([{
                          ...data,
                          pipelineId: data.pipeline_id,
                          id: data.id,
                          ...(data.details || {})
                        }, ...leads]);
                      } else {
                        console.error('Erro ao adicionar lead no modal:', error?.message);
                      }

                      // Reset form
                      setNewLeadForm({
                        title: 'Lead #Novo',
                        venda: '0',
                        tipoCliente: 'Selecione',
                        setorCliente: 'Selecione',
                        orcamento: '',
                        metodoPagamento: 'Selecione',
                        objetivoCliente: '',
                        motivoPerda: 'Selecione',
                        numeroContrato: '',
                        dataContrato: '',
                        pagamento: 'Selecione',
                        noteText: '',
                        funilEtapa: 'Nova Consulta',
                        subFunnelId: '',
                        tags: [],
                        empresaContato: '',
                        telComercialContato: '',
                        emailComercialContato: '',
                        posicaoContato: '',
                        telComercialEmpresa: '',
                        emailComercialEmpresa: '',
                        siteEmpresa: '',
                        enderecoEmpresa: ''
                      });
                      setIsEditingTags(false);
                      setTagInput('');
                      setIsNewLeadModalOpen(false);
                    }}
                    style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#3b82f6', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => {
                      setIsNewLeadModalOpen(false);
                    }}
                    style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* MODAL DE ADICIONAR SUB-FUNIL */}
      {isAddSubFunnelModalOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 400, padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setIsAddSubFunnelModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              <X size={18} />
            </button>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              📁 Novo Sub-funil
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
              Crie uma nova seção de etapas empilhada dentro deste pipeline.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>NOME DO SUB-FUNIL</label>
              <input
                autoFocus
                placeholder="Ex: Funil de Pós-Vendas, Recompra..."
                value={newSubFunnelName}
                onChange={e => setNewSubFunnelName(e.target.value)}
                style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: '0.82rem', outline: 'none' }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSubFunnel(newSubFunnelName);
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => setIsAddSubFunnelModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAddSubFunnel(newSubFunnelName)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {/* MODAL DE DETALHES DO LEAD */}
      {selectedLead && editLeadForm && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 1100, height: '85vh', borderRadius: 14, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', overflow: 'hidden', color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
            {/* PAINEL ESQUERDO: Form Fields */}
            <div style={{ width: '40%', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>

              {/* Header do form */}
              <div style={{ padding: '16px 20px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span onClick={() => setSelectedLead(null)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}>&lt;</span>
                    <input
                      value={editLeadForm.name}
                      onChange={e => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
                      style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 'bold', outline: 'none', width: '220px' }}
                    />
                  </div>
                  <span
                    onClick={() => setSelectedLead(null)}
                    style={{ cursor: 'pointer', color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 'normal', transition: 'color 0.2s', padding: '4px' }}
                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.color = '#f1f5f9'}
                  >
                    X
                  </span>
                </div>

                {/* Botão de adicionar tag ou Input de Tags */}
                {!isEditingLeadTags && editLeadForm.tags.length === 0 ? (
                  <button
                    onClick={() => setIsEditingLeadTags(true)}
                    style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: '#94a3b8', fontSize: '0.66rem', fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                  >
                    # ADICIONAR TAGS
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', alignSelf: 'stretch' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, borderBottom: '1px solid #38bdf8', paddingBottom: 6 }}>
                      {editLeadForm.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 4,
                            padding: '2px 8px',
                            color: '#e2e8f0',
                            fontSize: '0.74rem'
                          }}
                        >
                          <span>{tag}</span>
                          <span
                            onClick={() => {
                              const nextTags = editLeadForm.tags.filter(t => t !== tag);
                              setEditLeadForm({ ...editLeadForm, tags: nextTags });
                            }}
                            style={{ color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', marginLeft: 4, fontSize: '0.7rem' }}
                          >
                            X
                          </span>
                        </span>
                      ))}

                      <button
                        onClick={() => setIsEditingLeadTags(!isEditingLeadTags)}
                        style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: '0.66rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {isEditingLeadTags ? 'FECHAR' : '+ TAG'}
                      </button>
                    </div>

                    {isEditingLeadTags && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input
                          placeholder="Nova tag..."
                          value={leadTagInput}
                          onChange={e => setLeadTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const cleanTag = leadTagInput.trim();
                              if (cleanTag && !editLeadForm.tags.includes(cleanTag)) {
                                setEditLeadForm({ ...editLeadForm, tags: [...editLeadForm.tags, cleanTag] });
                                setLeadTagInput('');
                              }
                            }
                          }}
                          style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 8px', color: 'white', fontSize: '0.78rem', outline: 'none', flex: 1 }}
                        />
                        <button
                          onClick={() => {
                            const cleanTag = leadTagInput.trim();
                            if (cleanTag && !editLeadForm.tags.includes(cleanTag)) {
                              setEditLeadForm({ ...editLeadForm, tags: [...editLeadForm.tags, cleanTag] });
                              setLeadTagInput('');
                            }
                          }}
                          style={{ background: '#38bdf8', border: 'none', color: '#0f172a', padding: '4px 10px', borderRadius: 4, fontSize: '0.74rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          ADD
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-funil + Funil etapa inline */}
              <div style={{ padding: '0 20px 10px', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {(() => {
                  const subFunnels = pipelinesList.filter(p => p.parent_id === selectedPipeline?.id);
                  const etapas = pipelineColumnsMap[editLeadForm.pipeline_id] || ['Nova Consulta'];
                  return (
                    <>
                      {subFunnels.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#64748b', position: 'relative' }}>
                          <span>Sub-funil</span>
                          <button type="button" onClick={e => handleDropdownClick('editSubFunil', e)} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.78rem', outline: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{pipelinesList.find(p => p.id === editLeadForm.pipeline_id)?.name || 'Selecione'}</span>
                            <ChevronDown size={12} style={{ color: '#818cf8' }} />
                          </button>
                          {activeNewLeadDropdown === 'editSubFunil' && createPortal(
                            <div className="custom-blue-scrollbar" style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '200px', overflowY: 'auto' }}>
                              {subFunnels.map(sf => (<button key={sf.id} type="button" onClick={() => { const cols = pipelineColumnsMap[sf.id] || ['Nova Consulta']; setEditLeadForm({ ...editLeadForm, pipeline_id: sf.id, status: cols[0] }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.pipeline_id === sf.id ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.pipeline_id === sf.id ? 'rgba(255,255,255,0.06)' : 'transparent'}>{sf.name}</button>))}
                            </div>, document.body
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#64748b', position: 'relative' }}>
                        <span>Funil etapa</span>
                        <button type="button" onClick={e => handleDropdownClick('editFunilEtapa', e)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.78rem', outline: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>{editLeadForm.status || etapas[0]}</span>
                          <ChevronDown size={12} style={{ color: '#38bdf8' }} />
                        </button>
                        {activeNewLeadDropdown === 'editFunilEtapa' && createPortal(
                          <div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {etapas.map(opt => (<button key={opt} type="button" onClick={() => { setEditLeadForm({ ...editLeadForm, status: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.status === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.status === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}
                          </div>, document.body
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Abas Principal / Configurações */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 20px', gap: 16 }}>
                {['Principal', 'Configurações'].map(tab => (
                  <button key={tab} onClick={() => setActiveLeadTab(tab)} style={{ background: 'none', border: 'none', borderBottom: activeLeadTab === tab ? '2px solid #a855f7' : '2px solid transparent', color: activeLeadTab === tab ? '#a855f7' : '#64748b', padding: '8px 4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>{tab}</button>
                ))}
              </div>

              {/* Campos scrolláveis */}
              <div onScroll={() => setActiveNewLeadDropdown(null)} className="custom-blue-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Usuário responsável */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Usuário responsável</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <input value={editLeadForm.responsible || ''} onChange={e => setEditLeadForm({ ...editLeadForm, responsible: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }} />
                </div>

                {/* Venda */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Venda</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '150px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px' }}>
                    <span style={{ color: '#94a3b8', flexShrink: 0 }}>R$</span>
                    <input type="number" value={editLeadForm.venda} onChange={e => setEditLeadForm({ ...editLeadForm, venda: e.target.value })} style={{ background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem', width: '100%', outline: 'none' }} />
                  </div>
                </div>

                {/* Tipo de cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Tipo de cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button onClick={e => handleDropdownClick('editTipoCliente', e)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span>{editLeadForm.tipoCliente || 'Selecione'}</span><ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'editTipoCliente' && createPortal(<div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2 }}>{['Selecione','Individual','Pessoa jurídica'].map(opt => (<button key={opt} onClick={() => { setEditLeadForm({ ...editLeadForm, tipoCliente: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.tipoCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.tipoCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}</div>, document.body)}
                  </div>
                </div>

                {/* Setor do cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Setor do cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button onClick={e => handleDropdownClick('editSetorCliente', e)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span>{editLeadForm.setorCliente || 'Selecione'}</span><ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'editSetorCliente' && createPortal(<div className="custom-blue-scrollbar" style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '200px', overflowY: 'auto' }}>{['Selecione','Varejo e e-commerce','Saúde e bem-estar','Turismo','Criador de conteúdo','Mercado Imobiliário','Serviços digitais e de TI','Educação','Serviços jurídicos e consultoria','Finanças e seguros','Serviços de alimentação','Transporte','Manufatura/Indústria','Automotivo','Telecomunicações','Governamental','Organizações sem fins lucrativos','Serviços ao consumidor'].map(opt => (<button key={opt} onClick={() => { setEditLeadForm({ ...editLeadForm, setorCliente: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.setorCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.setorCliente === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}</div>, document.body)}
                  </div>
                </div>

                {/* Orçamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Orçamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <input value={editLeadForm.orcamento || ''} onChange={e => setEditLeadForm({ ...editLeadForm, orcamento: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }} />
                </div>

                {/* Método de pagamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Método de pagamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button onClick={e => handleDropdownClick('editMetodoPag', e)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span>{editLeadForm.metodoPagamento || 'Selecione'}</span><ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'editMetodoPag' && createPortal(<div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2 }}>{['Selecione','Cartão de Crédito','Boleto Bancário','Pix','Transferência'].map(opt => (<button key={opt} onClick={() => { setEditLeadForm({ ...editLeadForm, metodoPagamento: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.metodoPagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.metodoPagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}</div>, document.body)}
                  </div>
                </div>

                {/* Objetivo do cliente */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Objetivo do cliente</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <input value={editLeadForm.objetivoCliente || ''} onChange={e => setEditLeadForm({ ...editLeadForm, objetivoCliente: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }} />
                </div>

                {/* Motivo de perda */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Motivo de perda</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button onClick={e => handleDropdownClick('editMotivoPerda', e)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span>{editLeadForm.motivoPerda || 'Selecione'}</span><ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'editMotivoPerda' && createPortal(<div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 2 }}>{['Selecione','Questões de preço','Questões de qualidade','Mudança de ideia','Sem resposta','Spam'].map(opt => (<button key={opt} onClick={() => { setEditLeadForm({ ...editLeadForm, motivoPerda: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.motivoPerda === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.motivoPerda === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}</div>, document.body)}
                  </div>
                </div>

                {/* Número de contrato */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Número de contrato</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <input value={editLeadForm.numeroContrato || ''} onChange={e => setEditLeadForm({ ...editLeadForm, numeroContrato: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none', width: '150px' }} />
                </div>

                {/* Data de contrato */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Data de contrato</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <input type="date" value={editLeadForm.dataContrato || ''} onChange={e => setEditLeadForm({ ...editLeadForm, dataContrato: e.target.value })} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '150px' }} />
                </div>

                {/* Pagamento */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Pagamento</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <div style={{ position: 'relative', width: '150px' }}>
                    <button onClick={e => handleDropdownClick('editPagamento', e)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span>{editLeadForm.pagamento || 'Selecione'}</span><ChevronDown size={12} style={{ color: '#64748b' }} />
                    </button>
                    {activeNewLeadDropdown === 'editPagamento' && createPortal(<div style={{ position: 'fixed', top: dropdownCoords.top + 4, left: dropdownCoords.left, width: dropdownCoords.width, background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', padding: 4, zIndex: 999999, display: 'flex', flexDirection: 'column', gap: 2 }}>{['Selecione','À vista','Parcelado'].map(opt => (<button key={opt} onClick={() => { setEditLeadForm({ ...editLeadForm, pagamento: opt }); setActiveNewLeadDropdown(null); }} style={{ background: editLeadForm.pagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: '0.76rem', textAlign: 'left', cursor: 'pointer', width: '100%' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'} onMouseOut={e => e.currentTarget.style.background = editLeadForm.pagamento === opt ? 'rgba(255,255,255,0.06)' : 'transparent'}>{opt}</button>))}</div>, document.body)}
                  </div>
                </div>

                {/* Arquivo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.8rem', gap: 0 }}>
                  <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>Arquivo</span>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                  <label style={{ color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}>Fazer upload<input type="file" style={{ display: 'none' }} /></label>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

                {/* + Adicionar contato */}
                <button onClick={() => setShowEditContact(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem' }}>+</span> Adicionar contato
                </button>
                {showEditContact && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Contato</strong>
                      <span onClick={() => setShowEditContact(false)} style={{ fontSize: '0.74rem', color: '#ef4444', cursor: 'pointer' }}>cancelar</span>
                    </div>
                    {[['Empresa', 'empresaContato'], ['Tel. comercial', 'telComercialContato'], ['E-mail comercial', 'emailComercialContato'], ['Posição', 'posicaoContato']].map(([label, field]) => (
                      <div key={field} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
                        <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                        <input value={editLeadForm[field] || ''} onChange={e => setEditLeadForm({ ...editLeadForm, [field]: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* + Adicionar empresa */}
                <button onClick={() => setShowEditCompany(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', alignSelf: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem' }}>+</span> Adicionar empresa
                </button>
                {showEditCompany && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Empresa</strong>
                      <span onClick={() => setShowEditCompany(false)} style={{ fontSize: '0.74rem', color: '#ef4444', cursor: 'pointer' }}>cancelar</span>
                    </div>
                    {[['Tel. comercial', 'telComercialEmpresa'], ['E-mail comercial', 'emailComercialEmpresa'], ['Site', 'siteEmpresa'], ['Endereço', 'enderecoEmpresa']].map(([label, field]) => (
                      <div key={field} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 150px', alignItems: 'center', fontSize: '0.78rem', gap: 0 }}>
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{label}</span>
                        <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)', margin: '0 8px' }} />
                        <input value={editLeadForm[field] || ''} onChange={e => setEditLeadForm({ ...editLeadForm, [field]: e.target.value })} placeholder="..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '4px 10px', color: '#f1f5f9', fontSize: '0.78rem', outline: 'none', width: '150px' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10 }}>
                <button type="button" onClick={handleSaveLeadDetails} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#3b82f6', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Salvar Alterações</button>
                <button type="button" onClick={() => setSelectedLead(null)} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
              </div>

            </div>

            {/* PAINEL DIREITO: Chat / Histórico do Lead — Estilo Kommo */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080e1a', height: '100%' }}>

              {/* Header do chat */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                {/* Avatar — foto WhatsApp ou silhueta */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: leadProfilePics[selectedLead?.id]
                    ? 'transparent'
                    : (leadUnreadCounts[selectedLead?.id] > 0 ? 'rgba(37,211,102,0.15)' : 'rgba(99,102,241,0.25)'),
                  border: leadUnreadCounts[selectedLead?.id] > 0
                    ? '2px solid #25d366'
                    : (leadProfilePics[selectedLead?.id] ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(99,102,241,0.4)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: leadProfilePics[selectedLead?.id] ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                  transition: 'all 0.3s'
                }}>
                  {leadProfilePics[selectedLead?.id] ? (
                    <img
                      src={leadProfilePics[selectedLead?.id]}
                      alt={selectedLead?.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="7" r="4" fill={leadUnreadCounts[selectedLead?.id] > 0 ? '#25d366' : '#818cf8'}/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill={leadUnreadCounts[selectedLead?.id] > 0 ? '#25d366' : '#818cf8'}/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9' }}>{editLeadForm?.name || selectedLead?.name}</div>
                  {/* Telefone: prioridade details.phone > telComercialContato */}
                  {(() => {
                    const phone = editLeadForm?.details?.phone || editLeadForm?.telComercialContato || selectedLead?.details?.phone || '';
                    if (phone) return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: '0.7rem', color: waServerOnline ? '#10b981' : '#64748b' }}>
                          {waServerOnline ? '●' : '○'} {phone}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: waServerOnline ? '#10b981' : '#475569', background: waServerOnline ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${waServerOnline ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 4, padding: '1px 6px' }}>
                          {waServerOnline ? '📱 WhatsApp ativo' : '⚪ WhatsApp offline'}
                        </span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(phone).catch(() => {}); }}
                          title="Copiar telefone"
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.7rem', padding: '1px 4px' }}
                        >📋</button>
                      </div>
                    );
                    return <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>Sem telefone cadastrado</div>;
                  })()}
                </div>
                {/* Status badge */}
                <div style={{ fontSize: '0.68rem', color: '#818cf8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, padding: '3px 10px' }}>
                  {editLeadForm?.status || selectedLead?.status || 'Nova Consulta'}
                </div>
              </div>

              {/* Feed de mensagens */}
              <div className="custom-blue-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Spinner de carregamento */}
                {leadChatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(56,189,248,0.2)', borderTop: '2px solid #38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                )}

                {/* Evento automático de criação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.04)' }} />
                  <span style={{ fontSize: '0.66rem', color: '#475569', whiteSpace: 'nowrap' }}>
                    {selectedLead?.created_at
                      ? new Date(selectedLead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Hoje'}
                  </span>
                  <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.04)' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem' }}>🤖</span>
                  </div>
                  <div style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0 10px 10px 10px', padding: '8px 12px', maxWidth: '75%' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4 }}>
                      <strong style={{ color: '#cbd5e1' }}>Sistema</strong>
                      {' · '}
                      {selectedLead?.created_at
                        ? new Date(selectedLead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      Lead criado via <strong>{selectedLead?.source || 'Adicionado Manual'}</strong>
                    </div>
                  </div>
                </div>

                {/* Tags se existirem */}
                {selectedLead?.tags?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 36 }}>
                    <span style={{ fontSize: '0.68rem', color: '#475569' }}>Tags adicionadas:</span>
                    {selectedLead.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.66rem', color: '#7dd3fc', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: 4, padding: '1px 6px' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Mensagens com separadores de data */}
                {leadMessages.reduce((acc, msg, idx) => {
                  const msgDate = new Date(msg.created_at);
                  const dateStr = msgDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const prevDate = idx > 0 ? new Date(leadMessages[idx - 1].created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

                  // Separador de data
                  if (dateStr !== prevDate) {
                    acc.push(
                      <div key={`sep-${dateStr}`} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                        <span style={{ fontSize: '0.63rem', color: '#334155', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const today = new Date();
                            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
                            const todayStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const yesterdayStr = yesterday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            if (dateStr === todayStr) return 'Hoje';
                            if (dateStr === yesterdayStr) return 'Ontem';
                            return dateStr;
                          })()}
                        </span>
                        <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
                      </div>
                    );
                  }

                  const isMe = msg.sender === 'me';
                  const isWa = msg.type === 'whatsapp';
                  const isWaServer = msg._source === 'wa_server';
                  const msgTime = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  acc.push(
                    <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      {/* Avatar */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMe ? (isWa ? 'rgba(16,185,129,0.25)' : 'rgba(37,99,235,0.3)') : 'rgba(15,23,42,0.8)', border: `1px solid ${isMe ? (isWa ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)') : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem' }}>
                        {isMe ? (isWa ? '📱' : '👤') : '💬'}
                      </div>
                      {/* Bolha */}
                      <div style={{ background: isMe ? (isWa ? 'rgba(16,185,129,0.12)' : 'rgba(37,99,235,0.15)') : 'rgba(30,41,59,0.8)', border: `1px solid ${isMe ? (isWa ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.2)') : 'rgba(255,255,255,0.06)'}`, borderRadius: isMe ? '10px 0 10px 10px' : '0 10px 10px 10px', padding: '8px 12px', maxWidth: '75%' }}>
                        <div style={{ fontSize: '0.66rem', color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isWa && <span style={{ color: isWaServer ? '#25d366' : '#10b981' }}>{isWaServer ? '📲' : '📱'} WhatsApp</span>}
                          {!isWa && <span style={{ color: '#818cf8' }}>📝 Nota</span>}
                          <span style={{ color: '#334155' }}>· {msgTime}</span>
                          {isMe && isWa && <span style={{ color: '#38bdf8', marginLeft: 2 }}>✓✓</span>}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      </div>
                    </div>
                  );

                  return acc;
                }, [])}

                {/* Auto-scroll anchor */}
                <div ref={leadChatEndRef} style={{ height: 1 }} />

                {/* Empty state */}
                {leadMessages.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: '#334155' }}>
                    <span style={{ fontSize: '2rem' }}>💬</span>
                    <span style={{ fontSize: '0.78rem' }}>Nenhuma atividade registrada ainda para este lead.</span>
                    <span style={{ fontSize: '0.7rem', color: '#1e293b' }}>Adicione uma nota ou envie uma mensagem abaixo.</span>
                    {(() => {
                      const phone = (editLeadForm?.details?.phone || editLeadForm?.telComercialContato || '');
                      return phone
                        ? <span style={{ fontSize: '0.68rem', color: '#10b981', marginTop: 4 }}>📱 WhatsApp conectado: {phone}</span>
                        : <span style={{ fontSize: '0.68rem', color: '#475569', marginTop: 4 }}>💡 Salve um telefone no lead para habilitar WhatsApp</span>;
                    })()}
                  </div>
                )}
              </div>

              {/* Footer: Input de mensagem */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0b1120', flexShrink: 0 }}>
                {/* Abas: Nota | WhatsApp */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 16px' }}>
                  {[
                    { key: 'note', label: '📝 Nota' },
                    { key: 'whatsapp', label: '📱 WhatsApp' }
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setLeadMsgTab(tab.key)} style={{
                      background: 'none', border: 'none',
                      borderBottom: leadMsgTab === tab.key
                        ? `2px solid ${tab.key === 'whatsapp' ? '#10b981' : '#3b82f6'}`
                        : '2px solid transparent',
                      color: leadMsgTab === tab.key
                        ? (tab.key === 'whatsapp' ? '#10b981' : '#60a5fa')
                        : '#475569',
                      fontSize: '0.74rem', fontWeight: 600, padding: '8px 12px', cursor: 'pointer'
                    }}>
                      {tab.label}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: '0.65rem', color: '#334155', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
                    Enter para enviar · Shift+Enter nova linha
                  </span>
                </div>

                {/* Aviso: aba WhatsApp sem telefone */}
                {leadMsgTab === 'whatsapp' && (() => {
                  const phone = editLeadForm?.details?.phone || editLeadForm?.telComercialContato || selectedLead?.details?.phone || '';
                  if (!phone) return (
                    <div style={{ padding: '8px 16px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem' }}>⚠️</span>
                      <span style={{ fontSize: '0.72rem', color: '#d97706' }}>
                        Salve um telefone em <strong>Detalhes do Lead → Contato</strong> para habilitar o envio por WhatsApp.
                      </span>
                    </div>
                  );
                  return null;
                })()}

                {/* Textarea + botões */}
                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={leadMessageInput}
                    onChange={e => setLeadMessageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendLeadMessage(); } }}
                    placeholder={leadMsgTab === 'note'
                      ? '📝 Escreva uma observação interna sobre este lead...'
                      : '💬 Mensagem para enviar por WhatsApp...'}
                    rows={3}
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${leadMsgTab === 'whatsapp' ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#334155' }}>
                      {leadMessageInput.length > 0 && `${leadMessageInput.length} caracteres`}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setLeadMessageInput('')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: '0.76rem', cursor: 'pointer' }}>
                        Limpar
                      </button>
                      <button
                        onClick={handleSendLeadMessage}
                        disabled={leadMsgSaving || !leadMessageInput.trim()}
                        style={{
                          padding: '6px 18px', borderRadius: 6, border: 'none',
                          background: leadMsgTab === 'whatsapp'
                            ? (leadMsgSaving || !leadMessageInput.trim() ? 'rgba(16,185,129,0.3)' : '#059669')
                            : (leadMsgSaving || !leadMessageInput.trim() ? 'rgba(59,130,246,0.3)' : '#3b82f6'),
                          color: 'white', fontSize: '0.78rem', fontWeight: 700,
                          cursor: (leadMsgSaving || !leadMessageInput.trim()) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'background 0.2s'
                        }}
                      >
                        {leadMsgSaving
                          ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Enviando...</>
                          : leadMsgTab === 'whatsapp' ? '📤 Enviar WhatsApp' : '💾 Salvar Nota'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

    </div>
  );
}
