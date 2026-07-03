import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Clock, Calendar, CheckCircle2, AlertCircle, Loader2, Save, ChevronRight, User } from 'lucide-react';

export default function ClientSLAs() {
  const { user, isGestor, deptPermissions } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      fetchClientsForDept();
    }
  }, [selectedDeptId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Carregar todos os departamentos (services)
      const { data: svcData } = await supabase.from('services').select('*').eq('active', true).order('sort_order');
      
      // Filtrar apenas os que o usuário gerencia (se não for admin)
      let availableDepts = svcData || [];
      if (!isAdmin) {
        const managedIds = deptPermissions.filter(p => p.role === 'Gestor').map(p => p.service_id);
        availableDepts = availableDepts.filter(d => managedIds.includes(d.id));
      }
      
      setDepartments(availableDepts);
      if (availableDepts.length > 0) {
        setSelectedDeptId(availableDepts[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsForDept = async () => {
    if (!selectedDeptId) return;
    setLoading(true);
    try {
      // Buscar clientes vinculados ao serviço selecionado
      const { data, error } = await supabase
        .from('client_services')
        .select(`
          id,
          client_id,
          service_id,
          metadata,
          clients (
            id,
            name,
            company
          )
        `)
        .eq('service_id', selectedDeptId)
        .eq('status', 'active');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlaDays = async (csId, days) => {
    const val = parseInt(days, 10);
    if (isNaN(val) || val < 0) return;

    try {
      setSaving(true);
      // Atualizar no estado local
      setClients(prev => prev.map(item => {
        if (item.id === csId) {
          return { ...item, metadata: { ...item.metadata, sla_days: val } };
        }
        return item;
      }));

      // Salvar no Supabase
      const currentItem = clients.find(c => c.id === csId);
      const newMetadata = { ...currentItem.metadata, sla_days: val };
      
      const { error } = await supabase
        .from('client_services')
        .update({ metadata: newMetadata })
        .eq('id', csId);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao salvar SLA:', error);
      alert('Erro ao salvar alteração. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && departments.length === 0) {
    return <div className="loading-state"><Loader2 className="spin" /> Carregando departamentos...</div>;
  }

  return (
    <div className="slas-view">
      <div className="slas-header">
        <div className="header-info">
          <h2><Clock size={24} color="#6366f1" /> Prazos e SLAs por Departamento</h2>
          <p>Defina o tempo de entrega (em dias) para cada cliente. Isso ajudará seus colaboradores a priorizarem as tarefas dentro do prazo.</p>
        </div>

        <div className="dept-selector">
          <label>Departamento:</label>
          <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="clients-sla-grid">
        {loading ? (
          <div className="loading-state" style={{ gridColumn: '1/-1' }}><Loader2 className="spin" /> Atualizando lista de clientes...</div>
        ) : clients.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <AlertCircle size={40} />
            <p>Nenhum cliente ativo vinculado a este departamento.</p>
          </div>
        ) : (
          clients.map(item => (
            <div key={item.id} className="sla-card glass-card">
              <div className="sla-card-header">
                <div className="client-info">
                  <h3>{item.clients.name}</h3>
                  <p>{item.clients.company || 'Sem empresa definida'}</p>
                </div>
                <div className="service-badge" style={{ background: departments.find(d => d.id === item.service_id)?.color + '22', color: departments.find(d => d.id === item.service_id)?.color }}>
                  {departments.find(d => d.id === item.service_id)?.name}
                </div>
              </div>

              <div className="sla-card-body">
                <div className="sla-input-group">
                  <label>
                    <Calendar size={14} /> Dias para Conclusão
                  </label>
                  <div className="input-with-action">
                    <input 
                      type="number" 
                      min="0"
                      defaultValue={item.metadata?.sla_days || 0}
                      onBlur={(e) => updateSlaDays(item.id, e.target.value)}
                      placeholder="Ex: 3"
                    />
                    <span className="unit">dias</span>
                  </div>
                </div>

                <div className="sla-status-preview">
                   <div className={`status-pill ${item.metadata?.sla_days > 0 ? 'active' : 'pending'}`}>
                     {item.metadata?.sla_days > 0 ? (
                       <><CheckCircle2 size={12} /> Prazo Definido</>
                     ) : (
                       <><AlertCircle size={12} /> Sem Prazo</>
                     )}
                   </div>
                </div>
              </div>
              
              <div className="sla-card-footer">
                <p>Tarefas criadas para este cliente terão um prazo sugerido de {item.metadata?.sla_days || 0} dias.</p>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .slas-view { display: flex; flex-direction: column; gap: 24px; }
        .slas-header { 
          display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
          padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .header-info h2 { margin: 0 0 4px; display: flex; align-items: center; gap: 10px; font-size: 1.4rem; }
        .header-info p { margin: 0; color: var(--text-muted); font-size: 0.9rem; max-width: 600px; }
        
        .dept-selector { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
        .dept-selector label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
        .dept-selector select { 
          padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: white; outline: none; cursor: pointer;
        }

        .clients-sla-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .sla-card { 
          display: flex; flex-direction: column; gap: 20px; padding: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sla-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        
        .sla-card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .client-info h3 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
        .client-info p { margin: 2px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        .service-badge { padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }

        .sla-card-body { display: flex; flex-direction: column; gap: 16px; }
        .sla-input-group { display: flex; flex-direction: column; gap: 8px; }
        .sla-input-group label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); }
        
        .input-with-action { display: flex; align-items: center; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; }
        .input-with-action input { flex: 1; background: transparent; border: none; color: white; padding: 10px; outline: none; font-size: 1rem; text-align: center; }
        .input-with-action .unit { padding: 0 12px; font-size: 0.8rem; color: var(--text-muted); border-left: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); height: 40px; display: flex; align-items: center; }

        .status-pill { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; padding: 4px 12px; border-radius: 20px; width: fit-content; }
        .status-pill.active { background: rgba(16,185,129,0.1); color: #34d399; }
        .status-pill.pending { background: rgba(245,158,11,0.1); color: #fcd34d; }

        .sla-card-footer { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }
        .sla-card-footer p { margin: 0; font-size: 0.75rem; color: var(--text-muted); font-style: italic; line-height: 1.4; }

        .loading-state, .empty-state { padding: 60px; text-align: center; color: var(--text-muted); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
