import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Busca todos os clientes ordenados por nome
  const fetchClients = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();

    let timeoutId;
    // Escuta mudanças em tempo real com nome único para evitar conflito
    const channelId = `clients-changes-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
        clearTimeout(timeoutId);

        // Para UPDATE: atualiza apenas o cliente afetado usando o payload do evento,
        // evitando um fetchClients() completo que poderia sobrescrever dados recém-salvos.
        // Isso elimina o race condition causado por múltiplas instâncias do hook.
        if (payload.eventType === 'UPDATE' && payload.new?.id) {
          setClients(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
          return;
        }

        // Para INSERT ou DELETE: precisa refazer a busca completa com delay maior
        // para garantir consistência após a inserção/remoção
        timeoutId = setTimeout(() => {
          fetchClients(true);
        }, 2000);
      })
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  // Criar novo cliente
  const createClient = async (clientData) => {
    const { data, error: err } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (err) throw new Error(err.message);
    return data;
  };

  // Atualizar cliente
  const updateClient = async (id, updates) => {
    // Atualização otimista (reflete na UI instantaneamente)
    setClients(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ...updates,
          metadata: updates.metadata !== undefined ? { ...c.metadata, ...updates.metadata } : c.metadata
        };
      }
      return c;
    }));

    const { data, error: err } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (err) {
      // Reverte em caso de falha
      fetchClients(true);
      throw new Error(err.message);
    }
    
    // Atualiza com os dados exatos retornados pelo banco
    setClients(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  // Deletar cliente
  const deleteClient = async (id) => {
    const { error: err } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (err) throw new Error(err.message);
  };

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient };
}
