import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useDepartmentTasks(clientId, departmentName) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const deletingIds = useRef(new Set());
  const mountedRef = useRef(true);

  const fetchTasks = async () => {
    if (!clientId || !departmentName) return;
    try {
      let query = supabase
        .from('department_tasks')
        .select('*, client:clients(name, metadata)')
        .eq('department', departmentName)
        .order('created_at', { ascending: false });

      if (clientId !== 'ALL') {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!mountedRef.current) return;

      const filtered = (data || []).filter(t => !deletingIds.current.has(t.id));
      setTasks(filtered);
    } catch (err) {
      console.error('[useDepartmentTasks] erro:', err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchTasks();

    // Realtime para refletir deleções e edições instantaneamente entre cliente e colaborador
    const channel = supabase
      .channel(`rt_dept_tasks_${clientId}_${departmentName}_${Math.random()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'department_tasks', 
        filter: clientId === 'ALL' ? `department=eq.${departmentName}` : `client_id=eq.${clientId}` 
      }, () => {
        fetchTasks();
      })
      .subscribe();

    const handleWorkflowUpdate = () => fetchTasks();
    window.addEventListener('workflow-update', handleWorkflowUpdate);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      window.removeEventListener('workflow-update', handleWorkflowUpdate);
    };
  }, [clientId, departmentName]); // eslint-disable-line

  const addTask = async (taskData) => {
    try {
      const payload = {
        client_id: clientId === 'ALL' ? taskData.client_id : clientId,
        department: departmentName,
        ...taskData
      };
      const { data, error } = await supabase
        .from('department_tasks')
        .insert([payload])
        .select('*')
        .single();
      if (error) throw error;
      await fetchTasks();
      return data;
    } catch (err) {
      console.error('[useDepartmentTasks] addTask erro:', err.message);
      alert('Erro ao criar tarefa: ' + err.message);
      return null;
    }
  };

  const updateTask = async (id, updates) => {
    // Atualização otimista
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    try {
      const { data, error } = await supabase
        .from('department_tasks')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      await fetchTasks();
      return data;
    } catch (err) {
      console.error('[useDepartmentTasks] updateTask erro:', err.message);
      alert('Erro ao mover tarefa: ' + err.message);
      await fetchTasks(); // Reverte em caso de erro
      return null;
    }
  };

  const deleteTask = async (id) => {
    // Remove da UI imediatamente
    deletingIds.current.add(id);
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      // Tenta RPC primeiro
      const { error: rpcError } = await supabase.rpc('delete_department_task', { task_id: id });

      if (rpcError) {
        // Fallback: DELETE direto
        const { error: delError } = await supabase
          .from('department_tasks')
          .delete()
          .eq('id', id);
        if (delError) throw delError;
      }

      // Limpa após 3 segundos
      setTimeout(() => { deletingIds.current.delete(id); }, 3000);
      return true;
    } catch (err) {
      console.error('[useDepartmentTasks] deleteTask ERRO:', err.message);
      deletingIds.current.delete(id);
      await fetchTasks();
      alert('Erro ao excluir: ' + err.message);
      return false;
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask, refresh: fetchTasks };
}
