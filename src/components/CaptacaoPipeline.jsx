import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, X, Loader2, Calendar, Check, Send, Edit3, UserCircle, UploadCloud, Film, Camera, Trash2, Clock, Maximize2, Minimize2, Sliders, ArrowUp, ArrowDown, GripVertical, AlertCircle } from 'lucide-react';
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
    return ['Edição', 'Edição de Vídeo', 'Editor de Vídeo - Programação', 'Editor', 'Produção'];
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

const CustomGroupedSelect = ({ value, onChange, placeholder, groups }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedItem = groups.flatMap(g => g.options || []).find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <div 
        onClick={() => setOpen(!open)}
        style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: selectedItem ? 'white' : 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        {selectedItem ? selectedItem.label : placeholder}
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s', fontSize: '0.6rem' }}>▼</span>
      </div>
      
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#1e1e2d', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: 10, overflow: 'hidden', zIndex: 9999, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
             {groups.map((g, idx) => (
               <div key={idx}>
                 {g.label && (
                   <div style={{ padding: '8px 12px', fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', background: 'rgba(0,0,0,0.2)' }}>
                     {g.label}
                   </div>
                 )}
                 {(g.options || []).map(o => (
                   <div 
                     key={o.value}
                     onClick={() => { onChange(o.value); setOpen(false); }}
                     style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: value === o.value ? 'rgba(99, 102, 241, 0.2)' : 'transparent', color: value === o.value ? '#a5b4fc' : 'white', fontSize: '0.85rem' }}
                     onMouseEnter={(e) => e.currentTarget.style.background = value === o.value ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)'}
                     onMouseLeave={(e) => e.currentTarget.style.background = value === o.value ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                   >
                     {o.label}
                     {value === o.value && <span style={{ fontSize: '0.8rem' }}>✓</span>}
                   </div>
                 ))}
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CaptacaoPipeline = ({ client }) => {
  const departmentName = 'Captação';
  const { tasks, loading, addTask, updateTask: baseUpdateTask, deleteTask, refresh } = useDepartmentTasks(client?.id, departmentName);
  const [alertModal, setAlertModal] = useState(null);
  const updateTask = async (id, updates) => { await baseUpdateTask(id, updates); };
  
  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener('refresh_captacao_pipeline', handleRefresh);
    return () => window.removeEventListener('refresh_captacao_pipeline', handleRefresh);
  }, [refresh]);

  const [employees, setEmployees] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slaDays, setSlaDays] = useState(0);
  const [slaRules, setSlaRules] = useState([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', rule_id: '', platform: 'N/A', destination: 'Edição', publishDate: '', description: '', assigned_to: '', requested_sla_days: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendToEditModal, setSendToEditModal] = useState(null); // { task, driveLink, editorName, editorId, designerId, designerName, sending }
  const [clientAssignments, setClientAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('geral');
  const [newPartTitle, setNewPartTitle] = useState('');
  const [newPartDate, setNewPartDate] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const dragTaskIdRef = useRef(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  const defaultColumns = useMemo(() => {
    return ['A Fazer', 'Em Andamento', 'Enviar p/ Edição', 'Concluído'];
  }, []);

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
  }, [client, defaultColumns]);

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
  
  const { user } = useAuth();

  const boardRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastXRef = useRef(0);
  const rafRef = useRef(null);

  const [isMouseDown, setIsMouseDown] = useState(false);

  const startMomentum = () => {
    const decay = 0.95;
    const animate = () => {
      if (Math.abs(velocityRef.current) > 0.5) {
        if (boardRef.current) {
          boardRef.current.scrollLeft -= velocityRef.current;
        }
        velocityRef.current *= decay;
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button, input, textarea, select, a, [draggable="true"]')) return;
    e.preventDefault(); // Prevents text selection / native dragging
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    setIsMouseDown(true);
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - boardRef.current.offsetLeft;
    scrollLeftRef.current = boardRef.current.scrollLeft;
    
    velocityRef.current = 0;
    lastXRef.current = e.pageX;
    lastTimeRef.current = performance.now();
  };

  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
      setIsMouseDown(false);
      isMouseDownRef.current = false;
      startMomentum();
    }
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      setIsMouseDown(false);
      isMouseDownRef.current = false;
      startMomentum();
    }
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current) return;
    e.preventDefault();
    
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (boardRef.current) {
      boardRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
    
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      const dx = e.pageX - lastXRef.current;
      velocityRef.current = dx * 1.5;
    }
    
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setSendToEditModal(null);
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      if (client?.id) {
        const { data: assignmentsData } = await supabase
          .from('employee_client_assignments')
          .select('employee_id, department')
          .eq('client_id', client.id);
        setClientAssignments(assignmentsData || []);

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
  }, [client?.id]);

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
          metadata: { url: `${window.location.origin}/captacao?task=${task.id}` }
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
                url: `${window.location.origin}/captacao?task=${task.id}`,
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
        type: selectedRule?.activity_name || 'Gravação',
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
      if (!taskForm.assigned_to) {
        alert("É obrigatório atribuir a tarefa a um responsável.");
        return;
      }

      const targetStatus = taskForm.status || columns[0];
      const selectedRule = slaRules.find(r => r.id === taskForm.rule_id);
      const requestedDays = parseInt(taskForm.requested_sla_days) || (selectedRule ? selectedRule.days_allowed : slaDays || 2);

      const metadata = {
        description: '',
        parts: [],
        comments: [],
        publishDate: taskForm.publishDate || '',
        history: [{
          action: `Agendamento criado no status "${targetStatus}"`,
          by: user?.name || 'Usuário',
          date: new Date().toISOString()
        }]
      };

      if (targetStatus === 'Aguardando Cliente') {
        metadata.client_approval_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        metadata.capture_started = true;
      }

      await addTask({
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

    setTaskForm({ title: '', rule_id: '', platform: 'N/A', destination: 'Edição', publishDate: '', description: '', assigned_to: '', requested_sla_days: '', drive_link: '', status: '' });
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
      destination: task.metadata?.destination || 'Edição',
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

  const handleUploadAndSendToEditing = async (task) => {
    // Busca o editor e designer atribuídos a este cliente
    const { data: assignments } = await supabase
      .from('employee_client_assignments')
      .select('employee_id, department, employees(name)')
      .eq('client_id', client.id)
      .in('department', ['Edição', 'Design']);

    const editor = assignments?.find(a => a.department === 'Edição');
    const designer = assignments?.find(a => a.department === 'Design');

    setSendToEditModal({
      task,
      driveLink: client.metadata?.drive_links?.['Captação'] || client.metadata?.drive_folder_url || task.metadata?.drive_link || '',
      recordedNotes: '', // Novo campo
      editorId: editor?.employee_id || '',
      editorName: editor?.employees?.name || null,
      designerId: designer?.employee_id || '',
      designerName: designer?.employees?.name || null,
      sending: false,
    });
  };

  const confirmSendToEdit = async () => {
    if (!sendToEditModal) return;
    const { task, driveLink, editorId, editorName, designerId, designerName } = sendToEditModal;

    if (!driveLink.trim()) {
      alert('Insira o link do Google Drive com o material bruto.');
      return;
    }

    setSendToEditModal(prev => ({ ...prev, sending: true }));
    try {
      let currentMetadata = task.metadata;
      if (typeof currentMetadata === 'string') {
        try { currentMetadata = JSON.parse(currentMetadata); } catch(e) { currentMetadata = {}; }
      }
      if (!currentMetadata || typeof currentMetadata !== 'object') currentMetadata = {};

      const history = currentMetadata.history || [];
      const comments = currentMetadata.comments || [];
      const now = new Date().toISOString();

      const newComment = {
        id: crypto.randomUUID(),
        author: user?.name || 'Captador',
        text: `O que foi gravado?\n${sendToEditModal.recordedNotes}`,
        date: now
      };
      const updatedComments = [...comments, newComment];

      // 1. Atualiza a tarefa original (Captação) para Em Andamento
      const captacaoMetadata = {
        ...currentMetadata,
        history: [...history, { action: 'Arquivos upados. Demandas enviadas para Edição e Design', by: user?.name || 'Captador', date: now }],
        comments: updatedComments,
        drive_link: driveLink.trim(),
        recorded_notes: sendToEditModal.recordedNotes,
        sent_to_departments: ['Edição', 'Design'],
        chain_id: currentMetadata.chain_id || task.id
      };
      
      await updateTask(task.id, { 
        status: 'Concluído', 
        metadata: captacaoMetadata 
      });

      // 2. Cria nova tarefa para EDIÇÃO em A Fazer
      const editMetadata = {
        ...currentMetadata,
        history: [{ action: 'Gerado automaticamente da Captação', by: 'Sistema', date: now }],
        comments: updatedComments,
        drive_link: driveLink.trim(),
        recorded_notes: sendToEditModal.recordedNotes,
        sent_from_department: 'Captação',
        chain_id: currentMetadata.chain_id || task.id,
        original_task_id: task.id,
        type: 'Edição',
        workflow_stage: 'aguardando_aceite'
      };

      await supabase.from('department_tasks').insert([{
        client_id: client.id,
        department: 'Edição',
        title: `[EDIÇÃO] ${task.title}`,
        status: 'A Fazer',
        metadata: editMetadata,
        assigned_to: editorId || null,
        requested_sla_days: task.requested_sla_days || 1
      }]);

      // 3. CRIA UMA NOVA TAREFA PARA O DESIGN (Capa) em A Fazer
      const designMetadata = {
        ...currentMetadata,
        history: [{ action: 'Gerado automaticamente da Captação', by: 'Sistema', date: now }],
        comments: updatedComments,
        drive_link: driveLink.trim(),
        recorded_notes: sendToEditModal.recordedNotes,
        sent_from_department: 'Captação',
        chain_id: currentMetadata.chain_id || task.id,
        original_task_id: task.id,
        type: 'Design',
        workflow_stage: 'aguardando_aceite'
      };

      await supabase.from('department_tasks').insert([{
        client_id: client.id,
        department: 'Design', 
        title: `[CAPA] ${task.title}`,
        status: 'A Fazer',
        metadata: designMetadata,
        assigned_to: designerId || null,
        requested_sla_days: task.requested_sla_days || 1
      }]);

      setSendToEditModal(null);
      alert('Arquivos enviados! O card de captação mudou para Em Andamento. Edição e Design já receberam as demandas.');
    } catch (err) {
      alert('Erro ao enviar material: ' + err.message);
      setSendToEditModal(prev => ({ ...prev, sending: false }));
    }
  };

  if (!client) return null;

  const renderContent = (
    <div className={`captacao-pipeline-container ${isFullscreen ? 'kanban-fullscreen-wrapper' : ''}`}>
      {/* Modal: Subir Material para Edição */}
      {sendToEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setSendToEditModal(null)}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 20 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UploadCloud size={20} style={{ color: '#6366f1' }}/> Subir Material para Edição
            </h3>

            {/* Seleção de Editor e Designer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Seleção de Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Editor de Vídeo *</label>
                <CustomGroupedSelect
                  value={sendToEditModal.editorId}
                  onChange={(val) => {
                     const emp = employees.find(emp => emp.id === val);
                     setSendToEditModal(prev => ({ ...prev, editorId: val, editorName: emp?.name }));
                  }}
                  placeholder="Selecione o Editor..."
                  groups={[
                    {
                      label: "Atribuídos a este Cliente",
                      options: employees.filter(e => getMatchingDepartments('Edição').includes(e.department) && clientAssignments.some(a => a.employee_id === e.id)).map(emp => ({ value: emp.id, label: emp.name }))
                    },
                    {
                      label: "Outros Editores",
                      options: employees.filter(e => getMatchingDepartments('Edição').includes(e.department) && !clientAssignments.some(a => a.employee_id === e.id)).map(emp => ({ value: emp.id, label: emp.name }))
                    }
                  ]}
                />
              </div>

              {/* Seleção de Designer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Designer (Capa/Post)</label>
                <CustomGroupedSelect
                  value={sendToEditModal.designerId}
                  onChange={(val) => {
                     const emp = employees.find(emp => emp.id === val);
                     setSendToEditModal(prev => ({ ...prev, designerId: val, designerName: emp?.name }));
                  }}
                  placeholder="Nenhum / Selecione..."
                  groups={[
                    {
                      label: "",
                      options: [{ value: '', label: 'Nenhum / Selecione...' }]
                    },
                    {
                      label: "Atribuídos a este Cliente",
                      options: employees.filter(e => getMatchingDepartments('Design').includes(e.department) && clientAssignments.some(a => a.employee_id === e.id)).map(emp => ({ value: emp.id, label: emp.name }))
                    },
                    {
                      label: "Outros Designers",
                      options: employees.filter(e => getMatchingDepartments('Design').includes(e.department) && !clientAssignments.some(a => a.employee_id === e.id)).map(emp => ({ value: emp.id, label: emp.name }))
                    }
                  ]}
                />
              </div>
            </div>

            {/* Link do Drive */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Link do Google Drive com o material bruto *</label>
              <input
                type="url"
                value={sendToEditModal.driveLink}
                onChange={e => setSendToEditModal(prev => ({ ...prev, driveLink: e.target.value }))}
                placeholder="https://drive.google.com/..."
                style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            {/* O que foi gravado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>O que foi gravado? (Roteiros, observações) *</label>
              <textarea
                required
                value={sendToEditModal.recordedNotes}
                onChange={e => setSendToEditModal(prev => ({ ...prev, recordedNotes: e.target.value }))}
                placeholder="Descreva brevemente o conteúdo captado..."
                style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none', minHeight: 80, resize: 'vertical' }}
              />
            </div>



            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSendToEditModal(null)}
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmSendToEdit} disabled={sendToEditModal.sending || !sendToEditModal.driveLink.trim()}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (!sendToEditModal.driveLink.trim() || sendToEditModal.sending) ? 0.6 : 1 }}>
                {sendToEditModal.sending ? <Loader2 size={16} className="spin"/> : <Send size={16}/>}
                {sendToEditModal.sending ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>

        <div className="section-title" style={{ justifyContent: 'space-between', marginBottom: 16, flexShrink: 0, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Film size={20} /> Fluxo de Produção - Captação
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
            <button type="button" onClick={() => { setEditingTaskId(null); setTaskForm({ title: '', rule_id: '', platform: 'N/A', destination: 'Edição', publishDate: '', description: '', assigned_to: user?.employeeId || '', requested_sla_days: slaDays || '', status: columns[0] }); setIsTaskModalOpen(true); }} className="glass-btn primary">
              <Plus size={16} /> Nova Gravação
            </button>
          </div>
        </div>

        <PendingApprovalsWidget client={client} currentDepartment={departmentName} user={user} onWorkflowUpdate={refresh} />

        {loading ? (
          <div className="loading-state"><Loader2 className="spin" /> Carregando Kanban...</div>
        ) : (
          <div 
            ref={boardRef}
            className="kanban-board"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onDragOver={(e) => {
              e.preventDefault();
              if (boardRef.current) {
                const rect = boardRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < 150) boardRef.current.scrollLeft -= 15;
                else if (x > rect.width - 150) boardRef.current.scrollLeft += 15;
              }
            }}
            style={{ cursor: isMouseDown ? 'grabbing' : 'grab' }}
          >
            {(() => {
              const displayColumns = [...columns];
              tasks.forEach(t => {
                let s = t.status;
                if (s === 'Agendado' && displayColumns.includes('Aguardando Cliente')) return;
                // Em Captação, se for A Fazer mas não começou, pode continuar normal ou só exibir
                if (s && !displayColumns.includes(s)) {
                  displayColumns.push(s);
                }
              });
              return displayColumns;
            })().map(columnStatus => {
              const columnTasks = tasks.filter(t => {
                // Mapear 'Agendado' antigo para 'Aguardando Cliente' se necessário
                if (columnStatus === 'Aguardando Cliente' && t.status === 'Agendado') return true;
                if (columnStatus === 'A Fazer' && t.status === 'A Fazer') {
                  return t.metadata?.capture_started === true;
                }
                return t.status === columnStatus;
              });
              
              let columnLabel = columnStatus;
              if (columnStatus === 'Em Revisão') columnLabel = 'Aguardando Edição Aceitar';
              if (columnStatus === 'Aguardando Cliente') columnLabel = 'Aprovação do Cliente (24h)';

              return (
                <div 
                  key={columnStatus} 
                  className={`kanban-column${dragOverColumn === columnStatus ? ' drag-over' : ''}`}
                  style={{ flex: '0 0 320px' }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColumn(columnStatus); }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverColumn(null);
                    const taskId = dragTaskIdRef.current;
                    if (taskId) {
                      const taskObj = tasks.find(t => t.id === taskId);
                      if (taskObj && taskObj.status !== columnStatus) {
                        if (columnStatus === 'Enviar p/ Edição') {
                          handleUploadAndSendToEditing(taskObj);
                          dragTaskIdRef.current = null;
                          return;
                        }
                        if (columnStatus === 'Concluído') {
                          if (!taskObj.metadata?.drive_link) {
                            setAlertModal({
                              title: 'Material Pendente',
                              message: 'Por favor, envie o material para a Edição antes de marcar a Captação como Concluído.'
                            });
                            dragTaskIdRef.current = null;
                            return;
                          }
                        }
                        const oldStatus = taskObj.status;
                        let currentMetadata = taskObj.metadata || {};
                        if (typeof currentMetadata === 'string') {
                          try { currentMetadata = JSON.parse(currentMetadata); } catch(ex) { currentMetadata = {}; }
                        }
                        const history = [...(currentMetadata.history || [])];
                        history.push({
                          action: `Status alterado de "${oldStatus}" para "${columnStatus}" (via Arrastar e Soltar)`,
                          by: user?.name || 'Usuário',
                          date: new Date().toISOString()
                        });

                        const updates = { status: columnStatus };
                        if (columnStatus === 'Aguardando Cliente' && !currentMetadata.client_approval_deadline) {
                          currentMetadata.client_approval_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                        }
                        updates.metadata = { ...currentMetadata, history };

                        updateTask(taskId, updates);
                      }
                      dragTaskIdRef.current = null;
                    }
                  }}
                >
                  <div className="kanban-col-header">
                    <h4>{columnLabel}</h4>
                    <span className="kanban-count">{columnTasks.length}</span>
                  </div>
                  <div className="kanban-items">
                    {columnTasks.map(task => (
                      <div 
                        key={task.id} 
                        id={`kanban-task-${task.id}`}
                        className="kanban-card glass-card"
                        draggable="true"
                        onDragStart={(e) => {
                          dragTaskIdRef.current = task.id;
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={(e) => {
                          setDragOverColumn(null);
                        }}
                        onClick={() => openEditModal(task)}
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease-in-out' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span className={`badge bg-video`}>
                            {task.metadata?.platform || 'Vídeo'}
                          </span>
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
                              <h5 className="kanban-task-title">{task.title}</h5>
                           </div>
                        </div>

                        {task.metadata?.waiting_handoff && (
                           <div style={{ 
                             margin: '8px 0', 
                             padding: '10px', 
                             background: 'rgba(99, 102, 241, 0.15)', 
                             border: '2px solid #6366f1', 
                             borderRadius: '8px',
                             fontSize: '0.82rem',
                             color: '#fff',
                             fontWeight: 700,
                             display: 'flex',
                             flexDirection: 'column',
                             alignItems: 'center',
                             justifyContent: 'center',
                             gap: 4,
                             boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                           }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                               <Send size={14} className="text-primary" />
                               <span>ENCAMINHADO PARA: <strong style={{ color: '#a5b4fc' }}>{task.metadata.sent_to_department || 'Edição'}</strong></span>
                             </div>
                             {task.metadata?.assigned_editor_name && (
                               <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                                 <UserCircle size={12}/> Editor: <strong>{task.metadata.assigned_editor_name}</strong>
                               </div>
                             )}
                           </div>
                        )}
                        
                        {(() => {
                          if (columnStatus === 'Aguardando Cliente' && task.metadata?.client_approval_deadline) {
                            const deadline = new Date(task.metadata.client_approval_deadline);
                            const now = new Date();
                            const diffMs = deadline - now;
                            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                            
                            const isExpired = diffMs <= 0;
                            
                            return (
                              <div style={{ fontSize: '0.85rem', color: isExpired ? '#ef4444' : '#fbbf24', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.3)'}` }}>
                                <Clock size={14} /> 
                                {isExpired ? 'PRAZO DE APROVAÇÃO EXPIRADO' : `Aguardando: ${diffHrs}h ${diffMins}m restantes`}
                              </div>
                            );
                          }

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
                        
                        {task.metadata?.drive_link && (
                          <a href={task.metadata.drive_link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#60a5fa', marginBottom: 12, textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: 6, width: 'fit-content' }}>
                            <UploadCloud size={14} /> Acessar Brutos
                          </a>
                        )}

                        {(task.assigned_to || task.metadata?.assigned_to) && (
                          <div style={{ fontSize: '0.75rem', color: '#a5b4fc', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <UserCircle size={12} /> {employees.find(e => e.id === (task.assigned_to || task.metadata?.assigned_to))?.name || 'Responsável'}
                          </div>
                        )}

                        <div className="kanban-actions" onClick={(e) => e.stopPropagation()}>
                           {(columnStatus === 'Aguardando Agendamento' || columnStatus === 'Reagendamento Solicitado') && (
                             <button onClick={() => window.dispatchEvent(new CustomEvent('open_captacao_schedule_modal', { detail: task }))} className="status-btn primary" style={{ width: '100%', background: columnStatus === 'Reagendamento Solicitado' ? '#ef4444' : '#3b82f6', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                               <Calendar size={14} /> {columnStatus === 'Reagendamento Solicitado' ? 'REAGENDAR' : 'AGENDAR CAPTAÇÃO'}
                             </button>
                           )}
                           {columnStatus === 'Aguardando Cliente' && (
                             <button onClick={() => {
                               const history = [...(task.metadata?.history || [])];
                               history.push({ action: 'Cliente Aprovou via WhatsApp', by: 'Cliente', date: new Date().toISOString() });
                               updateTask(task.id, {
                                 status: 'A Fazer',
                                 metadata: {
                                   ...task.metadata,
                                   history
                                 }
                               });
                             }} className="status-btn" style={{ background: '#22c55e', color: 'white', fontWeight: 'bold' }}>
                               Simular Aceite do Cliente
                             </button>
                           )}
                           {(columnStatus === 'A Fazer' || columnStatus === 'Agendado') && (
                             <button onClick={() => {
                               const history = [...(task.metadata?.history || [])];
                               history.push({ action: 'Iniciou a gravação', by: user?.name || 'Responsável', date: new Date().toISOString() });
                               updateTask(task.id, { status: 'Em Andamento', metadata: { ...task.metadata, history } });
                             }} className="status-btn">Iniciar Gravação</button>
                           )}
                           
                           {columnStatus === 'Em Andamento' && (
                             <button onClick={() => handleUploadAndSendToEditing(task)} className="status-btn primary" style={{ width: '100%' }}>
                               <UploadCloud size={14} /> Subir Material p/ Edição
                             </button>
                           )}
                           
                           {columnStatus === 'Em Revisão' && !task.metadata?.waiting_handoff && (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                                <button className="status-btn" disabled>Aguardando Aprovação</button>
                             </div>
                           )}
                        </div>


                        <div className="kanban-task-date">
                          Atualizado em: {new Date(task.updated_at || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Task Creation Modal with Portal to prevent clipping */}
      {isTaskModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <Plus size={20} className="text-primary" /> Nova Gravação
                </h3>
                <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Título/Formato *</label>
                    <input required type="text" className="glass-input" style={{ width: '100%' }} value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Gravação Institucional..." />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prazo *</label>
                    <input required type="date" max="9999-12-31" className="glass-input" style={{ width: '100%' }} value={taskForm.publishDate} onChange={e => setTaskForm(f => ({ ...f, publishDate: e.target.value }))} />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Coluna/Etapa *</label>
                    <select required className="glass-input" style={{ width: '100%' }} value={taskForm.status || columns[0]} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                   <div>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Atribuir Captador *</label>
                     <select required className="glass-input" style={{ width: '100%' }} value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                       <option value="">Selecione...</option>
                       {employees
                         .filter(emp => getMatchingDepartments(departmentName).includes(emp.department) || emp.id === taskForm.assigned_to)
                         .map(emp => (
                           <option key={emp.id} value={emp.id}>{emp.name}</option>
                         ))}
                     </select>
                   </div>

                  <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                    <button type="button" className="glass-btn" onClick={() => setIsTaskModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="glass-btn primary" disabled={loading}>
                      {loading ? <Loader2 className="spin" /> : 'Criar Gravação'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================== MODAL DE DETALHES COM SUBABAS ================== */
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Cabeçalho da Tarefa */}
                <div style={{ marginBottom: 20 }}>
                  <span className="badge bg-video" style={{ marginBottom: 6, display: 'inline-block' }}>
                    {taskForm.platform || 'Vídeo'}
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
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome da Gravação *</label>
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
                            placeholder="Ex: Gravar introdução hoje" 
                            value={newPartTitle} 
                            onChange={e => setNewPartTitle(e.target.value)} 
                          />
                          <input 
                            type="date" max="9999-12-31" 
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Captador/Responsável *</label>
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Data Prevista *</label>
                        <input required type="date" max="9999-12-31" className="glass-input" style={{ width: '100%' }} value={taskForm.publishDate} onChange={e => setTaskForm(f => ({ ...f, publishDate: e.target.value }))} />
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prazo (Dias)</label>
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
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Destino Final</label>
                        <select className="glass-input" style={{ width: '100%' }} value={taskForm.destination} onChange={e => setTaskForm(f => ({ ...f, destination: e.target.value }))}>
                          <option value="Edição">Edição</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Tráfego Pago">Tráfego Pago</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#4285F4', marginBottom: 4, display: 'block', fontWeight: 700 }}>
                          Link do Google Drive
                        </label>
                        <input type="url" className="glass-input" style={{ width: '100%' }} value={taskForm.drive_link || ''} onChange={e => setTaskForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/..." />
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
                        return <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: 24 }}>Nenhum log registrado para este agendamento.</div>;
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
        </div>
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

export default CaptacaoPipeline;
