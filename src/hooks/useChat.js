import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useChat(clientId, department, isP2P = false) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  const [channelId] = useState(() => Math.random().toString(36).substring(7));

  const fetchMessages = useCallback(async () => {
    if (!clientId || !department) return;
    setLoading(true);
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('department', department)
      .neq('deletion_status', 'deleted')
      .order('created_at', { ascending: true });

    if (isP2P) {
      // Chat ponto a ponto entre colaboradores: 
      // Busca o user_id do destinatário
      const myEmpId = user?.employeeId;
      const { data: prof } = await supabase.from('profiles').select('id').eq('employee_id', clientId).single();
      const otherUserId = prof?.id;

      if (otherUserId) {
        query = query.or(`and(client_id.eq.${myEmpId},sender_id.eq.${otherUserId}),and(client_id.eq.${clientId},sender_id.eq.${user.id})`);
      } else {
        query = query.eq('client_id', clientId).eq('sender_id', user.id);
      }
    } else {
      query = query.eq('client_id', clientId);
      if (user?.role === 'client') {
        query = query.eq('is_internal', false);
      }
    }

    const { data, error } = await query;

    if (error) {
      setError(error.message);
    } else {
      const storageKey = `cleared_chat_${user?.id}_${clientId}_${department}`;
      const clearedAt = localStorage.getItem(storageKey);
      let finalMsgs = data || [];
      if (clearedAt) {
        finalMsgs = finalMsgs.filter(m => new Date(m.created_at) > new Date(clearedAt));
      }
      setMessages(finalMsgs);
    }
    setLoading(false);
  }, [clientId, department, user?.role, user?.id, user?.employeeId, isP2P]);

  useEffect(() => {
    fetchMessages();
    
    if (!clientId || !department) return;

    const channel = supabase.channel(`chat_${clientId}_${department}_${channelId}`);

    const handleRealtimeMessage = (payload) => {
      const newMsg = payload.new;
      if (!newMsg) return;

      if (isP2P) {
        const myEmpId = user?.employeeId;
        const isFromMeToHim = newMsg.client_id === clientId && newMsg.sender_id === user?.id;
        const isFromHimToMe = newMsg.client_id === myEmpId;
        if (isFromMeToHim || isFromHimToMe) {
          fetchMessages();
        }
      } else {
        if (newMsg.client_id === clientId) {
          fetchMessages();
        }
      }
    };

    if (isP2P) {
      // Em chats P2P, removemos o filtro por texto pois filtros com espaço ('Chat Equipe') não são suportados pelo Realtime do Supabase.
      // A filtragem correta já é realizada em Javascript dentro do handleRealtimeMessage.
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages'
      }, handleRealtimeMessage);
    } else {
      channel.on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages', 
        filter: `client_id=eq.${clientId}` 
      }, handleRealtimeMessage);
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [clientId, department, fetchMessages, channelId, isP2P, user?.id]);

  const uploadMedia = async (file) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('chat_media').upload(fileName, file);
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName);
    
    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    return { publicUrl, type };
  };

  const sendMessage = async (content, options = {}) => {
    const { file, isInternal, hideName } = options;
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      const uploaded = await uploadMedia(file);
      mediaUrl = uploaded.publicUrl;
      mediaType = uploaded.type;
    }

    const newMessage = {
      client_id: clientId,
      department,
      sender_id: user.id,
      sender_type: user.role === 'client' ? 'client' : 'employee',
      sender_name: hideName ? 'Time de Atendimento' : (user.name || 'Usuário'),
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      is_internal: isInternal || false,
      hide_sender_name: hideName || false
    };

    // Optimistic UI Update: Adiciona na tela instantaneamente
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { ...newMessage, id: tempId, created_at: new Date().toISOString() }]);

    const { data, error } = await supabase.from('chat_messages').insert(newMessage).select('*').single();
    
    if (error) {
       // Em caso de erro, reverte a mensagem da tela
       setMessages(prev => prev.filter(m => m.id !== tempId));
       throw error;
    }

    // Substitui a temporária pela oficial e atualiza via background
    setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    fetchMessages();

    // Integração WhatsApp Omnichannel: Envia para todos os contatos cadastrados
    if (!isInternal && user.role !== 'client' && !isP2P) {
      try {
        const { data: clientData } = await supabase.from('clients').select('phone, metadata').eq('id', clientId).single();
        if (clientData) {
          const contacts = clientData.metadata?.contacts || [];
          let phoneNumbers = contacts.map(c => c.phone).filter(Boolean);
          if (phoneNumbers.length === 0 && clientData.phone) {
            phoneNumbers = [clientData.phone];
          }
          
          if (phoneNumbers.length > 0) {
            const senderInfo = hideName ? 'Atendimento' : (user.name || 'Equipe');
            const mediaText = mediaUrl ? `\n🔗 Anexo: ${mediaUrl}` : '';
            const waMessages = phoneNumbers.map(phone => ({
              client_id: clientId,
              employee_id: user.id,
              direction: 'outbound',
              from_number: 'system',
              to_number: phone,
              content: `[${department}] ${senderInfo}:\n${content}${mediaText}`,
              status: 'pending'
            }));
            await supabase.from('whatsapp_messages').insert(waMessages);
          }
        }
      } catch (err) {
        console.error("Erro ao integrar com WhatsApp:", err);
      }
    }
  };

  const updateMessage = async (id, content) => {
    const { error } = await supabase.from('chat_messages').update({ content }).eq('id', id);
    if (error) throw error;
    fetchMessages();
  };

  const requestDelete = async (id) => {
    const { error } = await supabase.from('chat_messages').update({ deletion_status: 'pending_deletion' }).eq('id', id);
    if (error) throw error;
    fetchMessages();
  };

  const approveDelete = async (id) => {
    const { error } = await supabase.from('chat_messages').update({ deletion_status: 'deleted' }).eq('id', id);
    if (error) throw error;
    fetchMessages();
  };

  const rejectDelete = async (id) => {
    const { error } = await supabase.from('chat_messages').update({ deletion_status: 'active' }).eq('id', id);
    if (error) throw error;
    fetchMessages();
  };

  const clearConversation = async () => {
    if (messages.length === 0) return;
    const storageKey = `cleared_chat_${user?.id}_${clientId}_${department}`;
    localStorage.setItem(storageKey, new Date().toISOString());
    fetchMessages();
  };

  return { 
    messages, loading, error, 
    sendMessage, updateMessage, requestDelete, approveDelete, rejectDelete, clearConversation 
  };
}
