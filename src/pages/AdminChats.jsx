import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, Folder, MessageCircle, Send, Paperclip, EyeOff, ShieldAlert, FileText, Image as ImageIcon, Video as VideoIcon, Mic, MoreVertical, Edit3, Trash2, CheckCircle, XCircle, UserX, ArrowLeft, Check, CheckCheck, Filter, Plus } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useServices } from '../hooks/useServices';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { useChatListStats } from '../hooks/useChatListStats';
import { supabase } from '../lib/supabase';

const normalizeDept = (name) => {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  if (n === 'social mídia' || n === 'mídias sociais' || n === 'social media') return 'social-media';
  if (n === 'tráfego pago' || n === 'tráfego' || n === 'trafego') return 'trafego';
  if (n === 'edição de vídeo' || n === 'edição' || n === 'edicao') return 'edicao';
  if (n === 'captação' || n === 'captacao') return 'captacao';
  if (n === 'design') return 'design';
  return n;
};

export default function AdminChats({ internalOnly = false, clientMode = false }) {
  const location = useLocation();
  const { clients, loading: clientsLoading } = useClients();
  const { services, loading: servicesLoading } = useServices();
  const { user, onlineUsers = [] } = useAuth();
  
  const chatListStats = useChatListStats(internalOnly);

  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [profiles, setProfiles] = useState([]); // bridge: auth user_id → employee_id
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const fetchedOnce = useRef(false);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [expandDepartments, setExpandDepartments] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'read', 'dept_Name'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Busca funcionários (sempre, para montar lookup de cargos em ambos os modos)
  useEffect(() => {
    if (user) {
      const fetchEmps = async () => {
        if (!fetchedOnce.current) setEmpLoading(true);
        const { data } = await supabase.from('employees').select('*').order('name');
        
        // Remove o próprio usuário logado checando ID, Email ou Nome exato (caso o ID não esteja linkado no profile)
        const emps = (data || []).filter(e => {
          if (user?.employeeId && e.id === user.employeeId) return false;
          if (user?.email && e.email && e.email.toLowerCase() === user.email.toLowerCase()) return false;
          if (user?.name && e.name && e.name.toLowerCase() === user.name.toLowerCase()) return false;
          return true;
        });

        setEmployees(emps);
        setEmpLoading(false);
        fetchedOnce.current = true;

        // Busca profiles para mapear auth user_id → employee_id
        const { data: profilesData } = await supabase.from('profiles').select('id, employee_id');
        setProfiles(profilesData || []);
        
        // Seleção automática só no modo interno
        if (internalOnly) {
          const params = new URLSearchParams(location.search);
          const urlClientId = params.get('client');
          if (urlClientId) {
            const emp = emps.find(e => e.id === urlClientId);
            if (emp) {
              setSelectedClient(emp);
              return;
            }
          }
          if (emps.length > 0 && !selectedClient && !isMobile) {
            setSelectedClient(emps[0]);
          }
        }
      };
      fetchEmps();
    }
  }, [internalOnly, isMobile, user]);

  // Auto-seleção do próprio cliente quando em clientMode
  useEffect(() => {
    if (clientMode && user?.clientUuid && clients && !clientsLoading) {
      const myClient = clients.find(c => c.id === user.clientUuid);
      if (myClient) setSelectedClient(myClient);
    }
  }, [clientMode, user?.clientUuid, clients, clientsLoading]);


  // Sincroniza funcionários na tabela de clientes como "shadow clients" para evitar erros de restrição de chave estrangeira
  useEffect(() => {
    if (internalOnly && employees.length > 0 && clients && !clientsLoading) {
      const syncShadowClients = async () => {
        const missingEmployees = employees.filter(emp => {
          return !clients.some(c => c.id === emp.id);
        });

        if (missingEmployees.length === 0) return;

        console.log(`Sincronizando ${missingEmployees.length} colaboradores ausentes na tabela de clientes...`);

        for (const emp of missingEmployees) {
          try {
            const shadowClient = {
              id: emp.id,
              name: emp.name,
              company: emp.position || 'Colaborador',
              email: emp.email,
              phone: emp.phone || '',
              status: 'Inativo',
              avatar_color: emp.avatar_color || '#6366f1',
              avatar_url: emp.avatar_url || null,
              metadata: {
                show_in_agency: false,
                is_employee_shadow: true
              }
            };
            const { error } = await supabase.from('clients').upsert(shadowClient);
            if (error) {
              console.error(`Erro ao sincronizar shadow client para ${emp.name}:`, error.message);
            } else {
              console.log(`Shadow client sincronizado para ${emp.name}`);
            }
          } catch (err) {
            console.error(`Erro na sincronização do funcionário ${emp.name}:`, err);
          }
        }
      };
      syncShadowClients();
    }
  }, [internalOnly, employees, clients, clientsLoading]);

  const {
    messages, loading: msgsLoading,
    sendMessage, updateMessage, requestDelete, approveDelete, rejectDelete, clearConversation
  } = useChat(selectedClient?.id, selectedSector?.name, internalOnly);

  const [showClearModal, setShowClearModal] = useState(false);

  const [attachment, setAttachment] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Read Receipts status (1 tick, 2 grey, 2 blue)
  const [msgReceipts, setMsgReceipts] = useState(() => {
     const saved = localStorage.getItem('local_msg_receipts');
     return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
     localStorage.setItem('local_msg_receipts', JSON.stringify(msgReceipts));
  }, [msgReceipts]);

  useEffect(() => {
    const channel = supabase.channel('chat_read_receipts');
    
    channel.on('broadcast', { event: 'receipt' }, (payload) => {
       const { type, msgId, fromEmpId } = payload.payload;
       
       if (fromEmpId === selectedClient?.id) {
          setMsgReceipts(prev => {
             if (prev[msgId] === 'read' && type === 'delivered') return prev;
             return { ...prev, [msgId]: type };
          });
       }
    });
    
    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedClient?.id]);

  useEffect(() => {
     if (internalOnly && selectedClient && user) {
        const unreadMsgs = messages.filter(m => m.sender_id !== user.id);
        if (unreadMsgs.length > 0) {
           const channel = supabase.channel('chat_read_receipts');
           unreadMsgs.forEach(m => {
              channel.send({
                 type: 'broadcast',
                 event: 'receipt',
                 payload: { type: 'read', msgId: m.id, fromEmpId: user.employeeId }
              });
           });
        }
     }
  }, [messages, selectedClient, internalOnly, user]);



  useEffect(() => {
     if (internalOnly && selectedClient && onlineUsers.includes(selectedClient.id)) {
        const mySentMsgs = messages.filter(m => m.sender_id === user?.id && !msgReceipts[m.id]);
        if (mySentMsgs.length > 0) {
           setMsgReceipts(prev => {
              const next = { ...prev };
              let changed = false;
              mySentMsgs.forEach(m => {
                 if (!next[m.id]) {
                    next[m.id] = 'delivered';
                    changed = true;
                 }
              });
              return changed ? next : prev;
           });
        }
     }
  }, [onlineUsers, messages, selectedClient, internalOnly, user?.id, msgReceipts]);

  const getMessageStatus = (msgId) => {
    if (msgReceipts[msgId]) return msgReceipts[msgId];
    if (selectedClient && onlineUsers.includes(selectedClient.id)) {
       return 'delivered';
    }
    return 'sent';
  };

  const [audioUrl, setAudioUrl] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [viewMode, setViewMode] = useState('meus_chats'); // 'meus_chats' | 'visao_gestor'
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-scroll para baixo
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [inputMsg, setInputMsg] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [hideName, setHideName] = useState(false);

  // Handle URL client parameter changes dynamically (e.g. clicking on notifications)
  useEffect(() => {
    if (clientMode) return;
    const params = new URLSearchParams(location.search);
    const urlClientId = params.get('client');
    if (!urlClientId) return;

    if (internalOnly) {
      if (employees?.length > 0) {
        const emp = employees.find(e => e.id === urlClientId);
        if (emp && (!selectedClient || selectedClient.id !== emp.id)) {
          setSelectedClient(emp);
        }
      }
    } else {
      if (clients?.length > 0) {
        const client = clients.find(c => c.id === urlClientId);
        if (client && (!selectedClient || selectedClient.id !== client.id)) {
          setSelectedClient(client);
        }
      }
    }
  }, [location.search, internalOnly, employees, clients, selectedClient, clientMode]);

  // Set default selection or URL-based selection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlClientId = params.get('client');

    if (!internalOnly && !clientMode && clients?.length > 0) {
      if (urlClientId && (!selectedClient || selectedClient.id !== urlClientId)) {
        const client = clients.find(c => c.id === urlClientId);
        if (client) setSelectedClient(client);
      } else if (!selectedClient && !isMobile) {
        setSelectedClient(clients[0]);
      }
    }

    if (services?.length > 0) {
      const urlDept = params.get('dept');
      if (urlDept) {
        const normalizedUrlDept = normalizeDept(urlDept);
        const matchingService = services.find(s => {
          const name = s.name === 'Mídias Sociais' ? 'Social Media' : s.name;
          return normalizeDept(name) === normalizedUrlDept;
        });
        if (matchingService && (!selectedSector || selectedSector.id !== matchingService.id)) {
          setSelectedSector(matchingService);
          return;
        }
      }

      if (!selectedSector) {
        setSelectedSector(internalOnly ? { id: 'chat_interno', name: 'Chat Equipe' } : services[0]);
      }
    }
  }, [clients, services, selectedClient, selectedSector, internalOnly, isMobile, location.search]);

  // Marca como lido SOMENTE se a janela está em foco
  // Evita marcar como lido quando o usuário está em outra aba do navegador
  useEffect(() => {
    if (selectedClient?.id && document.hasFocus()) {
      const storageKey = internalOnly ? `last_chat_read_p2p_${selectedClient.id}` : `last_chat_read_${selectedClient.id}`;
      localStorage.setItem(storageKey, new Date().toISOString());
      window.dispatchEvent(new Event('chat_read_update'));
    }
  }, [internalOnly, selectedClient, messages]);

  // Quando a janela volta a ser focada, marca como lido (usuário voltou de outra aba)
  useEffect(() => {
    const handleFocus = () => {
      if (selectedClient?.id) {
        const storageKey = internalOnly ? `last_chat_read_p2p_${selectedClient.id}` : `last_chat_read_${selectedClient.id}`;
        localStorage.setItem(storageKey, new Date().toISOString());
        window.dispatchEvent(new Event('chat_read_update'));
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedClient?.id, internalOnly]);

  // Notifica o TopNotifications para limpar o sino quando o usuário abre o chat de um cliente
  useEffect(() => {
    if (selectedClient?.id && !internalOnly) {
      window.dispatchEvent(new CustomEvent('admin_chat_client_opened', {
        detail: { clientId: selectedClient.id }
      }));
    }
  }, [selectedClient?.id, internalOnly]);

  // Viewport setup effect for WhatsApp look
  useEffect(() => {
    const container = document.querySelector('.page-container');
    const footer = document.querySelector('.footer-bar');
    if (container) {
      container.classList.add('chat-container-fixed');
    }
    if (footer) {
      footer.classList.add('chat-footer-hidden');
    }
    return () => {
      if (container) {
        container.classList.remove('chat-container-fixed');
      }
      if (footer) {
        footer.classList.remove('chat-footer-hidden');
      }
    };
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() && !attachment) return;

    try {
      if (editingId) {
        await updateMessage(editingId, inputMsg);
        setEditingId(null);
      } else {
        await sendMessage(inputMsg, { file: attachment, isInternal, hideName });
      }
      setInputMsg('');
      setAttachment(null);
      setAudioUrl(null);
    } catch (err) {
      alert("Erro ao enviar mensagem: " + err.message);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setAttachment(e.target.files[0]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(file);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (err) {
      alert("Erro ao acessar microfone: " + err.message);
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
      setRecorder(null);
    }
  };


  const handleEditClick = (msg) => {
    setEditingId(msg.id);
    setInputMsg(msg.content || '');
  };

  const handleCancelAction = () => {
    setEditingId(null);
    setInputMsg('');
    setAttachment(null);
  };

  // Filtragem de clientes para a sidebar baseada no modo de visualização e busca
  const filteredClients = clients?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Apenas clientes "cetados" (Ativos e com show_in_agency true)
    if (c.status !== 'Ativo' || c.metadata?.show_in_agency !== true) return false;
    
    // Se for 'visao_gestor', mostra todos. Se for 'meus_chats', idealmente filtraria pelos clientes atrelados ao usuário logado (ex: via employee_client_assignments).
    // Para simplificar: na visão "Meus Chats", se a API do backend (useClients) já restringe, ótimo. Senão, assumimos que o gestor ativando 'meus_chats' quer ver apenas a caixa de entrada dele (caso seja vendedor ou tenha carteira).
    return true; 
  }) || [];

  const sortedEmployees = React.useMemo(() => {
    if (!employees || employees.length === 0) return [];
    
    // Filtro
    const filtered = employees.filter(emp => {
      const unreadCount = chatListStats[emp.id]?.unreadCount || 0;
      if (filterType === 'unread') return unreadCount > 0;
      if (filterType === 'read') return unreadCount === 0;
      if (filterType.startsWith('dept_')) {
         let deptName = filterType.replace('dept_', '');
         if (deptName === 'Mídias Sociais') deptName = 'Social Media';
         
         const empDept = emp.department || '';
         const empPos = emp.position || '';
         
         return empDept.includes(deptName) || empPos.includes(deptName) || (deptName === 'Social Media' && (empDept.includes('Mídias Sociais') || empPos.includes('Mídias Sociais')));
      }
      return true; // 'all'
    });

    // Ordenação
    return filtered.sort((a, b) => {
      const lastA = chatListStats[a.id]?.lastMsgAt || 0;
      const lastB = chatListStats[b.id]?.lastMsgAt || 0;
      if (lastA !== lastB) {
        return lastB - lastA; // Descending (latest first)
      }
      return a.name.localeCompare(b.name);
    });
  }, [employees, chatListStats, filterType, searchTerm]);

  // ── Sorted + filtered client list (like sortedEmployees but for clients) ───
  const sortedClients = React.useMemo(() => {
    if (!clients || clients.length === 0) return [];

    const filtered = clients.filter(c => {
      // Apenas clientes da agência, ativos e que não sejam shadows de funcionários
      if (c.status !== 'Ativo' || c.metadata?.show_in_agency !== true) return false;
      if (c.metadata?.is_employee_shadow === true) return false;

      // Busca por nome ou empresa
      const q = searchTerm.trim().toLowerCase();
      if (q && !(c.name || '').toLowerCase().includes(q) && !(c.company || '').toLowerCase().includes(q)) return false;

      // Filtro por leitura
      const unreadCount = chatListStats[c.id]?.unreadCount || 0;
      if (filterType === 'unread') return unreadCount > 0;
      if (filterType === 'read')   return unreadCount === 0;

      return true;
    });

    return filtered.sort((a, b) => {
      const lastA = chatListStats[a.id]?.lastMsgAt || 0;
      const lastB = chatListStats[b.id]?.lastMsgAt || 0;
      if (lastA !== lastB) return lastB - lastA; // mais recente primeiro
      return a.name.localeCompare(b.name);
    });
  }, [clients, chatListStats, searchTerm, filterType]);

  // Lookup de cargo/função por sender_id (auth UUID)
  // Ponte: sender_id (auth UUID) → profile.employee_id → employee.position
  const senderRoleMap = React.useMemo(() => {
    const empById = {};
    employees.forEach(e => { empById[e.id] = e; });

    const map = {};
    profiles.forEach(p => {
      const emp = empById[p.employee_id];
      if (emp) {
        map[p.id] = emp.position || emp.department || '';
      }
    });

    // Inclui o usuário logado (filtrado da lista de employees)
    if (user?.id && user?.position) {
      map[user.id] = user.position;
    }
    return map;
  }, [employees, profiles, user]);

  return (
    <div className={`dept-page${internalOnly ? ' internal-mode' : ''}`}>
      <header className="dept-header">
        <h1>{clientMode ? 'Chat com a Agência' : internalOnly ? "Chat Interno da Equipe" : "Chat Integrado (WhatsApp Omnichannel)"}</h1>
        <p>{clientMode ? 'Envie e receba mensagens da nossa equipe.' : internalOnly ? "Comunicação exclusiva entre colaboradores. Clientes não têm acesso a este painel." : "Todas as conversas enviadas por aqui chegarão no WhatsApp do cliente."}</p>
      </header>

      <div className={`admin-chat-layout glass-panel ${selectedClient ? 'has-active-client' : ''}`}>

        {/* Sidebar — oculto no modo cliente (veem apenas a própria conversa) */}
        {!clientMode && (<div className="client-list">
          {!internalOnly && isAdmin && (
            <div style={{ display: 'flex', padding: '12px 16px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                onClick={() => setViewMode('meus_chats')}
                className="view-mode-btn" 
                style={{ flex: 1, background: viewMode === 'meus_chats' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'meus_chats' ? '#818cf8' : 'var(--text-muted)' }}>
                Meus Chats
              </button>
              <button 
                onClick={() => setViewMode('visao_gestor')}
                className="view-mode-btn" 
                style={{ flex: 1, background: viewMode === 'visao_gestor' ? 'rgba(16,185,129,0.2)' : 'transparent', color: viewMode === 'visao_gestor' ? '#10b981' : 'var(--text-muted)' }}>
                Visão do Gestor
              </button>
            </div>
          )}

          <div className="list-title" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 99 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {internalOnly ? <><Users size={18} /> Equipe</> : <><MessageCircle size={18} /> {viewMode === 'visao_gestor' ? 'Todos os Clientes' : 'Conversas Ativas'}</>}
              </div>

              {/* Filtro — disponível para ambos os modos */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  style={{ background: filterType !== 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: 8, color: filterType !== 'all' ? '#818cf8' : 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Filtrar Contatos"
                >
                  <Filter size={16} />
                </button>

                {showFilterMenu && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 8, minWidth: 160, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <button onClick={() => { setFilterType('all'); setShowFilterMenu(false); }} style={{ padding: '6px 12px', textAlign: 'left', background: filterType === 'all' ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 6, color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}>Todas</button>
                    <button onClick={() => { setFilterType('unread'); setShowFilterMenu(false); }} style={{ padding: '6px 12px', textAlign: 'left', background: filterType === 'unread' ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 6, color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}>Não Lidas</button>
                    <button onClick={() => { setFilterType('read'); setShowFilterMenu(false); }} style={{ padding: '6px 12px', textAlign: 'left', background: filterType === 'read' ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 6, color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}>Lidas</button>

                    {/* Departamentos apenas no modo interno */}
                    {internalOnly && (
                      <>
                        <button onClick={() => setExpandDepartments(!expandDepartments)} style={{ padding: '6px 12px', textAlign: 'left', background: 'transparent', borderRadius: 6, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 8, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer' }}>
                           Departamentos <Plus size={14} />
                        </button>
                        {expandDepartments && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, marginTop: 4, maxHeight: 150, overflowY: 'auto' }}>
                            {services.map(s => {
                              const displayName = s.name === 'Mídias Sociais' ? 'Social Media' : s.name;
                              return (
                                <button key={s.id} onClick={() => { setFilterType(`dept_${s.name}`); setShowFilterMenu(false); }} style={{ padding: '4px 8px', textAlign: 'left', fontSize: '0.8rem', background: filterType === `dept_${s.name}` ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 4, color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                                  {displayName}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Barra de busca — ambos os modos */}
            <input 
              type="text" 
              placeholder={internalOnly ? 'Buscar colaborador...' : 'Buscar cliente...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.85rem', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {internalOnly ? (
              empLoading ? (
                <div style={{ padding: 20, color: 'var(--text-muted)' }}>Carregando...</div>
              ) : (
                sortedEmployees.map(emp => {
                  const unreadCount = chatListStats[emp.id]?.unreadCount || 0;
                  return (
                    <div
                      key={emp.id}
                      className={`client-item ${selectedClient?.id === emp.id ? 'active' : ''}`}
                      onClick={() => setSelectedClient(emp)}
                    >
                      <div className="emp-avatar-sm" style={{ backgroundColor: emp.avatar_color || '#6366f1' }}>
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.name} />
                        ) : (
                          emp.name?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="emp-info-mini" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="emp-name">{emp.name}</span>
                            <span style={{ color: onlineUsers.includes(emp.id) ? '#10b981' : '#ef4444', fontSize: '0.65rem', fontWeight: '600' }}>
                               {onlineUsers.includes(emp.id) ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {unreadCount > 0 && (
                            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 10, fontWeight: 'bold' }}>
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="emp-pos">{emp.position || 'Colaborador'}</span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              clientsLoading ? (
                <div style={{ padding: 20, color: 'var(--text-muted)' }}>Carregando...</div>
              ) : sortedClients.length === 0 ? (
                <div style={{ padding: '40px 20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>
                  {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}"` : 'Nenhuma conversa.'}
                </div>
              ) : (
                sortedClients.map(client => {
                  const stats  = chatListStats[client.id] || {};
                  const unread = stats.unreadCount || 0;
                  const lastAt = stats.lastMsgAt ? new Date(stats.lastMsgAt) : null;
                  const lastMsg = stats.lastMsg || '';
                  const timeLabel = lastAt ? lastAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const avatarColor = client.avatar_color || '#10b981';

                  return (
                    <div
                      key={client.id}
                      className={`client-item ${selectedClient?.id === client.id ? 'active' : ''}`}
                      onClick={() => setSelectedClient(client)}
                      style={{ background: unread > 0 && selectedClient?.id !== client.id ? 'rgba(99,102,241,0.05)' : undefined }}
                    >
                      <div className="emp-avatar-sm" style={{ backgroundColor: avatarColor, width: 36, height: 36, fontSize: '1rem' }}>
                        {client.avatar_url
                          ? <img src={client.avatar_url} alt={client.metadata?.display_name || client.name} />
                          : (client.metadata?.display_name || client.name || '?').charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="emp-info-mini" style={{ width: '100%', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 4 }}>
                          <span className="emp-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: unread > 0 ? 700 : 600 }}>
                            {client.metadata?.display_name || client.name}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: unread > 0 ? '#818cf8' : 'var(--text-muted)', flexShrink: 0 }}>{timeLabel}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                          <span className="emp-pos" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: unread > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: unread > 0 ? 500 : 400 }}>
                            {lastMsg || client.name || 'Cliente'}
                          </span>
                          {unread > 0 && (
                            <span style={{ background: '#6366f1', color: 'white', fontSize: '0.62rem', padding: '2px 6px', borderRadius: 10, fontWeight: 'bold', flexShrink: 0 }}>
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>)}

        {/* Right Area: Sectors and Chat */}
        <div className="chat-content">
          
          <div className="chat-area-header" style={{ background: 'var(--panel-bg, var(--surface, rgba(15,23,42,0.85)))', padding: '12px 18px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedClient && (
                  <button className="mobile-back-btn" onClick={() => setSelectedClient(null)}>
                    <ArrowLeft size={20} />
                  </button>
                )}
                {selectedClient && (
                  <div className="emp-avatar-sm" style={{ backgroundColor: internalOnly ? (selectedClient.avatar_color || '#6366f1') : '#10b981', width: 38, height: 38, fontSize: '1.1rem' }}>
                    {!internalOnly ? (selectedClient.metadata?.display_name || selectedClient.name).charAt(0).toUpperCase() : (selectedClient.avatar_url ? <img src={selectedClient.avatar_url} alt="A"/> : selectedClient.name.charAt(0))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{selectedClient ? (internalOnly ? selectedClient.name : (selectedClient.metadata?.display_name || selectedClient.name)) : 'Selecione uma conversa'}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedClient ? (!internalOnly ? selectedClient.name : selectedClient.position) : ''}</span>
                </div>
              </div>
              
              {selectedClient && (
                 <button 
                   onClick={() => setShowClearModal(true)} 
                   style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', transition: '0.2s' }}
                   onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                   onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                 >
                    <Trash2 size={14} /> Limpar Conversa
                 </button>
              )}
            </div>
          </div>

          <div className="sector-tabs" style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 8, flexShrink: 0, fontWeight: 500 }}>Depto:</span>
            {services.map(sector => {
              const displayName = sector.name === 'Mídias Sociais' ? 'Social Media' : sector.name;
              return (
                <button
                  key={sector.id}
                  className={`sector-tab ${selectedSector?.id === sector.id ? 'active' : ''}`}
                  onClick={() => setSelectedSector(sector)}
                >
                  {displayName}
                </button>
              );
            })}
          </div>

          <div className="messages-list">
              {msgsLoading && <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sincronizando...</div>}
              {!msgsLoading && messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: 20, alignSelf: 'center', fontSize: '0.8rem' }}>
                  Nenhuma mensagem neste setor.
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.sender_id === user?.id;
                // Detecta mensagem do cliente via sender_type (WhatsApp) ou via user_id linkado
                const isClient = !internalOnly && (
                  msg.sender_type === 'client' ||
                  clients?.some(c => c.user_id === msg.sender_id)
                );
                const senderClass = isMine ? 'mine' : (isClient ? 'client-msg' : 'employee-msg');

                // Busca o registro do cliente pelo client_id da mensagem (sempre confiável)
                const clientRecord = (!internalOnly && isClient)
                  ? clients?.find(c => c.id === msg.client_id)
                  : null;
                // Prefere Nome de Exibição (Card) > nome do registro > nome guardado na mensagem
                const bubbleSenderName = msg.hide_sender_name
                  ? 'Atendimento'
                  : (isClient
                      ? (clientRecord?.metadata?.display_name || clientRecord?.name || msg.sender_name)
                      : msg.sender_name);

                return (
                  <div key={msg.id} className={`msg-wrapper ${senderClass} ${msg.is_internal ? 'internal-msg' : ''} ${msg.content?.startsWith('🔔') ? 'warning-msg' : ''}`}>

                    <div className="msg-bubble">
                      {!isMine && (
                         <div className="msg-sender">
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                             <span>{bubbleSenderName}</span>
                             {!msg.hide_sender_name && (
                               <span className="msg-sender-role">
                                 {isClient ? 'Cliente' : (senderRoleMap[msg.sender_id] || '')}
                               </span>
                             )}
                           </div>
                           {msg.is_internal && <span className="internal-badge"><EyeOff size={10} /> Interno</span>}
                         </div>
                      )}
                      {isMine && msg.is_internal && (
                        <div className="msg-sender" style={{justifyContent: 'flex-end'}}>
                           <span className="internal-badge"><EyeOff size={10} /> Interno</span>
                        </div>
                      )}

                      {msg.deletion_status === 'pending_deletion' ? (
                        <div className="pending-deletion-box">
                           <ShieldAlert size={14} color="#f59e0b" /> Mensagem com pedido de exclusão.
                          {isAdmin && (
                            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                              <button className="mini-btn-success" onClick={() => approveDelete(msg.id)}><CheckCircle size={12} /> Aprovar</button>
                              <button className="mini-btn-danger" onClick={() => rejectDelete(msg.id)}><XCircle size={12} /> Recusar</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {msg.content && (
                            <p style={{ margin: '4px 0', lineHeight: '1.4' }}>
                              {msg.content.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                  {line}
                                  {i !== msg.content.split('\n').length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </p>
                          )}
                          {msg.media_url && (
                            <div className="msg-media">
                              {msg.media_type === 'image' && <img src={msg.media_url} alt="anexo" style={{ maxWidth: 200, borderRadius: 8 }} />}
                              {msg.media_type === 'video' && <video src={msg.media_url} controls style={{ maxWidth: 200, borderRadius: 8 }} />}
                              {msg.media_type === 'audio' && <audio src={msg.media_url} controls style={{ height: 40 }} />}
                              {msg.media_type === 'file' && <a href={msg.media_url} target="_blank" rel="noreferrer" className="file-link"><FileText size={16} /> Baixar Arquivo</a>}
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="msg-time-footer" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {isMine && (
                          <span style={{ display: 'flex', alignItems: 'center', marginLeft: 2 }}>
                            {getMessageStatus(msg.id) === 'sent' && <Check size={14} color="#9ca3af" />}
                            {getMessageStatus(msg.id) === 'delivered' && <CheckCheck size={14} color="#9ca3af" />}
                            {getMessageStatus(msg.id) === 'read' && <CheckCheck size={14} color="#3b82f6" />}
                          </span>
                        )}
                      </div>

                      {/* Ações da Mensagem para donos/admins */}
                      {isMine && msg.deletion_status !== 'pending_deletion' && (
                        <div className="msg-actions">
                          <button onClick={() => handleEditClick(msg)} title="Editar"><Edit3 size={12} /></button>
                          <button onClick={() => isAdmin ? approveDelete(msg.id) : requestDelete(msg.id)} title="Excluir"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <div className="chat-input-area">
              {attachment && (
                <div className="attachment-preview">
                  {attachment.type.startsWith('audio/') ? <Mic size={14} /> : <Paperclip size={14} />} {attachment.name}
                  {audioUrl && <audio src={audioUrl} controls style={{ height: 30, marginLeft: 10 }} />}
                  <button onClick={() => { setAttachment(null); setAudioUrl(null); }}><XCircle size={14} /></button>
                </div>
              )}
              {editingId && (
                <div className="attachment-preview" style={{ background: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                  <Edit3 size={14} /> Editando mensagem...
                  <button onClick={handleCancelAction}><XCircle size={14} /></button>
                </div>
              )}

              {user?.role !== 'client' && (
                <div className="chat-toggles-row" style={{ display: 'flex', gap: 8, paddingBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" className={`toggle-badge-btn ${isInternal ? 'on' : ''}`} onClick={() => setIsInternal(!isInternal)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: '10px', fontSize: '0.7rem',
                    background: isInternal ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                    color: isInternal ? '#fcd34d' : 'var(--text-muted)',
                    border: '1px solid ' + (isInternal ? '#f59e0b' : 'var(--border-color)'),
                    cursor: 'pointer', transition: '0.2s', fontWeight: 500
                  }}>
                    <EyeOff size={10} /> {isInternal ? 'Nota Interna (Cliente não vê)' : 'Mensagem Pública (Cliente vê)'}
                  </button>
                  <button type="button" className={`toggle-badge-btn ${hideName ? 'on' : ''}`} onClick={() => setHideName(!hideName)} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: '10px', fontSize: '0.7rem',
                    background: hideName ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                    color: hideName ? '#a5b4fc' : 'var(--text-muted)',
                    border: '1px solid ' + (hideName ? '#6366f1' : 'var(--border-color)'),
                    cursor: 'pointer', transition: '0.2s', fontWeight: 500
                  }}>
                    <UserX size={10} /> {hideName ? 'Enviando como Atendimento' : 'Enviando com meu Nome'}
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="chat-form">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                <button type="button" className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Anexar Arquivo">
                  <Paperclip size={20} />
                </button>
                <button type="button" className={`btn-icon ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording} title={isRecording ? "Parar Gravação" : "Gravar Áudio"}>
                  {isRecording ? <div className="recording-dot" /> : <Mic size={20} />}
                </button>

                <input
                  type="text"
                  className="chat-input"
                  placeholder={isInternal ? "Escrever nota interna..." : "Escrever mensagem..."}
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                />

                <button type="submit" className="btn-send" disabled={!inputMsg.trim() && !attachment}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {showClearModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div className="modal-content glass-panel" style={{ background: 'var(--panel-bg)', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <Trash2 size={40} color="#ef4444" style={{ marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>Limpar Conversa</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>Tem certeza que deseja Limpar a Conversa?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  onClick={() => setShowClearModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Não
                </button>
                <button 
                  onClick={() => {
                    clearConversation();
                    setShowClearModal(false);
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Sim
                </button>
              </div>
            </div>
          </div>
        )}

      <style>{`
        .dept-page { display: flex; flex-direction: column; flex: 1; height: calc(100vh - 100px); padding: 10px; box-sizing: border-box; }
        .dept-header { flex-shrink: 0; margin-bottom: 10px; padding: 0 4px; display: flex; justify-content: space-between; align-items: center; }
        .dept-header h1 { font-size: 1.2rem; margin: 0; color: var(--text-main); }
        .dept-header p { font-size: 0.8rem; margin: 0; color: var(--text-muted); }
        .admin-chat-layout { display: flex; flex: 1; min-height: 0; border-radius: 12px; overflow: hidden; background: var(--panel-bg, rgba(15, 23, 42, 0.7)); margin: 0; border: 1px solid var(--border-color); box-shadow: 0 4px 30px rgba(0,0,0,0.25); backdrop-filter: var(--glass-blur); }
        .client-list { width: 260px; background: rgba(0,0,0,0.15); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; height: 100%; z-index: 10; }
        .list-title { border-bottom: 1px solid var(--border-color); padding: 12px; }
        .client-item { padding: 10px 14px; border-bottom: 1px solid var(--border-color); cursor: pointer; display: flex; gap: 10px; align-items: center; transition: all 0.2s ease; font-size: 0.8rem; }
        .client-item:hover { background: rgba(255,255,255,0.04); }
        .client-item.active { background: var(--glow-1, rgba(16, 185, 129, 0.15)); border-left: 3px solid var(--primary, #10b981); }
        
        .view-mode-btn { border: 1px solid var(--border-color); padding: 6px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: 0.2s; background: rgba(255,255,255,0.02); }
        .view-mode-btn:hover { border-color: var(--primary); }

        .emp-avatar-sm { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.8rem; position: relative; flex-shrink: 0; }
        .emp-avatar-sm img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .online-status { position: absolute; bottom: 0; right: 0; width: 8px; height: 8px; background: #10b981; border: 2px solid var(--dark-bg, #0b1120); border-radius: 50%; }
        .emp-info-mini { display: flex; flex-direction: column; gap: 2px; }
        .emp-name { font-size: 0.8rem; font-weight: 600; color: var(--text-main); }
        .emp-pos { font-size: 0.7rem; color: var(--text-muted); }

        .chat-content { 
          flex: 1; 
          display: flex; 
          flex-direction: column; 
          position: relative; 
          background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png"); 
          background-size: cover; 
          background-repeat: repeat;
          background-blend-mode: overlay; 
          background-color: var(--chat-bg, #0b141a); 
        }
        .sector-tabs { display: flex; gap: 6px; align-items: center; overflow-x: auto; scroll-behavior: smooth; border-bottom: 1px solid var(--border-color); padding: 8px 16px; margin: 0; }
        .sector-tabs::-webkit-scrollbar { height: 4px; }
        .sector-tab { flex-shrink: 0; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); color: var(--text-muted); padding: 5px 12px; border-radius: 16px; cursor: pointer; white-space: nowrap; transition: 0.2s; font-size: 0.75rem; font-weight: 500; }
        .sector-tab:hover { background: rgba(255,255,255,0.08); color: var(--text-main); }
        .sector-tab.active { background: var(--primary, #10b981); color: var(--btn-primary-text, white); border-color: transparent; }
        
        .messages-list { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scroll-behavior: smooth; }
        .msg-wrapper { display: flex; flex-direction: column; max-width: 75%; position: relative; margin-bottom: 2px; }
        .msg-wrapper.mine { align-self: flex-end; }
        .msg-wrapper.employee-msg { align-self: flex-start; }
        .msg-wrapper.client-msg { align-self: flex-start; }
        
        .msg-bubble { padding: 6px 10px 8px 10px; position: relative; font-size: 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.15); line-height: 1.45; }
        .mine .msg-bubble { background: var(--msg-out-bg, #005c4b); color: var(--msg-out-text, #e9edef); border-radius: 8px 0px 8px 8px; }
        .employee-msg .msg-bubble { background: var(--msg-in-bg, #202c33); color: var(--msg-in-text, #e9edef); border-radius: 0px 8px 8px 8px; }
        .client-msg .msg-bubble { background: var(--msg-in-bg, #202c33); color: var(--msg-in-text, #e9edef); border-radius: 0px 8px 8px 8px; }
        
        .internal-msg .msg-bubble { background: #422a14 !important; color: #fde68a !important; border: 1px dashed rgba(245, 158, 11, 0.4) !important; }
        
        .warning-msg .msg-bubble { background: rgba(234, 179, 8, 0.15) !important; color: #fde047 !important; border: 1px solid rgba(234, 179, 8, 0.4) !important; }
        .warning-msg .msg-sender { color: #fde047 !important; }
        
        .msg-sender { font-weight: 600; color: var(--primary, #818cf8); display:flex; align-items:center; gap:6px; font-size: 0.75rem; margin-bottom: 2px; }
        .client-msg .msg-sender { color: #16a34a; }
        .msg-sender-role { font-size: 0.62rem; font-weight: 400; color: rgba(255,255,255,0.32); letter-spacing: 0.01em; margin-top: 1px; }
        .client-msg .msg-sender-role { color: rgba(255,255,255,0.28); }
        .msg-time-footer { font-size: 0.65rem; color: var(--text-muted); opacity: 0.8; text-align: right; margin-top: 2px; margin-bottom: -4px; float: right; margin-left: 12px; }
        
        .internal-badge { background: #f59e0b; color: black; font-size: 0.6rem; padding: 1px 4px; border-radius: 4px; display:inline-flex; align-items:center; gap:2px; font-weight: 700; }
        
        .msg-media { margin-top: 6px; margin-bottom: 2px; }
        .file-link { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: rgba(0,0,0,0.15); border-radius: 6px; color: var(--primary); text-decoration: none; font-size: 0.8rem; border: 1px solid var(--border-color); }
        
        .msg-actions { position: absolute; top: 50%; right: 100%; transform: translateY(-50%); display: flex; gap: 4px; opacity: 0; transition: 0.2s; padding: 4px; margin-right: 6px; }
        .msg-wrapper:hover .msg-actions { opacity: 1; }
        .msg-actions button { background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; transition: 0.2s; display:flex; align-items:center; justify-content:center; padding: 4px; border-radius:50%; }
        .msg-actions button:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }
        
        .pending-deletion-box { background: rgba(245, 158, 11, 0.1); border: 1px dashed #f59e0b; padding: 6px; border-radius: 6px; font-size: 0.75rem; color: #fbbf24; }
        .mini-btn-success { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; padding: 2px 6px; border-radius: 4px; cursor: pointer; display:flex; align-items:center; gap:4px; }
        .mini-btn-danger { background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444; padding: 2px 6px; border-radius: 4px; cursor: pointer; display:flex; align-items:center; gap:4px; }

        .attachment-preview { padding: 8px 16px; background: var(--chat-input-area-bg, #202c33); border-top: 1px solid var(--border-color); display:flex; align-items:center; gap:8px; font-size:0.8rem; color: var(--text-main);}
        .attachment-preview button { background:none; border:none; color:inherit; cursor:pointer; margin-left:auto;}
        
        .chat-input-area { padding: 10px 16px; background: var(--chat-input-area-bg, #202c33); border-top: 1px solid var(--border-color); }
        .chat-form { display: flex; gap: 10px; align-items: center; }
        
        .chat-input { flex: 1; background: var(--chat-input-bg, #2a3942); border: 1px solid var(--border-color); color: var(--text-main, #e9edef); padding: 10px 16px; border-radius: 24px; outline: none; font-size: 0.85rem; transition: border-color 0.2s; }
        .chat-input:focus { border-color: var(--primary); }
        .chat-input::placeholder { color: var(--text-muted); opacity: 0.6; }
        
        .btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; border-radius: 50%; transition:0.2s; display: flex; align-items: center; justify-content: center; }
        .btn-icon:hover { background: rgba(255,255,255,0.06); color: var(--text-main); }
        
        .btn-icon.recording { color: #ef4444; position: relative; }
        .recording-dot { width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.5; transform: scale(0.8); } }
        
        .btn-send { background: var(--primary, #00a884); color: var(--btn-primary-text, white); border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .btn-send:hover:not(:disabled) { transform: scale(1.05); }
        .btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .mobile-back-btn { display: none; }

        /* Helpers injetados no page-container */
        .chat-container-fixed {
          overflow: hidden !important;
          padding-bottom: 0 !important;
          padding-top: 8px !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
          height: 100% !important;
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 0 !important;
        }
        .chat-footer-hidden {
          display: none !important;
        }
        .chat-container-fixed .dept-page {
          height: 100% !important;
          padding: 0 !important;
        }
        .chat-container-fixed .admin-chat-layout {
          height: 100% !important;
          flex: 1 !important;
          border-radius: 12px 12px 0 0;
        }
        
        @media (max-width: 768px) {
          .chat-container-fixed {
            height: 100% !important;
            padding: 0 !important;
          }
          .chat-container-fixed .admin-chat-layout {
            border-radius: 0 !important;
          }
          .dept-header { display: none; }
          .admin-chat-layout { flex-direction: column; overflow: hidden; border: none; border-radius: 0; }
          .client-list { width: 100%; height: 100%; border-right: none; }
          .chat-content { width: 100%; height: 100%; }
          .msg-wrapper { max-width: 85%; }
          
          .admin-chat-layout.has-active-client .client-list { display: none; }
          .admin-chat-layout:not(.has-active-client) .chat-content { display: none; }
          
          .mobile-back-btn { display: flex; background: none; border: none; color: var(--text-main); padding: 6px; border-radius: 50%; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
          .mobile-back-btn:hover { background: rgba(255,255,255,0.08); }
        }
      `}</style>
    </div>
  );
}
