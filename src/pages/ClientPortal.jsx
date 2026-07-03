import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, XCircle, Clock, ExternalLink, HardDrive,
  Package, AlertTriangle, History, ChevronDown, ChevronUp,
  Send, Loader2, Play, Image as ImageIcon, FileText, Check, AlertCircle,
  Mic, Paperclip, Volume2, X
} from 'lucide-react';

const DEPT_COLORS = {
  'Social Media':  { bg: 'rgba(99,102,241,0.15)',  border: '#6366f1', text: '#a5b4fc' },
  'Edição':        { bg: 'rgba(245,158,11,0.15)',   border: '#f59e0b', text: '#fbbf24' },
  'Captação':      { bg: 'rgba(16,185,129,0.15)',   border: '#10b981', text: '#34d399' },
  'Design':        { bg: 'rgba(236,72,153,0.15)',   border: '#ec4899', text: '#f9a8d4' },
  'Tráfego Pago':  { bg: 'rgba(59,130,246,0.15)',   border: '#3b82f6', text: '#60a5fa' },
  'default':       { bg: 'rgba(255,255,255,0.05)',  border: 'rgba(255,255,255,0.2)', text: '#e2e8f0' },
};

// Notificação para equipe quando cliente aprova/revisa
const sendStaffNotification = async ({ user, client, action, itemTitle, date, table }) => {
  try {
    const dateStr = date ? ` — ${new Date(date).toLocaleDateString('pt-BR')}` : '';
    const isApproved = action === 'approved';
    const msg = isApproved
      ? `✅ Aprovado: "${itemTitle}"${dateStr}`
      : `🔄 Revisão solicitada: "${itemTitle}"${dateStr}`;
    await supabase.from('chat_messages').insert({
      client_id: client.id,
      department: 'Social Media',
      sender_id: user?.id,
      sender_name: client.name || 'Cliente',
      sender_type: 'client',
      content: msg,
      is_internal: false,
    });
  } catch (e) {
    console.warn('Notificação staff não enviada:', e);
  }
};

export default function ClientPortal() {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [historyTasks, setHistoryTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correctionModal, setCorrectionModal] = useState(null); // task object
  const [correctionText, setCorrectionText] = useState('');
  const [submitting, setSubmitting] = useState(null); // taskId
  const [showHistory, setShowHistory] = useState(false);

  // States for audio recording and file upload in correction modal
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

  const handleCloseCorrectionModal = () => {
    setCorrectionModal(null);
    setCorrectionText('');
    setFile(null);
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    if (recording && mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (user?.clientUuid) fetchTasks();
  }, [user?.clientUuid]);

  // Scroll para a tarefa destacada vinda da notificação
  useEffect(() => {
    if (!loading && pendingTasks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const taskIdParam = params.get('task');
      if (taskIdParam) {
        setTimeout(() => {
          const el = document.getElementById(`task-card-${taskIdParam}`) ||
                     document.getElementById(`task-card-content_${taskIdParam}`) ||
                     document.getElementById(`task-card-copy_${taskIdParam}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);
      }
    }
  }, [loading, pendingTasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 1. Department Tasks (Captação, Edição, Design, etc.)
      const { data: pending } = await supabase
        .from('department_tasks')
        .select('*')
        .eq('client_id', user.clientUuid)
        .eq('status', 'Aguardando Aprovação Cliente')
        .order('updated_at', { ascending: false });

      const mappedPending = (pending || []).map(t => ({
        ...t,
        type: 'task',
      }));

      // 2. Social Contents (Social Media posts)
      const { data: socialContents } = await supabase
        .from('social_contents')
        .select('*')
        .eq('client_id', user.clientUuid)
        .eq('status', 'pending_approval')
        .order('updated_at', { ascending: false });

      const mappedContents = (socialContents || []).map(c => ({
        id: 'content_' + c.id,
        rawId: c.id,
        title: `Social Media: ${c.title || 'Sem título'}`,
        department: 'Social Media',
        status: 'Aguardando Aprovação Cliente',
        updated_at: c.updated_at || c.created_at,
        type: 'social_content',
        rawItem: c,
        metadata: {
          description: c.description,
          delivery_link: c.url,
          preview_url: c.preview_url,
          platform: c.platform,
          contentType: c.type,
          scheduled_date: c.scheduled_date,
        }
      }));

      // 3. Social Copies (Social Media captions/texts)
      const { data: socialCopies } = await supabase
        .from('social_copies')
        .select('*')
        .eq('client_id', user.clientUuid)
        .eq('status', 'pending_approval')
        .order('updated_at', { ascending: false });

      const mappedCopies = (socialCopies || []).map(c => ({
        id: 'copy_' + c.id,
        rawId: c.id,
        title: `Social Media Copy: ${c.title || 'Sem título'}`,
        department: 'Social Media',
        status: 'Aguardando Aprovação Cliente',
        updated_at: c.updated_at || c.created_at,
        type: 'social_copy',
        rawItem: c,
        metadata: {
          description: c.copy_text,
          delivery_notes: c.instructions,
          platform: c.platform,
        }
      }));

      const allPending = [...mappedPending, ...mappedContents, ...mappedCopies];
      allPending.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setPendingTasks(allPending);

      // --- HISTÓRICO ---
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Histórico de department_tasks
      const { data: hist } = await supabase
        .from('department_tasks')
        .select('*')
        .eq('client_id', user.clientUuid)
        .in('status', ['Aprovado', 'Concluído', 'Refazer'])
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false });

      const mappedHist = (hist || []).map(t => ({
        ...t,
        type: 'task',
      }));

      // Histórico de social_contents
      const { data: histContents } = await supabase
        .from('social_contents')
        .select('*')
        .eq('client_id', user.clientUuid)
        .in('status', ['approved', 'revision'])
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false });

      const mappedHistContents = (histContents || []).map(c => ({
        id: 'content_' + c.id,
        rawId: c.id,
        title: `Social Media: ${c.title || 'Sem título'}`,
        department: 'Social Media',
        status: c.status === 'approved' ? 'Aprovado' : 'Refazer',
        updated_at: c.updated_at,
        type: 'social_content',
        rawItem: c,
        metadata: {
          description: c.description,
          delivery_link: c.url,
          platform: c.platform,
        }
      }));

      // Histórico de social_copies
      const { data: histCopies } = await supabase
        .from('social_copies')
        .select('*')
        .eq('client_id', user.clientUuid)
        .in('status', ['approved', 'revision'])
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: false });

      const mappedHistCopies = (histCopies || []).map(c => ({
        id: 'copy_' + c.id,
        rawId: c.id,
        title: `Social Media Copy: ${c.title || 'Sem título'}`,
        department: 'Social Media',
        status: c.status === 'approved' ? 'Aprovado' : 'Refazer',
        updated_at: c.updated_at,
        type: 'social_copy',
        rawItem: c,
        metadata: {
          description: c.copy_text,
          platform: c.platform,
        }
      }));

      const allHist = [...mappedHist, ...mappedHistContents, ...mappedHistCopies];
      allHist.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      setHistoryTasks(allHist);

    } catch (err) {
      console.error('Erro ao carregar portal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (task) => {
    setSubmitting(task.id);
    try {
      if (task.type === 'social_content') {
        const { error } = await supabase.from('social_contents').update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        }).eq('id', task.rawId);

        if (error) throw error;
        
        await sendStaffNotification({
          user,
          client: { id: user.clientUuid, name: user.name || 'Cliente' },
          action: 'approved',
          itemTitle: task.rawItem.title,
          date: task.metadata.scheduled_date,
          table: 'social_contents'
        });
      } else if (task.type === 'social_copy') {
        const { error } = await supabase.from('social_copies').update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        }).eq('id', task.rawId);

        if (error) throw error;

        await sendStaffNotification({
          user,
          client: { id: user.clientUuid, name: user.name || 'Cliente' },
          action: 'approved',
          itemTitle: task.rawItem.title,
          date: null,
          table: 'social_copies'
        });
      } else {
        const newMetadata = {
          ...task.metadata,
          client_approved: true,
          client_approved_at: new Date().toISOString(),
          client_approved_by: user?.name || 'Cliente',
          history: [
            ...(task.metadata?.history || []),
            { action: 'Aprovado pelo cliente', by: user?.name || 'Cliente', date: new Date().toISOString() }
          ]
        };
        await supabase
          .from('department_tasks')
          .update({ status: 'Aprovado', metadata: newMetadata })
          .eq('id', task.id);
      }

      setPendingTasks(prev => prev.filter(t => t.id !== task.id));
      setHistoryTasks(prev => [{ ...task, status: 'Aprovado', updated_at: new Date().toISOString() }, ...prev]);
    } catch (err) {
      alert('Erro ao aprovar: ' + err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleRequestCorrection = async () => {
    if (!correctionText.trim() && !audioBlob && !file) return;
    setSubmitting(correctionModal.id);
    setUploading(true);
    
    let attachmentUrl = null;
    let uploadedAudioUrl = null;
    
    try {
      // 1. Upload file if selected
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

      // 2. Upload audio if recorded
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

      let finalComment = correctionText;
      if (attachmentUrl) finalComment += `\n📎 Anexo: ${attachmentUrl}`;
      if (uploadedAudioUrl) finalComment += `\n🔊 Áudio: ${uploadedAudioUrl}`;

      if (correctionModal.type === 'social_content') {
        const meta = {
          revision_comment: finalComment,
          revision_attachment_url: attachmentUrl || null,
          revision_audio_url: uploadedAudioUrl || null,
          revision_by: user?.name || user?.email,
          revision_at: new Date().toISOString()
        };
        const { error } = await supabase
          .from('social_contents')
          .update({ status: 'revision', metadata: meta })
          .eq('id', correctionModal.rawId);

        if (error) throw error;
        
        await sendStaffNotification({
          user,
          client: { id: user.clientUuid, name: user.name || 'Cliente' },
          action: 'revision',
          itemTitle: correctionModal.rawItem.title,
          date: correctionModal.metadata.scheduled_date,
          table: 'social_contents'
        });
      } else if (correctionModal.type === 'social_copy') {
        const { error } = await supabase
          .from('social_copies')
          .update({ status: 'revision', client_notes: finalComment })
          .eq('id', correctionModal.rawId);

        if (error) throw error;

        await sendStaffNotification({
          user,
          client: { id: user.clientUuid, name: user.name || 'Cliente' },
          action: 'revision',
          itemTitle: correctionModal.rawItem.title,
          date: null,
          table: 'social_copies'
        });
      } else {
        const newComments = [...(correctionModal.metadata?.comments || [])];
        newComments.push({
          id: crypto.randomUUID(),
          author: user?.name || 'Cliente',
          text: `Correção solicitada pelo cliente:\n${finalComment}`,
          date: new Date().toISOString()
        });

        const newMetadata = {
          ...correctionModal.metadata,
          comments: newComments,
          history: [
            ...(correctionModal.metadata?.history || []),
            { action: `Correção solicitada pelo cliente: ${finalComment}`, by: user?.name || 'Cliente', date: new Date().toISOString() }
          ]
        };
        await supabase
          .from('department_tasks')
          .update({ status: 'Refazer', feedback: finalComment, metadata: newMetadata })
          .eq('id', correctionModal.id);
      }

      setPendingTasks(prev => prev.filter(t => t.id !== correctionModal.id));
      setHistoryTasks(prev => [{ ...correctionModal, status: 'Refazer', updated_at: new Date().toISOString() }, ...prev]);
      
      // Reset state
      setCorrectionModal(null);
      setCorrectionText('');
      setFile(null);
      setAudioBlob(null);
      setAudioUrl('');
      setRecordingTime(0);
    } catch (err) {
      alert('Erro ao solicitar correção: ' + err.message);
    } finally {
      setSubmitting(null);
      setUploading(false);
    }
  };

  const deptOf = (task) => task.department || task.metadata?.destination || 'Geral';
  const colorOf = (dept) => DEPT_COLORS[dept] || DEPT_COLORS['default'];

  // Group pending by department
  const grouped = pendingTasks.reduce((acc, task) => {
    const dept = deptOf(task);
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(task);
    return acc;
  }, {});

  const statusColor = (status) => {
    if (status === 'Aprovado' || status === 'Concluído') return '#34d399';
    if (status === 'Refazer') return '#fb7185';
    return '#fbbf24';
  };

  return (
    <div className="module-container animated-entry" style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <header className="glass-panel" style={{ padding: '24px 30px', borderLeft: '4px solid #6366f1' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={28} style={{ color: '#a5b4fc' }} /> Portal de Aprovações
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
          Materiais aguardando sua aprovação. Revise, aprove ou solicite correções diretamente aqui.
        </p>
      </header>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', gap: 12 }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} />
          <span>Carregando suas aprovações...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        </div>
      ) : (
        <>
          {/* Pending Approvals */}
          {pendingTasks.length === 0 ? (
            <div className="glass-panel" style={{ padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <CheckCircle size={48} style={{ color: '#34d399', opacity: 0.6 }} />
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Tudo em dia!</h3>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>Nenhum material aguardando sua aprovação no momento.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Badge counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> {pendingTasks.length} material{pendingTasks.length !== 1 ? 'is' : ''} aguardando aprovação
                </span>
              </div>

              {Object.entries(grouped).map(([dept, tasks]) => {
                const colors = colorOf(dept);
                return (
                  <div key={dept}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: colors.border }} />
                      <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {dept}
                      </h3>
                      <span style={{ background: colors.bg, color: colors.text, padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${colors.border}` }}>
                        {tasks.length}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                      {tasks.map(task => {
                        const params = new URLSearchParams(window.location.search);
                        const taskIdParam = params.get('task');
                        const isHighlighted = taskIdParam && (
                          task.id === taskIdParam ||
                          task.rawId === taskIdParam ||
                          task.id === 'content_' + taskIdParam ||
                          task.id === 'copy_' + taskIdParam
                        );
                        return (
                          <div 
                            key={task.id} 
                            id={`task-card-${task.id}`}
                            className="glass-card" 
                            style={{ 
                              padding: 20, 
                              borderLeft: `3px solid ${colors.border}`, 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 14, 
                              borderRadius: 12,
                              transition: 'all 0.3s ease-in-out',
                              ...(isHighlighted ? {
                                boxShadow: '0 0 25px rgba(99, 102, 241, 0.45)',
                                border: '2px solid rgba(99, 102, 241, 0.65)',
                                transform: 'scale(1.02)'
                              } : {})
                            }}
                          >
                          {/* Task title & date */}
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', marginBottom: 4 }}>{task.title}</h4>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 8px' }}>
                              {task.metadata?.platform && (
                                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontWeight: 700 }}>
                                  {task.metadata.platform}
                                </span>
                              )}
                              {task.metadata?.contentType && (
                                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                  {task.metadata.contentType}
                                </span>
                              )}
                            </div>
                            {task.metadata?.description && (
                              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{task.metadata.description}</p>
                            )}
                            {task.updated_at && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                <Clock size={12} /> Enviado em {new Date(task.updated_at).toLocaleDateString('pt-BR')} às {new Date(task.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {/* Social Content Preview Box */}
                          {task.type === 'social_content' && (task.metadata.preview_url || task.metadata.delivery_link) && (
                            <div style={{ width: '100%', height: 180, background: 'rgba(0,0,0,0.25)', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                              {task.metadata.contentType === 'Vídeo' || task.metadata.contentType === 'Reels' ? (
                                <video src={task.metadata.delivery_link} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted />
                              ) : (
                                <img src={task.metadata.preview_url || task.metadata.delivery_link} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              )}
                            </div>
                          )}

                          {/* Material link */}
                          {(task.metadata?.delivery_link || task.metadata?.drive_link) && (
                            <a
                              href={task.metadata.delivery_link || task.metadata.drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '8px 14px', borderRadius: 8, textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'background 0.2s' }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.22)'}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                            >
                              {task.metadata.contentType === 'Vídeo' || task.metadata.contentType === 'Reels' ? <Play size={15} /> : <ExternalLink size={15} />}
                              {task.metadata.delivery_link ? 'Ver Material Completo' : 'Acessar Arquivos'}
                            </a>
                          )}

                          {/* Notes from employee */}
                          {task.metadata?.delivery_notes && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-muted)', borderLeft: '2px solid rgba(255,255,255,0.15)' }}>
                              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 4, fontSize: '0.75rem' }}>INSTRUÇÕES DA EQUIPE</strong>
                              {task.metadata.delivery_notes}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button
                              onClick={() => handleApprove(task)}
                              disabled={submitting === task.id}
                              style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#34d399', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
                              onMouseOver={e => { if (submitting !== task.id) e.currentTarget.style.background = 'rgba(16,185,129,0.3)'; }}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                            >
                              {submitting === task.id ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={15} />}
                              Aprovar
                            </button>
                            <button
                              onClick={() => { setCorrectionModal(task); setCorrectionText(''); }}
                              disabled={submitting === task.id}
                              style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#fb7185', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}
                              onMouseOver={e => { if (submitting !== task.id) e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; }}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                            >
                              <XCircle size={15} /> Solicitar Correção
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History toggle */}
          {historyTasks.length > 0 && (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setShowHistory(h => !h)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--text-main)' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '0.95rem' }}>
                  <History size={18} style={{ color: '#a5b4fc' }} /> Histórico dos Últimos 30 Dias ({historyTasks.length})
                </span>
                {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showHistory && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {historyTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(task.status), flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>{task.title}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 8 }}>{deptOf(task)}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor(task.status), background: `${statusColor(task.status)}22`, padding: '3px 8px', borderRadius: 6 }}>
                        {task.status}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(task.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Correction Modal */}
      {correctionModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 480, padding: 28, position: 'relative', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <XCircle size={20} style={{ color: '#fb7185' }} /> Solicitar Correção
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Descreva o que precisa ser corrigido em <strong style={{ color: 'var(--text-main)' }}>{correctionModal.title}</strong>:
              </p>
            </div>
            
            <textarea
              autoFocus
              rows={4}
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Ex: A cor do texto precisa ser azul, o logo está pequeno..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', color: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
              disabled={uploading}
            />

            {/* File and Audio preview list */}
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

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Audio capture */}
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
                      padding: '8px 12px',
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
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: '0.75rem',
                      cursor: !!audioUrl ? 'not-allowed' : 'pointer',
                      opacity: !!audioUrl ? 0.5 : 1
                    }}
                  >
                    <Mic size={14} /> Gravar Áudio
                  </button>
                )}

                {/* File Attachment */}
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
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    cursor: !!file ? 'not-allowed' : 'pointer',
                    opacity: !!file ? 0.5 : 1
                  }}
                >
                  <Paperclip size={14} /> Anexar Arquivo
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleCloseCorrectionModal}
                  disabled={uploading || submitting}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestCorrection}
                  disabled={(!correctionText.trim() && !audioBlob && !file) || uploading || submitting}
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid #ef4444',
                    color: '#fb7185',
                    padding: '10px 20px',
                    borderRadius: 8,
                    cursor: (!correctionText.trim() && !audioBlob && !file) || uploading || submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: (!correctionText.trim() && !audioBlob && !file) || uploading || submitting ? 0.5 : 1,
                    fontSize: '0.88rem'
                  }}
                >
                  {uploading || submitting ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                  Enviar Correção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
      `}</style>
    </div>
  );
}
