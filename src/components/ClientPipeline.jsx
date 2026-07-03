import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, ArrowRight, Play, Check, AlertCircle, Film, PenTool, LayoutTemplate, Send, Plus, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

// Estágios mapeados
const STAGES = {
  'captacao': { label: 'Em Captação', icon: <Film size={14}/>, next: 'edicao', dept: 'Departamento de Captação' },
  'edicao': { label: 'Fila de Edição', icon: <PenTool size={14}/>, next: 'social_media', dept: 'Departamento de Edição' },
  'design': { label: 'Fila de Design', icon: <LayoutTemplate size={14}/>, next: 'social_media', dept: 'Departamento de Design' },
  'social_media': { label: 'Pronto p/ Postar', icon: <Send size={14}/>, next: 'concluido', dept: 'Social Media' },
  'concluido': { label: 'Concluído', icon: <CheckCircle size={14}/>, next: null, dept: '*' }
};

export default function ClientPipeline({ client, currentDept }) {
  const confirm = useConfirm();
  const [pipelineItems, setPipelineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States para novo item (apenas visível na Captação/Design inicial)
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('edicao'); // vai para edicao ou design

  // SLAS temporários (depois vem do BD)
  const slasHoras = client.metadata?.slas || { edicao: 48, design: 24, captacao: 72 };

  const fetchPipeline = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('department_tasks')
      .select('*')
      .eq('client_id', client.id)
      .eq('department', 'Pipeline')
      .order('created_at', { ascending: false });
    
    if (data) setPipelineItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPipeline();
    
    // Inscrever para atualizações pra ter notificação realtime
    const channel = supabase.channel(`pipeline_${client.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'department_tasks', filter: `client_id=eq.${client.id}` }, () => {
        fetchPipeline();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [client.id]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    const newItem = {
      client_id: client.id,
      department: 'Pipeline',
      title: newTitle,
      status: 'A Fazer',
      metadata: {
        stage: newType === 'edicao' ? 'captacao' : 'design', // Design pode criar as próprias peças ou vir da captação
        description: newDesc,
        timers: {
          created_at: new Date().toISOString()
        }
      }
    };
    
    await supabase.from('department_tasks').insert([newItem]);
    setShowNew(false);
    setNewTitle('');
    setNewDesc('');
  };

  const advanceStage = async (item, forceNextStage = null) => {
    let nextStage = forceNextStage || STAGES[item.metadata?.stage]?.next;
    if (!nextStage) return;

    const newTimers = { ...item.metadata.timers };
    
    // Registra a conclusão do estágio atual
    newTimers[`${item.metadata.stage}_completed`] = new Date().toISOString();
    // Registra o início do novo estágio
    newTimers[`${nextStage}_received`] = new Date().toISOString();

    const newData = {
      ...item.metadata,
      stage: nextStage,
      timers: newTimers
    };

    await supabase.from('department_tasks').update({ metadata: newData }).eq('id', item.id);
  };

  // Função para calcular o tempo atual (SLA)
  const renderTimer = (item) => {
    const stage = item.metadata?.stage;
    if (stage === 'concluido' || stage === 'social_media') return <span style={{color: '#10b981', fontSize:'0.75rem', display:'flex', alignItems:'center', gap:4}}><CheckCircle size={12}/> {stage === 'social_media' ? 'Aguardando Postagem' : 'Finalizado'}</span>;
    
    const receivedAt = item.metadata?.timers?.[`${stage}_received`] || item.metadata?.timers?.created_at;
    if (!receivedAt) return null;

    const start = new Date(receivedAt).getTime();
    const now = new Date().getTime();
    const diffHoras = (now - start) / (1000 * 60 * 60);

    const slaAtual = slasHoras[stage] || 24;
    const isLate = diffHoras > slaAtual;
    const tempoGastoStr = diffHoras < 1 ? `${~~(diffHoras * 60)} min` : `${~~diffHoras}h ${~~((diffHoras % 1) * 60)}m`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.75rem', color: isLate ? '#ef4444' : '#fbbf24' }}>
        <div style={{display:'flex', alignItems:'center', gap:4}}>
          <Clock size={12}/> {isLate ? 'Atrasado' : 'No Prazo'}
        </div>
        <span style={{opacity: 0.8}}>Tempo corrido: <b>{tempoGastoStr}</b> / {slaAtual}h</span>
      </div>
    );
  };

  if (loading) return null;

  const canCreate = currentDept === 'Departamento de Captação' || currentDept === 'Departamento de Design';
  
  return (
    <div className="pipeline-container glass-panel" style={{ marginBottom: 16, border: '1px solid rgba(99, 102, 241, 0.3)', background: 'linear-gradient(to right, rgba(0,0,0,0.3), rgba(99, 102, 241, 0.05))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={18} color="#a5b4fc" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>Pipeline de Produção (Linha do Tempo)</h3>
        </div>
        
        {canCreate && !showNew && (
          <button className="glass-btn primary" style={{fontSize: '0.75rem', padding: '6px 10px'}} onClick={() => setShowNew(true)}>
            <Plus size={14}/> Nova Peça / Arquivo Bruto
          </button>
        )}
      </div>

      {showNew && (
        <form onSubmit={handleCreateAsset} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', gap: 8, flexDirection: 'column' }}>
          <input type="text" placeholder="Ex: Raw Video 01 - Roteiro de Vendas" className="glass-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
          <textarea placeholder="Insira o Roteiro, a Ideia ou o Link do Drive aqui..." className="glass-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} required />
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
             <select className="glass-input" value={newType} onChange={e => setNewType(e.target.value)} style={{width: '200px'}}>
               <option value="edicao">Acionar Edição</option>
               <option value="design">Acionar Design</option>
             </select>
             <div style={{display:'flex', gap:8}}>
               <button type="button" className="glass-btn" onClick={() => setShowNew(false)}>Cancelar</button>
               <button type="submit" className="glass-btn primary">Subir e Notificar</button>
             </div>
          </div>
        </form>
      )}

      {pipelineItems.length === 0 && !showNew && (
         <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0'}}>Nenhuma peça em produção no momento.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pipelineItems.map(item => {
          const stg = STAGES[item.metadata?.stage] || STAGES['concluido'];
          const isMyDept = stg.dept === currentDept || (currentDept === 'Social Media' && item.metadata?.stage === 'social_media');
          
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', background: isMyDept ? 'rgba(99, 102, 241, 0.15)' : 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 8, border: isMyDept ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent', gap: 16 }}>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {stg.icon} {stg.label}
                  </span>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{item.title}</h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.metadata?.description || 'Sem descrição/roteiro anexado.'}
                </p>
              </div>

              {/* SLA Cronômetro */}
              <div style={{ padding: '0 16px', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 150 }}>
                {renderTimer(item)}
              </div>

              {/* Botão de Avanço se pertencer ao departamento atual */}
              <div style={{ minWidth: 130, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                {isMyDept && stg.next && (
                  <button className="glass-btn primary" style={{fontSize: '0.75rem', padding: '6px 12px'}} onClick={() => advanceStage(item)}>
                    Concluir <ArrowRight size={14}/>
                  </button>
                )}
                {!isMyDept && stg.next && (
                  <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Em {stg.dept.replace('Departamento de ','')}</span>
                )}
                
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = await confirm({
                      title: 'Excluir Demanda?',
                      message: 'ATENÇÃO: Se apagar este card, você não poderá recuperá-lo. Tem certeza que deseja excluir esta demanda definitivamente?',
                      confirmText: 'Sim, excluir',
                      isDanger: true
                    });
                    if (confirmed) {
                        console.log('Iniciando exclusão na Pipeline:', item.id);
                        
                        // Optimistic Update
                        setPipelineItems(prev => prev.filter(p => p.id !== item.id));
                        
                        const { error } = await supabase.rpc('delete_department_task', { task_id: item.id });
                        
                        if (error) {
                          console.warn('RPC falhou, tentando delete direto:', error);
                          const { error: err2 } = await supabase.from('department_tasks').delete().eq('id', item.id);
                          if (err2) {
                            alert('Erro ao excluir: ' + err2.message);
                            fetchPipeline(); // Rollback
                          } else {
                            alert('Item excluído com sucesso!');
                          }
                        } else {
                           alert('Item excluído com sucesso!');
                        }
                      }
                  }} 
                  className="icon-btn text-danger" 
                  title="Apagar da Pipeline"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: 8, borderRadius: 8, cursor: 'pointer', display: 'flex' }}
                >
                  <X size={18}/>
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
