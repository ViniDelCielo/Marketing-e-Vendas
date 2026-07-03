import { useState, useRef, useEffect } from 'react';
import { Calendar, Video, BookOpen, UserCircle, MessageSquare, Plus, X, Loader2, Cloud, RefreshCw, ExternalLink, Edit3, Check, Upload, FileText, Trash2 } from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import FeedbackField from '../components/FeedbackField';
import DepartmentPipeline from '../components/DepartmentPipeline';
import ClientSocialPanel from '../components/ClientSocialPanel';
import StaffSocialPanel from '../components/StaffSocialPanel';
import { supabase } from '../lib/supabase';
import { useConfirm } from '../context/ConfirmContext';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import MeetingScheduler from '../components/MeetingScheduler';
import { useAuth } from '../context/AuthContext';

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

const SocialMediaContent = ({ client, isClient }) => {
  const confirm = useConfirm();
  // States para Integração mLabs
  const [mlabsConnections, setMlabsConnections] = useState(client.metadata?.mlabs_connections || []);
  const [isMlabsModalOpen, setIsMlabsModalOpen] = useState(false);
  const [newMlabs, setNewMlabs] = useState({ account_id: '', profile_name: '' });
  const [isMlabsSyncing, setIsMlabsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [autoSync, setAutoSync] = useState(true);

  // States para Estratégia
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [strategyText, setStrategyText] = useState(client.metadata?.strategy_text || '');
  const [strategyFileName, setStrategyFileName] = useState(client.metadata?.strategy_file_name || '');
  const [strategyFileUrl, setStrategyFileUrl] = useState(client.metadata?.strategy_file_url || '');
  const strategyFileInputRef = useRef(null);

  // Funções mLabs
  const handleAddMlabs = async () => {
    if (!newMlabs.account_id || !newMlabs.profile_name) return;
    const updated = [...mlabsConnections, { ...newMlabs, id: Date.now(), status: 'active' }];
    setMlabsConnections(updated);
    setIsMlabsModalOpen(false);
    setNewMlabs({ account_id: '', profile_name: '' });
    
    // Salvar no metadata
    const newMetadata = { ...(client.metadata || {}), mlabs_connections: updated };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
  };

  const removeMlabs = async (id) => {
    const updated = mlabsConnections.filter(c => c.id !== id);
    setMlabsConnections(updated);
    const newMetadata = { ...(client.metadata || {}), mlabs_connections: updated };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
  };

  const handleMlabsSync = () => {
    if (mlabsConnections.length === 0) return alert("Conecte uma conta mLabs primeiro!");
    setIsMlabsSyncing(true);
    setTimeout(() => {
      setIsMlabsSyncing(false);
      setLastSync(new Date());
      // Aqui simulamos o "tempo real" atualizando algum dado do cliente se necessário
    }, 2500);
  };

  // Simulação de tempo real (AutoSync)
  useEffect(() => {
    let interval;
    if (autoSync && mlabsConnections.length > 0) {
      interval = setInterval(() => {
        setLastSync(new Date());
        console.log("mLabs: Sincronização automática realizada em tempo real.");
      }, 30000); // Sincroniza a cada 30 segundos simbolicamente
    }
    return () => clearInterval(interval);
  }, [autoSync, mlabsConnections]);



  const saveStrategyText = async () => {
    setIsEditingStrategy(false);
    const newMetadata = { ...(client.metadata || {}), strategy_text: strategyText };
    await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
  };

  const handleStrategyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split('.').pop();
      const fileName = `strategy-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error: upErr } = await supabase.storage.from('chat_media').upload(fileName, file);
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName);
      
      const newMetadata = { 
        ...(client.metadata || {}), 
        strategy_file_name: file.name,
        strategy_file_url: publicUrl 
      };
      
      await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
      setStrategyFileName(file.name);
      setStrategyFileUrl(publicUrl);
    } catch (err) {
      alert("Erro no upload da estratégia: " + err.message);
    }
  };

  const removeStrategyFile = async () => {
    const confirmed = await confirm({
      title: 'Remover Estratégia?',
      message: 'Remover o arquivo de estratégia atual?',
      confirmText: 'Sim, remover',
      isDanger: true
    });
    if(confirmed) {
      const newMetadata = { ...(client.metadata || {}) };
      delete newMetadata.strategy_file_name;
      delete newMetadata.strategy_file_url;
      await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
      setStrategyFileName('');
      setStrategyFileUrl('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
         <DepartmentGuide department="Social Media" />
         <GoogleDriveConnector client={client} department="Social Media" />
      </div>


      {/* Grid Estratégia + mLabs — somente para funcionários */}
      {!isClient && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flexShrink: 0, alignItems: 'start' }}>
          {/* Estratégia */}
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} /> Estratégia de Conteúdo
            </div>
            <button 
              className="glass-btn" 
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              onClick={() => isEditingStrategy ? saveStrategyText() : setIsEditingStrategy(true)}
            >
              {isEditingStrategy ? <><Check size={14} color="#10b981"/> Salvar</> : <><Edit3 size={14} /> Editar</>}
            </button>
          </div>
          
          {isEditingStrategy ? (
            <textarea 
               value={strategyText}
               onChange={(e) => setStrategyText(e.target.value)}
               className="glass-input"
               style={{ width: '100%', minHeight: '80px', resize: 'vertical', fontSize: '0.85rem' }}
               placeholder="Descreva a estratégia do cliente aqui..."
               autoFocus
            />
          ) : (
            <p className="text-muted" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', margin: 0 }}>
              {strategyText || `O foco de ${client?.name || 'este cliente'} ainda não foi definido.`}
            </p>
          )}

          {strategyFileUrl && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
               <a href={strategyFileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#93c5fd', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>
                 <FileText size={14} /> Documento de Estratégia
               </a>
               <button onClick={removeStrategyFile} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Remover Arquivo"><Trash2 size={14} /></button>
            </div>
          )}
          {!strategyFileUrl && !isEditingStrategy && (
            <div style={{ marginTop: 12 }}>
              <input type="file" ref={strategyFileInputRef} onChange={handleStrategyUpload} style={{ display: 'none' }} />
              <button className="glass-btn primary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => strategyFileInputRef.current?.click()}>
                <Upload size={12} /> Anexar PDF/Doc
              </button>
            </div>
          )}
        </section>

        {/* Mlabs & Calendário rápido */}
        <section className="glass-panel" style={{ padding: 20, border: '1px solid rgba(236, 72, 153, 0.2)', background: 'rgba(236, 72, 153, 0.02)' }}>
          <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(236, 72, 153, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                <Cloud size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>mLabs INTEGRATION</span>
                {lastSync && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>● LIVE: {lastSync.toLocaleTimeString()}</span>}
              </div>
            </div>
            <button 
              className="premium-action-btn" 
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', background: '#ec4899', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsMlabsModalOpen(true)}
            >
              <Plus size={14} /> CONECTAR
            </button>
          </div>

          <div className="mlabs-connections-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {mlabsConnections.map(conn => (
              <div key={conn.id} className="conn-item-row-premium">
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="live-pulse-pink"></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{conn.profile_name}</span>
                       <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {conn.account_id}</span>
                    </div>
                 </div>
                 <button className="icon-btn-danger" onClick={() => removeMlabs(conn.id)}><Trash2 size={14}/></button>
              </div>
            ))}
            {mlabsConnections.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px dashed rgba(236, 72, 153, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma conta mLabs vinculada.</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CALENDÁRIO DE POSTAGENS</span>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="switch-mini">
                   <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
                   <span className="slider-mini"></span>
                </label>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Auto-Sync</span>
             </div>
          </div>

          <div className="mock-calendar">
            <div className="calendar-day">Seg<br/>12<div className="dot" style={{ background: 'rgba(255,255,255,0.1)' }}></div></div>
            <div className="calendar-day">Ter<br/>13</div>
            <div className="calendar-day active" style={{ borderColor: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' }}>Qua<br/>14<div className="dot" style={{ background: '#ec4899' }}></div></div>
            <div className="calendar-day">Qui<br/>15</div>
            <div className="calendar-day">Sex<br/>16<div className="dot" style={{ background: '#ec4899' }}></div></div>
            <div className="calendar-day">Sáb<br/>17</div>
            <div className="calendar-day">Dom<br/>18</div>
          </div>

          <button 
            className="sync-btn-premium" 
            style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10, background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={handleMlabsSync}
            disabled={isMlabsSyncing || mlabsConnections.length === 0}
          >
            <RefreshCw size={14} className={isMlabsSyncing ? 'spin' : ''} /> 
            {isMlabsSyncing ? 'ATUALIZANDO DADOS...' : 'SINCRONIZAR AGORA'}
          </button>
        </section>
        </div>
      )}

      {!isClient && <DepartmentPipeline client={client} departmentName="Social Media" />}

      {/* O Hub do Google Drive agora é gerenciado globalmente pelo FileManager abaixo deste componente */}
      <style>{`
        .dept-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px; min-height: 0; }
        .mock-calendar { display: flex; gap: 8px; margin-bottom: 12px; flex-shrink: 0;}
        .calendar-day { flex: 1; padding: 8px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 500; position: relative; }
        .calendar-day.active { border-color: var(--primary); background: rgba(99, 102, 241, 0.2); }
        .dot { width: 6px; height: 6px; background: var(--secondary); border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); }
        
        .conn-item-row-premium { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }
        .conn-item-row-premium:hover { background: rgba(255,255,255,0.05); border-color: rgba(236, 72, 153, 0.3); }
        .live-pulse-pink { width: 8px; height: 8px; background: #ec4899; border-radius: 50%; box-shadow: 0 0 8px #ec4899; animation: pulse-pink 1.5s infinite; }
        @keyframes pulse-pink { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }
        
        .icon-btn-danger { background: none; border: none; color: #ef4444; cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s; opacity: 0.5; }
        .icon-btn-danger:hover { background: rgba(239, 68, 68, 0.1); opacity: 1; }
        
        .switch-mini { position: relative; display: inline-block; width: 30px; height: 16px; }
        .switch-mini input { opacity: 0; width: 0; height: 0; }
        .slider-mini { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 16px; }
        .slider-mini:before { position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider-mini { background-color: #ec4899; }
        input:checked + .slider-mini:before { transform: translateX(14px); }

        .sync-btn-premium:hover:not(:disabled) { background: rgba(236, 72, 153, 0.2) !important; transform: translateY(-2px); }
        .premium-action-btn:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 5px 15px rgba(236, 72, 153, 0.3); }

        /* Estilos Locais de Social Media */
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; align-self: flex-start;}
        .bg-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; }
        .bg-video { background: #ef4444; color: white; }
      `}</style>

      {isMlabsModalOpen && (
        <div className="help-modal-overlay no-print" style={{ zIndex: 6000 }}>
           <div className="glass-panel" style={{ 
             width: '100%', maxWidth: 400, padding: 32, 
             display: 'flex', flexDirection: 'column', gap: 20,
             boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
             border: '1px solid rgba(255,255,255,0.1)',
             borderRadius: 24
           }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                  <Cloud size={24} style={{ color: '#ec4899' }}/> mLabs API
                </h3>
                <button onClick={() => setIsMlabsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Conecte a conta mLabs para rastrear o calendário de postagens automaticamente.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div className="form-group-premium">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome do Perfil</label>
                    <input 
                      className="premium-input-field" 
                      placeholder="Ex: @roiexpert_oficial" 
                      value={newMlabs.profile_name} 
                      onChange={e => setNewMlabs({...newMlabs, profile_name: e.target.value})} 
                      style={{ 
                        width: '100%', padding: '12px 16px', borderRadius: 12, 
                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', outline: 'none', fontSize: '0.9rem'
                      }}
                    />
                 </div>

                 <div className="form-group-premium">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account ID (mLabs)</label>
                    <input 
                      className="premium-input-field" 
                      placeholder="Ex: 5829310" 
                      value={newMlabs.account_id} 
                      onChange={e => setNewMlabs({...newMlabs, account_id: e.target.value})} 
                      style={{ 
                        width: '100%', padding: '12px 16px', borderRadius: 12, 
                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', 
                        color: 'white', outline: 'none', fontSize: '0.9rem'
                      }}
                    />
                 </div>

                 <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button className="glass-btn" style={{ flex: 1, padding: '14px', borderRadius: 14, fontWeight: 700 }} onClick={() => setIsMlabsModalOpen(false)}>Cancelar</button>
                    <button 
                      className="premium-action-btn" 
                      onClick={handleAddMlabs}
                      style={{ 
                        flex: 2, padding: '14px', borderRadius: 14, fontWeight: 900, 
                        background: '#ec4899', color: 'white', border: 'none',
                        boxShadow: '0 8px 20px rgba(236, 72, 153, 0.3)', cursor: 'pointer'
                      }}
                    >
                      ATIVAR SYNC
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SocialMedia = () => {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  return (
    <ClientFolderManager title="Social Media" description="Acompanhe o Calendário de Postagem, Estratégia de Conteúdo e Gaveta de Vídeos sincrônicos com o BD.">
      {(client) => (
        <>
          {isClient ? (
            <ClientSocialPanel client={client} />
          ) : (
            <StaffSocialPanel client={client} />
          )}

          <style>{`
            .dept-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px; min-height: 0; }
            .dept-header h1 { font-size: 1.4rem; margin-bottom: 4px; color: var(--text-main); }
            .text-primary { color: var(--primary); }
            .text-muted { color: var(--text-muted); }
            .contact-card { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; margin-bottom: 16px; flex-shrink: 0;}
            .contact-info { display: flex; align-items: center; gap: 12px; }
            .contact-info h3 { margin: 0; font-size: 1rem; }
            .contact-info p { margin: 0; font-size: 0.8rem; }
            .glass-btn { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: 0.2s; font-size:0.85rem;}
            .glass-btn.primary { background: var(--primary); border-color: transparent; }
            .glass-btn:hover { background: rgba(99, 102, 241, 0.4); border-color: var(--primary); }
            .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .glass-input { flex: 1; min-width: 0; background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size:0.85rem;}
            .glass-input:focus { border-color: var(--primary); }
            .add-task-form { display: flex; gap: 8px; margin-bottom: 16px; flex-shrink: 0;}
            .dept-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; min-height: 0; }
            .col-span-2 { grid-column: span 2; display: flex; flex-direction: column; min-height: 0;}
            .dept-grid section { padding: 16px; overflow-y: auto;}
            .section-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; flex-shrink: 0;}
            .mock-calendar { display: flex; gap: 8px; margin-bottom: 16px; flex-shrink: 0;}
            .calendar-day { flex: 1; padding: 8px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 500; position: relative; }
            .calendar-day.active { border-color: var(--primary); background: rgba(99, 102, 241, 0.2); }
            .dot { width: 6px; height: 6px; background: var(--secondary); border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); }
            .post-list { display: flex; flex-direction: column; gap: 12px; }
            .post-item { padding: 12px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; margin-bottom: 6px; align-self: flex-start;}
            .bg-instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; }
            .video-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
            .video-list li { padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid transparent; transition: 0.2s;}
            .video-list li:hover { border-color: rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); }
            .icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
            .icon-btn:hover { background: rgba(255,0,0,0.1); color: #ff4444; }
            .spin { animation: spin 1s linear infinite; }
            .loading-state { display: flex; align-items: center; gap: 8px; color: var(--text-muted); padding: 20px; justify-content: center;}
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </ClientFolderManager>
  );
};
export default SocialMedia;
