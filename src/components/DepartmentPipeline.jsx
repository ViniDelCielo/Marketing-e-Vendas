import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, X, Loader2, Calendar, Check, Send, Edit3, UserCircle, Clock, Trash2, Link, AlertTriangle, HardDrive, ExternalLink, Maximize2, Minimize2, Sliders, ArrowUp, ArrowDown, GripVertical, Package, RefreshCw, Film, Scissors, CheckCircle, Circle, AlertCircle, Palette, Mic, Volume2, Paperclip, XCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDepartmentTasks } from '../hooks/useDepartmentTasks';
import { useAuth } from '../context/AuthContext';
import FeedbackField from './FeedbackField';
import PendingApprovalsWidget from './PendingApprovalsWidget';

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

const DEPARTMENTS = [
  'Social Media',
  'Edição',
  'Captação',
  'Design',
  'Tráfego Pago',
  'CRM',
  'Comercial'
];

const getMatchingDepartments = (deptName) => {
  if (deptName === 'Edição') {
    return ['Edição', 'Edição de Vídeo', 'Editor de Vídeo - Programação', 'Editor'];
  }
  if (deptName === 'Tráfego Pago') {
    return ['Tráfego Pago', 'Trafego - Gestor', 'Tráfego', 'Gestor de Tráfego'];
  }
  if (deptName === 'Captação') {
    return ['Captação', 'Videomaker', 'Captação - Direção', 'Captador'];
  }
  if (deptName === 'Design') {
    return ['Design', 'Designer', 'Social Media & Design', 'Design Gráfico'];
  }
  if (deptName === 'Social Media') {
    return ['Social Media', 'Social Media', 'Atendimento & Social Media', 'Copywriter', 'Social Media & Copywriter'];
  }
  return [deptName];
};

const DepartmentPipeline = ({ client, departmentName, readOnly = false, globalClients = [] }) => {
  const { tasks, loading, addTask, updateTask: baseUpdateTask, deleteTask, refresh } = useDepartmentTasks(client?.id, departmentName);
  const { user, isGestor } = useAuth();

  const handleAddTask = async (taskData) => {
    const finalClientId = client?.id === 'ALL' ? taskData.client_id : client.id;
    await addTask({ ...taskData, client_id: finalClientId });
  };

  const updateTask = async (id, updates) => {
    if (updates.status) {
      const taskObj = tasks.find(t => t.id === id);
      if (taskObj && taskObj.status !== updates.status) {
        let currentMetadata = updates.metadata || taskObj.metadata || {};
        if (typeof currentMetadata === 'string') {
          try { currentMetadata = JSON.parse(currentMetadata); } catch(ex) { currentMetadata = {}; }
        }
        if (!updates.metadata) updates.metadata = { ...currentMetadata };

        // Validações de transição
        if (departmentName === 'Edição' && updates.status === 'Em Revisão Interna') {
          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
            setAlertModal({
              title: 'Material Pendente',
              message: "Para mover a demanda para 'Em Revisão Interna', você precisa primeiro entregar o material (adicionar o link do Google Drive/Entrega)."
            });
            return null;
          }
        }

        if (departmentName === 'Social Media' && updates.status === 'Aguardando Cliente') {
          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
            setAlertModal({
              title: 'Link de Entrega Vazio',
              message: "Não é possível mover para 'Aguardando Cliente' sem o link do material entregue."
            });
            return null;
          }
        }

        if (departmentName === 'Social Media' && updates.status === 'Agendar/Concluído') {
          if (!currentMetadata.client_approved) {
            setAlertModal({
              title: 'Aprovação Pendente',
              message: "Esta demanda precisa ser aprovada pelo cliente antes de ser agendada/concluída."
            });
            return null;
          }
        }

        if (['Design', 'Edição', 'Social Media'].includes(departmentName) && ['Aprovado', 'Concluído'].includes(updates.status)) {
          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
            setAlertModal({
              title: 'Entrega Requerida',
              message: "Você precisa primeiro entregar o material antes de concluir ou aprovar a demanda."
            });
            return null;
          }
        }

        if (departmentName === 'Social Media' && updates.status === 'Solicitar Gravação') {
          try {
            const { data: assign } = await supabase
              .from('employee_client_assignments')
              .select('employee_id')
              .eq('client_id', client.id)
              .eq('department', 'Captação')
              .maybeSingle();

            const captacaoEmployeeId = assign?.employee_id || null;
            const now = new Date().toISOString();
            const captacaoMetadata = {
              original_task_id: id,
              sent_from_department: 'Social Media',
              history: [{ action: 'Solicitado pelo Social Media', by: user?.name || 'Sistema', date: now }]
            };
            await supabase.from('department_tasks').insert([{
              client_id: client.id,
              department: 'Captação',
              title: `[GRAVAÇÃO] ${taskObj.title}`,
              status: 'A Fazer',
              metadata: captacaoMetadata,
              assigned_to: captacaoEmployeeId,
              requested_sla_days: 2
            }]);
            alert("Solicitação de gravação enviada para a Captação!");
          } catch (e) {
            console.error("Erro ao criar demanda em Captação:", e);
          }
        }

        if (departmentName === 'Edição' && ['Em Revisão Interna', 'Em Revisão'].includes(updates.status)) {
          updates.metadata.approvals = { captacao: 'pending', social_media: 'pending' };

          // Encontra o card correspondente em Social Media e o move de volta para "Em Revisão" limpando feedback e atualizando link/metadata
          try {
            const { data: socialTasks } = await supabase
              .from('department_tasks')
              .select('id, metadata')
              .eq('department', 'Social Media')
              .eq('client_id', client.id);

            if (socialTasks) {
              const targetSocialTask = socialTasks.find(t => {
                let meta = t.metadata;
                if (typeof meta === 'string') {
                  try { meta = JSON.parse(meta); } catch (ex) { meta = {}; }
                }
                return meta && String(meta.original_task_id) === String(id);
              });

              if (targetSocialTask) {
                let sMeta = targetSocialTask.metadata || {};
                if (typeof sMeta === 'string') {
                  try { sMeta = JSON.parse(sMeta); } catch (ex) { sMeta = {}; }
                }
                
                const updatedMeta = updates.metadata || {};
                const sHistory = [...(sMeta.history || [])];
                sHistory.push({
                  action: 'Demanda re-enviada pela Edição após ajuste',
                  by: user?.name || 'Editor',
                  date: new Date().toISOString()
                });

                await supabase.from('department_tasks')
                  .update({
                    status: 'Em Revisão', // Move de volta para Em Revisão
                    feedback: '', // Limpa o feedback anterior
                    metadata: {
                      ...sMeta,
                      delivery_link: updatedMeta.delivery_link || sMeta.delivery_link || null,
                      drive_link: updatedMeta.drive_link || sMeta.drive_link || null,
                      approvals: { captacao: 'pending', social_media: 'pending' },
                      history: sHistory
                    }
                  })
                  .eq('id', targetSocialTask.id);
              }
            }
          } catch (e) {
            console.error("Error updating corresponding Social Media task:", e);
          }
        }

        if (departmentName === 'Social Media' && (updates.status === 'Ajuste do Cliente' || updates.status === 'Refazer')) {
          const origId = currentMetadata.original_task_id;
          if (origId) {
            try {
              const { data: origTask } = await supabase.from('department_tasks')
                .select('*')
                .eq('id', origId)
                .single();

              if (origTask) {
                let origMeta = origTask.metadata || {};
                if (typeof origMeta === 'string') {
                  try { origMeta = JSON.parse(origMeta); } catch(ex) { origMeta = {}; }
                }
                const origHistory = [...(origMeta.history || [])];
                origHistory.push({
                  action: 'Retornado para ajuste (Reprovado pelo Cliente / Social Media)',
                  by: user?.name || 'Cliente (WhatsApp)',
                  date: new Date().toISOString()
                });
                await supabase.from('department_tasks')
                  .update({
                    status: 'Refazer',
                    feedback: updates.feedback || taskObj.feedback || 'Solicitado ajuste pelo Cliente / Social Media',
                    metadata: { ...origMeta, history: origHistory }
                  })
                  .eq('id', origId);
              }
            } catch (e) {
              console.error("Error propagating client feedback to Edição:", e);
            }
          }
        }
      }
    }
    return baseUpdateTask(id, updates);
  };
  const [employees, setEmployees] = useState([]);
  const [alertModal, setAlertModal] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slaDays, setSlaDays] = useState(0);
  const [slaRules, setSlaRules] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', rule_id: '', platform: 'N/A', destination: 'Social Media', publishDate: '', description: '', assigned_to: '', requested_sla_days: '', drive_link: '', status: '', target_department: '', client_id: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deptManager, setDeptManager] = useState(null); // { id, name }
  const [currentServiceId, setCurrentServiceId] = useState(null); // id do serviço atual
  const [activeTab, setActiveTab] = useState('geral');
  const [newPartTitle, setNewPartTitle] = useState('');
  const [newPartDate, setNewPartDate] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');

  // ===== Content Status Panel (Social Media only) =====
  const [syncedTasks, setSyncedTasks] = useState([]); // tasks from Captação & Edição
  const [contentChecklist, setContentChecklist] = useState([]); // manual items
  const [contentLoading, setContentLoading] = useState(false);
  const [editingContentId, setEditingContentId] = useState(null);
  const [editingContentName, setEditingContentName] = useState('');
  const [newContentName, setNewContentName] = useState('');
  const [newContentDept, setNewContentDept] = useState('Captação');
  const [contentPanelOpen, setContentPanelOpen] = useState(true);
  const [contentDeptFilter, setContentDeptFilter] = useState('Todos');

  const CONTENT_DEPT_ICON = { 'Captação': { icon: Film, color: '#f59e0b' }, 'Edição': { icon: Scissors, color: '#a78bfa' }, 'Design': { icon: Palette, color: '#34d399' } };

  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [draggedTeamColIndex, setDraggedTeamColIndex] = useState(null);

  const matchingDepts = useMemo(() => getMatchingDepartments(departmentName), [departmentName]);
  
  const teamEmployees = useMemo(() => {
    return employees.filter(e => matchingDepts.some(d => (e.department || '').includes(d)));
  }, [employees, matchingDepts]);

  const isDeptManager = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'owner') return true;
    return isGestor(currentServiceId);
  }, [user, currentServiceId, isGestor]);

  const defaultColumns = useMemo(() => {
    if (departmentName === 'Social Media') {
      return ['A Fazer', 'Em Andamento', 'Solicitar Gravação', 'Aguardando Cliente', 'Ajuste do Cliente', 'Aprovado', 'Agendar/Concluído'];
    }
    if (departmentName === 'Edição') {
      return ['A Fazer', 'Em Andamento', 'Em Revisão Interna', 'Ajuste Interno', 'Aguardando Cliente', 'Ajuste Cliente', 'Refazer', 'Aprovado'];
    }
    return ['A Fazer', 'Em Andamento', 'Em Revisão', 'Aguardando Aprovação Cliente', 'Refazer', 'Aprovado', 'Concluído'];
  }, [departmentName]);

  const [columns, setColumns] = useState(defaultColumns);
  const [tempColumns, setTempColumns] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingColumns, setSavingColumns] = useState(false);
  const [draggedColIndex, setDraggedColIndex] = useState(null);

  useEffect(() => {
    if (client?.metadata?.custom_kanban_columns?.[departmentName]) {
      setColumns(client.metadata.custom_kanban_columns[departmentName]);
    } else {
      setColumns(defaultColumns);
    }
  }, [client, departmentName, defaultColumns]);

  useEffect(() => {
    if (isSettingsOpen) {
      setTempColumns([...columns]);
    }
  }, [isSettingsOpen, columns]);

  const handleSaveColumns = async () => {
    const cleaned = tempColumns.map(c => c.trim()).filter(c => c.length > 0);
    if (cleaned.length === 0) {
      alert('O Kanban precisa ter pelo menos uma coluna válida.');
      return;
    }

    setSavingColumns(true);
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('metadata')
        .eq('id', client.id)
        .single();
      
      const currentMetadata = clientData?.metadata || {};
      const newCustomColumns = {
        ...(currentMetadata.custom_kanban_columns || {}),
        [departmentName]: cleaned
      };
      const newMetadata = {
        ...currentMetadata,
        custom_kanban_columns: newCustomColumns
      };

      const { error: clientErr } = await supabase
        .from('clients')
        .update({ metadata: newMetadata })
        .eq('id', client.id);

      if (clientErr) throw clientErr;

      for (let i = 0; i < columns.length; i++) {
        const oldName = columns[i];
        const newName = cleaned[i];
        if (newName && oldName !== newName) {
          if (!cleaned.includes(oldName)) {
            await supabase
              .from('department_tasks')
              .update({ status: newName })
              .eq('client_id', client.id)
              .eq('department', departmentName)
              .eq('status', oldName);
          }
        }
      }

      const deletedColumns = columns.filter(col => !cleaned.includes(col));
      if (deletedColumns.length > 0) {
        const fallbackColumn = cleaned[0];
        for (const deletedCol of deletedColumns) {
          await supabase
            .from('department_tasks')
            .update({ status: fallbackColumn })
            .eq('client_id', client.id)
            .eq('department', departmentName)
            .eq('status', deletedCol);
        }
      }

      setColumns(cleaned);
      setIsSettingsOpen(false);
      if (typeof refresh === 'function') {
        await refresh();
      }
      alert('Colunas atualizadas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSavingColumns(false);
    }
  };

  // Delivery Modal States
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryLink, setDeliveryLink] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [taskToDeliver, setTaskToDeliver] = useState(null);

  // Social Media Reproval Modal States
  const [reprovalModalOpen, setReprovalModalOpen] = useState(false);
  const [reprovalTask, setReprovalTask] = useState(null);
  const [reprovalText, setReprovalText] = useState('');
  const [reprovalFile, setReprovalFile] = useState(null);
  const [reprovalAudioBlob, setReprovalAudioBlob] = useState(null);
  const [reprovalAudioUrl, setReprovalAudioUrl] = useState('');
  const [reprovalRecording, setReprovalRecording] = useState(false);
  const [reprovalRecordingTime, setReprovalRecordingTime] = useState(0);
  const [reprovalMediaRecorder, setReprovalMediaRecorder] = useState(null);
  const [reprovalUploading, setReprovalUploading] = useState(false);
  const [reprovalSubmitting, setReprovalSubmitting] = useState(false);

  const reprovalTimerRef = useRef(null);
  const reprovalFileInputRef = useRef(null);

  const startReprovalRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setReprovalAudioBlob(blob);
        setReprovalAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setReprovalMediaRecorder(recorder);
      setReprovalRecording(true);
      setReprovalRecordingTime(0);

      reprovalTimerRef.current = setInterval(() => {
        setReprovalRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Erro ao acessar microfone: ' + err.message);
    }
  };

  const stopReprovalRecording = () => {
    if (reprovalMediaRecorder && reprovalMediaRecorder.state !== 'inactive') {
      reprovalMediaRecorder.stop();
    }
    setReprovalRecording(false);
    if (reprovalTimerRef.current) clearInterval(reprovalTimerRef.current);
  };

  const clearReprovalAudio = () => {
    setReprovalAudioBlob(null);
    setReprovalAudioUrl('');
    setReprovalRecordingTime(0);
  };

  const clearReprovalFile = () => {
    setReprovalFile(null);
    if (reprovalFileInputRef.current) reprovalFileInputRef.current.value = '';
  };

  const formatReprovalTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCloseReprovalModal = () => {
    setReprovalModalOpen(false);
    setReprovalTask(null);
    setReprovalText('');
    setReprovalFile(null);
    setReprovalAudioBlob(null);
    setReprovalAudioUrl('');
    setReprovalRecordingTime(0);
    if (reprovalRecording && reprovalMediaRecorder) {
      reprovalMediaRecorder.stop();
      setReprovalRecording(false);
    }
    if (reprovalTimerRef.current) clearInterval(reprovalTimerRef.current);
  };

  const handleSendReproval = async (e) => {
    if (e) e.preventDefault();
    if (!reprovalText.trim() && !reprovalAudioBlob && !reprovalFile) return;

    setReprovalSubmitting(true);
    setReprovalUploading(true);

    let attachmentUrl = null;
    let uploadedAudioUrl = null;

    try {
      // 1. Upload file if selected
      if (reprovalFile) {
        const fileExt = reprovalFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `client_feedback/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, reprovalFile);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        attachmentUrl = publicUrl;
      }

      // 2. Upload audio if recorded
      if (reprovalAudioBlob) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.webm`;
        const filePath = `client_feedback/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, reprovalAudioBlob);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);
        uploadedAudioUrl = publicUrl;
      }

      let finalComment = reprovalText;
      if (attachmentUrl) finalComment += `\n📎 Anexo: ${attachmentUrl}`;
      if (uploadedAudioUrl) finalComment += `\n🔊 Áudio: ${uploadedAudioUrl}`;

      const history = [...(reprovalTask.metadata?.history || [])];
      history.push({
        action: `Demanda Reprovada (Social Media): "${reprovalText}"`,
        by: user?.name || 'Social Media',
        date: new Date().toISOString()
      });

      const comments = [...(reprovalTask.metadata?.comments || [])];
      comments.push({
        id: crypto.randomUUID(),
        author: user?.name || 'Social Media',
        text: `Motivo da Reprovação:\n${finalComment}`,
        date: new Date().toISOString()
      });

      let newStatus = 'Refazer';
      let targetDept = undefined;

      const currentStatus = reprovalTask.status?.trim()?.toLowerCase();
      
      if (departmentName === 'Social Media') {
        targetDept = reprovalTask.metadata?.original_department || 'Edição';
        if (currentStatus === 'em revisão interna' || currentStatus === 'em revisão') {
           newStatus = 'Ajuste Interno';
        } else if (currentStatus === 'refazer' || currentStatus === 'ajuste do cliente') {
           newStatus = 'Ajuste Cliente';
        }
      } else if (departmentName === 'Edição') {
        if (currentStatus === 'em revisão interna') newStatus = 'Ajuste Interno';
        else if (currentStatus === 'aguardando cliente' || currentStatus === 'aguardando aprovação cliente') newStatus = 'Ajuste Cliente';
      }

      const updates = {
        status: newStatus,
        feedback: finalComment,
        metadata: {
          ...reprovalTask.metadata,
          history,
          comments
        }
      };

      if (targetDept) {
        updates.department = targetDept;
      }

      await updateTask(reprovalTask.id, updates);
      handleCloseReprovalModal();
    } catch (err) {
      console.error(err);
      alert('Erro ao reprovar demanda: ' + err.message);
    } finally {
      setReprovalSubmitting(false);
      setReprovalUploading(false);
    }
  };

  const [isMouseDown, setIsMouseDown] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const activeBoardRef = useRef(null);
  const dragTaskIdRef = useRef(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('button, input, textarea, select, a, [draggable="true"]')) return;
    e.preventDefault(); // Prevents text selection / ghost dragging
    setIsMouseDown(true);
    const board = e.currentTarget;
    activeBoardRef.current = board;
    startXRef.current = e.pageX - board.offsetLeft;
    scrollLeftRef.current = board.scrollLeft;
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
    activeBoardRef.current = null;
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    activeBoardRef.current = null;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !activeBoardRef.current) return;
    e.preventDefault();
    const board = activeBoardRef.current;
    const x = e.pageX - board.offsetLeft;
    const walk = (x - startXRef.current) * 2; // Scroll-fast
    board.scrollLeft = scrollLeftRef.current - walk;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setDeliveryModalOpen(false);
        setIsFullscreen(false);
      }
    };
    if (isTaskModalOpen || deliveryModalOpen || isFullscreen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTaskModalOpen, deliveryModalOpen, isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isFullscreen]);
  
  const myStats = useMemo(() => {
    if (!user?.employeeId) return { total: 0, delayed: 0, onTime: 0 };
    const myTasks = tasks.filter(t => t.assigned_to === user?.employeeId && t.status !== 'Concluído' && t.status !== 'Aprovado');
    let delayed = 0;
    myTasks.forEach(t => {
      const rule = slaRules.find(r => r.id === t.rule_id);
      const days = rule ? rule.days_allowed : slaDays;
      if (days > 0) {
        const d = new Date(new Date(t.created_at).getTime() + (days * 24 * 60 * 60 * 1000));
        if (new Date() > d) delayed++;
      }
    });
    return { total: myTasks.length, delayed, onTime: myTasks.length - delayed };
  }, [tasks, user?.employeeId, slaRules, slaDays]);

  useEffect(() => {
    async function loadInitialData() {
      const { data: empData } = await supabase.from('employees').select('id, name, department').eq('status', 'active');
      setEmployees(empData || []);

      // Busca o gestor deste departamento
      if (departmentName) {
        const { data: svc } = await supabase.from('services').select('id').eq('name', departmentName).maybeSingle();
        if (svc) setCurrentServiceId(svc.id);

        const { data: mgr } = await supabase
          .from('employees')
          .select('id, name')
          .eq('department', departmentName)
          .eq('is_manager', true)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();
        setDeptManager(mgr || null);
      }

      if (client?.id && departmentName) {
        const { data: svcData } = await supabase
          .from('client_services')
          .select('metadata')
          .eq('client_id', client.id)
          .eq('service_id', departmentName)
          .maybeSingle();
        
        if (!svcData) {
           const { data: depts } = await supabase.from('services').select('id').eq('name', departmentName).maybeSingle();
           if (depts) {
             const { data: svcData2 } = await supabase
               .from('client_services')
               .select('metadata')
               .eq('client_id', client.id)
               .eq('service_id', depts.id)
               .maybeSingle();
             setSlaDays(svcData2?.metadata?.sla_days || 0);

             // Fetch Department Rules
             const { data: rules } = await supabase.from('department_sla_rules').select('*').eq('service_id', depts.id);
             setSlaRules(rules || []);
           }
        } else {
          setSlaDays(svcData?.metadata?.sla_days || 0);
          const { data: rules } = await supabase.from('department_sla_rules').select('*').eq('service_id', departmentName);
          setSlaRules(rules || []);
        }
      }
    }
    loadInitialData();
  }, [client?.id, departmentName]);

  // ===== Content Status: Fetch synced tasks from Captação & Edição =====
  const fetchContentStatus = async () => {
    if (departmentName !== 'Social Media' || !client?.id) return;
    setContentLoading(true);
    try {
      const { data } = await supabase
        .from('department_tasks')
        .select('id, title, status, department, updated_at, assigned_to, metadata')
        .eq('client_id', client.id)
        .in('department', ['Captação', 'Edição', 'Design'])
        .order('created_at', { ascending: false });
      setSyncedTasks(data || []);
      // Load manual checklist from metadata
      setContentChecklist(client.metadata?.content_checklist || []);
    } catch (err) {
      console.error('Erro ao buscar status de conteúdo:', err);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    fetchContentStatus();
  }, [client?.id, departmentName]);

  // Save manual checklist to client.metadata
  const saveContentChecklist = async (newList) => {
    setContentChecklist(newList);
    try {
      const { data: clientData } = await supabase.from('clients').select('metadata').eq('id', client.id).single();
      const meta = clientData?.metadata || {};
      await supabase.from('clients').update({ metadata: { ...meta, content_checklist: newList } }).eq('id', client.id);
    } catch (err) {
      console.error('Erro ao salvar checklist:', err);
    }
  };

  const addContentItem = () => {
    if (!newContentName.trim()) return;
    const newItem = {
      id: crypto.randomUUID(),
      name: newContentName.trim(),
      status: 'Falta',
      department: contentDeptFilter === 'Todos' ? 'Captação' : contentDeptFilter,
      linkedTaskId: null,
      createdAt: new Date().toISOString()
    };
    const newList = [...contentChecklist, newItem];
    saveContentChecklist(newList);
    setNewContentName('');
  };

  const updateContentItem = (id, updates) => {
    const newList = contentChecklist.map(item => item.id === id ? { ...item, ...updates } : item);
    saveContentChecklist(newList);
    setEditingContentId(null);
  };

  const deleteContentItem = (id) => {
    const newList = contentChecklist.filter(item => item.id !== id);
    saveContentChecklist(newList);
  };

  const requestFromDepartment = async (item) => {
    try {
      const { data, error } = await supabase
        .from('department_tasks')
        .insert([{
          client_id: client.id,
          department: item.department,
          title: item.name,
          status: 'A Fazer',
          scheduled_for: new Date().toISOString(),
          metadata: {
            requested_by: 'Social Media',
            requested_at: new Date().toISOString(),
            type: 'Conteúdo Solicitado',
            capture_started: true,
            history: [{ action: 'Conteúdo solicitado via Social Media', date: new Date().toISOString() }]
          }
        }])
        .select('id')
        .single();
      if (error) throw error;
      // Link the manual item to the created task
      updateContentItem(item.id, { status: 'Pendente', linkedTaskId: data.id });
      await fetchContentStatus();
      alert(`Solicitação criada com sucesso no pipeline de ${item.department}!`);
    } catch (err) {
      alert('Erro ao solicitar: ' + err.message);
    }
  };

  // Scroll para a tarefa destacada vinda da notificação
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const urlTaskId = params.get('task');
      if (urlTaskId) {
        setTimeout(() => {
          const el = document.getElementById(`kanban-task-${urlTaskId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);
      }
    }
  }, [loading, tasks]);


  const handleTogglePart = async (partId) => {
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};
    
    const parts = (currentMetadata.parts || []).map(p => {
      if (p.id === partId) {
        const nextStatus = !p.completed;
        const history = currentMetadata.history || [];
        history.push({
          action: `Sub-prazo "${p.title}" marcado como ${nextStatus ? 'concluído' : 'pendente'}`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        });
        return { ...p, completed: nextStatus };
      }
      return p;
    });

    const newMetadata = { ...currentMetadata, parts };
    await updateTask(editingTaskId, { metadata: newMetadata });
  };

  const handleAddPart = async () => {
    if (!newPartTitle.trim() || !newPartDate) return;
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

    const parts = [...(currentMetadata.parts || [])];
    const newPart = {
      id: crypto.randomUUID(),
      title: newPartTitle.trim(),
      date: newPartDate,
      completed: false
    };
    parts.push(newPart);

    const history = currentMetadata.history || [];
    history.push({
      action: `Sub-prazo "${newPart.title}" (até ${new Date(newPart.date).toLocaleDateString('pt-BR')}) adicionado`,
      by: user?.name || 'Usuário',
      date: new Date().toISOString()
    });

    const newMetadata = { ...currentMetadata, parts, history };
    await updateTask(editingTaskId, { metadata: newMetadata });
    setNewPartTitle('');
    setNewPartDate('');
  };

  const handleDeletePart = async (partId) => {
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

    const targetPart = (currentMetadata.parts || []).find(p => p.id === partId);
    const parts = (currentMetadata.parts || []).filter(p => p.id !== partId);

    const history = currentMetadata.history || [];
    if (targetPart) {
      history.push({
        action: `Sub-prazo "${targetPart.title}" removido`,
        by: user?.name || 'Usuário',
        date: new Date().toISOString()
      });
    }

    const newMetadata = { ...currentMetadata, parts, history };
    await updateTask(editingTaskId, { metadata: newMetadata });
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

    const comments = [...(currentMetadata.comments || [])];
    const newComment = {
      id: crypto.randomUUID(),
      author: user?.name || 'Usuário',
      text: newCommentText.trim(),
      date: new Date().toISOString()
    };
    comments.push(newComment);

    const history = currentMetadata.history || [];
    history.push({
      action: `Comentário adicionado por ${newComment.author}`,
      by: user?.name || 'Usuário',
      date: new Date().toISOString()
    });

    const newMetadata = { ...currentMetadata, comments, history };
    await updateTask(editingTaskId, { metadata: newMetadata });
    setNewCommentText('');

    // Trigger Notification
    const assigneeId = task.assigned_to || task.metadata?.assigned_to;
    if (assigneeId && assigneeId !== user?.employeeId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('employee_id', assigneeId)
        .maybeSingle();
      if (prof?.id) {
        await supabase.from('notifications').insert({
          user_id: prof.id,
          title: `Novo comentário em "${task.title}"`,
          description: `${user?.name || 'Alguém'}: "${newComment.text.slice(0, 60)}${newComment.text.length > 60 ? '...' : ''}"`,
          type: 'task_comment',
          related_id: task.id,
          metadata: { url: `${window.location.origin}/social-media?task=${task.id}` }
        });

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                userId: prof.id,
                title: `Novo comentário em "${task.title}"`,
                body: `${user?.name || 'Alguém'}: "${newComment.text.slice(0, 60)}"`,
                url: `${window.location.origin}/social-media?task=${task.id}`,
                icon: '/favicon.svg',
              }),
            });
          }
        } catch (e) {
          console.warn('Erro ao disparar push:', e);
        }
      }
    }
  };

  const handleSaveEditedComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

    const comments = (currentMetadata.comments || []).map(comment => {
      if (comment.id === commentId) {
        return { ...comment, text: editingCommentText.trim(), edited: true, editedAt: new Date().toISOString() };
      }
      return comment;
    });

    const history = currentMetadata.history || [];
    history.push({
      action: `Comentário editado`,
      by: user?.name || 'Usuário',
      date: new Date().toISOString()
    });

    const newMetadata = { ...currentMetadata, comments, history };
    await updateTask(editingTaskId, { metadata: newMetadata });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Deseja realmente excluir este comentário?')) return;
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    let currentMetadata = task.metadata;
    if (typeof currentMetadata === 'string') {
      try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
    }
    if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

    const comments = (currentMetadata.comments || []).filter(comment => comment.id !== commentId);

    const history = currentMetadata.history || [];
    history.push({
      action: `Comentário removido`,
      by: user?.name || 'Usuário',
      date: new Date().toISOString()
    });

    const newMetadata = { ...currentMetadata, comments, history };
    await updateTask(editingTaskId, { metadata: newMetadata });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    if (editingTaskId) {
      const existingTask = tasks.find(t => t.id === editingTaskId);
      if (!existingTask) return;

      const selectedRule = slaRules.find(r => r.id === taskForm.rule_id);
      const requestedDays = parseInt(taskForm.requested_sla_days) || (selectedRule ? selectedRule.days_allowed : slaDays || 2);
      const isExceeded = selectedRule ? requestedDays > selectedRule.days_allowed : (slaDays > 0 && requestedDays > slaDays);

      const history = [...(existingTask.metadata?.history || [])];

      if (existingTask.title !== taskForm.title) {
        history.push({
          action: `Tarefa renomeada de "${existingTask.title}" para "${taskForm.title}"`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        });
      }
      if ((existingTask.metadata?.description || '') !== taskForm.description) {
        history.push({
          action: `Descrição/Briefing atualizada`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        });
      }
      const oldAssignee = existingTask.assigned_to || existingTask.metadata?.assigned_to;
      if (oldAssignee !== taskForm.assigned_to) {
        const oldEmpName = employees.find(emp => emp.id === oldAssignee)?.name || 'Ninguém';
        const newEmpName = employees.find(emp => emp.id === taskForm.assigned_to)?.name || 'Ninguém';
        history.push({
          action: `Responsável alterado de "${oldEmpName}" para "${newEmpName}"`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        });
      }

      const metadata = {
        ...(existingTask.metadata || {}),
        platform: taskForm.platform,
        destination: taskForm.destination,
        publishDate: taskForm.publishDate,
        description: taskForm.description,
        drive_link: taskForm.drive_link,
        type: selectedRule?.activity_name || 'Atividade',
        history
      };

      await updateTask(editingTaskId, {
        title: taskForm.title,
        assigned_to: taskForm.assigned_to || null,
        rule_id: taskForm.rule_id || null,
        requested_sla_days: requestedDays,
        sla_approval_status: isExceeded ? 'pending' : 'approved',
        scheduled_for: taskForm.publishDate || null,
        metadata
      });
    } else {
      const isDelegation = taskForm.target_department && taskForm.target_department !== departmentName;

      if (!isDelegation && !taskForm.assigned_to) {
        alert("É obrigatório atribuir a tarefa a um responsável.");
        return;
      }

      const targetStatus = isDelegation ? 'Concluído' : (taskForm.status || columns[0]);
      const selectedRule = slaRules.find(r => r.id === taskForm.rule_id);
      const requestedDays = parseInt(taskForm.requested_sla_days) || (selectedRule ? selectedRule.days_allowed : slaDays || 2);

      const metadata = {
        description: taskForm.description || '',
        platform: taskForm.platform,
        destination: taskForm.destination || 'Social Media',
        parts: [],
        comments: [],
        publishDate: taskForm.publishDate || '',
        waiting_handoff: isDelegation,
        sent_to_department: isDelegation ? taskForm.target_department : null,
        history: [{
          action: isDelegation ? `Criada e delegada para ${taskForm.target_department}` : `Tarefa criada no status "${targetStatus}"`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        }]
      };

      await handleAddTask({
        client_id: taskForm.client_id || undefined,
        title: taskForm.title,
        status: targetStatus,
        assigned_to: taskForm.assigned_to || null,
        rule_id: taskForm.rule_id || null,
        requested_sla_days: requestedDays,
        sla_approval_status: 'approved',
        scheduled_for: taskForm.publishDate || null,
        metadata
      });
    }

    setTaskForm({ title: '', rule_id: '', platform: 'N/A', destination: 'Social Media', publishDate: '', description: '', assigned_to: '', requested_sla_days: '', drive_link: '', status: '', target_department: '', client_id: '' });
    setEditingTaskId(null);
    setIsTaskModalOpen(false);
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setConfirmDelete(false);
    setDeleting(false);
    setTaskForm({
      title: task.title,
      rule_id: task.rule_id || '',
      platform: task.metadata?.platform || 'N/A',
      destination: task.metadata?.destination || 'Social Media',
      publishDate: task.metadata?.publishDate || '',
      description: task.metadata?.description || '',
      assigned_to: task.assigned_to || task.metadata?.assigned_to || '',
      requested_sla_days: task.requested_sla_days || '',
      drive_link: task.metadata?.drive_link || '',
      status: task.status
    });
    setActiveTab('geral');
    setIsTaskModalOpen(true);
  };

  const openDeliveryModal = (task) => {
    setTaskToDeliver(task);
    setDeliveryLink(task.metadata?.drive_link || client.metadata?.drive_links?.[departmentName] || client.metadata?.drive_folder_url || '');
    setDeliveryModalOpen(true);
  };

  const handleFinalize = async (task) => {
    const destination = task.metadata?.destination;
    
    // Se houver destino e for diferente do atual, encaminha automaticamente
    if (destination && destination !== departmentName) {
      await forwardTask(task.id, destination);
      return;
    }
    
    await updateTask(task.id, { status: 'Concluído' });
  };

  const forwardTask = async (taskId, targetDepartment) => {
    if (!targetDepartment || targetDepartment === departmentName) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      let currentMetadata = task.metadata;
      if (typeof currentMetadata === 'string') {
        try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
      }
      if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

      const history = currentMetadata.history || [];
      const newHistoryEntry = {
        from: departmentName,
        to: targetDepartment,
        action: `Enviado para Aceite em ${targetDepartment}`,
        by: user?.name || 'Usuário',
        date: new Date().toISOString()
      };

      const newMetadata = { 
        ...currentMetadata, 
        history: [...history, newHistoryEntry],
        sent_to_department: targetDepartment,
        waiting_handoff: true,
        chain_id: currentMetadata.chain_id || task.id
      };
      
      await updateTask(taskId, { 
        status: 'Em Revisão', 
        metadata: newMetadata 
      });

      alert(`Enviado com sucesso! Agora o departamento de ${targetDepartment} precisa aceitar o material.`);
    } catch (err) {
      console.error('Erro ao encaminhar tarefa:', err);
      alert('Erro ao encaminhar tarefa: ' + err.message);
    }
  };

  const handleSendToClient = async (e) => {
    e.preventDefault();
    if (!taskToDeliver || !deliveryLink.trim()) {
      alert("Por favor, adicione o link do material.");
      return;
    }
    
    try {
      const currentMetadata = taskToDeliver.metadata || {};
      const comments = currentMetadata.comments || [];
      const now = new Date().toISOString();
      
      let updatedComments = comments;
      if (deliveryNotes.trim()) {
        updatedComments = [...comments, {
          id: crypto.randomUUID(),
          author: user?.name || 'Equipe',
          text: `Observações da Entrega:\n${deliveryNotes}`,
          date: now
        }];
      }

      const newMetadata = {
        ...currentMetadata,
        delivery_link: deliveryLink,
        delivery_notes: deliveryNotes,
        comments: updatedComments,
        history: [...(currentMetadata.history || []), { action: 'Material enviado p/ aprovação do cliente via WhatsApp', by: user?.name || 'Equipe', date: now }]
      };
      
      await updateTask(taskToDeliver.id, { 
        status: ['Design', 'Edição'].includes(departmentName) ? 'Concluído' : 'Aguardando Aprovação Cliente',
        metadata: newMetadata 
      });

      // Se for Design ou Edição, envia automaticamente para o Social Media
      if (['Design', 'Edição'].includes(departmentName)) {
        await forwardTask(taskToDeliver.id, 'Social Media');
        alert(`Peça finalizada e enviada para revisão de Social Media!`);
        setDeliveryModalOpen(false);
        setTaskToDeliver(null);
        setDeliveryLink('');
        setDeliveryNotes('');
        return;
      }

      // Integração com WhatsApp (Chatbot Approvals)
      if (client?.phone) {
        // Registra a aprovação pendente no banco
        await supabase.from('whatsapp_approvals').insert({
          task_id: taskToDeliver.id,
          client_id: client.id,
          employee_id: user?.employeeId || null,
          phone_number: client.phone,
          status: 'pending'
        });

        // Insere a mensagem simulada enviada para o cliente no histórico de chat
        await supabase.from('whatsapp_messages').insert({
          client_id: client.id,
          employee_id: user?.employeeId || null,
          direction: 'outbound',
          from_number: 'system',
          to_number: client.phone,
          content: `Olá ${client.name}!\n\nO colaborador *${user?.name || 'da equipe'}* enviou um material de ${departmentName} para sua aprovação.\n\n📄 *Detalhes:* ${deliveryNotes || taskToDeliver.title}\n🔗 *Link:* ${deliveryLink}\n\nResponda apenas com o número da opção desejada:\n*1* - Aprovar\n*2* - Refazer\n*3* - Reagendar`,
          status: 'sent'
        });
      }
      
      setDeliveryModalOpen(false);
      setTaskToDeliver(null);
      setDeliveryLink('');
      setDeliveryNotes('');
      alert("Material enviado para aprovação via WhatsApp com sucesso!");
    } catch (err) {
      alert("Erro ao enviar aprovação: " + err.message);
    }
  };

  if (!client) return null;

  // Clientes não têm acesso ao Pipeline interno — processo exclusivo da equipe
  if (user?.role === 'client') return null;

  const renderContent = (
    <div className={`department-pipeline-container ${isFullscreen ? 'kanban-fullscreen-wrapper' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {['minha', ...(isDeptManager && departmentName === 'Edição' ? ['equipe'] : [])].map((boardMode) => {
        const currentColumns = boardMode === 'minha' ? columns : ['Prontos p/ Editar', ...teamEmployees.map(c => c.name || 'Desconhecido')];
        return (
          <section key={boardMode} className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            {boardMode === 'minha' ? (
              <>
                <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: 16, flexShrink: 0, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BookOpen size={20} /> Pipeline - {departmentName}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsSettingsOpen(true)} 
                      className="icon-btn text-muted" 
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Ajustar Colunas do Kanban"
                    >
                      <Sliders size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {isFullscreen ? (
                      <button 
                        type="button" 
                        onClick={() => setIsFullscreen(false)} 
                        className="glass-btn"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#fca5a5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.85rem'
                        }}
                        title="Fechar Tela Cheia (Esc)"
                      >
                        <X size={16} /> Fechar
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setIsFullscreen(true)} 
                        className="glass-btn"
                        title="Tela Cheia"
                      >
                        <Maximize2 size={16} /> Expandir
                      </button>
                    )}

                    <button type="button" onClick={() => { 
                      setEditingTaskId(null);
                      setTaskForm({ 
                        title: '', rule_id: '', platform: 'N/A', publishDate: '', description: '', 
                        assigned_to: user?.employeeId || '', 
                        requested_sla_days: slaDays || '',
                        drive_link: client?.metadata?.drive_links?.[departmentName] || client?.metadata?.drive_folder_url || '',
                        status: columns[0],
                        client_id: ''
                      }); 
                      setIsTaskModalOpen(true); 
                    }} className="glass-btn primary" style={{ display: readOnly ? 'none' : 'flex' }}>
                      <Plus size={16} /> Nova Demanda
                    </button>
                  </div>
                </div>

                {['Captação', 'Social Media'].includes(departmentName) && (
                  <PendingApprovalsWidget client={client} currentDepartment={departmentName} user={user} onWorkflowUpdate={refresh} />
                )}
              </>
            ) : (
              <div className="section-title" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCircle size={20} /> Organizar Demandas (Equipe)
                   </div>
                   <button 
                     type="button" 
                     onClick={() => setIsTeamSettingsOpen(true)} 
                     className="icon-btn text-muted" 
                     style={{
                       background: 'rgba(255,255,255,0.05)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       padding: '6px',
                       borderRadius: '6px',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center'
                     }}
                     title="Ajustar Colaboradores"
                   >
                     <Sliders size={16} />
                   </button>
                 </div>
              </div>
            )}

            {loading ? (
              <div className="loading-state"><Loader2 className="spin" /> Carregando Kanban...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {boardMode === 'minha' && isDeptManager && <h3 style={{ marginLeft: 16, marginTop: 8, color: '#a78bfa', paddingBottom: 4, fontSize: '1.1rem' }}>PIPELINE {departmentName.toUpperCase()} (Minha Visão)</h3>}
                
                <div 
                  className="kanban-board"
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  style={{ cursor: isMouseDown ? 'grabbing' : 'grab' }}
                >
                    {currentColumns.map(columnStatus => {
              const columnTasks = tasks.filter(t => {
                const s1 = (t.status || '').toLowerCase().trim();
                const c1 = (columnStatus || '').toLowerCase().trim();
                
                if (boardMode === 'minha' && departmentName === 'Edição') {
                  if (!t.assigned_to || t.assigned_to !== user?.employeeId) return false;
                }

                if (boardMode === 'equipe') {
                  if (c1 === 'prontos p/ editar') {
                     const isAssignedToTeam = teamEmployees.some(col => col.id === t.assigned_to);
                     return !isAssignedToTeam && (s1 === 'a fazer' || s1 === 'prontos p/ editar' || !s1);
                  }
                  const colEmp = teamEmployees.find(c => (c.name || '').toLowerCase() === c1);
                  if (colEmp && t.assigned_to === colEmp.id) return true;
                  return false;
                }

                if (s1 === c1) return true;
                // Handle Aprovado vs Aprovados (ignore aprovados internamente)
                if (s1 === 'aprovado' && c1.includes('aprovado') && c1 !== 'aprovados internamente') return true;
                // Handle Concluído vs Concluídos vs Agendar/Concluído
                if (s1 === 'concluído' && (c1.includes('concluíd') || c1.includes('agendar'))) return true;
                // Preserve old mapping for other departments
                if ((c1 === 'em revisão interna' || c1 === 'revisão interna') && s1 === 'em revisão') return true;
                if (c1 === 'em revisão' && s1 === 'em revisão interna' && departmentName !== 'Social Media') return true;
                // New hidden mapping for Aprovados Internamente bypassing DB check constraint
                if (c1 === 'aprovados internamente' && s1 === 'em revisão interna') return true;
                return false;
              });
              return (
                <div key={columnStatus} className={`kanban-column${dragOverColumn === columnStatus ? ' drag-over' : ''}`}
                  onDragOver={(e) => { if (!readOnly) { e.preventDefault(); setDragOverColumn(columnStatus); } }}
                  onDragLeave={() => { if (!readOnly) setDragOverColumn(null); }}
                  onDrop={(e) => {
                    if (readOnly) return;
                    e.preventDefault();
                    setDragOverColumn(null);
                    const taskId = dragTaskIdRef.current;
                    if (taskId) {
                      const taskObj = tasks.find(t => t.id === taskId);
                      if (taskObj) {
                        let currentMetadata = taskObj.metadata || {};
                        if (typeof currentMetadata === 'string') {
                          try { currentMetadata = JSON.parse(currentMetadata); } catch(ex) { currentMetadata = {}; }
                        }

                        if (boardMode === 'equipe') {
                          const history = [...(currentMetadata.history || [])];
                          if (columnStatus === 'Prontos p/ Editar') {
                            if (taskObj.assigned_to !== null) {
                              history.push({
                                action: `Retornado para fila de edição`,
                                by: user?.name || 'Líder',
                                date: new Date().toISOString()
                              });
                              updateTask(taskId, {
                                 assigned_to: null,
                                 status: 'Prontos p/ Editar',
                                 metadata: { ...currentMetadata, history }
                              });
                            }
                          } else {
                            const targetEmp = teamEmployees.find(c => c.name === columnStatus);
                            if (targetEmp && taskObj.assigned_to !== targetEmp.id) {
                              history.push({
                                action: `Delegado para ${targetEmp.name}`,
                                by: user?.name || 'Líder',
                                date: new Date().toISOString()
                              });
                              const newStatus = (!taskObj.status || taskObj.status.toLowerCase() === 'prontos p/ editar') ? 'A Fazer' : taskObj.status;
                              updateTask(taskId, {
                                 assigned_to: targetEmp.id,
                                 status: newStatus,
                                 metadata: { ...currentMetadata, history }
                              });
                            }
                          }
                          dragTaskIdRef.current = null;
                          return;
                        }

                        if (taskObj.status !== columnStatus) {
                          // Validações de transição
                          if (departmentName === 'Edição' && columnStatus === 'Em Revisão Interna') {
                          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
                            setAlertModal({
                              title: 'Material Pendente',
                              message: "Para mover a demanda para 'Em Revisão Interna', você precisa primeiro entregar o material (adicionar o link do Google Drive/Entrega)."
                            });
                            dragTaskIdRef.current = null;
                            return;
                          }
                        }

                        if (departmentName === 'Social Media' && columnStatus === 'Aguardando Cliente') {
                          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
                            setAlertModal({
                              title: 'Link de Entrega Vazio',
                              message: "Não é possível mover para 'Aguardando Cliente' sem o link do material entregue."
                            });
                            dragTaskIdRef.current = null;
                            return;
                          }
                        }

                        if (departmentName === 'Social Media' && columnStatus === 'Agendar/Concluído') {
                          if (!currentMetadata.client_approved) {
                            setAlertModal({
                              title: 'Aprovação Pendente',
                              message: "Esta demanda precisa ser aprovada pelo cliente antes de ser agendada/concluída."
                            });
                            dragTaskIdRef.current = null;
                            return;
                          }
                        }

                        if (['Design', 'Edição', 'Social Media'].includes(departmentName) && ['Aprovado', 'Concluído'].includes(columnStatus)) {
                          if (!currentMetadata.delivery_link && !currentMetadata.drive_link) {
                            setAlertModal({
                              title: 'Entrega Requerida',
                              message: "Você precisa primeiro entregar o material antes de concluir ou aprovar a demanda."
                            });
                            dragTaskIdRef.current = null;
                            return;
                          }
                        }

                        const oldStatus = taskObj.status;
                        const history = [...(currentMetadata.history || [])];
                        history.push({
                          action: `Status alterado de "${oldStatus}" para "${columnStatus}" (via Arrastar e Soltar)`,
                          by: user?.name || 'Usuário',
                          date: new Date().toISOString()
                        });
                        
                        const validStatuses = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Em Revisão Interna', 'Aguardando Aprovação Cliente', 'Aguardando Cliente', 'Solicitar Gravação', 'Ajuste do Cliente', 'Refazer', 'Aprovado', 'Concluído', 'Agendar/Concluído'];
                        let targetStatus = columnStatus;
                        if (targetStatus.toLowerCase().trim() === 'aprovados internamente') targetStatus = 'Em Revisão Interna';
                        
                        const matched = validStatuses.find(v => v.toLowerCase() === targetStatus.toLowerCase().trim());
                        if (matched) targetStatus = matched;

                        updateTask(taskId, { 
                          status: targetStatus,
                          metadata: { ...currentMetadata, history }
                        });
                        }
                      }
                      dragTaskIdRef.current = null;
                    }
                  }}
                >
                  <div className="kanban-col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4>{columnStatus}</h4>
                      <span className="kanban-count">{columnTasks.length}</span>
                    </div>
                  </div>
                  <div className="kanban-items">
                    {columnTasks.map(task => {
                      const params = new URLSearchParams(window.location.search);
                      const urlTaskId = params.get('task');
                      const isHighlighted = urlTaskId === task.id;
                      return (
                        <div 
                          key={task.id} 
                          id={`kanban-task-${task.id}`}
                          className="kanban-card glass-card"
                          style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
                          draggable={readOnly ? "false" : "true"}
                          onDragStart={(e) => {
                            if (readOnly) return;
                            dragTaskIdRef.current = task.id;
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={(e) => {
                            setDragOverColumn(null);
                          }}
                          onClick={() => openEditModal(task)}
                          style={{
                            transition: 'all 0.3s ease-in-out',
                            cursor: 'pointer',
                            ...(isHighlighted ? {
                              boxShadow: '0 0 25px rgba(99, 102, 241, 0.45)',
                              border: '2px solid rgba(99, 102, 241, 0.65)',
                              transform: 'scale(1.025)',
                              zIndex: 10
                            } : {})
                          }}
                        >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={`badge ${task.metadata?.type === 'video' ? 'bg-video' : 'bg-instagram'}`}>
                              {task.metadata?.platform || (task.metadata?.type === 'video' ? 'Vídeo' : 'Arte')}
                            </span>
                            {client?.id === 'ALL' && task.client && (
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                {task.client?.metadata?.display_name || task.client?.name || 'Cliente'}
                              </span>
                            )}
                          </div>
                          
                          {boardMode === 'equipe' && columnStatus !== 'Prontos p/ Editar' && (
                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', border: '1px solid #3b82f6', marginLeft: 'auto', marginRight: 8, fontSize: '0.65rem' }}>
                              {task.status || 'A Fazer'}
                            </span>
                          )}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(task);
                            }} 
                            className="icon-btn text-muted" 
                            title="Editar / Excluir Demanda"
                            style={{ padding: '6px' }}
                          >
                            <Edit3 size={16}/>
                          </button>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                           <div>
                              {task.rule_id && slaRules.find(r => r.id === task.rule_id) && (
                                <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginBottom: 4, fontWeight: 700 }}>
                                  {slaRules.find(r => r.id === task.rule_id)?.activity_name}
                                </div>
                              )}
                              {(() => {
                                let displayTitle = task.title || '';
                                let receivedTag = task.metadata?.received_from;

                                const match = displayTitle.match(/^\[Recebido de (.*?)\]\s*/);
                                if (match) {
                                  receivedTag = match[1];
                                  displayTitle = displayTitle.replace(match[0], '');
                                }

                                return (
                                  <>
                                    <h5 className="kanban-task-title" style={{ marginBottom: receivedTag ? 4 : undefined }}>{displayTitle}</h5>
                                    {receivedTag && (
                                      <div style={{ 
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', 
                                        color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.25)', 
                                        padding: '2px 6px', borderRadius: '4px', fontWeight: 600, 
                                        marginTop: 4
                                      }}>
                                        Origem: {receivedTag}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                           </div>
                           {task.sla_approval_status === 'pending' && (
                             <div className="pending-badge" title="Aguardando aprovação do prazo pelo gestor">
                               <Clock size={10} /> Pendente SLA
                             </div>
                           )}
                        </div>

                        {task.metadata?.waiting_handoff && (
                           <div style={{ 
                             margin: '8px 0', 
                             padding: '10px', 
                             background: 'rgba(99, 102, 241, 0.15)', 
                             border: '2px solid #6366f1', 
                             borderRadius: '8px',
                             fontSize: '0.85rem',
                             color: '#fff',
                             fontWeight: 800,
                             textAlign: 'center',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             gap: 8,
                             boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                           }}>
                             <Send size={16} className="text-primary" /> 
                             <span>ENCAMINHADO PARA: <br/> <strong style={{ color: '#a5b4fc' }}>{task.metadata.sent_to_department}</strong></span>
                           </div>
                        )}
                        
                        {(() => {
                          const dateStr = task.scheduled_for || task.metadata?.publishDate;
                          if (!dateStr) return null;
                          const dueDate = new Date(dateStr);
                          const now = new Date();
                          const diffTime = dueDate - now;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isDone = task.status === 'Concluído' || task.status === 'Aprovado';
                          
                          let formattedDate = '';
                          const dateOnly = dateStr.substring(0, 10);
                          const parts = dateOnly.split('-');
                          if (parts.length === 3) {
                            formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                          } else {
                            formattedDate = dueDate.toLocaleDateString('pt-BR').replace(/\//g, '.');
                          }
                          
                          if (isDone) {
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(52, 211, 153, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                <Check size={12} /> Entregue no Prazo ({formattedDate})
                              </div>
                            );
                          }
                          if (diffDays < 0) {
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(251, 113, 133, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', border: '1px solid rgba(251, 113, 133, 0.3)' }}>
                                <Clock size={12} /> Atrasado há {Math.abs(diffDays)} dia(s) ({formattedDate})
                              </div>
                            );
                          } else if (diffDays === 0) {
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                <Clock size={12} /> Vence Hoje! ({formattedDate})
                              </div>
                            );
                          } else {
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                <Calendar size={12} /> Faltam {diffDays} dia(s) ({formattedDate})
                              </div>
                            );
                          }
                        })()}

                        {task.metadata?.description && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>{task.metadata.description}</p>
                        )}
                        {(task.assigned_to || task.metadata?.assigned_to) && (
                          <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <UserCircle size={12} /> {employees.find(e => e.id === (task.assigned_to || task.metadata?.assigned_to))?.name || 'Responsável'}
                          </div>
                        )}

                        {/* Briefing Recebido da Captação */}
                        {task.metadata?.recorded_notes && columnStatus !== 'Concluído' && (
                          <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid #f59e0b', borderRadius: '4px', fontSize: '0.75rem', color: '#fbbf24', marginBottom: 12 }}>
                            <strong>Briefing da Captação:</strong><br/>
                            {task.metadata.recorded_notes}
                          </div>
                        )}
                        
                        {task.metadata?.drive_link && columnStatus !== 'Concluído' && (
                          <a href={task.metadata.drive_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#60a5fa', marginBottom: 12, textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
                            <HardDrive size={14} /> Acessar Arquivos Brutos
                          </a>
                        )}

                        {/* M5: Gestor do departamento aparece em "Em Revisão" */}
                        {columnStatus === 'Em Revisão' && deptManager && (
                          <div style={{ fontSize: '0.75rem', color: '#34d399', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
                            <UserCircle size={12}/> Revisor: {deptManager.name}
                          </div>
                        )}

                        <div className="kanban-actions" onClick={(e) => e.stopPropagation()} style={{ display: readOnly ? 'none' : 'flex' }}>
                           {columnStatus === 'A Fazer' && (
                             task.metadata?.workflow_stage === 'aguardando_aceite' ? (
                               <button onClick={() => {
                                 const history = [...(task.metadata?.history || [])];
                                 history.push({ action: 'Aceitou a demanda com o briefing', by: user?.name || 'Responsável', date: new Date().toISOString() });
                                 updateTask(task.id, {
                                   status: 'Em Andamento',
                                   metadata: {
                                     ...task.metadata,
                                     workflow_stage: 'em_producao',
                                     history
                                   }
                                 });
                               }} className="status-btn primary" style={{ background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>
                                 Aceitar Demanda (Ler Briefing)
                               </button>
                             ) : (
                               <button onClick={() => {
                                 const history = [...(task.metadata?.history || [])];
                                 history.push({ action: 'Iniciou produção', by: user?.name || 'Responsável', date: new Date().toISOString() });
                                 updateTask(task.id, { status: 'Em Andamento', metadata: { ...task.metadata, history } });
                               }} className="status-btn">Iniciar Produção</button>
                             )
                           )}
                           
                           {['em revisão', 'em revisão interna', 'revisão interna'].includes(columnStatus.toLowerCase().trim()) && !task.metadata?.waiting_handoff && departmentName === 'Social Media' && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                               <button onClick={() => {
                                 const history = [...(task.metadata?.history || [])];
                                 const currentIndex = columns.indexOf(columnStatus);
                                 let nextStatus = (departmentName === 'Social Media' && currentIndex !== -1 && currentIndex + 1 < columns.length) ? columns[currentIndex + 1] : 'Aprovado';
                                 
                                 // Força para a coluna Aprovados Internamente, caso ela exista
                                 if (departmentName === 'Social Media' && columnStatus.toLowerCase().trim() === 'em revisão') {
                                    if (columns.map(c => c.toLowerCase().trim()).includes('aprovados internamente')) {
                                      nextStatus = 'Aprovados Internamente';
                                    }
                                 }

                                 const validStatuses = ['A Fazer', 'Em Andamento', 'Em Revisão', 'Em Revisão Interna', 'Aguardando Aprovação Cliente', 'Aguardando Cliente', 'Solicitar Gravação', 'Ajuste do Cliente', 'Refazer', 'Aprovado', 'Concluído', 'Agendar/Concluído'];
                                 let dbStatus = nextStatus;
                                 if (dbStatus.toLowerCase().trim() === 'aprovados internamente') dbStatus = 'Em Revisão Interna';
                                 
                                 const match = validStatuses.find(v => v.toLowerCase() === dbStatus.toLowerCase().trim());
                                 if (match) dbStatus = match;
                                 
                                 history.push({ action: `Demanda aprovada internamente - Enviada para ${nextStatus}`, by: user?.name || 'Revisor', date: new Date().toISOString() });
                                 updateTask(task.id, { status: dbStatus, feedback: '', metadata: { ...task.metadata, history } });
                               }} className="status-btn success" style={{ width: '100%', background: '#10b981', color: 'white' }}><Check size={14}/> Aprovar Demanda</button>

                               <button onClick={() => {
                                 setReprovalTask(task);
                                 setReprovalModalOpen(true);
                               }} className="status-btn" style={{ width: '100%', background: '#ef4444', color: 'white' }}><XCircle size={14}/> Reprovar Demanda</button>
                             </div>
                           )}

                           {columnStatus.toLowerCase().trim() === 'refazer' && (
                               <button onClick={() => {
                                 setReprovalTask(task);
                                 setReprovalModalOpen(true);
                               }} className="status-btn" style={{ width: '100%', background: '#ef4444', color: 'white', marginTop: 8 }}><XCircle size={14}/> Solicitar Ajuste (Edição)</button>
                           )}

                           {columnStatus.toLowerCase().trim() === 'aprovados internamente' && departmentName === 'Social Media' && (
                               <button onClick={() => {
                                 const history = [...(task.metadata?.history || [])];
                                 const validStatuses = ['Aguardando Aprovação Cliente', 'Aguardando Cliente'];
                                 let dbStatus = 'Aguardando Cliente'; // Fallback seguro
                                 const targetColumn = columns.find(c => c.toLowerCase().trim().includes('aguardando'));
                                 if (targetColumn) {
                                    const match = validStatuses.find(v => v.toLowerCase() === targetColumn.toLowerCase().trim());
                                    if (match) dbStatus = match;
                                 }
                                 
                                 // 1. Injeta automaticamente na tela do Portal do Cliente
                                 const payload = {
                                    client_id: client.id,
                                    title: task.title,
                                    description: task.description || '',
                                    url: task.metadata?.delivery_link || task.metadata?.drive_link || null,
                                    status: 'pending_approval',
                                    type: task.metadata?.content_type || 'Arte',
                                    platform: task.metadata?.platform || 'Instagram',
                                    created_by: user?.id,
                                    metadata: { original_task_id: task.id }
                                 };
                                 supabase.from('social_contents').insert(payload).then(async ({ error }) => {
                                    if (error) {
                                      console.error("Erro ao sincronizar com Portal do Cliente:", error);
                                      alert("Erro ao enviar para o portal do cliente: " + error.message);
                                    } else {
                                      // 2. Acende o Sino do Cliente no Portal (Aba Chat/Aprovações)
                                      await supabase.from('chat_messages').insert({
                                        client_id: client.id,
                                        department: 'Social Media',
                                        sender_id: user?.id,
                                        sender_name: user?.name || user?.email || 'Equipe ROI Expert',
                                        sender_type: 'employee',
                                        content: `🎨 Aprovação pendente: "${task.title}"`,
                                        is_internal: false,
                                      });
                                    }
                                 });
                                 
                                 // 3. Dispara WhatsApp e registra a pendência no bot (caso cliente tenha telefone)
                                 if (client?.phone) {
                                   supabase.from('whatsapp_approvals').insert({
                                     task_id: task.id,
                                     client_id: client.id,
                                     employee_id: user?.employeeId || null,
                                   }).then();
                                   
                                   supabase.from('whatsapp_messages').insert({
                                     client_id: client.id,
                                     employee_id: user?.employeeId || null,
                                     direction: 'outbound',
                                     message: `Olá! Seu material "*${task.title}*" está pronto para aprovação. Acesse o portal do cliente para visualizar e aprovar.`,
                                     status: 'sent'
                                   }).then();
                                 }

                                 // 4. Atualiza o status e histórico do Kanban
                                 history.push({ action: `Demanda enviada para aprovação do cliente (Portal Sincronizado e Notificado)`, by: user?.name || 'Social Media', date: new Date().toISOString() });
                                 updateTask(task.id, { status: dbStatus, feedback: '', metadata: { ...task.metadata, history } });
                               }} className="status-btn primary" style={{ width: '100%', background: '#3b82f6', color: 'white' }}><Send size={14}/> Enviar para o Cliente</button>
                           )}

                           {columnStatus === 'Refazer' && departmentName !== 'Social Media' && (
                              <button onClick={() => {
                                const targetStatus = departmentName === 'Edição' ? 'Em Revisão Interna' : 'Em Revisão';
                                updateTask(task.id, {status: targetStatus});
                              }} className="status-btn">Re-enviar para Aprovação</button>
                            )}

                           {['Ajuste Interno', 'Ajuste Cliente'].includes(columnStatus) && (
                               <button onClick={() => {
                                 const targetStatus = columnStatus === 'Ajuste Interno' ? 'Em Revisão Interna' : 'Aguardando Cliente';
                                 updateTask(task.id, {status: targetStatus});
                               }} className="status-btn">Entregar Correção</button>
                             )}

                           {['Aprovado', 'Concluído'].includes(columnStatus) && <button onClick={() => handleFinalize(task)} className="status-btn success">Finalizar / Arquivar</button>}
                           
                           {['Em Andamento'].includes(columnStatus) && (
                             <button onClick={() => openDeliveryModal(task)} className="status-btn" style={{ background: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', border: '1px solid rgba(66, 133, 244, 0.3)' }}>
                               <ExternalLink size={14}/> Entregar Material
                             </button>
                           )}
                        </div>

                        {['Em Andamento', 'Refazer'].includes(columnStatus) && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <FeedbackField
                              initialFeedback={task.feedback}
                              readOnly={departmentName === 'Social Media'}
                              onSubmit={(feedback) => {
                                const history = [...(task.metadata?.history || [])];
                                history.push({ action: `Solicitou refação: "${feedback}"`, by: user?.name || 'Gestor', date: new Date().toISOString() });
                                updateTask(task.id, { feedback, status: 'Refazer', metadata: { ...task.metadata, history } });
                              }}
                            />
                          </div>
                        )}


                        <div className="kanban-task-date">
                          Atualizado em: {new Date(task.updated_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })}


            </div>
            </div>
            )}
          </section>
        );
      })}

      {/* ===== CONTENT STATUS PANEL (Social Media only) ===== */}
      {departmentName === 'Social Media' && !isFullscreen && (
        <section className="glass-panel" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: contentPanelOpen ? 16 : 0, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={18} className="text-primary" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Status de Conteúdo</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                {syncedTasks.filter(t => t.status !== 'Concluído' && t.status !== 'Aprovado').length + contentChecklist.filter(c => c.status !== 'Recebido').length} pendente(s)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filter Tabs inline */}
              {contentPanelOpen && (
                <div style={{ display: 'flex', gap: 4, padding: '3px', background: 'rgba(0,0,0,0.25)', borderRadius: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: 'Todos', icon: <Package size={12} />, color: '#6366f1' },
                    { key: 'Captação', icon: <Film size={12} />, color: '#f59e0b' },
                    { key: 'Edição', icon: <Scissors size={12} />, color: '#a78bfa' },
                    { key: 'Design', icon: <Palette size={12} />, color: '#34d399' }
                  ].map(tab => {
                    const isActive = contentDeptFilter === tab.key;
                    const count = tab.key === 'Todos'
                      ? syncedTasks.length + contentChecklist.length
                      : syncedTasks.filter(t => t.department === tab.key).length + contentChecklist.filter(c => c.department === tab.key).length;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setContentDeptFilter(tab.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: isActive ? `${tab.color}20` : 'transparent',
                          color: isActive ? tab.color : 'var(--text-muted)',
                          boxShadow: isActive ? `0 0 0 1px ${tab.color}40` : 'none'
                        }}
                      >
                        {tab.icon}
                        {tab.key}
                        <span style={{
                          fontSize: '0.6rem', padding: '0px 5px', borderRadius: 6,
                          background: isActive ? `${tab.color}25` : 'rgba(255,255,255,0.05)',
                          color: isActive ? tab.color : 'var(--text-muted)',
                          fontWeight: 700, minWidth: 16, textAlign: 'center'
                        }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={(e) => { e.stopPropagation(); fetchContentStatus(); }} className="icon-btn" style={{ color: 'var(--text-muted)', padding: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} title="Atualizar">
                <RefreshCw size={14} />
              </button>
              <button type="button" onClick={() => setContentPanelOpen(!contentPanelOpen)} className="icon-btn" style={{ color: 'var(--text-muted)', padding: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'transform 0.2s', transform: contentPanelOpen ? 'rotate(0)' : 'rotate(-90deg)' }} title={contentPanelOpen ? 'Recolher' : 'Expandir'}>
                <span style={{ fontSize: '0.8rem' }}>▼</span>
              </button>
            </div>
          </div>

          {contentPanelOpen && (
            <div>
              {contentLoading ? (
                <div className="loading-state" style={{ padding: 16 }}><Loader2 className="spin" size={16} /> Carregando...</div>
              ) : (
                <>

                  {/* Synced Tasks Table */}
                  {(() => {
                    const filteredSynced = contentDeptFilter === 'Todos' ? syncedTasks : syncedTasks.filter(t => t.department === contentDeptFilter);
                    const filteredManual = contentDeptFilter === 'Todos' ? contentChecklist : contentChecklist.filter(c => c.department === contentDeptFilter);
                    return (filteredSynced.length > 0 || filteredManual.length > 0) ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conteúdo</th>
                            <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: 100 }}>Depto</th>
                            <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: 140 }}>Status</th>
                            <th style={{ textAlign: 'center', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', width: 100 }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Synced tasks from Captação & Edição */}
                          {filteredSynced.map(task => {
                            const statusColor = ['Concluído', 'Aprovado'].includes(task.status) ? '#34d399' : ['Em Andamento', 'Em Revisão'].includes(task.status) ? '#60a5fa' : ['A Fazer'].includes(task.status) ? '#fbbf24' : '#94a3b8';
                            const StatusIcon = ['Concluído', 'Aprovado'].includes(task.status) ? CheckCircle : ['Em Andamento', 'Em Revisão'].includes(task.status) ? RefreshCw : Circle;
                            const deptInfo = CONTENT_DEPT_ICON[task.department] || { icon: Circle, color: '#94a3b8' };
                            const DeptIcon = deptInfo.icon;
                            return (
                              <tr key={`sync-${task.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '10px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <DeptIcon size={14} style={{ color: deptInfo.color, flexShrink: 0 }} />
                                  <span style={{ color: 'var(--text-main)' }}>{task.title}</span>
                                  <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '1px 6px', borderRadius: 8, flexShrink: 0 }}>sync</span>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <span style={{ fontSize: '0.75rem', color: deptInfo.color, fontWeight: 600 }}>{task.department}</span>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: statusColor, fontWeight: 600, background: `${statusColor}15`, padding: '3px 8px', borderRadius: 6, border: `1px solid ${statusColor}30` }}>
                                    <StatusIcon size={12} /> {task.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(task.updated_at).toLocaleDateString('pt-BR')}</span>
                                    {['Concluído', 'Aprovado'].includes(task.status) && (
                                      <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); forwardTask(task.id, departmentName); }} 
                                        style={{ padding: '2px 8px', fontSize: '0.65rem', background: '#3b82f6', color: '#fff', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 600 }} 
                                        title="Receber"
                                      >
                                        Receber
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {/* Manual checklist items */}
                          {filteredManual.map(item => {
                            const statusColor = item.status === 'Recebido' ? '#34d399' : item.status === 'Pendente' ? '#fbbf24' : '#f87171';
                            const StatusIcon = item.status === 'Recebido' ? CheckCircle : item.status === 'Pendente' ? Clock : AlertCircle;
                            const deptInfo = CONTENT_DEPT_ICON[item.department] || { icon: Circle, color: '#94a3b8' };
                            const DeptIcon = deptInfo.icon;
                            return (
                              <tr key={`manual-${item.id}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>
                                <td style={{ padding: '10px 10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <DeptIcon size={14} style={{ color: deptInfo.color, flexShrink: 0 }} />
                                    {editingContentId === item.id ? (
                                      <input
                                        autoFocus
                                        value={editingContentName}
                                        onChange={e => setEditingContentName(e.target.value)}
                                        onBlur={() => { updateContentItem(item.id, { name: editingContentName }); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { updateContentItem(item.id, { name: editingContentName }); } if (e.key === 'Escape') setEditingContentId(null); }}
                                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-main)', fontSize: '0.82rem', flex: 1 }}
                                      />
                                    ) : (
                                      <span style={{ color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => { setEditingContentId(item.id); setEditingContentName(item.name); }}>{item.name}</span>
                                    )}
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 8, flexShrink: 0 }}>manual</span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <select value={item.department} onChange={e => updateContentItem(item.id, { department: e.target.value })} style={{ background: 'transparent', border: 'none', color: (CONTENT_DEPT_ICON[item.department] || {}).color || '#94a3b8', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                                    <option value="Captação" style={{ background: '#1e293b' }}>Captação</option>
                                    <option value="Edição" style={{ background: '#1e293b' }}>Edição</option>
                                    <option value="Design" style={{ background: '#1e293b' }}>Design</option>
                                  </select>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <select value={item.status} onChange={e => updateContentItem(item.id, { status: e.target.value })} style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30`, color: statusColor, fontSize: '0.78rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', outline: 'none' }}>
                                    <option value="Falta" style={{ background: '#1e293b', color: '#f87171' }}>🔴 Falta</option>
                                    <option value="Pendente" style={{ background: '#1e293b', color: '#fbbf24' }}>⏳ Pendente</option>
                                    <option value="Recebido" style={{ background: '#1e293b', color: '#34d399' }}>✅ Recebido</option>
                                  </select>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                    <button type="button" onClick={() => { setEditingContentId(item.id); setEditingContentName(item.name); }} className="icon-btn" style={{ padding: 4, color: 'var(--text-muted)' }} title="Renomear"><Edit3 size={13} /></button>
                                    {item.status === 'Falta' && (
                                      <button type="button" onClick={() => requestFromDepartment(item)} className="icon-btn" style={{ padding: 4, color: '#60a5fa' }} title={`Solicitar à ${item.department}`}><Send size={13} /></button>
                                    )}
                                    <button type="button" onClick={() => deleteContentItem(item.id)} className="icon-btn" style={{ padding: 4, color: '#f87171' }} title="Remover"><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <Package size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p style={{ margin: 0 }}>{contentDeptFilter === 'Todos' ? 'Nenhum conteúdo encontrado para este cliente.' : `Nenhum conteúdo de ${contentDeptFilter} encontrado.`}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Adicione itens manualmente abaixo ou crie demandas nos departamentos.</p>
                    </div>
                  );
                  })()}

                  {/* Add manual item */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <input
                      value={newContentName}
                      onChange={e => setNewContentName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addContentItem(); } }}
                      placeholder="Nome do conteúdo..."
                      style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none' }}
                    />

                    <button type="button" onClick={addContentItem} disabled={!newContentName.trim()} style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: newContentName.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, opacity: newContentName.trim() ? 1 : 0.5 }}>
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* Task Creation / Details Modal */}
      {isTaskModalOpen && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: editingTaskId ? 750 : 400, 
              height: editingTaskId ? 'min(720px, 90vh)' : 'auto',
              padding: 24, 
              position: 'relative', 
              maxHeight: '95vh', 
              overflowY: editingTaskId ? 'hidden' : 'auto', 
              display: 'flex', 
              flexDirection: 'column' 
            }}
          >
            <button onClick={() => setIsTaskModalOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16 }}>
              <X size={20} />
            </button>

            {!editingTaskId ? (
              /* ================== MODAL DE CRIAÇÃO SIMPLES ================== */
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={20} className="text-primary" /> Nova Demanda
                </h3>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Título da Tarefa *</label>
                    <input required type="text" className="glass-input" style={{ width: '100%' }} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Roteiro, Carrossel, etc..." />
                  </div>

                  {client?.id === 'ALL' && (
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Cliente *</label>
                      <select required className="glass-input" style={{ width: '100%' }} value={taskForm.client_id} onChange={e => setTaskForm(f => ({ ...f, client_id: e.target.value }))}>
                        <option value="">Selecione o Cliente</option>
                        {globalClients.map(c => (
                          <option key={c.id} value={c.id}>{c.metadata?.display_name || c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Setor Destino (Delegação)</label>
                    <select className="glass-input" style={{ width: '100%' }} value={taskForm.target_department || departmentName} onChange={e => setTaskForm(f => ({ ...f, target_department: e.target.value }))}>
                      <option value={departmentName}>Neste Setor ({departmentName})</option>
                      {DEPARTMENTS.filter(d => d !== departmentName).map(d => (
                        <option key={d} value={d}>Delegar para {d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prazo *</label>
                    <input required type="date" className="glass-input" style={{ width: '100%' }} value={taskForm.publishDate} onChange={e => setTaskForm(f => ({ ...f, publishDate: e.target.value }))} />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Coluna/Etapa *</label>
                    <select required className="glass-input" style={{ width: '100%' }} value={taskForm.status || columns[0]} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                   {(!taskForm.target_department || taskForm.target_department === departmentName) && (
                     <div>
                       <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Responsável *</label>
                       <select required className="glass-input" style={{ width: '100%' }} value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                         <option value="">Selecione...</option>
                         {employees
                           .filter(emp => getMatchingDepartments(departmentName).includes(emp.department) || emp.id === taskForm.assigned_to)
                           .map(emp => (
                             <option key={emp.id} value={emp.id}>{emp.name}</option>
                           ))}
                       </select>
                     </div>
                   )}

                  <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                    <button type="button" className="glass-btn" onClick={() => setIsTaskModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="glass-btn primary" disabled={loading}>
                      {loading ? <Loader2 className="spin" /> : 'Criar Demanda'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================== MODAL DE DETALHES COM SUBABAS ================== */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Cabeçalho da Tarefa */}
                <div style={{ marginBottom: 20 }}>
                  <span className="badge bg-instagram" style={{ marginBottom: 6, display: 'inline-block' }}>
                    {taskForm.platform || 'Geral'}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>{taskForm.title}</h3>
                </div>

                {/* Subabas */}
                <div style={{ display: 'flex', width: '100%', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 20 }}>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('geral')} 
                    style={{ 
                      flex: 1,
                      textAlign: 'center',
                      background: activeTab === 'geral' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      color: activeTab === 'geral' ? '#818cf8' : 'var(--text-muted)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Informações Gerais
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('comentarios')} 
                    style={{ 
                      flex: 1,
                      textAlign: 'center',
                      background: activeTab === 'comentarios' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      color: activeTab === 'comentarios' ? '#818cf8' : 'var(--text-muted)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Comentários
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setActiveTab('logs')} 
                    style={{ 
                      flex: 1,
                      textAlign: 'center',
                      background: activeTab === 'logs' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      border: 'none',
                      color: activeTab === 'logs' ? '#818cf8' : 'var(--text-muted)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Logs
                  </button>
                </div>

                {/* Conteúdo da Aba Ativa */}
                {activeTab === 'geral' && (
                  /* ================ ABA: INFORMAÇÕES GERAIS ================ */
                  <form onSubmit={handleCreateTask} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Renomear Tarefa */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome da Tarefa *</label>
                        <input required type="text" className="glass-input" style={{ width: '100%' }} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
                      </div>

                      {/* Descrição / Briefing */}
                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Descrição (Briefing)</label>
                        <textarea className="glass-input" rows={4} style={{ width: '100%' }} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes da solicitação..." />
                      </div>

                      {/* Prazos / Divisão de partes */}
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={16} className="text-primary" /> Divisão de Prazos / Partes
                        </h4>
                        
                        {/* Lista de Partes */}
                        {(() => {
                          const taskObj = tasks.find(t => t.id === editingTaskId);
                          const parts = taskObj?.metadata?.parts || [];
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                              {parts.length === 0 ? (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma divisão de prazo adicionada.</span>
                              ) : (
                                parts.map(part => (
                                  <div key={part.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(0,0,0,0.1)', padding: '6px 12px', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                      <input 
                                        type="checkbox" 
                                        checked={!!part.completed} 
                                        onChange={() => handleTogglePart(part.id)} 
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <span style={{ fontSize: '0.85rem', textDecoration: part.completed ? 'line-through' : 'none', color: part.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                                        {part.title}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {part.date ? new Date(part.date).toLocaleDateString('pt-BR') : ''}
                                      </span>
                                      <button type="button" onClick={() => handleDeletePart(part.id)} className="icon-btn text-danger" style={{ padding: 2 }}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          );
                        })()}

                        {/* Adicionar Parte Form */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input 
                            type="text" 
                            className="glass-input" 
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }} 
                            placeholder="Ex: 3 vídeos essa semana" 
                            value={newPartTitle} 
                            onChange={e => setNewPartTitle(e.target.value)} 
                          />
                          <input 
                            type="date" 
                            className="glass-input" 
                            style={{ width: 120, padding: '6px 10px', fontSize: '0.8rem' }} 
                            value={newPartDate} 
                            onChange={e => setNewPartDate(e.target.value)} 
                          />
                          <button type="button" onClick={handleAddPart} className="glass-btn primary" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Adicionar parte/prazo">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Coluna Lateral de Parâmetros */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 20 }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Responsável *</label>
                        <select required className="glass-input" style={{ width: '100%' }} value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                          <option value="">Selecione...</option>
                          {employees
                            .filter(emp => getMatchingDepartments(departmentName).includes(emp.department) || emp.id === taskForm.assigned_to)
                            .map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Data Limite de Entrega *</label>
                        <input required type="date" className="glass-input" style={{ width: '100%' }} value={taskForm.publishDate} onChange={e => setTaskForm(f => ({ ...f, publishDate: e.target.value }))} />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Tipo de Atividade (SLA)</label>
                        <select 
                          className="glass-input"
                          style={{ width: '100%' }}
                          value={taskForm.rule_id} 
                          onChange={e => {
                            const rid = e.target.value;
                            const rule = slaRules.find(r => r.id === rid);
                            setTaskForm(prev => ({...prev, rule_id: rid}));
                            if (rule) setTaskForm(prev => ({...prev, requested_sla_days: rule.days_allowed.toString()}));
                          }}
                        >
                          <option value="">Selecione a Regra...</option>
                          {slaRules.map(rule => (
                            <option key={rule.id} value={rule.id}>{rule.activity_name} ({rule.days_allowed} d)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prazo Solicitado (Dias)</label>
                        <input type="number" min="1" className="glass-input" style={{ width: '100%' }} value={taskForm.requested_sla_days} onChange={e => setTaskForm(f => ({ ...f, requested_sla_days: e.target.value }))} />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Plataforma</label>
                        <select className="glass-input" style={{ width: '100%' }} value={taskForm.platform} onChange={e => setTaskForm(f => ({ ...f, platform: e.target.value }))}>
                          <option value="N/A">N/A</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="TikTok">TikTok</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="YouTube">YouTube</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Destino Pós-Aprovação</label>
                        <select className="glass-input" style={{ width: '100%' }} value={taskForm.destination} onChange={e => setTaskForm(f => ({ ...f, destination: e.target.value }))}>
                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#4285F4', marginBottom: 4, display: 'block', fontWeight: 700 }}>
                          Link do Google Drive
                        </label>
                        <input type="url" className="glass-input" style={{ width: '100%' }} value={taskForm.drive_link} onChange={e => setTaskForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." />
                      </div>

                      {/* Excluir Card Seção */}
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {!confirmDelete ? (
                          <button
                            type="button"
                            className="glass-btn"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            onClick={() => setConfirmDelete(true)}
                          >
                            <Trash2 size={16} /> Excluir Card
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)' }}>
                            <span style={{ color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>Confirmar exclusão permanente?</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                disabled={deleting}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: deleting ? 'not-allowed' : 'pointer' }}
                                onClick={async () => {
                                  setDeleting(true);
                                  try {
                                    const { error } = await supabase.from('department_tasks').delete().eq('id', editingTaskId);
                                    if (error) throw error;
                                    deleteTask(editingTaskId);
                                    setSyncedTasks(prev => prev.filter(t => t.id !== editingTaskId));
                                    setIsTaskModalOpen(false);
                                    setConfirmDelete(false);
                                  } catch (err) {
                                    alert('Erro ao excluir: ' + err.message);
                                    setDeleting(false);
                                  }
                                }}
                              >
                                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
                              </button>
                              <button type="button" className="glass-btn" onClick={() => setConfirmDelete(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancelar</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botões do Formulário de Edição */}
                      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <button type="button" className="glass-btn" style={{ flex: 1 }} onClick={() => setIsTaskModalOpen(false)}>Fechar</button>
                        <button type="submit" className="glass-btn primary" style={{ flex: 1 }} disabled={loading}>
                          {loading ? <Loader2 className="spin" /> : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'comentarios' && (
                  /* ================ ABA: COMENTÁRIOS ================ */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'hidden' }}>
                    {/* Lista de Comentários */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                      {(() => {
                        const taskObj = tasks.find(t => t.id === editingTaskId);
                        const comments = taskObj?.metadata?.comments || [];
                        if (comments.length === 0) {
                          return <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 24 }}>Nenhum comentário ainda. Seja o primeiro a comentar!</div>;
                        }
                        return comments.map(comment => {
                          const isAuthor = comment.author === (user?.name || 'Usuário');
                          const isEditing = editingCommentId === comment.id;

                          return (
                            <div key={comment.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 12 }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <textarea
                                    className="glass-input"
                                    rows={2}
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                    value={editingCommentText}
                                    onChange={e => setEditingCommentText(e.target.value)}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button 
                                      type="button" 
                                      className="glass-btn" 
                                      style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                                      onClick={() => setEditingCommentId(null)}
                                    >
                                      Cancelar
                                    </button>
                                    <button 
                                      type="button" 
                                      className="glass-btn primary" 
                                      style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                                      onClick={() => handleSaveEditedComment(comment.id)}
                                      disabled={!editingCommentText.trim()}
                                    >
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <strong style={{ fontSize: '0.85rem', color: '#a5b4fc' }}>{comment.author}</strong>
                                      {comment.edited && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(editado)</span>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(comment.date).toLocaleString('pt-BR')}</span>
                                      {isAuthor && (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                          <button 
                                            type="button" 
                                            className="icon-btn" 
                                            style={{ padding: 2, color: 'var(--text-muted)' }} 
                                            title="Editar comentário"
                                            onClick={() => {
                                              setEditingCommentId(comment.id);
                                              setEditingCommentText(comment.text);
                                            }}
                                          >
                                            <Edit3 size={13} />
                                          </button>
                                          <button 
                                            type="button" 
                                            className="icon-btn" 
                                            style={{ padding: 2, color: '#ef4444' }} 
                                            title="Excluir comentário"
                                            onClick={() => handleDeleteComment(comment.id)}
                                          >
                                            <Trash2 size={13} style={{ color: '#ef4444' }} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{comment.text}</p>
                                </>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Novo Comentário */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Escrever Comentário</label>
                      <textarea 
                        className="glass-input" 
                        rows={3} 
                        style={{ width: '100%' }} 
                        placeholder="Digite seu comentário..." 
                        value={newCommentText} 
                        onChange={e => setNewCommentText(e.target.value)}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={handleAddComment} disabled={!newCommentText.trim()} className="glass-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Send size={14} /> Enviar Comentário
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'logs' && (
                  /* ================ ABA: LOGS ================ */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                    {(() => {
                      const taskObj = tasks.find(t => t.id === editingTaskId);
                      const history = taskObj?.metadata?.history || [];
                      if (history.length === 0) {
                        return <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 24 }}>Nenhum log registrado para esta demanda.</div>;
                      }
                      const sortedHistory = [...history].sort((a,b) => new Date(b.date) - new Date(a.date));
                      return sortedHistory.map((log, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 12, background: 'rgba(0,0,0,0.1)', padding: 12, borderRadius: 8, borderLeft: '3px solid #818cf8' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.action}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              por <strong style={{ color: '#a5b4fc' }}>{log.by || 'Sistema'}</strong> em {new Date(log.date).toLocaleString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>, document.getElementById('modal-root') || document.body
      )}

      {/* Modal Enviar para Aprovação Cliente */}
      {deliveryModalOpen && taskToDeliver && createPortal(
        <div className="help-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="icon-btn" onClick={() => setDeliveryModalOpen(false)} style={{ position: 'absolute', top: 16, right: 16 }}>
              <X size={20} />
            </button>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '1.2rem' }}>
              <Link size={20} className="text-primary"/> Enviar para o Cliente
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Insira o link da entrega final (ex: Google Drive, Vimeo) para que o cliente possa visualizar e aprovar.
            </p>
            
            <form onSubmit={handleSendToClient} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Link do Material (URL) *</label>
                <input 
                  type="url" 
                  className="glass-input" 
                  placeholder="https://drive.google.com/..." 
                  value={deliveryLink}
                  onChange={(e) => setDeliveryLink(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mensagem/Notas para o Cliente (Opcional)</label>
                <textarea 
                  className="glass-input" 
                  rows={3} 
                  placeholder="Olá! Segue o material para aprovação..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="glass-btn" onClick={() => setDeliveryModalOpen(false)}>Cancelar</button>
                <button type="submit" className="glass-btn primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Send size={16}/> Enviar para Aprovação
                </button>
              </div>
            </form>
          </div>
        </div>, document.getElementById('modal-root') || document.body
      )}

      {isTeamSettingsOpen && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 450, padding: 24, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsTeamSettingsOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16 }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={20} className="text-primary" /> Colaboradores - Equipe
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Abaixo estão listados automaticamente todos os colaboradores do departamento {departmentName}. As colunas não podem ser removidas manualmente; elas são atualizadas conforme o cadastro da equipe.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {teamEmployees.map((col, index) => (
                <div 
                  key={col.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}
                >
                  <span style={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '0.75rem', fontWeight: 700 
                  }}>
                    {index + 1}
                  </span>
                  <div className="glass-input" style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                    {col.name}
                  </div>
                </div>
              ))}
              
              {teamEmployees.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  Nenhum colaborador encontrado neste departamento.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="glass-btn primary" onClick={() => setIsTeamSettingsOpen(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>, document.getElementById('modal-root') || document.body
      )}

      {isSettingsOpen && createPortal(
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 450, padding: 24, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setIsSettingsOpen(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16 }}>
              <X size={20} />
            </button>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={20} className="text-primary" /> Ajustar Colunas - {departmentName}
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Personalize as colunas do seu Kanban. Se renomear uma coluna, as tarefas existentes nela serão migradas automaticamente. Se excluir uma coluna, as tarefas correspondentes serão movidas para a primeira coluna.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {tempColumns.map((colName, index) => (
                <div 
                  key={index} 
                  data-index={index}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    opacity: draggedColIndex === index ? 0.4 : 1,
                    background: draggedColIndex === index ? 'rgba(255,255,255,0.02)' : 'transparent',
                    border: '1px dashed rgba(255,255,255,0.05)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'grab'
                  }}
                  draggable
                  onDragStart={(e) => {
                    setDraggedColIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDragEnter={() => {
                    if (draggedColIndex !== null && draggedColIndex !== index) {
                      const updated = [...tempColumns];
                      const draggedCol = updated[draggedColIndex];
                      updated.splice(draggedColIndex, 1);
                      updated.splice(index, 0, draggedCol);
                      setDraggedColIndex(index);
                      setTempColumns(updated);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedColIndex(null);
                  }}
                  onTouchStart={(e) => {
                    window.touchDraggedIndex = index;
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (!element) return;
                    const row = element.closest('[data-index]');
                    if (row) {
                      const overIndex = parseInt(row.getAttribute('data-index'), 10);
                      if (window.touchDraggedIndex !== undefined && window.touchDraggedIndex !== null && window.touchDraggedIndex !== overIndex) {
                        const updated = [...tempColumns];
                        const draggedCol = updated[window.touchDraggedIndex];
                        updated.splice(window.touchDraggedIndex, 1);
                        updated.splice(overIndex, 0, draggedCol);
                        window.touchDraggedIndex = overIndex;
                        setTempColumns(updated);
                      }
                    }
                  }}
                  onTouchEnd={() => {
                    window.touchDraggedIndex = null;
                  }}
                >
                  <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} title="Arraste para reordenar">
                    <GripVertical size={16} />
                  </div>
                  
                  <input
                    type="text"
                    className="glass-input"
                    style={{ flex: 1 }}
                    value={colName}
                    onChange={(e) => {
                      const updated = [...tempColumns];
                      updated[index] = e.target.value;
                      setTempColumns(updated);
                    }}
                    placeholder="Nome da coluna..."
                    required
                  />
                  
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        const updated = [...tempColumns];
                        const temp = updated[index];
                        updated[index] = updated[index - 1];
                        updated[index - 1] = temp;
                        setTempColumns(updated);
                      }}
                      className="icon-btn text-muted"
                      style={{ padding: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}
                      title="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    
                    <button
                      type="button"
                      disabled={index === tempColumns.length - 1}
                      onClick={() => {
                        const updated = [...tempColumns];
                        const temp = updated[index];
                        updated[index] = updated[index + 1];
                        updated[index + 1] = temp;
                        setTempColumns(updated);
                      }}
                      className="icon-btn text-muted"
                      style={{ padding: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}
                      title="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <button
                      type="button"
                      disabled={tempColumns.length <= 1}
                      onClick={() => {
                        const updated = tempColumns.filter((_, i) => i !== index);
                        setTempColumns(updated);
                      }}
                      className="icon-btn"
                      style={{ padding: 6, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 4 }}
                      title="Excluir Coluna"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setTempColumns([...tempColumns, 'Nova Coluna'])}
                className="glass-btn"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Plus size={14} /> Adicionar Coluna
              </button>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="glass-btn" onClick={() => setIsSettingsOpen(false)}>Cancelar</button>
                <button
                  type="button"
                  onClick={handleSaveColumns}
                  className="glass-btn primary"
                  disabled={savingColumns}
                >
                  {savingColumns ? <Loader2 className="spin" size={14} /> : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      {reprovalModalOpen && reprovalTask && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: 480, padding: 28, position: 'relative', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <button className="icon-btn text-muted" onClick={handleCloseReprovalModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <XCircle size={20} style={{ color: '#fb7185' }} /> Reprovar Demanda (Social Media)
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Descreva o que precisa ser corrigido em <strong style={{ color: 'var(--text-main)' }}>{reprovalTask.title}</strong>:
              </p>
            </div>
            
            <textarea
              autoFocus
              rows={4}
              value={reprovalText}
              onChange={e => setReprovalText(e.target.value)}
              placeholder="Ex: Ajustar o texto da legenda, mudar a imagem de fundo, etc..."
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', color: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
              disabled={reprovalUploading}
            />

            {/* File and Audio preview list */}
            {(reprovalFile || reprovalAudioUrl) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {reprovalFile && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Paperclip size={13} /> {reprovalFile.name} ({(reprovalFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button onClick={clearReprovalFile} disabled={reprovalUploading} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                  </div>
                )}
                {reprovalAudioUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(244, 63, 94, 0.08)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                      <span style={{ fontSize: '0.7rem', color: '#fecdd3', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Volume2 size={12} /> Áudio Gravado</span>
                      <audio src={reprovalAudioUrl} controls style={{ width: '100%', height: '28px', marginTop: 2 }} />
                    </div>
                    <button onClick={clearReprovalAudio} disabled={reprovalUploading} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 8 }}><X size={14} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Audio capture */}
                {reprovalRecording ? (
                  <button
                    onClick={stopReprovalRecording}
                    disabled={reprovalUploading}
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
                    Gravar {formatReprovalTime(reprovalRecordingTime)} (Parar)
                  </button>
                ) : (
                  <button
                    onClick={startReprovalRecording}
                    disabled={reprovalUploading || !!reprovalAudioUrl}
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
                      cursor: !!reprovalAudioUrl ? 'not-allowed' : 'pointer',
                      opacity: !!reprovalAudioUrl ? 0.5 : 1
                    }}
                  >
                    <Mic size={14} /> Gravar Áudio
                  </button>
                )}

                {/* File Attachment */}
                <input
                  type="file"
                  ref={reprovalFileInputRef}
                  onChange={(e) => {
                    const selected = e.target.files[0];
                    if (selected) setReprovalFile(selected);
                  }}
                  style={{ display: 'none' }}
                  disabled={reprovalUploading}
                />
                <button
                  onClick={() => reprovalFileInputRef.current?.click()}
                  disabled={reprovalUploading || !!reprovalFile}
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
                    cursor: !!reprovalFile ? 'not-allowed' : 'pointer',
                    opacity: !!reprovalFile ? 0.5 : 1
                  }}
                >
                  <Paperclip size={14} /> Anexar Arquivo
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleCloseReprovalModal}
                  disabled={reprovalUploading || reprovalSubmitting}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendReproval}
                  disabled={(!reprovalText.trim() && !reprovalAudioBlob && !reprovalFile) || reprovalUploading || reprovalSubmitting}
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid #ef4444',
                    color: '#fb7185',
                    padding: '10px 20px',
                    borderRadius: 8,
                    cursor: (!reprovalText.trim() && !reprovalAudioBlob && !reprovalFile) || reprovalUploading || reprovalSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: (!reprovalText.trim() && !reprovalAudioBlob && !reprovalFile) || reprovalUploading || reprovalSubmitting ? 0.5 : 1,
                    fontSize: '0.88rem'
                  }}
                >
                  {reprovalUploading || reprovalSubmitting ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
                  Reprovar Demanda
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>

      {alertModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="glass-panel" style={{
            maxWidth: 420, width: '100%',
            textAlign: 'center', padding: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            borderRadius: 18, border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(255, 255, 255, 0.02))',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            position: 'relative'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginBottom: 8
            }}>
              <AlertCircle size={32} color="#f87171" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700 }}>{alertModal.title}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>{alertModal.message}</p>
            <div className="confirm-actions" style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="glass-btn" onClick={() => setAlertModal(null)} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
                padding: '8px 24px', borderRadius: 8, fontWeight: 600,
                transition: 'all 0.2s'
              }}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return createPortal(renderContent, document.getElementById('modal-root') || document.body);
  }
  return renderContent;
};

export default DepartmentPipeline;
