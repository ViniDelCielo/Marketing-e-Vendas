import { Target, BarChart, Users, MessageSquare, CheckSquare, Settings, AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Edit2, Save, X as CloseIcon, Plus, Trash2, PieChart, Globe, Link, ExternalLink, HardDrive, FileText, Send } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import ClientFolderManager from '../components/ClientFolderManager';
import DepartmentPipeline from '../components/DepartmentPipeline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import { useAuth } from '../context/AuthContext';

const TrafegoContent = ({ client }) => {
  const { user } = useAuth();
  const isClient = user?.role === 'client';
  const [dailyRoutine, setDailyRoutine] = useState([
    { id: 1, task: 'Verificar orçamentos e gastos diários nas plataformas', done: false },
    { id: 2, task: 'Analisar CTR e CPA das campanhas ativas (identificar anomalias)', done: false },
    { id: 3, task: 'Checar se existem anúncios reprovados ou limitações', done: false },
    { id: 4, task: 'Otimizar lances e segmentações das campanhas em aprendizado', done: false },
    { id: 5, task: 'Pausar criativos saturados ou com custo muito elevado', done: false },
  ]);

  const [leadsMeta, setLeadsMeta] = useState(0);
  const [leadsGoogle, setLeadsGoogle] = useState(0);
  const [clicksMeta, setClicksMeta] = useState(0);
  const [clicksGoogle, setClicksGoogle] = useState(0);
  const [metaBalance, setMetaBalance] = useState(0);
  const [googleBalance, setGoogleBalance] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isEditingData, setIsEditingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [connections, setConnections] = useState([]);
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [newConn, setNewConn] = useState({ platform: 'meta', account_id: '', account_name: '' });
  
  const [logs, setLogs] = useState([]);
  const [newLog, setNewLog] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editLogContent, setEditLogContent] = useState('');

  useEffect(() => {
    if (client?.metadata) {
      setLeadsMeta(client.metadata.leads_meta || 0);
      setLeadsGoogle(client.metadata.leads_google || 0);
      setClicksMeta(client.metadata.clicks_meta || 0);
      setClicksGoogle(client.metadata.clicks_google || 0);
      setMetaBalance(client.metadata.meta_balance || 0);
      setGoogleBalance(client.metadata.google_balance || 0);
      if (client.metadata.daily_routine) setDailyRoutine(client.metadata.daily_routine);
      setCampaigns(client.metadata.campaigns || []);
      setAlerts(client.metadata.alerts || []);
      fetchConnections();
      fetchLogs();
    }
  }, [client]);

  const fetchConnections = async () => {
    if (!client?.id) return;
    const { data } = await supabase.from('ads_connections').select('*').eq('client_id', client.id);
    setConnections(data || []);
  };

  const fetchLogs = async () => {
    if (!client?.id) return;
    setLoadingLogs(true);
    const { data } = await supabase.from('trafego_logs').select('*').eq('client_id', client.id).order('created_at', { ascending: false });
    setLogs(data || []);
    setLoadingLogs(false);
  };

  const handleAddConnection = async () => {
    try {
      const { error } = await supabase.from('ads_connections').insert([{
        client_id: client.id,
        ...newConn
      }]);
      if (error) throw error;
      setIsConnModalOpen(false);
      setNewConn({ platform: 'meta', account_id: '', account_name: '' });
      fetchConnections();
    } catch (err) {
      alert("Erro ao conectar: " + err.message);
    }
  };

  const handleAddLog = async () => {
    if (!newLog.trim()) return;
    try {
      const { error } = await supabase.from('trafego_logs').insert([{
        client_id: client.id,
        author_name: user?.name || 'Colaborador',
        content: newLog.trim()
      }]);
      if (error) throw error;
      setNewLog('');
      fetchLogs();
    } catch (err) {
      alert('Erro ao salvar resumo: ' + err.message);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Deseja realmente excluir este resumo?")) return;
    try {
      const { error } = await supabase.from('trafego_logs').delete().eq('id', id);
      if (error) throw error;
      fetchLogs();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleEditLog = async (id) => {
    if (!editLogContent.trim()) return;
    try {
      const { error } = await supabase.from('trafego_logs').update({ content: editLogContent.trim() }).eq('id', id);
      if (error) throw error;
      setEditingLogId(null);
      fetchLogs();
    } catch (err) {
      alert("Erro ao editar: " + err.message);
    }
  };

  const handleSyncAds = async () => {
    if (connections.length === 0) { alert("Conecte ao menos uma conta primeiro!"); return; }
    setIsSyncing(true);
    
    try {
      // Chama a Edge Function que faz a integração real
      const { data, error } = await supabase.functions.invoke('sync-ads-data', {
        body: { client_id: client.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Atualiza o estado visualmente com os dados reais retornados
      if (data?.metadata) {
        setLeadsMeta(data.metadata.leads_meta || 0);
        setLeadsGoogle(data.metadata.leads_google || 0);
        setClicksMeta(data.metadata.clicks_meta || 0);
        setClicksGoogle(data.metadata.clicks_google || 0);
        setMetaBalance(data.metadata.meta_balance || 0);
        setGoogleBalance(data.metadata.google_balance || 0);
      }
      
      alert("Dados sincronizados com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao sincronizar dados reais. Verifique se os tokens estão configurados: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveData = async () => {
    setSavingData(true);
    try {
      const newMetadata = {
        ...client.metadata,
        leads_meta: Number(leadsMeta),
        leads_google: Number(leadsGoogle),
        clicks_meta: Number(clicksMeta),
        clicks_google: Number(clicksGoogle),
        meta_balance: Number(metaBalance),
        google_balance: Number(googleBalance),
        campaigns, alerts, daily_routine: dailyRoutine
      };
      await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
      setIsEditingData(false);
    } catch (error) {
      alert('Erro ao atualizar dados.');
    } finally {
      setSavingData(false);
    }
  };

  const toggleTask = (id) => {
    setDailyRoutine(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const totalLeads = Number(leadsMeta) + Number(leadsGoogle);
  const totalClicks = Number(clicksMeta) + Number(clicksGoogle);

  const chartData = [
    { name: 'Jan', leads: Math.floor(totalLeads * 0.7) },
    { name: 'Fev', leads: Math.floor(totalLeads * 0.85) },
    { name: 'Mar', leads: totalLeads },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <DepartmentGuide department="Tráfego Pago" />
        <GoogleDriveConnector client={client} department="Tráfego Pago" />
      </div>

      {/* Checklist Diário — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
            <CheckSquare size={20} className="text-primary" /> Rotina Diária Obrigatória
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {dailyRoutine.map(task => (
              <div key={task.id} onClick={() => toggleTask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: task.done ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: task.done ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer' }}>
                <div style={{ color: task.done ? '#10b981' : 'var(--text-muted)' }}>
                  {task.done ? <CheckCircle size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />}
                </div>
                <span style={{ fontSize: '0.9rem', color: task.done ? '#10b981' : 'white', textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DepartmentPipeline — somente funcionários */}
      {!isClient && (
        <DepartmentPipeline client={client} departmentName="Tráfego Pago" />
      )}

      {/* CONTAS VINCULADAS LISTA — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
           <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold' }}>
                <Globe size={20} className="text-primary" /> Conexões Ativas
              </div>
              <button onClick={() => setIsConnModalOpen(true)} className="glass-btn primary small" style={{ fontSize: '0.75rem' }}>
                <Link size={14} /> Vincular Conta
              </button>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {connections.map(conn => (
                <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                  <div>
                     <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{conn.platform.toUpperCase()}</div>
                     <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{conn.account_id}</div>
                  </div>
                </div>
              ))}
              {connections.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma conta vinculada.</p>}
           </div>
        </section>
      )}

      {/* Saldo e Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* SALDO DAS CONTAS */}
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold' }}>
              <PieChart size={20} className="text-primary" /> Saldo Disponível para Anúncios
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="balance-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Meta Ads</span>
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>R$ {Number(metaBalance).toLocaleString('pt-BR')}</span>
              </div>
              <div className="balance-bar-bg"><div className="balance-bar-fill" style={{ width: '65%', background: '#3b82f6' }}></div></div>
            </div>
            <div className="balance-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Google Ads</span>
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>R$ {Number(googleBalance).toLocaleString('pt-BR')}</span>
              </div>
              <div className="balance-bar-bg"><div className="balance-bar-fill" style={{ width: '40%', background: '#ea4335' }}></div></div>
            </div>
          </div>
        </section>

        {/* RESUMO DA CONTA */}
        {!isClient && (
          <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold' }}>
              <FileText size={20} className="text-primary" /> Resumo da Conta
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
              {logs.map(log => (
                <div key={log.id} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.75rem' }}>{log.author_name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                       <button onClick={() => { setEditingLogId(log.id); setEditLogContent(log.content); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}><Edit2 size={12} /></button>
                       <button onClick={() => handleDeleteLog(log.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {editingLogId === log.id ? (
                     <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input className="glass-input" style={{ flex: 1, height: 32, fontSize: '0.8rem' }} value={editLogContent} onChange={e => setEditLogContent(e.target.value)} />
                        <button onClick={() => handleEditLog(log.id)} className="glass-btn primary small" style={{ height: 32, padding: '0 12px' }}>Salvar</button>
                        <button onClick={() => setEditingLogId(null)} className="glass-btn small" style={{ height: 32, padding: '0 12px' }}>Cancelar</button>
                     </div>
                  ) : (
                     <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{log.content}</p>
                  )}
                </div>
              ))}
              {logs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 20 }}>Nenhum registro hoje.</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <input 
                value={newLog}
                onChange={e => setNewLog(e.target.value)}
                placeholder="Descreva as ações do dia..."
                className="glass-input"
                style={{ flex: 1, height: 40, fontSize: '0.85rem' }}
                onKeyDown={e => e.key === 'Enter' && handleAddLog()}
              />
              <button onClick={handleAddLog} className="glass-btn primary" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                <Send size={16} />
              </button>
            </div>
          </section>
        )}
      </div>



      <div className="dept-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* MÉTRICAS E GRÁFICO */}
        <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={20} className="text-primary" /> Desempenho Mensal</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setIsEditingData(!isEditingData)} className="icon-btn">{isEditingData ? <CloseIcon size={16}/> : <Edit2 size={16}/>}</button>
              <button onClick={handleSyncAds} disabled={isSyncing} className="glass-btn primary small" style={{ fontSize: '0.7rem' }}>
                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} /> Sync
              </button>
            </div>
          </div>

          {isEditingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="glass-input" placeholder="Leads Meta" value={leadsMeta} onChange={e=>setLeadsMeta(e.target.value)}/>
                  <input className="glass-input" placeholder="Cliques Meta" value={clicksMeta} onChange={e=>setClicksMeta(e.target.value)}/>
                  <input className="glass-input" placeholder="Leads Google" value={leadsGoogle} onChange={e=>setLeadsGoogle(e.target.value)}/>
                  <input className="glass-input" placeholder="Cliques Google" value={clicksGoogle} onChange={e=>setClicksGoogle(e.target.value)}/>
               </div>
               <button onClick={handleSaveData} className="glass-btn primary">Salvar</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="stat-card">
                  <label>Total de Leads</label>
                  <div className="value">{totalLeads}</div>
                  <div className="sub-value"><span style={{color: '#3b82f6'}}>M: {leadsMeta}</span> • <span style={{color: '#ea4335'}}>G: {leadsGoogle}</span></div>
                </div>
                <div className="stat-card">
                  <label>Total de Cliques</label>
                  <div className="value" style={{color: '#10b981'}}>{totalClicks}</div>
                  <div className="sub-value"><span style={{color: '#3b82f6'}}>M: {clicksMeta}</span> • <span style={{color: '#ea4335'}}>G: {clicksGoogle}</span></div>
                </div>
              </div>
              <div style={{ height: 180, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="leads" stroke="var(--primary)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        {/* CAMPANHAS E ALERTAS */}
        <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart size={20} className="text-primary" /> Campanhas Ativas</div>
            <button onClick={() => setCampaigns([...campaigns, {id: Date.now(), platform: 'Meta Ads', name: 'Nova Campanha', costPerLead: '0.00', status: 'Ativa'}])} className="icon-btn"><Plus size={18}/></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{c.name}</div>
                   <div style={{ fontSize: '0.7rem', color: c.platform.includes('Meta') ? '#3b82f6' : '#ea4335' }}>{c.platform}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.85rem', color: '#10b981' }}>R$ {c.costPerLead}/lead</div>
                   <div className="status-badge active">Ativa</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
             <h5 style={{ margin: '0 0 8px 0', color: '#ea4335', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14}/> Alertas Críticos</h5>
             {alerts.map(a => <div key={a.id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>• {a.text}</div>)}
          </div>
        </section>
      </div>

      {/* BIBLIOTECA DE CRIATIVOS — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <PieChart size={20} className="text-primary" /> Biblioteca de Criativos de Alta Conversão
            </div>
            <button className="glass-btn primary small" style={{ fontSize: '0.75rem' }}>
              <Plus size={14} /> Solicitar Novo Criativo
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { id: 1, img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop', ctr: '3.2%', cpc: 'R$ 0,80', nome: 'Criativo_Ebook_01' },
              { id: 2, img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop', ctr: '2.8%', cpc: 'R$ 1,05', nome: 'Criativo_Consultoria' },
              { id: 3, img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop', ctr: '4.5%', cpc: 'R$ 0,55', nome: 'Vídeo_Promocional_V1' },
              { id: 4, img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=250&fit=crop', ctr: '2.1%', cpc: 'R$ 1,20', nome: 'Carrossel_Servicos' }
            ].map(criativo => (
              <div key={criativo.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <img src={criativo.img} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                 <div style={{ padding: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>{criativo.nome}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>CTR: {criativo.ctr}</span>
                      <span>CPC: {criativo.cpc}</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}



      {isConnModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: 400, padding: 24, position: 'relative' }}>
            <button onClick={() => setIsConnModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <CloseIcon size={20} />
            </button>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link size={20} className="text-primary"/> Vincular Conta ADS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="field-label">Plataforma</label>
                <select className="glass-input" style={{ width: '100%' }} value={newConn.platform} onChange={e => setNewConn({...newConn, platform: e.target.value})}>
                  <option value="meta">Meta Ads (Facebook/Instagram)</option>
                  <option value="google">Google Ads (Pesquisa/Youtube)</option>
                </select>
              </div>
              <div>
                <label className="field-label">Account ID</label>
                <input className="glass-input" style={{ width: '100%' }} placeholder="Ex: act_123456 ou 123-456-7890" value={newConn.account_id} onChange={e => setNewConn({...newConn, account_id: e.target.value})} />
              </div>
              <button onClick={handleAddConnection} className="glass-btn primary" style={{ width: '100%', marginTop: 8 }}>ATIVAR CONEXÃO</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; display: block; font-weight: bold; text-transform: uppercase; }
        .stat-card { background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .stat-card label { font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px; }
        .stat-card .value { font-size: 1.8rem; font-weight: 800; }
        .stat-card .sub-value { font-size: 0.7rem; color: var(--text-muted); }
        .balance-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 16px; }
        .balance-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; margin-top: 8px; }
        .balance-bar-fill { height: 100%; border-radius: 10px; }
        .status-badge { padding: 2px 6px; border-radius: 6px; font-size: 0.65rem; font-weight: bold; background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .icon-btn { background: transparent; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .icon-btn:hover { color: var(--primary); transform: scale(1.1); }
      `}</style>
    </div>
  );
};

const Trafego = () => {
  return (
    <ClientFolderManager title="Tráfego Pago" description="Gestão estratégica de campanhas e rotina operacional.">
      {(client) => <TrafegoContent client={client} />}
    </ClientFolderManager>
  );
};
export default Trafego;
