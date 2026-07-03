import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck, Plus, Search, Edit3, Trash2, X, Save,
  Mail, Phone, Briefcase, Building2, AlertCircle,
  CheckCircle, Loader2, ChevronDown, Shield, Eye,
  Pencil, Check, Key, ShieldCheck, FileText,
  ExternalLink, Copy, MessageCircle, Users2, Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useServices } from '../../hooks/useServices';
import { useConfirm } from '../../context/ConfirmContext';
import PhotoUpload from '../../components/PhotoUpload';
import ContractUpload from '../../components/ContractUpload';
import * as XLSX from 'xlsx';

const DEPT_OPTIONS = ['Captação', 'Edição', 'Social Media', 'Tráfego Pago', 'Design', 'CRM', 'Comercial', 'Sucesso do Cliente'];
const STATUS_OPTIONS = ['active', 'inactive', 'pending'];
const STATUS_LABELS   = { active: 'Ativo', inactive: 'Inativo', pending: 'Aguardando' };
const STATUS_STYLES   = {
  active:   { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  inactive: { bg: 'rgba(107,114,128,0.15)',color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
  pending:  { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
};
const AVATAR_COLORS = ['#6366f1','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4'];
const normalize = (str) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const getInitials = (n = '') => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';

const EMPTY_FORM = {
  name:'', email:'', phone:'', position:'', department:'', status:'active',
  hired_at:'', notes:'', avatar_color:'#6366f1', avatar_url: null, is_admin: false,
  is_manager: false,
  contract_url: null, new_password: '', system_password: '',
  whatsapp_notifications: false, can_manage_logins: false
};

// Hook de funcionários
function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('employees')
      .select(`*, employee_permissions(service_id, role, can_view, can_edit, can_approve, services(name, color))`)
      .order('name');
    if (e) setError(e.message); else setEmployees(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('employees-ch')
      .on('postgres_changes', { event:'*', schema:'public', table:'employees' }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);

  const create = async (d) => {
    const { data, error:e } = await supabase.from('employees').insert([d]).select().single();
    if (e) throw new Error(e.message); return data;
  };
  const update = async (id, d) => {
    const { data, error:e } = await supabase.from('employees').update(d).eq('id',id).select().single();
    if (e) throw new Error(e.message); return data;
  };
  const remove = async (id) => {
    const { error:e } = await supabase.from('employees').delete().eq('id',id);
    if (e) throw new Error(e.message);
  };

  return { employees, loading, error, fetch, create, update, remove };
}

// Salva permissões de um funcionário
async function savePermissions(employeeId, permissions) {
  // deleta as existentes e recria
  await supabase.from('employee_permissions').delete().eq('employee_id', employeeId);
  if (permissions.length === 0) return;
  const rows = permissions.map(p => ({ employee_id: employeeId, ...p }));
  const { error } = await supabase.from('employee_permissions').insert(rows);
  if (error) throw new Error(error.message);
}

// Cria conta Supabase Auth para funcionário e vincula
async function createEmployeeAccount(employeeId, email) {
  // Gera uma senha temporária
  const tempPassword = 'Temp@' + Math.random().toString(36).slice(2, 8) + '!';

  // Chama a função RPC que cria o usuário via service role
  const { data, error } = await supabase.rpc('admin_create_employee_user', {
    p_email: email,
    p_employee_id: employeeId,
    p_temp_password: tempPassword
  });

  if (error) throw new Error(error.message);
  return { ...data, tempPassword };
}

export default function Funcionarios({ inConfigMode = false, onExternalEdit, initialEditMode, onCloseEdit }) {
  const { user }    = useAuth();
  const isAdmin     = user?.role === 'owner' || user?.role === 'admin';
  const { services} = useServices();
  const { employees, loading, error, create, update, remove } = useEmployees();

  // Se estivermos em modo de edição inicial (aba de edição externa)
  useEffect(() => {
    if (initialEditMode) {
      setEditing(initialEditMode);
      setForm({
        name: initialEditMode.name||'', email: initialEditMode.email||'', phone: initialEditMode.phone||'',
        position: initialEditMode.position||'', department: initialEditMode.department||'',
        status: initialEditMode.status||'active', hired_at: initialEditMode.hired_at||'',
        notes: initialEditMode.notes||'', avatar_color: initialEditMode.avatar_color||'#6366f1',
        avatar_url: initialEditMode.avatar_url || null,
        is_admin: initialEditMode.is_admin || false,
        is_manager: initialEditMode.is_manager || false,
        contract_url: initialEditMode.contract_url || null,
        new_password: '',
        system_password: initialEditMode.system_password || '',
        whatsapp_notifications: initialEditMode.whatsapp_notifications || false,
        can_manage_logins: initialEditMode.can_manage_logins || false,
      });
      const perms = (initialEditMode.employee_permissions || []).map(p => ({
        service_id: p.service_id, can_view: p.can_view,
        can_edit: p.can_edit, can_approve: p.can_approve,
        role: p.role || 'Analista'
      }));
      setPermissions(perms);
    }
  }, [initialEditMode]);

  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  // permissions: [{ service_id, can_view, can_edit, can_approve }, ...]
  const [permissions, setPermissions] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const confirm = useConfirm();
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [toast, setToast]         = useState(null);
  const [permTab, setPermTab]     = useState(false); // aba ativa: false=dados, true=permissões
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountResult, setAccountResult]     = useState(null);
  const [clientsTab, setClientsTab]           = useState(false);
  const [clientAssignments, setClientAssignments] = useState([]);
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [allClients, setAllClients]           = useState([]);
  const [newClientId, setNewClientId]         = useState('');
  const [newDept, setNewDept]                 = useState('Captação');
  const [selectedDepts, setSelectedDepts]     = useState([]);
  const [showDeptFilter, setShowDeptFilter]   = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    if (modalOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // trava o scroll do fundo
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  // Carrega todos os clientes ativos para o seletor (apenas os da agência)
  useEffect(() => {
    supabase.from('clients').select('id, name, metadata').eq('status', 'Ativo').order('name')
      .then(({ data }) => setAllClients((data || []).filter(c => c.metadata?.show_in_agency === true)));
  }, []);

  const loadClientAssignments = async (employeeId) => {
    const { data } = await supabase
      .from('employee_client_assignments')
      .select('client_id, department')
      .eq('employee_id', employeeId);
    if (!data) return [];
    return data.map(a => ({
      client_id: a.client_id,
      department: a.department,
      client_name: allClients.find(c => c.id === a.client_id)?.metadata?.display_name || allClients.find(c => c.id === a.client_id)?.name || a.client_id
    }));
  };

  const saveClientAssignments = async (employeeId) => {
    await supabase.from('employee_client_assignments').delete().eq('employee_id', employeeId);
    if (clientAssignments.length === 0) return;
    const rows = clientAssignments.map(a => ({ employee_id: employeeId, client_id: a.client_id, department: a.department }));
    const { error } = await supabase.from('employee_client_assignments').insert(rows);
    if (error) throw new Error(error.message);
  };

  const addClientAssignment = () => {
    if (!newClientId) return;

    if (newClientId === 'ALL') {
      setClientAssignments(prev => {
        const toAdd = [];
        for (const client of allClients) {
          if (!prev.some(a => a.client_id === client.id && a.department === newDept)) {
            toAdd.push({ client_id: client.id, client_name: client.metadata?.display_name || client.name, department: newDept });
          }
        }
        return [...prev, ...toAdd];
      });
      setNewClientId('');
      return;
    }

    const client = allClients.find(c => c.id === newClientId);
    if (!client) return;
    if (clientAssignments.some(a => a.client_id === newClientId && a.department === newDept)) return;
    setClientAssignments(prev => [...prev, { client_id: newClientId, client_name: client.metadata?.display_name || client.name, department: newDept }]);
    setNewClientId('');
  };

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copiado para a área de transferência!');
  };

  const handleExportExcel = () => {
    const dataToExport = employees.map(e => ({
      Nome: e.name || '',
      Email: e.email || '',
      Telefone: e.phone || '',
      Cargo: e.position || '',
      Departamento: e.department || '',
      DataContratacao: e.hired_at || '',
      Status: e.status || 'active',
      AdminGeral: e.is_admin ? 'Sim' : 'Não',
      Notas: e.notes || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Colaboradores');
    XLSX.writeFile(workbook, 'Cadastro_Colaboradores.xlsx');
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast('Lendo arquivo Excel...', 'success');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let count = 0;
        for (const row of data) {
          if (!row.Nome || !row.Email) continue;
          await create({
            name: row.Nome,
            email: row.Email,
            phone: row.Telefone || '',
            position: row.Cargo || '',
            department: row.Departamento || '',
            status: row.Status || 'active',
            hired_at: row.DataContratacao || null,
            notes: row.Notas || '',
            is_admin: row.AdminGeral === 'Sim',
            avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
          });
          count++;
        }
        showToast(`Importação concluída: ${count} colaboradores cadastrados!`);
      } catch (err) {
        showToast("Erro ao importar planilha: " + err.message, "error");
      }
      e.target.value = null; // reseta o input
    };
    reader.readAsBinaryString(file);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPermissions([]);
    setPermTab(false);
    setClientsTab(false);
    setClientAssignments([]);
    setSelectedAssignments([]);
    setNewClientId('');
    setAccountResult(null);
    setModalOpen(true);
  };

  const openEdit = (emp) => {
    if (onExternalEdit) {
      onExternalEdit(emp);
      return;
    }
    setEditing(emp);
    setForm({
      name: emp.name||'', email: emp.email||'', phone: emp.phone||'',
      position: emp.position||'', department: emp.department||'',
      status: emp.status||'active', hired_at: emp.hired_at||'',
      notes: emp.notes||'', avatar_color: emp.avatar_color||'#6366f1',
      avatar_url: emp.avatar_url || null,
      is_admin: emp.is_admin || false,
      is_manager: emp.is_manager || false,
      contract_url: emp.contract_url || null,
      new_password: '',
      system_password: emp.system_password || '',
      whatsapp_notifications: emp.whatsapp_notifications || false,
      can_manage_logins: emp.can_manage_logins || false,
    });
    // Popula permissões
    const perms = (emp.employee_permissions || []).map(p => ({
      service_id: p.service_id, can_view: p.can_view,
      can_edit: p.can_edit, can_approve: p.can_approve,
      role: p.role || 'Analista'
    }));
    setPermissions(perms);
    setPermTab(false);
    setClientsTab(false);
    setNewClientId('');
    setAccountResult(null);
    setSelectedAssignments([]);
    // Carrega atribuições de clientes
    loadClientAssignments(emp.id).then(setClientAssignments);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (onCloseEdit) {
      onCloseEdit();
      return;
    }
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM);
    setPermissions([]); setPermTab(false); setClientsTab(false);
    setClientAssignments([]); setNewClientId(''); setSelectedAssignments([]);
    setAccountResult(null);
  };

  // Alterna permissão de um serviço
  const toggleService = (serviceId) => {
    setPermissions(prev => {
      const exists = prev.find(p => p.service_id === serviceId);
      if (exists) return prev.filter(p => p.service_id !== serviceId);
      return [...prev, { service_id: serviceId, can_view: true, can_edit: false, can_approve: false, role: 'Executor' }];
    });
  };

  const updatePerm = (serviceId, field, value) => {
    setPermissions(prev => prev.map(p =>
      p.service_id === serviceId ? { ...p, [field]: value } : p
    ));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      showToast('Por favor, preencha o Nome e o Email.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      const newPassword = payload.new_password;
      delete payload.new_password;

      // Salva a senha visivelmente para o administrador
      if (newPassword) {
        payload.system_password = newPassword;
      }
      // Ensure empty strings for dates are converted to null
      payload.hired_at = payload.hired_at || null;

      let emp;
      if (editing) {
        emp = await update(editing.id, payload);
        await savePermissions(editing.id, permissions);
        await saveClientAssignments(editing.id);
        showToast('Funcionário atualizado!');
      } else {
        emp = await create(payload);
        await savePermissions(emp.id, permissions);
        await saveClientAssignments(emp.id);
        showToast('Funcionário cadastrado!');
      }

      // Sincroniza o colaborador como cliente inativo ("shadow client") para evitar erro de chave estrangeira no chat interno
      try {
        await supabase.from('clients').upsert({
          id: emp.id,
          name: payload.name,
          company: payload.position || 'Colaborador',
          email: payload.email,
          phone: payload.phone || '',
          status: 'Inativo',
          avatar_color: payload.avatar_color || '#6366f1',
          avatar_url: payload.avatar_url || null,
          metadata: {
            show_in_agency: false,
            is_employee_shadow: true
          }
        });
      } catch (syncErr) {
        console.error("Erro ao sincronizar shadow client:", syncErr);
      }

      if (newPassword) {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-manage-user', {
          body: {
            email: form.email,
            password: newPassword,
            entityType: 'employee',
            entityId: emp.id,
            name: form.name
          },
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token}`
          }
        });
        
        if (fnError) {
          throw new Error('Erro ao criar/atualizar credenciais: ' + fnError.message);
        }
        if (fnData && fnData.success === false) {
          throw new Error('Erro do Servidor: ' + fnData.error);
        }
      }

      if (onCloseEdit) {
        onCloseEdit();
      } else {
        closeModal();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await remove(id);
      showToast('Funcionário removido.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = employees.filter(e => {
    // Se houver departamentos selecionados, ignora a busca por texto e filtra apenas por departamento
    if (selectedDepts.length > 0) {
      return selectedDepts.some(dept => normalize(e.department)?.includes(normalize(dept)));
    }
    
    // Caso contrário, filtra pela busca por texto
    const matchesSearch = !search ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  const totalAtivos = employees.filter(e => e.status === 'active').length;

  const toggleSelectEmployee = (id) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filtered.length && filtered.length > 0) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filtered.map(e => e.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;
    const confirmed = await confirm({
      title: 'Excluir Selecionados',
      message: `Tem certeza que deseja excluir ${selectedEmployees.length} colaborador(es) selecionado(s)?`,
      confirmText: 'Sim, excluir',
      isDanger: true
    });
    if (!confirmed) return;
    setBulkDeleting(true);
    try {
      for (const id of selectedEmployees) {
        await remove(id);
      }
      showToast(`${selectedEmployees.length} colaborador(es) removido(s) com sucesso.`);
      setSelectedEmployees([]);
    } catch (err) {
      showToast('Erro na exclusão em massa: ' + err.message, 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="func-page">
      {/* Toast */}
      {toast && (
        <div className={`toast-notif ${toast.type}`}>
          {toast.type==='success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Confirm Delete */}
      {/* Confirm Delete state removed in favor of useConfirm hook */}

      {!initialEditMode && (
        <>
          <header className="page-header">
            <div>
              <h1><UserCheck size={26}/> Colaboradores</h1>
              <p>Gerencie os funcionários e suas permissões de acesso por departamento.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedEmployees.length > 0 && (
                <button className="btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting} title="Excluir selecionados">
                  {bulkDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />} Excluir ({selectedEmployees.length})
                </button>
              )}
              {isAdmin && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={selectedEmployees.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} />
                  Selecionar Todos
                </label>
              )}
              <input type="file" id="excel-import-emp" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportExcel} />
              <button className="btn-ghost" onClick={() => document.getElementById('excel-import-emp').click()} title="Importar Excel via Planilha Tabulada">
                Upload Excel
              </button>
              <button className="btn-ghost" onClick={handleExportExcel} title="Exportar tabela completa">
                Exportar
              </button>
              <button className="btn-primary" onClick={openCreate} id="new-employee-btn">
                <Plus size={18}/> Novo Colaborador
              </button>
            </div>
          </header>

          <div className="kpi-row">
            <div className="kpi-card glass-card">
              <span className="kpi-label">Total</span>
              <strong className="kpi-value">{employees.length}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">Ativos</span>
              <strong className="kpi-value" style={{color:'#34d399'}}>{totalAtivos}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">Aguardando Acesso</span>
              <strong className="kpi-value" style={{color:'#fcd34d'}}>{employees.filter(e=>e.status==='pending').length}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">Com Login Ativo</span>
              <strong className="kpi-value" style={{color:'#6366f1'}}>{employees.filter(e=>e.user_id).length}</strong>
            </div>
          </div>

          <div className="filters-bar glass-card">
            <div className="filters-main">
              <div className="search-box">
                <Search size={16}/>
                <input
                  type="text" placeholder="Buscar por nome, e-mail ou cargo..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                {search && <button className="clear-search" onClick={() => setSearch('')}><X size={14}/></button>}
              </div>
              <button 
                className={`btn-filter ${showDeptFilter || selectedDepts.length > 0 ? 'active' : ''}`}
                onClick={() => setShowDeptFilter(!showDeptFilter)}
              >
                <Filter size={16}/> Filtros {selectedDepts.length > 0 && `(${selectedDepts.length})`}
              </button>
            </div>

            {(showDeptFilter || selectedDepts.length > 0) && (
              <div className="filter-options">
                <div className="filter-group">
                  <span className="filter-label">Departamentos:</span>
                  <div className="dept-chips">
                    {DEPT_OPTIONS.map(dept => {
                      const isSelected = selectedDepts.includes(dept);
                      return (
                        <button
                          key={dept}
                          className={`dept-chip-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedDepts(prev => 
                              isSelected ? prev.filter(d => d !== dept) : [...prev, dept]
                            );
                          }}
                        >
                          {dept}
                        </button>
                      );
                    })}
                    {selectedDepts.length > 0 && (
                      <button className="clear-filters-btn" onClick={() => setSelectedDepts([])}>
                        Limpar tudo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lista */}
      {loading ? (
        <div className="loading-state"><Loader2 size={32} className="spin"/> Carregando...</div>
      ) : error ? (
        <div className="error-state glass-card"><AlertCircle size={24} color="#f87171"/><span>{error}</span></div>
      ) : initialEditMode ? (
        <div className="modal-overlay" onClick={onCloseEdit}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Editar: {form.name}</h2>
            <button className="modal-close" onClick={onCloseEdit}><X size={20}/></button>
          </div>
          <form onSubmit={handleSave} className="modal-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', overflowY: 'auto' }}>
            <div className="modal-col">
              <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={18}/> Dados do Colaborador</h3>
                <div className="photo-section">
                  <span className="photo-section-label">Foto do Colaborador</span>
                  <PhotoUpload
                    currentUrl={form.avatar_url}
                    fallbackColor={form.avatar_color}
                    fallbackText={getInitials(form.name)}
                    type="employee"
                    entityId={editing?.id || 'new'}
                    onUpload={(url) => setForm(f => ({...f, avatar_url: url}))}
                    size={80}
                    shape="circle"
                  />
                </div>
                <div className="color-picker-row">
                  <div className="avatar-preview" style={{background:form.avatar_color}}>{getInitials(form.name)}</div>
                  <div>
                    <span className="field-label">Cor (se sem foto)</span>
                    <div className="color-swatches">
                      {AVATAR_COLORS.map(c => (
                        <button key={c} type="button" className={`color-swatch ${form.avatar_color===c?'selected':''}`} style={{background:c}} onClick={() => setForm(f => ({...f, avatar_color: c}))} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-field span-2"><label><UserCheck size={14}/> Nome Completo *</label><input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
                  <div className="form-field"><label><Mail size={14}/> E-mail *</label><input required type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
                  <div className="form-field"><label><Phone size={14}/> Telefone</label><input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <div className={`toggle-switch ${form.whatsapp_notifications ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      <div className="toggle-knob" />
                    </div>
                    <label style={{ fontSize: '0.85rem', color: form.whatsapp_notifications ? 'white' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      Notificar via WhatsApp
                    </label>
                  </div>
                  <div className="form-field"><label><Briefcase size={14}/> Cargo</label><input value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))} /></div>
                  <div className="form-field"><label><Building2 size={14}/> Departamento</label><input value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} /></div>
                  <div className="form-field">
                    <label>Status</label>
                    <div className="select-wrapper">
                      <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <ChevronDown size={14} className="select-arrow"/>
                    </div>
                  </div>
                  <div className="form-field span-2" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={16} /> Acesso ao Sistema</h4>
                    <div className="form-grid" style={{ gap: '16px' }}>
                      <div className="form-field"><label>Login</label><input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@acesso.com" /></div>
                      <div className="form-field">
                        <label>Senha Atual Salva</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ flex: 1, fontFamily: 'monospace', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {form.system_password ? (showSavedPassword ? form.system_password : '••••••••') : 'Nenhuma senha registrada'}
                          </span>
                          {form.system_password && (
                            <button
                              type="button"
                              onClick={() => setShowSavedPassword(!showSavedPassword)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showSavedPassword ? '#6366f1' : 'var(--text-muted)' }}
                              title={showSavedPassword ? "Ocultar senha" : "Ver senha"}
                            >
                              <Eye size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Nova Senha</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            value={form.new_password} 
                            onChange={e => setForm(f=>({...f,new_password:e.target.value}))} 
                            placeholder="Digite a senha..." 
                            style={{ width: '100%', paddingRight: '40px' }} 
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: showNewPassword ? '#6366f1' : 'var(--text-muted)' }}
                            title={showNewPassword ? "Ocultar senha" : "Ver senha"}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Gerar Link de Acesso */}
                    <div className="access-link-section" style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>
                        <ExternalLink size={14} /> Link de Acesso Direto
                      </label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input
                          readOnly
                          value={`${window.location.origin}/login?email=${form.email}`}
                          style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', opacity: 0.8, color: 'white', padding: '8px 12px', borderRadius: '8px' }}
                        />
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '8px 12px', height: 38 }}
                          onClick={() => copyToClipboard(`${window.location.origin}/login?email=${form.email}`)}
                          title="Copiar Link"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '8px 12px', height: 38, border: '1px solid #25d366', color: '#25d366' }}
                          onClick={() => {
                            const msg = `Olá! Aqui está seu link de acesso à nossa plataforma: ${window.location.origin}/login?email=${form.email}`;
                            const url = `https://wa.me/${(form.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                            window.open(url, '_blank');
                          }}
                          title="Enviar por WhatsApp"
                          disabled={!form.phone}
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="form-field span-2"><label>Observações</label><textarea rows={3} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-col" style={{ paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={18}/> Permissões de Acesso</h3>
              <div className="permissions-section">
                <div className="service-perm-row" style={{ borderColor: form.is_admin?'#f59e0b':'rgba(255,255,255,0.05)', background: form.is_admin?'rgba(245,158,11,0.08)':'rgba(0,0,0,0.1)' }}>
                  <div className="svc-toggle" onClick={() => setForm(f => ({ ...f, is_admin: !f.is_admin }))}>
                    <div className={`toggle-switch ${form.is_admin?'on':''}`} style={{ background: form.is_admin?'#f59e0b':''}}><div className="toggle-knob"/></div>
                    <div className="svc-info"><ShieldCheck size={16} /> <strong>Administrador Geral</strong></div>
                  </div>
                </div>

                <div className="services-list" style={{ opacity: form.is_admin ? 0.3 : 1, pointerEvents: form.is_admin ? 'none' : 'auto', marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} /> Atribuições por Departamento
                  </h4>
                  {services.map(svc => {
                    const perm = permissions.find(p => p.service_id === svc.id);
                    const isOn = !!perm;
                    return (
                      <div key={svc.id} className={`service-perm-row ${isOn?'enabled':''}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                          <div className="svc-toggle" onClick={() => toggleService(svc.id)}>
                            <div className={`toggle-switch ${isOn?'on':''}`}><div className="toggle-knob"/></div>
                            <div className="svc-info"><div className="svc-dot" style={{background: svc.color}}/> <strong>{svc.name}</strong></div>
                          </div>
                          
                          {isOn && (
                            <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Função:</label>
                              <div className="select-wrapper" style={{ width: '140px' }}>
                                <select 
                                  value={perm.role || 'Analista'} 
                                  onChange={e => updatePerm(svc.id, 'role', e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                >
                                  <option value="Executor">Executor</option>
                                  <option value="Gestor">Gestor</option>
                                  <option value="Revisor">Revisor</option>
                                </select>
                                <ChevronDown size={14} className="select-arrow"/>
                              </div>
                            </div>
                          )}
                        </div>

                        {isOn && (
                          <div className="perm-levels" style={{ paddingLeft: '44px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Permissões detalhadas:</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {[{k:'can_view',l:'Ver',i:<Eye size={13}/>},{k:'can_edit',l:'Editar',i:<Pencil size={13}/>},{k:'can_approve',l:'Aprovar',i:<Check size={13}/>}].map(o => (
                                <button key={o.k} type="button" className={`perm-chip ${perm[o.k]?'active':''}`} onClick={() => updatePerm(svc.id,o.k,!perm[o.k])} disabled={o.k==='can_view'}>{o.i} {o.l}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ gridColumn: '1 / -1', marginTop: 16 }}>
              <button type="button" className="btn-ghost" onClick={onCloseEdit}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spin"/> : <Save size={16}/>} Salvar Alterações</button>
            </div>
          </form>
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div className="empty-state glass-card">
          <UserCheck size={48} style={{opacity:0.3}}/>
          <p>{search ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado ainda.'}</p>
          {!search && <button className="btn-primary" onClick={openCreate}><Plus size={16}/> Cadastrar primeiro</button>}
        </div>
      ) : (
        <div className="employees-grid">
          {filtered.map(emp => {
            const st = STATUS_STYLES[emp.status] || STATUS_STYLES.active;
            const permCount = (emp.employee_permissions || []).length;
            return (
              <div key={emp.id} className="employee-card glass-card" style={{ position: 'relative', border: selectedEmployees.includes(emp.id) ? '1px solid #6366f1' : '' }}>
                {isAdmin && (
                  <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                    <input type="checkbox" checked={selectedEmployees.includes(emp.id)} onChange={() => toggleSelectEmployee(emp.id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                  </div>
                )}
                <div className="emp-card-header">
                  {/* Avatar: foto ou iniciais */}
                  {emp.avatar_url ? (
                    <img
                      src={emp.avatar_url}
                      alt={emp.name}
                      className="emp-avatar-img"
                    />
                  ) : (
                    <div className="emp-avatar" style={{background: emp.avatar_color||'#6366f1'}}>
                      {getInitials(emp.name)}
                    </div>
                  )}
                  <div className="emp-info">
                    <h3>{emp.name}</h3>
                    <p>{emp.position || '—'}</p>
                    {emp.department && <p style={{color:'var(--text-muted)', fontSize:'0.78rem'}}>{emp.department}</p>}
                  </div>
                  <span className="status-badge-sm" style={{background:st.bg, color:st.color, border:`1px solid ${st.border}`}}>
                    {STATUS_LABELS[emp.status]}
                  </span>
                </div>

                <div className="emp-card-body">
                  {emp.email && <div className="emp-detail"><Mail size={13}/> {emp.email}</div>}
                  {emp.phone && <div className="emp-detail"><Phone size={13}/> {emp.phone}</div>}
                  <div className="emp-roles" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(emp.employee_permissions || []).map(p => (
                    <span key={p.service_id} className="role-badge" title={`${p.role || 'Analista'} em ${p.services?.name || 'Departamento'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.services?.color || '#ccc' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{p.services?.name}:</span>
                      <strong style={{ color: p.role === 'Gestor' ? '#10b981' : 'inherit' }}>{p.role || 'Analista'}</strong>
                    </span>
                  ))}
                  </div>
                  <div className="emp-perms" style={{ marginTop: '12px' }}>
                    {emp.is_admin ? (
                      <>
                        <ShieldCheck size={13} color="#fcd34d" />
                        <span style={{ color: '#fcd34d', fontWeight: 600 }}>Administrador Geral</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={13} style={{color: permCount > 0 ? '#6366f1' : 'var(--text-muted)'}}/>
                        <span>{permCount > 0 ? `${permCount} departamento${permCount>1?'s':''} liberado${permCount>1?'s':''}` : 'Sem permissões'}</span>
                      </>
                    )}
                  </div>
                  {emp.user_id
                    ? <div className="emp-login-badge"><Key size={12}/> Login ativo</div>
                    : <div className="emp-login-badge inactive"><Key size={12}/> Sem acesso ao sistema</div>
                  }
                </div>

                <div className="emp-card-actions">
                  {emp.contract_url && (
                    <a href={emp.contract_url} target="_blank" rel="noreferrer" className="action-btn" title="Ver Contrato" style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)' }}>
                      <FileText size={15}/>
                    </a>
                  )}
                  <button className="action-btn edit-btn" onClick={() => openEdit(emp)}><Edit3 size={15}/> Editar</button>
                  <button className="action-btn delete-btn" onClick={async () => {
                    const conf = await confirm({
                      title: 'Remover Funcionário?',
                      message: `O funcionário ${emp.name} será removido do sistema. O acesso de login permanece porém ele não terá mais permissões.`,
                      confirmText: 'Sim, remover',
                      isDanger: true
                    });
                    if (conf) handleDelete(emp.id);
                  }}><Trash2 size={15}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Usando Portal para evitar cortes de layout */}
      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()} style={{ maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16, marginBottom: 0 }}>
              <div>
                <h2>{editing ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                <p style={{margin:0, fontSize:'0.82rem', color:'var(--text-muted)'}}>
                  Configure dados e permissões de acesso por departamento
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="btn-ghost" onClick={closeModal} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>Cancelar</button>
                <button type="button" className="btn-primary" disabled={saving} onClick={() => { document.getElementById('employee-edit-form')?.requestSubmit(); }} style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  {editing ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
                <button className="modal-close" onClick={closeModal}><X size={20}/></button>
              </div>
            </div>

            {/* Abas */}
          <form id="employee-edit-form" onSubmit={handleSave} className="modal-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', overflowY: 'auto' }}>
            <div className="modal-col">
              <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Briefcase size={18}/> Dados do Colaborador</h3>
                  {/* Upload de Foto */}
                  <div className="photo-section">
                    <span className="photo-section-label">Foto do Colaborador</span>
                    <PhotoUpload
                      currentUrl={form.avatar_url}
                      fallbackColor={form.avatar_color}
                      fallbackText={getInitials(form.name)}
                      type="employee"
                      entityId={editing?.id || 'new'}
                      onUpload={(url) => setForm(f => ({...f, avatar_url: url}))}
                      size={80}
                      shape="circle"
                    />
                  </div>

                  {/* Cor do Avatar (fallback) */}
                  <div className="color-picker-row">
                    <div className="avatar-preview" style={{background:form.avatar_color}}>
                      {getInitials(form.name)}
                    </div>
                    <div>
                      <span className="field-label">Cor (se sem foto)</span>
                      <div className="color-swatches">
                        {AVATAR_COLORS.map(c => (
                          <button key={c} type="button"
                            className={`color-swatch ${form.avatar_color===c?'selected':''}`}
                            style={{background:c}}
                            onClick={() => setForm(f => ({...f, avatar_color: c}))}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field span-2">
                      <label><UserCheck size={14}/> Nome Completo *</label>
                      <input required value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo" />
                    </div>
                    <div className="form-field">
                      <label><Mail size={14}/> E-mail *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@dominio.com" />
                    </div>
                    <div className="form-field">
                      <label><Phone size={14}/> Telefone</label>
                      <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="(11) 99999-9999" />
                    </div>

                    <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <div className={`toggle-switch ${form.whatsapp_notifications ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                        <div className="toggle-knob" />
                      </div>
                      <label style={{ fontSize: '0.85rem', color: form.whatsapp_notifications ? 'white' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                        Notificar via WhatsApp
                      </label>
                    </div>
                    <div className="form-field">
                      <label><Briefcase size={14}/> Cargo</label>
                      <input value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))} placeholder="Ex: Gestor de Tráfego" />
                    </div>
                    <div className="form-field">
                      <label><Building2 size={14}/> Departamento</label>
                      <input value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} placeholder="Ex: Tráfego Pago" />
                    </div>
                    <div className="form-field">
                      <label>Status</label>
                      <div className="select-wrapper">
                        <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                        <ChevronDown size={14} className="select-arrow"/>
                      </div>
                    </div>
                    <div className="form-field">
                      <label>Data de Contratação</label>
                      <input type="date" max="9999-12-31" value={form.hired_at} onChange={e => setForm(f=>({...f,hired_at:e.target.value}))} />
                    </div>

                    <div className="form-field span-2" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={16} /> Acesso ao Sistema (Login)
                      </h4>
                      <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Defina ou altere a senha de acesso deste colaborador à plataforma.</p>
                      
                      <div className="form-grid" style={{ gap: '16px' }}>
                        <div className="form-field">
                          <label>Login de Acesso (E-mail associado)</label>
                          <input value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@acesso.com" />
                        </div>
                        <div className="form-field">
                          <label>Senha Atual Salva</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ flex: 1, fontFamily: 'monospace', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {form.system_password ? (showSavedPassword ? form.system_password : '••••••••') : 'Nenhuma senha registrada'}
                            </span>
                            {form.system_password && (
                              <button
                                type="button"
                                onClick={() => setShowSavedPassword(!showSavedPassword)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: showSavedPassword ? '#6366f1' : 'var(--text-muted)' }}
                                title={showSavedPassword ? "Ocultar senha" : "Ver senha"}
                              >
                                <Eye size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="form-field">
                          <label>Nova Senha</label>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type={showNewPassword ? "text" : "password"} 
                              name="new_password" 
                              autoComplete="new-password"
                              value={form.new_password} 
                              onChange={e => setForm(f=>({...f,new_password:e.target.value}))} 
                              placeholder={editing ? "Deixe em branco para manter a atual..." : "Definir senha nova..."} 
                              style={{ width: '100%', paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: showNewPassword ? '#6366f1' : 'var(--text-muted)' }}
                              title={showNewPassword ? "Ocultar senha" : "Ver senha"}
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Gerar Link de Acesso */}
                      <div className="access-link-section" style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>
                          <ExternalLink size={14} /> Link de Acesso Direto
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input
                            readOnly
                            value={`${window.location.origin}/login?email=${form.email}`}
                            style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', opacity: 0.8, color: 'white', padding: '8px 12px', borderRadius: '8px' }}
                          />
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '8px 12px', height: 38 }}
                            onClick={() => copyToClipboard(`${window.location.origin}/login?email=${form.email}`)}
                            title="Copiar Link"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '8px 12px', height: 38, border: '1px solid #25d366', color: '#25d366' }}
                            onClick={() => {
                              const msg = `Olá! Aqui está seu link de acesso à nossa plataforma: ${window.location.origin}/login?email=${form.email}`;
                              const url = `https://wa.me/${(form.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                              window.open(url, '_blank');
                            }}
                            title="Enviar por WhatsApp"
                            disabled={!form.phone}
                          >
                            <MessageCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-field span-2">
                       <label>Contrato Assinado (Arquivo)</label>
                       <ContractUpload 
                         currentUrl={form.contract_url} 
                         type="employee" 
                         entityId={editing?.id} 
                         onUpload={(url) => setForm(f => ({ ...f, contract_url: url }))} 
                       />
                    </div>

                    <div className="form-field span-2">
                      <label>Observações Internas</label>
                      <textarea rows={3} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Notas sobre o colaborador..." />
                    </div>
                  </div>
                </div>
              <div className="modal-col" style={{ paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={18}/> Permissões de Acesso</h3>
                <div className="permissions-section">
                  {/* Administrador Geral (Destacado) */}
                  <div className="service-perm-row" style={{ borderColor: form.is_admin?'#f59e0b':'rgba(255,255,255,0.05)', background: form.is_admin?'rgba(245,158,11,0.08)':'rgba(0,0,0,0.1)' }}>
                    <div className="svc-toggle" onClick={() => setForm(f => ({ ...f, is_admin: !f.is_admin }))}>
                      <div className={`toggle-switch ${form.is_admin?'on':''}`} style={{ background: form.is_admin?'#f59e0b':''}}>
                        <div className="toggle-knob"/>
                      </div>
                      <div className="svc-info">
                        <ShieldCheck size={16} color={form.is_admin ? '#fcd34d' : 'var(--text-muted)'} />
                        <strong style={{ color: form.is_admin ? '#fcd34d' : 'var(--text-main)' }}>
                          Administrador Geral (Acesso Total)
                        </strong>
                      </div>
                    </div>
                    {form.is_admin && (
                      <p style={{ margin: '8px 0 0 52px', fontSize: '0.8rem', color: '#fcd34d', opacity: 0.9 }}>
                        Este colaborador terá acesso e gerência total à plataforma (nível de gestor), ignorando as restrições por departamento abaixo.
                      </p>
                    )}
                  </div>

                  {/* Permissão para Gerenciar Logins - Exclusivo para Admin Geral */}
                  {isAdmin && !form.is_admin && (
                    <div className="service-perm-row" style={{ marginTop: 12, borderColor: form.can_manage_logins?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.05)', background: form.can_manage_logins?'rgba(99,102,241,0.08)':'rgba(0,0,0,0.1)' }}>
                      <div className="svc-toggle" onClick={() => setForm(f => ({ ...f, can_manage_logins: !f.can_manage_logins }))}>
                        <div className={`toggle-switch ${form.can_manage_logins?'on':''}`} style={{ background: form.can_manage_logins?'#6366f1':''}}>
                          <div className="toggle-knob"/>
                        </div>
                        <div className="svc-info">
                          <Users2 size={16} color={form.can_manage_logins ? '#a5b4fc' : 'var(--text-muted)'} />
                          <strong style={{ color: form.can_manage_logins ? '#a5b4fc' : 'var(--text-main)' }}>
                            Permissão Especial: Gerenciar Logins
                          </strong>
                        </div>
                      </div>
                      {form.can_manage_logins && (
                        <p style={{ margin: '8px 0 0 52px', fontSize: '0.8rem', color: '#a5b4fc', opacity: 0.9 }}>
                          Este gestor poderá criar e alterar senhas de acesso para outros colaboradores e clientes.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="perm-hint" style={{ opacity: form.is_admin ? 0.5 : 1, marginTop: 16 }}>
                    <Shield size={14}/> Selecione os departamentos e defina o nível de acesso de cada um.
                  </p>
                  <div className="services-list" style={{ opacity: form.is_admin ? 0.3 : 1, pointerEvents: form.is_admin ? 'none' : 'auto' }}>
                    {services.map(svc => {
                      const perm = permissions.find(p => p.service_id === svc.id);
                      const isOn = !!perm;
                      return (
                        <div key={svc.id} className={`service-perm-row ${isOn?'enabled':''}`}>
                          <div className="svc-toggle" onClick={() => toggleService(svc.id)}>
                            <div className={`toggle-switch ${isOn?'on':''}`}>
                              <div className="toggle-knob"/>
                            </div>
                            <div className="svc-info">
                              <div className="svc-dot" style={{background: svc.color}}/>
                              <strong>{svc.name}</strong>
                            </div>
                          </div>
                          {isOn && (
                            <div style={{ paddingLeft: '52px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Função:</label>
                                <div className="select-wrapper" style={{ flex: 1, maxWidth: '150px' }}>
                                  <select 
                                    value={perm.role || 'Executor'} 
                                    onChange={e => updatePerm(svc.id, 'role', e.target.value)}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                  >
                                    <option value="Executor">Executor</option>
                                    <option value="Gestor">Gestor</option>
                                    <option value="Revisor">Revisor</option>
                                  </select>
                                  <ChevronDown size={14} className="select-arrow" />
                                </div>
                              </div>

                              <div className="perm-levels" style={{ marginLeft: 0 }}>
                                {[
                                  { key:'can_view',    label:'Visualizar', icon:<Eye size={13}/>   },
                                  { key:'can_edit',    label:'Editar',     icon:<Pencil size={13}/> },
                                  { key:'can_approve', label:'Aprovar',    icon:<Check size={13}/>  },
                                ].map(({ key, label, icon }) => (
                                  <button
                                    key={key} type="button"
                                    className={`perm-chip ${perm[key]?'active':''}`}
                                    onClick={() => updatePerm(svc.id, key, !perm[key])}
                                    disabled={key==='can_view'} // visualizar é sempre obrigatório
                                  >
                                    {icon} {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              {/* Aba Clientes Atribuídos */}
              <h3 className="col-title" style={{ marginTop: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Users2 size={18}/> Clientes Atribuídos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p className="perm-hint">
                    <Users2 size={14}/> Atribua clientes e defina em qual departamento este colaborador os atende.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select value={newClientId} onChange={e => setNewClientId(e.target.value)}
                      style={{ flex: 1, minWidth: 160, padding: '10px 14px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
                      <option value="">Selecionar cliente...</option>
                      <option value="ALL" style={{ fontWeight: 'bold', color: '#a5b4fc' }}> TODOS </option>
                      {allClients.map(c => <option key={c.id} value={c.id}>{c.metadata?.display_name || c.name}</option>)}
                    </select>
                    <select value={newDept} onChange={e => setNewDept(e.target.value)}
                      style={{ padding: '10px 14px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}>
                      {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button type="button" onClick={addClientAssignment} disabled={!newClientId}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: newClientId ? 'pointer' : 'not-allowed', fontWeight: 700, opacity: newClientId ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Plus size={16}/> Adicionar
                    </button>
                  </div>
                  {clientAssignments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.08)' }}>
                      <Users2 size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }}/>
                      Nenhum cliente atribuído ainda.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" 
                            checked={selectedAssignments.length === clientAssignments.length && clientAssignments.length > 0} 
                            onChange={() => {
                              if (selectedAssignments.length === clientAssignments.length) {
                                setSelectedAssignments([]);
                              } else {
                                setSelectedAssignments(clientAssignments.map((_, i) => i));
                              }
                            }} 
                          /> Selecionar Todos
                        </label>
                        {selectedAssignments.length > 0 && (
                          <button type="button" 
                            onClick={() => {
                              setClientAssignments(prev => prev.filter((_, i) => !selectedAssignments.includes(i)));
                              setSelectedAssignments([]);
                            }}
                            style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={14}/> Excluir Selecionados
                          </button>
                        )}
                      </div>
                      {clientAssignments.map((a, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(99,102,241,0.05)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input type="checkbox" 
                              checked={selectedAssignments.includes(i)}
                              onChange={() => {
                                setSelectedAssignments(prev => prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]);
                              }}
                              style={{ marginRight: 4 }}
                            />
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', flexShrink: 0 }}>
                              {a.client_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem', display: 'block' }}>{a.client_name}</span>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '1px 8px', borderRadius: 20, display: 'inline-block' }}>{a.department}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => setClientAssignments(prev => prev.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                            <X size={16}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>


            </form>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      <style>{`
        .func-page { padding:16px; display:flex; flex-direction:column; gap:24px; position:relative; }
        .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
        .page-header h1 { margin:0 0 6px; font-size:1.75rem; font-weight:800; display:flex; align-items:center; gap:10px; }
        .page-header p { margin:0; color:var(--text-muted); font-size:0.9rem; }
        .btn-primary { display:flex; align-items:center; gap:8px; padding:10px 20px; background:linear-gradient(135deg,#6366f1,#3b82f6); color:white; border:none; border-radius:10px; font-size:0.9rem; font-weight:600; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 14px rgba(99,102,241,0.3); white-space:nowrap; }
        .btn-primary:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .btn-ghost { display:flex; align-items:center; gap:8px; padding:10px 20px; background:transparent; color:var(--text-muted); border:1px solid var(--border-color); border-radius:10px; font-size:0.9rem; font-weight:500; cursor:pointer; transition:all 0.2s; }
        .btn-ghost:hover { background:rgba(255,255,255,0.05); }
        .btn-danger { display:flex; align-items:center; gap:8px; padding:10px 20px; background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); border-radius:10px; font-size:0.9rem; font-weight:600; cursor:pointer; transition:all 0.2s; }
        .kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:16px; }
        .kpi-card { padding:20px 24px; display:flex; flex-direction:column; gap:6px; }
        .kpi-label { font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; }
        .kpi-value { font-size:1.8rem; font-weight:800; color:var(--text-main); }
        .filters-bar { display:flex; flex-wrap: wrap; align-items:center; gap:16px; padding:12px 18px; }
        .search-box { display:flex; align-items:center; gap:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:8px 14px; flex:1; color:var(--text-muted); }
        .search-box input { flex:1; background:none; border:none; outline:none; color:var(--text-main); font-size:0.9rem; }
        .clear-search { background:none; border:none; color:var(--text-muted); cursor:pointer; }

        /* Grid de Cards */
        .employees-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px; }
        .employee-card { padding:20px; display:flex; flex-direction:column; gap:14px; }
        .emp-card-header { display:flex; align-items:flex-start; gap:14px; }
        .emp-avatar { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; color:white; font-size:1rem; flex-shrink:0; }
        .emp-avatar-img { width:44px; height:44px; border-radius:50%; object-fit:cover; flex-shrink:0; border:2px solid rgba(255,255,255,0.12); }
        .photo-section { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .photo-section-label { font-size:0.8rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; }
        .emp-info { flex:1; min-width: 0; }
        .emp-info h3 { margin:0 0 4px; font-size:1rem; font-weight:600; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .emp-info p { margin:0; font-size:0.82rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .status-badge-sm { padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; white-space:nowrap; flex-shrink:0; }
        .emp-card-body { display:flex; flex-direction:column; gap:8px; }
        .emp-detail { display:flex; align-items:center; gap:8px; font-size:0.83rem; color:var(--text-muted); }
        .emp-perms { display:flex; align-items:center; gap:8px; font-size:0.8rem; color:var(--text-muted); }
        .emp-login-badge { display:flex; align-items:center; gap:6px; font-size:0.78rem; padding:4px 10px; border-radius:6px; background:rgba(99,102,241,0.1); color:#a5b4fc; width:fit-content; }
        .emp-login-badge.inactive { background:rgba(107,114,128,0.1); color:var(--text-muted); }
        .emp-card-actions { display:flex; gap:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:14px; }
        .action-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-size:0.82rem; font-weight:500; cursor:pointer; border:1px solid rgba(255,255,255,0.08); transition:all 0.2s; background:transparent; }
        .edit-btn { color:#93c5fd; flex:1; justify-content:center; }
        .edit-btn:hover { background:rgba(59,130,246,0.15); border-color:rgba(59,130,246,0.3); }
        .delete-btn { color:#f87171; }
        .delete-btn:hover { background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); }

        /* Estados */
        .loading-state, .empty-state, .error-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:60px; color:var(--text-muted); text-align:center; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); display:flex; justify-content:flex-end; z-index:99999; animation:fadeIn 0.3s ease; }
        .modal-panel { width: 100%; max-width: 1200px; height: 100vh; background: #0f172a; display: flex; flex-direction: column; animation: slideRight 0.4s cubic-bezier(0.16,1,0.3,1); border-left: 1px solid rgba(255,255,255,0.1); box-shadow: -20px 0 50px rgba(0,0,0,0.8); }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(15,23,42,1); z-index: 10; flex-shrink: 0; }
        .modal-header h2 { margin:0; font-size:1.1rem; font-weight:700; color: #f8fafc; }
        .modal-close { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); border-radius:8px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; }
        .modal-close:hover { background:rgba(255,255,255,0.1); color:white; }
        .modal-tabs { display:flex; gap:0; padding:0 28px; border-bottom:1px solid rgba(255,255,255,0.07); background: rgba(15,23,42,1); flex-shrink: 0; }
        .modal-tab { display:flex; align-items:center; gap:8px; padding:10px 16px; background:transparent; border:none; border-bottom:2px solid transparent; color:var(--text-muted); font-size:0.85rem; font-weight:500; cursor:pointer; transition:all 0.2s; position:relative; margin-bottom:-1px; }
        .modal-tab:hover { color:var(--text-main); }
        .modal-tab.active { color:#a5b4fc; border-bottom-color:#6366f1; }
        .tab-badge { background:#6366f1; color:white; border-radius:20px; padding:1px 7px; font-size:0.72rem; font-weight:700; }
        .modal-form { padding: 28px; flex: 1; overflow-y: auto; }
        .color-picker-row { display:flex; align-items:center; gap:20px; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .avatar-preview { width:56px; height:56px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; font-weight:700; color:white; flex-shrink:0; transition:background 0.3s; }
        .field-label { font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:8px; }
        .color-swatches { display:flex; gap:7px; }
        .color-swatch { width:26px; height:26px; border-radius:7px; border:2px solid transparent; cursor:pointer; transition:all 0.15s; }
        .color-swatch:hover { transform:scale(1.1); }
        .color-swatch.selected { border-color:white; transform:scale(1.15); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-field { display:flex; flex-direction:column; gap:6px; }
        .form-field.span-2 { grid-column:span 2; }
        .form-field label { font-size:0.8rem; font-weight:500; color:var(--text-muted); display:flex; align-items:center; gap:6px; }
        .form-field input, .form-field textarea, .form-field select, .select-wrapper select { 
          width:100%; padding:10px 14px; 
          background: rgba(15, 23, 42, 0.6); 
          border:1px solid rgba(255,255,255,0.08); 
          border-radius:10px; color:var(--text-main); 
          font-size:0.85rem; outline:none; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          box-sizing:border-box;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .form-field input:focus, .form-field textarea:focus, .select-wrapper select:focus { 
          border-color:#6366f1; 
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15), inset 0 2px 4px rgba(0,0,0,0.1); 
        }
        .form-field textarea { resize:vertical; font-family:inherit; }
        .select-wrapper { position:relative; }
        .select-wrapper select { appearance:none; cursor:pointer; padding-right:36px; }
        .select-arrow { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.4); pointer-events:none; }
        .modal-footer { display:flex; justify-content:flex-end; gap:12px; padding: 20px 28px; background: rgba(15,23,42,1); border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }

        /* Permissões */
        .permissions-section { display:flex; flex-direction:column; gap:16px; }
        .perm-hint { display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-muted); padding:10px 14px; background:rgba(99,102,241,0.08); border-radius:8px; border:1px solid rgba(99,102,241,0.15); margin:0; }
        .services-list { display:flex; flex-direction:column; gap:8px; }
        .service-perm-row { padding:14px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); background:rgba(15, 23, 42, 0.4); transition:all 0.3s; }
        .service-perm-row.enabled { border-color:rgba(99,102,241,0.3); background:rgba(99,102,241,0.05); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .svc-toggle { display:flex; align-items:center; gap:12px; cursor:pointer; }
        .toggle-switch { width:42px; height:22px; border-radius:12px; background:rgba(255,255,255,0.05); position:relative; transition:all 0.3s; border: 1px solid rgba(255,255,255,0.05); }
        .service-perm-row.enabled .toggle-switch { 
          background: linear-gradient(135deg, #6366f1, #3b82f6); 
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 0 10px rgba(99,102,241,0.4);
        }
        .toggle-knob { width:16px; height:16px; border-radius:50%; background:white; position:absolute; top:2px; left:2px; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .service-perm-row.enabled .toggle-knob { left:22px; }
        .svc-info { display:flex; align-items:center; gap:10px; }
        .svc-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; box-shadow: 0 0 8px currentColor; }
        .svc-info strong { font-size:0.9rem; font-weight:600; color:var(--text-main); }
        .perm-levels { display:flex; gap:8px; margin-top:12px; margin-left:52px; flex-wrap:wrap; }
        .perm-chip { 
          display:flex; align-items:center; gap:6px; padding:6px 14px; 
          border-radius:20px; font-size:0.75rem; font-weight:600; 
          cursor:pointer; border:1px solid rgba(255,255,255,0.05); 
          background:rgba(255,255,255,0.02); color:var(--text-muted); transition:all 0.2s; 
        }
        .perm-chip:not(:disabled):hover { border-color:rgba(99,102,241,0.3); color:var(--text-main); background:rgba(99,102,241,0.05); }
        .perm-chip.active { 
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2)); 
          border-color:rgba(99,102,241,0.4); 
          color:#a5b4fc; 
          box-shadow: 0 4px 12px rgba(99,102,241,0.1);
        }
        .perm-chip:disabled { opacity:0.5; cursor:default; }

        /* Toast & Confirm */
        .toast-notif { position:fixed; bottom:28px; right:28px; z-index:2000; display:flex; align-items:center; gap:10px; padding:14px 20px; border-radius:12px; font-size:0.9rem; font-weight:500; box-shadow:0 8px 30px rgba(0,0,0,0.4); animation:slideInR 0.3s ease; }
        .toast-notif.success { background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#34d399; }
        .toast-notif.error { background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#f87171; }
        @keyframes slideInR { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        .confirm-dialog { max-width:420px; width:100%; text-align:center; padding:40px; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .confirm-dialog h3 { margin:0; font-size:1.2rem; }
        .confirm-dialog p { margin:0; color:var(--text-muted); font-size:0.9rem; line-height:1.6; }
        .confirm-actions { display:flex; gap:12px; margin-top:8px; }
        .spin { animation:spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        
        /* Filters Bar & Chips */
        .filters-main { display: flex; gap: 12px; width: 100%; align-items: center; flex: 1; min-width: 100%; }
        .btn-filter {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
          color: var(--text-muted); font-size: 0.85rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-filter:hover { background: rgba(255,255,255,0.06); color: var(--text-main); }
        .btn-filter.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
        
        .filter-options {
          width: 100%; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 16px; animation: fadeIn 0.3s ease;
        }
        .filter-group { display: flex; flex-direction: column; gap: 12px; }
        .filter-label { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .dept-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .dept-chip-card {
          padding: 8px 16px; background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05); border-radius: 12px;
          color: var(--text-muted); font-size: 0.82rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .dept-chip-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .dept-chip-card.selected {
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2));
          border-color: rgba(99,102,241,0.4); color: #f8fafc;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .clear-filters-btn {
          background: transparent; border: none; color: #f87171;
          font-size: 0.8rem; font-weight: 600; cursor: pointer;
          padding: 4px 12px; border-radius: 6px; transition: all 0.2s;
        }
        .clear-filters-btn:hover { background: rgba(248,113,113,0.1); }

        @media (max-width:600px) {
          .form-grid { grid-template-columns:1fr; }
          .form-field.span-2 { grid-column:span 1; }
          .employees-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
