import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useChatListStats(internalOnly) {
  const [stats, setStats] = useState({});
  const { user } = useAuth();
  
  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    if (internalOnly) {
      const myUserId = user.id;
      const myEmpId = user.employeeId;
      
      const { data: allMsgs } = await supabase
        .from('chat_messages')
        .select('client_id, sender_id, created_at')
        .neq('deletion_status', 'deleted')
        .or(`client_id.eq.${myEmpId},sender_id.eq.${myUserId}`);
        
      if (!allMsgs) return;
      
      const { data: profilesData } = await supabase.from('profiles').select('id, employee_id');
      const userToEmpMap = {};
      profilesData?.forEach(p => userToEmpMap[p.id] = p.employee_id);
      
      const newStats = {};
      
      allMsgs.forEach(msg => {
        let otherEmpId;
        let isFromMe = msg.sender_id === myUserId;
        
        if (isFromMe) {
          otherEmpId = msg.client_id;
        } else {
          otherEmpId = userToEmpMap[msg.sender_id];
        }
        
        if (!otherEmpId) return;
        
        const msgTime = new Date(msg.created_at).getTime();
        
        if (!newStats[otherEmpId]) {
          newStats[otherEmpId] = { lastMsgAt: 0, unreadCount: 0 };
        }
        
        if (msgTime > newStats[otherEmpId].lastMsgAt) {
          newStats[otherEmpId].lastMsgAt = msgTime;
        }
        
        if (!isFromMe) {
          const lastReadStr = localStorage.getItem(`last_chat_read_p2p_${otherEmpId}`);
          const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
          if (msgTime > lastReadTime) {
            newStats[otherEmpId].unreadCount++;
          }
        }
      });
      
      setStats(newStats);
    } else {
      // ── Client chat stats ─────────────────────────────────────────
      const { data: allMsgs } = await supabase
        .from('chat_messages')
        .select('client_id, sender_id, created_at, content')
        .neq('deletion_status', 'deleted')
        .eq('is_internal', false); // notas internas não geram badge

      if (!allMsgs) return;

      const newStats = {};

      allMsgs.forEach(msg => {
        const clientId = msg.client_id;
        if (!clientId) return;

        const msgTime = new Date(msg.created_at).getTime();
        const isFromMe = msg.sender_id === user.id;

        if (!newStats[clientId]) {
          newStats[clientId] = { lastMsgAt: 0, unreadCount: 0, lastMsg: '' };
        }

        if (msgTime > newStats[clientId].lastMsgAt) {
          newStats[clientId].lastMsgAt = msgTime;
          newStats[clientId].lastMsg = msg.content || '📎 Mídia';
        }

        if (!isFromMe) {
          const lastReadStr = localStorage.getItem(`last_chat_read_${clientId}`);
          const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
          if (msgTime > lastReadTime) {
            newStats[clientId].unreadCount++;
          }
        }
      });

      setStats(newStats);
    }
  }, [internalOnly, user]);

  useEffect(() => {
    fetchStats();
    
    // Listen to chat_read_update manually fired by AdminChats
    const handleReadUpdate = () => {
      fetchStats();
    };
    window.addEventListener('chat_read_update', handleReadUpdate);
    
    // Realtime channel
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase.channel(`chat_list_stats_${channelId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
      const msg = payload.new || payload.old;
      if (!msg) return;
      if (internalOnly && user) {
        if (msg.client_id === user.employeeId || msg.sender_id === user.id) {
          fetchStats();
          // Envio de "Entregue" (2 risquinhos cinza) via broadcast
          if (payload.eventType === 'INSERT' && msg.sender_id !== user.id) {
            supabase.channel('chat_read_receipts').send({
              type: 'broadcast',
              event: 'receipt',
              payload: { type: 'delivered', msgId: msg.id, fromEmpId: user.employeeId }
            });
          }
        }
      } else {
        fetchStats();
      }
    });
    channel.subscribe();
    
    return () => {
      window.removeEventListener('chat_read_update', handleReadUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchStats, internalOnly, user]);

  return stats;
}
