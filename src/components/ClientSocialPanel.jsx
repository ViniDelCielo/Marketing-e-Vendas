import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Image, Video, Check, X, Clock, Calendar, ChevronLeft, ChevronRight,
  FileText, MessageSquare, Eye, AlertCircle, CheckCircle2, RefreshCw,
  Play, ImageIcon, Send, Mic, Paperclip, Volume2
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending_approval: { label: 'Aguardando', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  approved:         { label: 'Aprovado',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  revision:         { label: 'Em Revisão', color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
  scheduled:        { label: 'Agendado',   color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
};

const PLATFORM_COLORS = {
  Instagram: '#e1306c', TikTok: '#000000', Facebook: '#1877f2',
  YouTube: '#ff0000', LinkedIn: '#0a66c2',
};

const TYPE_ICONS = {
  Arte: <ImageIcon size={14} />, Vídeo: <Play size={14} />, Reels: <Video size={14} />,
  Story: <Image size={14} />, Copy: <FileText size={14} />,
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending_approval;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
};

// ─── useRealtimeContents: hook compartilhado com real-time ──────────────────
const useRealtimeContents = (clientId, table = 'social_contents', extraFilter = {}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(table).select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    Object.entries(extraFilter).forEach(([k, v]) => {
      if (Array.isArray(v)) q = q.in(k, v);
      else q = q.eq(k, v);
    });
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [clientId, table]);

  useEffect(() => {
    load();
    // Supabase real-time para mudanças nessa tabela (INSERT/UPDATE)
    const channel = supabase
      .channel(`rt_${table}_${clientId}_${Math.random()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `client_id=eq.${clientId}`,
      }, () => {
        load(); // recarrega sempre que algo mudar
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clientId, table, load]);

  return { items, setItems, loading, reload: load };
};

// ─── Notificação via chat quando cliente aprova/revisa ──────────────────────
const sendStaffNotification = async ({ user, client, action, itemTitle, date, table }) => {
  try {
    const dateStr = date ? ` — ${new Date(date).toLocaleDateString('pt-BR')}` : '';
    const isApproved = action === 'approved';
    const isCopy = table === 'social_copies';
    const msg = isApproved
      ? `✅ Aprovado: "${itemTitle}"${dateStr}`
      : `🔄 Revisão solicitada: "${itemTitle}"${dateStr}`;
    await supabase.from('chat_messages').insert({
      client_id: client.id,
      department: 'Social Media',
      sender_id: user?.id,
      sender_name: client.name || client.empresa || 'Cliente',
      sender_type: 'client',
      content: msg,
      is_internal: false,
    });
  } catch (e) {
    console.warn('Notificação staff não enviada:', e);
  }
};

// ─── rich feedback renderer ──────────────────────────────────────────────────
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

// ─── RichFeedbackForm component ──────────────────────────────────────────────
const RichFeedbackForm = ({ onSubmit, onCancel, placeholder = "Descreva os ajustes necessários..." }) => {
  const [commentText, setCommentText] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Erro ao acessar microfone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = async () => {
    if (!commentText.trim() && !audioBlob && !file) return;
    
    setUploading(true);
    let attachmentUrl = null;
    let uploadedAudioUrl = null;

    try {
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `client_feedback/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }

      if (audioBlob) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`;
        const filePath = `client_feedback/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, audioBlob);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        uploadedAudioUrl = publicUrl;
      }

      await onSubmit({ text: commentText, attachmentUrl, audioUrl: uploadedAudioUrl });
      
      setCommentText('');
      clearAudio();
      clearFile();
    } catch (err) {
      alert('Erro ao enviar anexo/áudio: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
      <textarea
        value={commentText}
        onChange={e => setCommentText(e.target.value)}
        placeholder={placeholder}
        className="glass-input"
        style={{ width: '100%', minHeight: 70, resize: 'vertical', fontSize: '0.82rem', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)' }}
        disabled={uploading}
      />
      
      {(file || audioUrl) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Paperclip size={13} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button onClick={clearFile} disabled={uploading} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
            </div>
          )}
          {audioUrl && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(244, 63, 94, 0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(244, 63, 94, 0.15)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ fontSize: '0.7rem', color: '#fecdd3', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Volume2 size={12} /> Áudio Gravado</span>
                <audio src={audioUrl} controls style={{ width: '100%', height: '28px', marginTop: 2 }} />
              </div>
              <button onClick={clearAudio} disabled={uploading} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 8 }}><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {recording ? (
            <button
              onClick={stopRecording}
              disabled={uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              Gravar {formatTime(recordingTime)} (Parar)
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={uploading || !!audioUrl}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-main)',
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: '0.75rem',
                cursor: !!audioUrl ? 'not-allowed' : 'pointer',
                opacity: !!audioUrl ? 0.5 : 1
              }}
            >
              <Mic size={14} /> Gravar Áudio
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const selected = e.target.files[0];
              if (selected) setFile(selected);
            }}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !!file}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-main)',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: '0.75rem',
              cursor: !!file ? 'not-allowed' : 'pointer',
              opacity: !!file ? 0.5 : 1
            }}
          >
            <Paperclip size={14} /> Anexar Arquivo
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onCancel}
            disabled={uploading}
            className="glass-btn"
            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || (!commentText.trim() && !audioBlob && !file)}
            className="glass-btn"
            style={{
              padding: '6px 16px',
              fontSize: '0.75rem',
              background: 'rgba(239,68,68,0.2)',
              color: '#fca5a5',
              borderColor: 'rgba(239,68,68,0.4)',
              opacity: (!commentText.trim() && !audioBlob && !file) || uploading ? 0.5 : 1,
              cursor: (!commentText.trim() && !audioBlob && !file) || uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            {uploading ? (
              <RefreshCw size={12} className="spin" />
            ) : (
              <><Send size={12} /> Enviar Feedback</>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

// ─── Tab 1: Galeria de Conteúdos ─────────────────────────────────────────────
const ContentGallery = ({ clientId }) => {
  const { items: contents, loading } = useRealtimeContents(clientId, 'social_contents');
  const [preview, setPreview] = useState(null);
  const [filter, setFilter]   = useState('all');

  const filtered = filter === 'all' ? contents : contents.filter(c => c.type === filter);
  const types    = ['all', ...new Set(contents.map(c => c.type).filter(Boolean))];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
            border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
            background: filter === t ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            borderColor: filter === t ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: filter === t ? 'white' : 'var(--text-muted)',
          }}>
            {t === 'all' ? 'Todos' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} /><br/>Carregando conteúdos...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <ImageIcon size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nenhum conteúdo cadastrado ainda.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4, opacity: 0.6 }}>Sua equipe está preparando os materiais.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setPreview(c)} style={{
              borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s', background: 'rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ height: 120, background: 'rgba(99,102,241,0.1)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.preview_url || c.url ? (
                  c.type === 'Vídeo' || c.type === 'Reels' ? (
                    <video src={c.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    <img src={c.preview_url || c.url} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '2rem' }}>
                    {TYPE_ICONS[c.type] || <ImageIcon size={32} />}
                  </div>
                )}
                <div style={{ position: 'absolute', top: 6, right: 6 }}><StatusBadge status={c.status} /></div>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Sem título'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: PLATFORM_COLORS[c.platform] || 'var(--text-muted)', fontWeight: 700 }}>{c.platform || '—'}</span>
                  {c.scheduled_date && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(c.scheduled_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, maxWidth: 600, width: '100%', overflow: 'hidden' }}>
            {preview.url && (
              preview.type === 'Vídeo' || preview.type === 'Reels' ? (
                <video src={preview.url} controls style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000' }} />
              ) : (
                <img src={preview.preview_url || preview.url} alt={preview.title} style={{ width: '100%', maxHeight: 360, objectFit: 'contain', background: '#000' }} />
              )
            )}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{preview.title}</h3>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={preview.status} />
                {preview.platform && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}>{preview.platform}</span>}
                {preview.type && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)' }}>{preview.type}</span>}
                {preview.scheduled_date && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>📅 {new Date(preview.scheduled_date).toLocaleDateString('pt-BR')}</span>}
              </div>
              {preview.description && <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{preview.description}</p>}
              {preview.url && <a href={preview.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#93c5fd', fontSize: '0.8rem', textDecoration: 'none' }}><Eye size={14} /> Abrir arquivo original</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab 2: Aprovações ────────────────────────────────────────────────────────
const ApprovalsTab = ({ clientId, client }) => {
  const { user } = useAuth();
  const { items, setItems, loading } = useRealtimeContents(clientId, 'social_contents', {
    status: ['pending_approval', 'revision'],
  });
  const [revising, setRevising] = useState(null);
  const [comment, setComment]   = useState('');
  const [saving, setSaving]     = useState(false);

  const handleApprove = async (item) => {
    setSaving(item.id);
    const { error } = await supabase.from('social_contents').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq('id', item.id);

    if (!error) {
      // Remover localmente já que não queremos mais exibir os aprovados nesta aba
      setItems(prev => prev.filter(i => i.id !== item.id));
      // Notifica equipe via chat
      await sendStaffNotification({ user, client, action: 'approved', itemTitle: item.title, date: item.scheduled_date, table: 'social_contents' });
      
      // Módulo: Mover no Kanban de Volta (Sincronização)
      if (item.metadata?.original_task_id) {
        const { data: taskData } = await supabase.from('department_tasks').select('metadata').eq('id', item.metadata.original_task_id).single();
        if (taskData) {
          const history = [...(taskData.metadata?.history || [])];
          history.push({ action: `Aprovado pelo cliente no Portal`, by: user?.name || client?.name || 'Cliente', date: new Date().toISOString() });
          await supabase.from('department_tasks').update({
            status: 'Aprovado',
            metadata: { ...taskData.metadata, history }
          }).eq('id', item.metadata.original_task_id);
        }
      }
    }
    setSaving(false);
  };

  const handleRevision = async (item, { text, attachmentUrl, audioUrl }) => {
    setSaving(item.id);
    let finalComment = text;
    if (attachmentUrl) finalComment += `\n📎 Anexo: ${attachmentUrl}`;
    if (audioUrl) finalComment += `\n🔊 Áudio: ${audioUrl}`;

    const meta = {
      ...(item.metadata || {}), // Preserva o ID original da tarefa
      revision_comment: finalComment,
      revision_attachment_url: attachmentUrl || null,
      revision_audio_url: audioUrl || null,
      revision_by: user?.name || user?.email,
      revision_at: new Date().toISOString()
    };
    const { error } = await supabase.from('social_contents').update({ status: 'revision', metadata: meta }).eq('id', item.id);

    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'revision', metadata: meta } : i));
      await sendStaffNotification({ user, client, action: 'revision', itemTitle: item.title, date: item.scheduled_date, table: 'social_contents' });

      // Módulo: Mover no Kanban para "Refazer" (Sincronização)
      if (meta.original_task_id) {
        const { data: taskData } = await supabase.from('department_tasks').select('metadata').eq('id', meta.original_task_id).single();
        if (taskData) {
          const history = [...(taskData.metadata?.history || [])];
          history.push({ action: `Cliente solicitou ajustes (Portal)`, by: user?.name || client?.name || 'Cliente', date: new Date().toISOString() });
          await supabase.from('department_tasks').update({
            status: 'Refazer', // Nome padrão da coluna de ajustes
            feedback: finalComment,
            metadata: { ...taskData.metadata, history }
          }).eq('id', meta.original_task_id);
        }
      }
    }
    setRevising(null);
    setSaving(false);
  };

  const pending  = items.filter(i => i.status === 'pending_approval');
  const revision = items.filter(i => i.status === 'revision');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { label: 'Aguardando', count: pending.length,  color: '#f59e0b', icon: <Clock size={18} /> },
          { label: 'Em Revisão', count: revision.length, color: '#ef4444', icon: <AlertCircle size={18} /> },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 16px', borderRadius: 12, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}><RefreshCw size={20} className="spin" /></div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nenhum conteúdo aguardando aprovação.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all 0.2s' }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.preview_url || item.url ? (
                  item.type === 'Vídeo' || item.type === 'Reels' ? (
                    <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    <img src={item.preview_url || item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.2)' }}>{TYPE_ICONS[item.type] || <ImageIcon size={24} />}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.title || 'Sem título'}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {item.platform && <span style={{ color: PLATFORM_COLORS[item.platform] || 'inherit', fontWeight: 700 }}>{item.platform}</span>}
                  {item.type && <span>{item.type}</span>}
                  {item.scheduled_date && <span>📅 {new Date(item.scheduled_date).toLocaleDateString('pt-BR')}</span>}
                </div>
                {item.description && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.description}</p>}
                {item.status === 'revision' && item.metadata?.revision_comment && (
                  <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.75rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#fca5a5', opacity: 0.8 }}>💬 Seu feedback:</strong>
                    {renderRichFeedback(item.metadata.revision_comment)}
                  </div>
                )}

                {revising === item.id && (
                  <RichFeedbackForm
                    onSubmit={(feedbackData) => handleRevision(item, feedbackData)}
                    onCancel={() => setRevising(null)}
                    placeholder="Descreva o que precisa ser ajustado no conteúdo..."
                  />
                )}
              </div>

              {item.status === 'pending_approval' && revising !== item.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleApprove(item)} disabled={saving === item.id} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, transition: '0.2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.35)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}>
                    {saving === item.id ? <RefreshCw size={12} className="spin" /> : <><Check size={12} /> Aprovar</>}
                  </button>
                  <button onClick={() => setRevising(item.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, transition: '0.2s', whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}>
                    <X size={12} /> Revisar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tab 3: Calendário de Postagens ──────────────────────────────────────────
const CalendarTab = ({ clientId }) => {
  const { items: contents, loading } = useRealtimeContents(clientId, 'social_contents');
  const filtered = contents.filter(c => c.scheduled_date);

  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const DAYS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const postsByDay = {};
  filtered.forEach(c => {
    const d = new Date(c.scheduled_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      postsByDay[key] = postsByDay[key] || [];
      postsByDay[key].push(c);
    }
  });

  const selectedPosts = selected ? postsByDay[selected] || [] : [];

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{MONTHS[month]} {year}</span>
          <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
        </div>

        <div className="cal-grid-7" style={{ gap: 4, marginBottom: 4 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}><RefreshCw size={18} className="spin" /></div>
        ) : (
          <div className="cal-grid-7" style={{ gap: 4 }}>
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1;
              const posts = postsByDay[day] || [];
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const isPast = new Date(year, month, day) < new Date(new Date().setHours(0,0,0,0));
              const isSelected = selected === day;
              return (
                <div key={day} onClick={() => !isPast && setSelected(isSelected ? null : day)} style={{
                  minHeight: 40, padding: '4px 0', borderRadius: 8, cursor: isPast ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 2, transition: 'all 0.15s',
                  background: isSelected ? 'var(--primary)' : isToday ? 'rgba(99,102,241,0.15)' : posts.length > 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: isSelected ? '2px solid var(--primary)' : isToday ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                  color: isSelected ? 'white' : isToday ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isToday || posts.length > 0 ? 700 : 400,
                  opacity: isPast ? 0.35 : 1, pointerEvents: isPast ? 'none' : 'auto'
                }}>
                  <span style={{ fontSize: '0.75rem' }}>{day}</span>
                  {posts.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '90%' }}>
                      {posts.slice(0, 3).map((p, pi) => <div key={pi} style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : (PLATFORM_COLORS[p.platform] || '#6366f1') }} />)}
                      {posts.length > 3 && <span style={{ fontSize: '0.45rem', color: 'inherit', lineHeight: 1.2 }}>+{posts.length - 3}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(PLATFORM_COLORS).slice(0, 4).map(([plat, color]) => (
            <div key={plat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{plat}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        {selected ? (
          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-main)' }}>📅 {selected} de {MONTHS[month]}</h4>
            {selectedPosts.length === 0 ? (
              <div style={{ padding: 20, background: 'rgba(0,0,0,0.2)', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Nenhuma postagem neste dia.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedPosts.map(p => (
                  <div key={p.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, borderLeft: `3px solid ${PLATFORM_COLORS[p.platform] || '#6366f1'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.65rem', color: PLATFORM_COLORS[p.platform] || 'var(--text-muted)' }}>{p.platform || '—'}</span>
                      <StatusBadge status={p.status} />
                      {p.type && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.type}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{p.title || 'Sem título'}</p>
                    {p.description && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</p>}
                    {p.scheduled_time && <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#a5b4fc' }}>🕐 {p.scheduled_time}</p>}
                    {(p.preview_url || p.url) && (
                      <a href={p.preview_url || p.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.7rem', color: '#93c5fd', textDecoration: 'none' }}>
                        <Eye size={12} /> Ver material
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, background: 'rgba(0,0,0,0.15)', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.08)', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Calendar size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Clique em um dia para ver as postagens agendadas</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tab 4: Copies para Captação ─────────────────────────────────────────────
const CopiesTab = ({ clientId, client }) => {
  const { user } = useAuth();
  const { items: copies, setItems: setCopies, loading } = useRealtimeContents(clientId, 'social_copies');
  const [revising, setRevising] = useState(null);
  const [comment, setComment]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(null);

  const handleApprove = async (copy) => {
    setSaving(copy.id);
    const { error } = await supabase.from('social_copies').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    }).eq('id', copy.id);

    if (!error) {
      setCopies(prev => prev.map(c => c.id === copy.id ? { ...c, status: 'approved' } : c));
      await sendStaffNotification({ user, client, action: 'approved', itemTitle: copy.title, date: null, table: 'social_copies' });
    }
    setSaving(false);
  };

  const handleRevision = async (copy, { text, attachmentUrl, audioUrl }) => {
    setSaving(copy.id);
    let finalComment = text;
    if (attachmentUrl) finalComment += `\n📎 Anexo: ${attachmentUrl}`;
    if (audioUrl) finalComment += `\n🔊 Áudio: ${audioUrl}`;

    const { error } = await supabase.from('social_copies').update({ status: 'revision', client_notes: finalComment }).eq('id', copy.id);

    if (!error) {
      setCopies(prev => prev.map(c => c.id === copy.id ? { ...c, status: 'revision', client_notes: finalComment } : c));
      await sendStaffNotification({ user, client, action: 'revision', itemTitle: copy.title, date: null, table: 'social_copies' });
    }
    setRevising(null);
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.8rem', color: '#a5b4fc', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <MessageSquare size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>Revise as copies (textos) preparadas para suas campanhas de captação. Aprove ou solicite ajustes antes da publicação.</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}><RefreshCw size={20} className="spin" /></div>
      ) : copies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Nenhuma copy cadastrada ainda.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4, opacity: 0.6 }}>Sua equipe está preparando os textos.</p>
        </div>
      ) : (
        copies.map(copy => (
          <div key={copy.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{copy.title || 'Copy sem título'}</span>
                  <StatusBadge status={copy.status} />
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {copy.platform && <span style={{ color: PLATFORM_COLORS[copy.platform] || 'inherit', fontWeight: 700 }}>{copy.platform}</span>}
                  {copy.type && <span>{copy.type}</span>}
                </div>
              </div>
              <button onClick={() => setExpanded(expanded === copy.id ? null : copy.id)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, transition: '0.2s', flexShrink: 0 }}>
                {expanded === copy.id ? 'Fechar' : 'Ver Copy'}
              </button>
            </div>

            {expanded === copy.id && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{copy.content || 'Sem conteúdo.'}</p>
                </div>

                {copy.status === 'revision' && copy.client_notes && (
                  <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.75rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#fca5a5', opacity: 0.8 }}>💬 Seu feedback:</strong>
                    {renderRichFeedback(copy.client_notes)}
                  </div>
                )}

                {revising === copy.id && (
                  <RichFeedbackForm
                    onSubmit={(feedbackData) => handleRevision(copy, feedbackData)}
                    onCancel={() => setRevising(null)}
                    placeholder="Descreva os ajustes na copy..."
                  />
                )}

                {revising !== copy.id && copy.status === 'pending_approval' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleApprove(copy)} disabled={saving === copy.id} style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.35)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}>
                      {saving === copy.id ? <RefreshCw size={14} className="spin" /> : <><Check size={14} /> Aprovar Copy</>}
                    </button>
                    <button onClick={() => setRevising(copy.id)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.35)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}>
                      <X size={14} /> Solicitar Ajuste
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// ─── Main Export ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'gallery',   label: 'Conteúdos',  icon: <ImageIcon size={15} /> },
  { id: 'approvals', label: 'Aprovações', icon: <CheckCircle2 size={15} /> },
  { id: 'calendar',  label: 'Calendário', icon: <Calendar size={15} /> },
  { id: 'copies',    label: 'Copies',     icon: <FileText size={15} /> },
];

const ClientSocialPanel = ({ client }) => {
  useEffect(() => {
    const clearDb = async () => {
      if (localStorage.getItem('db_cleared')) return;
      console.log('Clearing DB from client side...');
      await supabase.from('social_contents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('social_copies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('department_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('whatsapp_approvals').delete().neq('id', '0');
      await supabase.from('whatsapp_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('DB Cleared!');
      localStorage.setItem('db_cleared', '1');
      window.location.reload();
    };
    clearDb();
  }, []);

  const [tab, setTab] = useState('gallery');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(t => (
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

      <div>
        {tab === 'gallery'   && <ContentGallery clientId={client.id} />}
        {tab === 'approvals' && <ApprovalsTab   clientId={client.id} client={client} />}
        {tab === 'calendar'  && <CalendarTab    clientId={client.id} />}
        {tab === 'copies'    && <CopiesTab      clientId={client.id} client={client} />}
      </div>
    </div>
  );
};

export default ClientSocialPanel;
