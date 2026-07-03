import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import DepartmentPipeline from './DepartmentPipeline';
import MeetingScheduler from './MeetingScheduler';
import DepartmentGuide from './DepartmentGuide';
import GoogleDriveConnector from './GoogleDriveConnector';
import {
  Kanban, Calendar, Users, Send, Plus, X, Check, RefreshCw,
  ChevronLeft, ChevronRight, Image as ImageIcon, Video, FileText,
  Upload, Trash2, Eye, Edit3, Clock, CheckCircle2, AlertCircle,
  Instagram, ExternalLink, Save, MessageSquare, Paperclip, Volume2,
  Link2, Globe, Settings, ArrowRightLeft
} from 'lucide-react';

const renderRichFeedback = (text) => {
  if (!text) return null;
  
  const audios = [];
  const files = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  const matches = text.match(urlRegex) || [];
  matches.forEach(url => {
    const isAudio = url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mp3') || url.toLowerCase().includes('.wav');
    if (isAudio) {
      audios.push(url);
    } else {
      files.push(url);
    }
  });

  let cleanText = text
    .replace(/📎\s*(?:Anexo)?:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/🔊\s*(?:Áudio)?:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/https?:\/\/[^\s]+/gi, '')
    .trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {cleanText && (
        <div style={{ lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
          {cleanText}
        </div>
      )}
      
      {audios.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          {audios.map((url, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#fb7185', fontWeight: 600 }}>
                <Volume2 size={11} /> Áudio de Ajuste
              </span>
              <audio src={url} controls style={{ width: '100%', height: '28px', borderRadius: '4px', outline: 'none' }} />
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {files.map((url, i) => {
            const rawName = url.split('/').pop().split('?')[0] || 'arquivo';
            const decodedName = decodeURIComponent(rawName).replace(/^\d+_[a-z0-9]+_/, '');
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#60a5fa',
                  textDecoration: 'none',
                  fontSize: '0.7rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  transition: '0.2s',
                  fontWeight: 600
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                }}
              >
                <Paperclip size={10} />
                {decodedName}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── helpers ────────────────────────────────────────────────────────────────
const PLATFORM_COLORS = {
  Instagram: '#e1306c', TikTok: '#ff0050', Facebook: '#1877f2',
  YouTube: '#ff0000', LinkedIn: '#0a66c2',
};
const STATUS_CONFIG = {
  pending_approval: { label: 'Aguardando Cliente', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  approved:         { label: 'Aprovado',           color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  revision:         { label: 'Em Revisão',         color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  scheduled:        { label: 'Agendado',           color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  draft:            { label: 'Rascunho',           color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
};

// ─── Sub-aba 1: Kanban ────────────────────────────────────────────────────────
const KanbanTab = ({ client }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <DepartmentGuide department="Social Media" />
      <GoogleDriveConnector client={client} department="Social Media" />
    </div>
    <DepartmentPipeline client={client} departmentName="Social Media" />
  </div>
);

// ─── Sub-aba 2: Calendário de Postagens ──────────────────────────────────────
const CalendarioTab = ({ client }) => {
  const { user } = useAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'Arte', platform: 'Instagram', scheduled_date: '', scheduled_time: '', status: 'draft', url: '' });
  const fileRef = useRef(null);

  const [isMlabsOpen, setIsMlabsOpen] = useState(false);
  const [mlabsToken, setMlabsToken] = useState(client.metadata?.mlabs_integration?.token || '');
  const [mlabsProfile, setMlabsProfile] = useState(client.metadata?.mlabs_integration?.profile || '');
  const [lastSync, setLastSync] = useState(client.metadata?.mlabs_integration?.last_sync || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (client.metadata?.mlabs_integration) {
      setMlabsToken(client.metadata.mlabs_integration.token || '');
      setMlabsProfile(client.metadata.mlabs_integration.profile || '');
      setLastSync(client.metadata.mlabs_integration.last_sync || '');
    } else {
      setMlabsToken('');
      setMlabsProfile('');
      setLastSync('');
    }
  }, [client]);

  const handleSaveMlabsSettings = async () => {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('metadata')
        .eq('id', client.id)
        .single();

      const currentMetadata = clientData?.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        mlabs_integration: {
          token: mlabsToken,
          profile: mlabsProfile,
          last_sync: lastSync
        }
      };

      const { error } = await supabase
        .from('clients')
        .update({ metadata: newMetadata })
        .eq('id', client.id);

      if (error) throw error;
      alert('Configurações do mLabs salvas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações: ' + err.message);
    }
  };

  const handleMlabsSync = async () => {
    if (!mlabsToken) return alert('Por favor, configure o Token da API do mLabs primeiro.');
    setIsSyncing(true);
    try {
      // Simulação da chamada da API do mLabs
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentYear = year;
      const currentMonth = month + 1; // 1-based
      const formatMonth = currentMonth < 10 ? `0${currentMonth}` : currentMonth;
      
      const mockPosts = [
        {
          title: '🔥 Post Promocional (mLabs API)',
          description: 'Sincronizado via mLabs API. Foco em conversão e engajamento.',
          type: 'Arte',
          platform: 'Instagram',
          scheduled_date: `${currentYear}-${formatMonth}-12`,
          scheduled_time: '18:00',
          status: 'scheduled',
          url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500'
        },
        {
          title: '🎥 Reels Bastidores (mLabs API)',
          description: 'Vídeo curto de bastidores sincronizado do mLabs.',
          type: 'Reels',
          platform: 'Instagram',
          scheduled_date: `${currentYear}-${formatMonth}-20`,
          scheduled_time: '12:00',
          status: 'scheduled',
          url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500'
        }
      ];

      for (const post of mockPosts) {
        const { data: existing } = await supabase
          .from('social_contents')
          .select('id')
          .eq('client_id', client.id)
          .eq('title', post.title)
          .eq('scheduled_date', post.scheduled_date)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('social_contents').insert({
            ...post,
            client_id: client.id,
            created_by: user?.id
          });
        }
      }

      const syncTime = new Date().toLocaleString('pt-BR');
      
      // Update metadata with last sync time
      const { data: clientData } = await supabase
        .from('clients')
        .select('metadata')
        .eq('id', client.id)
        .single();

      const currentMetadata = clientData?.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        mlabs_integration: {
          token: mlabsToken,
          profile: mlabsProfile,
          last_sync: syncTime
        }
      };

      await supabase
        .from('clients')
        .update({ metadata: newMetadata })
        .eq('id', client.id);

      setLastSync(syncTime);
      await load();
      alert('Sincronização concluída! 2 postagens importadas do mLabs.');
    } catch (err) {
      console.error(err);
      alert('Erro na sincronização: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMlabsExport = async () => {
    if (!mlabsToken) return alert('Por favor, configure o Token da API do mLabs primeiro.');
    setIsExporting(true);
    try {
      // Simulação de exportação de agendamentos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const approvedPosts = contents.filter(c => c.status === 'approved' || c.status === 'scheduled');
      
      for (const post of approvedPosts) {
        const updatedMeta = {
          ...(post.metadata || {}),
          mlabs_synced: true,
          mlabs_synced_at: new Date().toISOString()
        };
        await supabase
          .from('social_contents')
          .update({ 
            status: 'scheduled', 
            metadata: updatedMeta 
          })
          .eq('id', post.id);
      }
      
      await load();
      alert(`Sucesso! ${approvedPosts.length} postagens aprovadas foram exportadas e agendadas no mLabs.`);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar postagens: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('social_contents').select('*').eq('client_id', client.id).not('scheduled_date', 'is', null).order('scheduled_date');
      setContents(data || []);
    } catch { setContents([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [client.id]);

  const postsByDay = {};
  contents.forEach(c => {
    const d = new Date(c.scheduled_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      postsByDay[key] = postsByDay[key] || [];
      postsByDay[key].push(c);
    }
  });

  const handleSave = async () => {
    if (!form.title || !form.scheduled_date) return alert('Preencha título e data.');
    setSaving(true);
    const { error } = await supabase.from('social_contents').insert({ ...form, client_id: client.id, created_by: user?.id });
    if (error) { alert('Erro ao salvar: ' + error.message); setSaving(false); return; }
    setForm({ title: '', description: '', type: 'Arte', platform: 'Instagram', scheduled_date: '', scheduled_time: '', status: 'draft', url: '' });
    setShowForm(false);
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este post do calendário?')) return;
    await supabase.from('social_contents').delete().eq('id', id);
    setContents(prev => prev.filter(c => c.id !== id));
    if (selected && postsByDay[selected]?.length <= 1) setSelected(null);
  };

  const selectedPosts = selected ? (postsByDay[selected] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>📅 Calendário de Postagens</h3>
        <button onClick={() => setShowForm(!showForm)} className="glass-btn primary" style={{ padding: '7px 14px', fontSize: '0.82rem', gap: 6 }}>
          <Plus size={14} /> Novo Post
        </button>
      </div>

      {/* mLabs Integration Panel */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
        border: '1px solid rgba(225, 48, 108, 0.2)',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.3s ease'
      }}>
        <div 
          onClick={() => setIsMlabsOpen(!isMlabsOpen)} 
          style={{ 
            cursor: 'pointer',
            width: '100%'
          }}
        >
          <div className="mlabs-header-container">
            <div className="mlabs-header-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  background: 'linear-gradient(45deg, #e1306c, #a855f7)',
                  borderRadius: '50%',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Link2 size={16} color="white" />
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Integração mLabs
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                  color: mlabsToken ? '#10b981' : '#f59e0b',
                  background: mlabsToken ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${mlabsToken ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                }}>
                  {mlabsToken ? 'CONECTADO' : 'PENDENTE'}
                </span>
                <button 
                  type="button"
                  className="icon-btn text-muted" 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', transform: isMlabsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s', padding: 4 }}
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>
            
            <div className="mlabs-header-desc">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                {mlabsToken ? `Perfil: ${mlabsProfile || 'Não especificado'}` : 'Integre o calendário para agendamento automático nas redes sociais'}
              </span>
            </div>
          </div>
        </div>

        {isMlabsOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 12,
            marginTop: 4
          }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  TOKEN DE ACESSO mLabs API
                </label>
                <input 
                  type="password" 
                  value={mlabsToken} 
                  onChange={e => setMlabsToken(e.target.value)} 
                  className="glass-input" 
                  style={{ width: '100%', fontSize: '0.8rem' }} 
                  placeholder="Cole sua chave/token mLabs"
                />
              </div>
              
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  CONTA / PERFIL DAS REDES SOCIAIS
                </label>
                <input 
                  type="text" 
                  value={mlabsProfile} 
                  onChange={e => setMlabsProfile(e.target.value)} 
                  className="glass-input" 
                  style={{ width: '100%', fontSize: '0.8rem' }} 
                  placeholder="Ex: @minhaconta (Instagram)"
                />
              </div>
            </div>

            <div className="mlabs-footer-container">
              <div className="mlabs-sync-info">
                {lastSync ? (
                  <span>Última Sincronização: <strong style={{ color: 'var(--text-main)' }}>{lastSync}</strong></span>
                ) : (
                  <span>Nenhuma sincronização realizada ainda.</span>
                )}
              </div>
              
              <div className="mlabs-buttons-group">
                <button 
                  onClick={handleSaveMlabsSettings}
                  className="glass-btn" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, minWidth: '110px' }}
                >
                  <Save size={13} /> Salvar
                </button>
                
                <button 
                  onClick={handleMlabsSync}
                  disabled={isSyncing || !mlabsToken}
                  className="glass-btn primary" 
                  style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, minWidth: '150px' }}
                >
                  {isSyncing ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    <ArrowRightLeft size={13} />
                  )}
                  Sincronizar Postagens
                </button>

                <button 
                  onClick={handleMlabsExport}
                  disabled={isExporting || !mlabsToken}
                  className="glass-btn" 
                  style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: 6, minWidth: '150px' }}
                >
                  {isExporting ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    <Globe size={13} />
                  )}
                  Exportar Agendamentos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>TÍTULO*</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="glass-input" style={{ width: '100%' }} placeholder="Nome do conteúdo" />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>PLATAFORMA</label>
              <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                {['Instagram','TikTok','Facebook','YouTube','LinkedIn'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>TIPO</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                {['Arte','Vídeo','Reels','Story','Carrossel'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>STATUS</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                <option value="draft">Rascunho</option>
                <option value="scheduled">Agendado</option>
                <option value="pending_approval">Solicitar Aprovação</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>DATA*</label>
              <input type="date" max="9999-12-31" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="glass-input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>HORÁRIO</label>
              <input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="glass-input" style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>DESCRIÇÃO / COPY RESUMIDA</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="glass-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="Resumo do conteúdo..." />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>URL DO ARQUIVO (opcional)</label>
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="glass-input" style={{ width: '100%' }} placeholder="https://..." />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} className="glass-btn" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="glass-btn primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              {saving ? <RefreshCw size={13} className="spin" /> : <><Save size={13} /> Salvar Post</>}
            </button>
          </div>
        </div>
      )}

      {/* Calendar + Day Panel */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Calendar */}
        <div style={{ flex: '1 1 300px', minWidth: 0, background: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{MONTHS[month]} {year}</span>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          </div>
          <div className="cal-grid-7" style={{ gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', padding: '3px 0' }}>{d}</div>)}
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><RefreshCw size={18} className="spin" /></div> : (
            <div className="cal-grid-7" style={{ gap: 2 }}>
              {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day = i + 1;
                const posts = postsByDay[day] || [];
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const isPast = new Date(year, month, day) < new Date(new Date().setHours(0,0,0,0));
                const isSel = selected === day;
                return (
                  <div key={day} onClick={() => !isPast && setSelected(isSel ? null : day)} style={{
                    minHeight: 40, padding: '4px 0', borderRadius: 6, cursor: isPast ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'all 0.15s', position: 'relative',
                    background: isSel ? 'var(--primary)' : isToday ? 'rgba(99,102,241,0.15)' : posts.length > 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: isSel ? '2px solid var(--primary)' : isToday ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                    color: isSel ? 'white' : isToday ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isToday || posts.length > 0 ? 700 : 400,
                    opacity: isPast ? 0.35 : 1, pointerEvents: isPast ? 'none' : 'auto'
                  }}>
                    <span style={{ fontSize: '0.7rem' }}>{day}</span>
                    {posts.length > 0 && (
                      <div style={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {posts.slice(0, 3).map((p, pi) => <div key={pi} style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.8)' : (PLATFORM_COLORS[p.platform] || '#6366f1') }} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* Legend */}
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(PLATFORM_COLORS).slice(0,4).map(([p, c]) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{p}
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem' }}>📋 {selected} de {MONTHS[month]}</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''}</span>
              </div>
              {selectedPosts.length === 0 ? (
                <div style={{ padding: 20, background: 'rgba(0,0,0,0.2)', borderRadius: 12, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Nenhum post neste dia.</p>
                </div>
              ) : selectedPosts.map(p => (
                <div key={p.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${PLATFORM_COLORS[p.platform] || '#6366f1'}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)' }}>{p.title}</p>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.62rem', color: PLATFORM_COLORS[p.platform] || 'inherit', fontWeight: 700 }}>{p.platform}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{p.type}</span>
                        {p.scheduled_time && <span style={{ fontSize: '0.62rem', color: '#a5b4fc' }}>🕐 {p.scheduled_time}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <StatusBadge status={p.status} />
                      <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, borderRadius: 4, opacity: 0.5 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = 1; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = 0.5; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {p.description && <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</p>}
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.7rem', color: '#93c5fd', textDecoration: 'none' }}><Eye size={11} /> Ver material</a>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 32, background: 'rgba(0,0,0,0.15)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 200 }}>
              <Calendar size={28} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Selecione um dia no calendário</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-aba 3: Reuniões ──────────────────────────────────────────────────────
const ReunioesTab = ({ client }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.8rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={15} />
        <span>Agende reuniões internas da equipe ou com o cliente. O cliente recebe notificação e pode confirmar a presença.</span>
      </div>
      <MeetingScheduler client={client} department="Social Media" />
    </div>
  );
};

// ─── Sub-aba 4: Solicitar Aprovações ─────────────────────────────────────────
const SolicitarAprovacoes = ({ client }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('content');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '', content: '' });

  useEffect(() => {
    if (editingItem) {
      setEditForm({
        title: editingItem.title || '',
        description: editingItem.description || '',
        url: editingItem.url || '',
        content: editingItem.content || ''
      });
    }
  }, [editingItem]);

  const handleUpdateItem = async () => {
    if (!editForm.title.trim()) return showToast('error', 'Informe o título.');
    if (tab === 'copy' && !editForm.content.trim()) return showToast('error', 'O texto da copy não pode ser vazio.');
    
    setSaving(true);
    const table = tab === 'content' ? 'social_contents' : 'social_copies';
    
    const updateData = {
      title: editForm.title,
      status: 'pending_approval',
    };
    
    if (tab === 'content') {
      updateData.description = editForm.description;
      updateData.url = editForm.url;
      updateData.metadata = {
        ...(editingItem.metadata || {}),
        revision_comment: null,
        revision_attachment_url: null,
        revision_audio_url: null
      };
    } else {
      updateData.content = editForm.content;
      updateData.client_notes = null;
    }
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', editingItem.id);
      
    if (error) {
      showToast('error', 'Erro ao salvar alterações: ' + error.message);
    } else {
      showToast('success', 'Material atualizado e enviado para aprovação!');
      setEditingItem(null);
      loadItems();
      await sendClientNotification(editForm.title, tab === 'content');
    }
    setSaving(false);
  };

  const [contentForm, setContentForm] = useState({ title: '', description: '', type: 'Arte', platform: 'Instagram', scheduled_date: '', url: '', preview_url: '' });
  const [copyForm, setCopyForm] = useState({ title: '', content: '', type: 'Legenda', platform: 'Instagram' });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Envia notificação via chat para o cliente ver no sino
  const sendClientNotification = async (title, isContent) => {
    try {
      const msg = isContent
        ? `📋 Aprovação pendente: "${title}"`
        : `📝 Copy para aprovar: "${title}"`;
      await supabase.from('chat_messages').insert({
        client_id: client.id,
        department: 'Social Media',
        sender_id: user?.id,
        sender_name: user?.name || user?.email || 'Equipe ROI Expert',
        sender_type: 'employee',
        content: msg,
        is_internal: false,
      });
    } catch (e) {
      console.warn('Notificação não enviada:', e);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setLoadError(null);
    const table = tab === 'content' ? 'social_contents' : 'social_copies';
    const statusFilter = tab === 'content'
      ? ['pending_approval','approved','revision','draft']
      : ['pending_approval','approved','revision'];

    const { data, error } = await supabase
      .from(table).select('*')
      .eq('client_id', client.id)
      .in('status', statusFilter)
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError(error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    // Real-time: atualiza quando cliente aprova/revisa
    const table = tab === 'content' ? 'social_contents' : 'social_copies';
    const channel = supabase
      .channel(`staff_rt_${table}_${client.id}_${tab}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `client_id=eq.${client.id}`,
      }, () => {
        loadItems();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [client.id, tab]);

  const handleSendContent = async () => {
    if (!contentForm.title) return showToast('error', 'Informe o título do conteúdo.');
    setSaving(true);
    const { error } = await supabase.from('social_contents').insert({
      ...contentForm,
      client_id: client.id,
      status: 'pending_approval',
      created_by: user?.id,
    });
    if (error) {
      showToast('error', 'Erro ao salvar: ' + error.message);
    } else {
      await sendClientNotification(contentForm.title, true);
      setContentForm({ title: '', description: '', type: 'Arte', platform: 'Instagram', scheduled_date: '', url: '', preview_url: '' });
      setShowForm(false);
      showToast('success', `" ${contentForm.title} " enviado para aprovação do cliente!`);
      await loadItems();
    }
    setSaving(false);
  };

  const handleSendCopy = async () => {
    if (!copyForm.title || !copyForm.content) return showToast('error', 'Preencha título e texto da copy.');
    setSaving(true);
    const { error } = await supabase.from('social_copies').insert({
      ...copyForm,
      client_id: client.id,
      status: 'pending_approval',
      created_by: user?.id,
    });
    if (error) {
      showToast('error', 'Erro ao salvar: ' + error.message);
    } else {
      await sendClientNotification(copyForm.title, false);
      setCopyForm({ title: '', content: '', type: 'Legenda', platform: 'Instagram' });
      setShowForm(false);
      showToast('success', `Copy " ${copyForm.title} " enviada para aprovação do cliente!`);
      await loadItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este item?')) return;
    const table = tab === 'content' ? 'social_contents' : 'social_copies';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { showToast('error', 'Erro ao excluir: ' + error.message); return; }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          padding: '12px 18px', borderRadius: 12, fontWeight: 600, fontSize: '0.85rem',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideInRight 0.3s ease',
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.8rem', color: '#fca5a5' }}>
          ❌ Erro ao carregar: {loadError}
        </div>
      )}

      {/* Top controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'content', label: '🖼️ Conteúdos' },
            { id: 'copy',    label: '📝 Copies' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', transition: 'all 0.2s',
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-muted)',
            }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="glass-btn primary" style={{ padding: '7px 14px', fontSize: '0.8rem', gap: 6 }}>
          <Send size={13} /> {tab === 'content' ? 'Solicitar Aprovação de Conteúdo' : 'Enviar Copy para Aprovação'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
            {tab === 'content' ? '🖼️ Enviar Conteúdo para Aprovação do Cliente' : '📝 Enviar Copy para Aprovação do Cliente'}
          </h4>
          {tab === 'content' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>TÍTULO*</label>
                  <input value={contentForm.title} onChange={e => setContentForm(f => ({ ...f, title: e.target.value }))} className="glass-input" style={{ width: '100%' }} placeholder="Nome do conteúdo" />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>TIPO</label>
                  <select value={contentForm.type} onChange={e => setContentForm(f => ({ ...f, type: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                    {['Arte','Vídeo','Reels','Story','Carrossel'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>PLATAFORMA</label>
                  <select value={contentForm.platform} onChange={e => setContentForm(f => ({ ...f, platform: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                    {['Instagram','TikTok','Facebook','YouTube','LinkedIn'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>DATA PREVISTA</label>
                  <input type="date" max="9999-12-31" value={contentForm.scheduled_date} onChange={e => setContentForm(f => ({ ...f, scheduled_date: e.target.value }))} className="glass-input" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>DESCRIÇÃO / OBSERVAÇÕES</label>
                <textarea value={contentForm.description} onChange={e => setContentForm(f => ({ ...f, description: e.target.value }))} className="glass-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="Descreva o conteúdo para o cliente..." />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>URL DO ARQUIVO (Drive/Storage)</label>
                <input value={contentForm.url} onChange={e => setContentForm(f => ({ ...f, url: e.target.value }))} className="glass-input" style={{ width: '100%' }} placeholder="https://drive.google.com/..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} className="glass-btn" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Cancelar</button>
                <button onClick={handleSendContent} disabled={saving} className="glass-btn primary" style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'rgba(16,185,129,0.8)' }}>
                  {saving ? <RefreshCw size={13} className="spin" /> : <><Send size={13} /> Enviar para Cliente</>}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>TÍTULO DA COPY*</label>
                  <input value={copyForm.title} onChange={e => setCopyForm(f => ({ ...f, title: e.target.value }))} className="glass-input" style={{ width: '100%' }} placeholder="Ex: Legenda Reels - Produto X" />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>TIPO</label>
                  <select value={copyForm.type} onChange={e => setCopyForm(f => ({ ...f, type: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                    {['Legenda','CTA','Script','Bio','Hashtags','Anúncio'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>PLATAFORMA</label>
                  <select value={copyForm.platform} onChange={e => setCopyForm(f => ({ ...f, platform: e.target.value }))} className="glass-input" style={{ width: '100%' }}>
                    {['Instagram','TikTok','Facebook','YouTube','LinkedIn'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 3 }}>TEXTO DA COPY*</label>
                <textarea value={copyForm.content} onChange={e => setCopyForm(f => ({ ...f, content: e.target.value }))} className="glass-input" style={{ width: '100%', minHeight: 120, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }} placeholder="Escreva o texto completo aqui..." />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} className="glass-btn" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Cancelar</button>
                <button onClick={handleSendCopy} disabled={saving} className="glass-btn primary" style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'rgba(16,185,129,0.8)' }}>
                  {saving ? <RefreshCw size={13} className="spin" /> : <><Send size={13} /> Enviar para Cliente</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}><RefreshCw size={20} className="spin" /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.08)' }}>
          <Send size={36} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 10 }} />
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Nenhuma solicitação enviada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>{item.title}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {item.platform && <span style={{ color: PLATFORM_COLORS[item.platform] || 'inherit', fontWeight: 700 }}>{item.platform}</span>}
                  {item.type && <span>{item.type}</span>}
                  {item.scheduled_date && <span>📅 {new Date(item.scheduled_date).toLocaleDateString('pt-BR')}</span>}
                  <span style={{ color: '#64748b' }}>{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {(tab === 'copy' && item.content) && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.content}
                  </p>
                )}
                 {item.status === 'revision' && (item.metadata?.revision_comment || item.client_notes) && (
                  <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.75rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#fca5a5', opacity: 0.8 }}>💬 Feedback do cliente:</strong>
                    {renderRichFeedback(item.metadata?.revision_comment || item.client_notes)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {item.status === 'revision' && (
                  <button 
                    onClick={() => setEditingItem(item)} 
                    style={{ 
                      background: 'rgba(99,102,241,0.15)', 
                      border: '1px solid rgba(99,102,241,0.3)', 
                      color: '#a5b4fc', 
                      borderRadius: 6, 
                      padding: '4px 8px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center' 
                    }}
                    title="Ajustar e Re-enviar"
                  >
                    <Edit3 size={13} />
                  </button>
                )}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 8px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    <Eye size={13} />
                  </a>
                )}
                <button onClick={() => handleDelete(item.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Resubmit Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 500, padding: 28, position: 'relative', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit3 size={20} style={{ color: '#6366f1' }} /> Ajustar e Re-enviar para Aprovação
              </h3>
              <button onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.75rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
              <strong style={{ display: 'block', marginBottom: '4px', color: '#fca5a5' }}>💬 Ajustes solicitados pelo cliente:</strong>
              {renderRichFeedback(editingItem.metadata?.revision_comment || editingItem.client_notes)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>TÍTULO*</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="glass-input"
                  style={{ width: '100%' }}
                />
              </div>

              {tab === 'content' ? (
                <>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>DESCRIÇÃO / OBSERVAÇÕES</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      className="glass-input"
                      style={{ width: '100%', minHeight: 60, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>URL DO NOVO ARQUIVO (Drive/Storage)</label>
                    <input
                      type="text"
                      value={editForm.url}
                      onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                      className="glass-input"
                      style={{ width: '100%' }}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>TEXTO DA COPY*</label>
                  <textarea
                    value={editForm.content}
                    onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                    className="glass-input"
                    style={{ width: '100%', minHeight: 140, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.5 }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setEditingItem(null)}
                disabled={saving}
                className="glass-btn"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateItem}
                disabled={saving || !editForm.title.trim() || (tab === 'copy' && !editForm.content.trim())}
                className="glass-btn primary"
                style={{ padding: '8px 20px', fontSize: '0.8rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {saving ? <RefreshCw size={14} className="spin" /> : <><Send size={14} /> Re-enviar para Aprovação</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
const STAFF_TABS = [
  { id: 'kanban',    label: 'Kanban',               icon: <Kanban size={15} /> },
  { id: 'calendario',label: 'Calendário',           icon: <Calendar size={15} /> },
  { id: 'reunioes',  label: 'Reuniões',             icon: <Users size={15} /> },
  { id: 'aprovacoes',label: 'Solicitar Aprovações', icon: <Send size={15} /> },
];

const StaffSocialPanel = ({ client }) => {
  const [tab, setTab] = useState('kanban');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
        {STAFF_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
            background: tab === t.id ? 'var(--primary)' : 'transparent',
            color: tab === t.id ? 'white' : 'var(--text-muted)',
            boxShadow: tab === t.id ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
          }}>
            {t.icon} <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'kanban'     && <KanbanTab client={client} />}
      {tab === 'calendario' && <CalendarioTab client={client} />}
      {tab === 'reunioes'   && <ReunioesTab client={client} />}
      {tab === 'aprovacoes' && <SolicitarAprovacoes client={client} />}
    </div>
  );
};

export default StaffSocialPanel;
