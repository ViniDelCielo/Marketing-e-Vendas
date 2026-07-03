import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Send, Target, Palette, Camera, Video, Megaphone } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'design', name: 'Design', icon: <Palette size={16} /> },
  { id: 'edicao', name: 'Edição', icon: <Video size={16} /> },
  { id: 'captacao', name: 'Captação', icon: <Camera size={16} /> },
  { id: 'social-media', name: 'Social Media', icon: <Megaphone size={16} /> },
  { id: 'trafego', name: 'Tráfego Pago', icon: <Target size={16} /> }
];

export default function TaskDelegation({ client }) {
  const { user } = useAuth();
  const [task, setTask] = useState({ title: '', department: 'design', description: '', deadline: '' });
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (client?.id) fetchHistory();
  }, [client?.id]);

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('department_tasks')
      .select('id, title, department, status, created_at, metadata')
      .eq('client_id', client.id)
      .filter('metadata->>assigned_by', 'eq', 'Sucesso do Cliente')
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const handleSendTask = async () => {
    if (!task.title || !task.description) return alert("Preencha título e descrição.");
    setSaving(true);
    try {
      await supabase.from('department_tasks').insert([{
        client_id: client.id,
        department: DEPARTMENTS.find(d => d.id === task.department).name,
        title: task.title,
        status: 'A Fazer',
        metadata: {
          description: task.description,
          deadline: task.deadline,
          assigned_by: 'Sucesso do Cliente',
          assigner_name: user?.name,
          assigner_id: user?.id,
          history: [{ action: 'Tarefa delegada pelo Sucesso do Cliente', by: user?.name, date: new Date().toISOString() }]
        }
      }]);
      setTask({ title: '', department: 'design', description: '', deadline: '' });
      fetchHistory();
    } catch (err) {
      alert("Erro ao delegar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: '1.1rem' }}>
        <Send size={20} className="text-primary" /> Delegar Demanda para Outros Departamentos
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TÍTULO DA TAREFA</label>
          <input className="glass-input" style={{ width: '100%' }} value={task.title} onChange={e => setTask({...task, title: e.target.value})} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DEPARTAMENTO DESTINO</label>
          <select className="glass-input" style={{ width: '100%' }} value={task.department} onChange={e => setTask({...task, department: e.target.value})}>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DESCRIÇÃO DETALHADA</label>
        <textarea className="glass-input" style={{ width: '100%', minHeight: 80 }} value={task.description} onChange={e => setTask({...task, description: e.target.value})} />
      </div>
      <div style={{ marginBottom: 16, width: '50%' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRAZO (OPCIONAL)</label>
        <input type="date" max="9999-12-31" className="glass-input" style={{ width: '100%' }} value={task.deadline} onChange={e => setTask({...task, deadline: e.target.value})} />
      </div>

      <button onClick={handleSendTask} disabled={saving} className="glass-btn primary" style={{ fontWeight: 'bold' }}>
        {saving ? 'Enviando...' : 'ENVIAR PARA O KANBAN'}
      </button>

      {history.length > 0 && (
        <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 12 }}>Histórico de Demandas Enviadas</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(h => (
              <div key={h.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{h.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Para: {h.department} | Criado em: {new Date(h.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 'bold' }}>
                  {h.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
