import { useState, useRef, useEffect } from 'react';
import { FolderSync, Cloud, ExternalLink, X, Folder, FileText, Info, Edit3, Save, Globe, Instagram, Tag, AlignLeft, Users, ChevronDown, Plus, Mail, MessageCircle, Target, Briefcase, Activity, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConfirm } from '../context/ConfirmContext';

export const ResponsaveisPanel = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const items = value || [];
  const addItem = () => onChange([...items, { name: '', phone: '', role: '' }]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) =>
    onChange(items.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const label = items.length === 0
    ? 'Adicionar funcionário...'
    : items.map(r => r.name || '—').join(', ');

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, padding: '10px 14px',
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${open ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, color: items.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
          <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {items.length > 0 && (
            <span style={{
              background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
              fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
              borderRadius: 10, flexShrink: 0
            }}>{items.length}</span>
          )}
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s', flexShrink: 0
        }} />
      </button>

      {open && (
        <div style={{
          marginTop: 6,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)', padding: 12,
          maxHeight: '320px', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {items.length === 0 && (
              <div style={{
                padding: '14px 12px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '0.82rem',
                borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)'
              }}>Nenhum funcionário adicionado à equipe ainda.</div>
            )}
            {items.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8, padding: '10px 12px',
                display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr auto',
                gap: 8, alignItems: 'end'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Nome</div>
                  <input
                    value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="Nome do funcionário"
                    style={{
                      width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Função</div>
                  <input
                    value={item.role} onChange={e => updateItem(idx, 'role', e.target.value)}
                    placeholder="Ex: Diretor, Ti..."
                    style={{
                      width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Contato</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      value={item.phone} onChange={e => updateItem(idx, 'phone', e.target.value)}
                      placeholder="Telefone ou E-mail"
                      style={{
                        width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                        color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box', flex: 1
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    {item.phone && item.phone.includes('@') && (
                      <a
                        href={`mailto:${item.phone.trim()}`}
                        target="_blank" rel="noopener noreferrer"
                        title={`Enviar e-mail para ${item.phone.trim()}`}
                        style={{
                          width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(59,130,246,0.15)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(59,130,246,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
                      >
                        <Mail size={13} color="#3b82f6" />
                      </a>
                    )}
                    {item.phone && !item.phone.includes('@') && item.phone.replace(/\D/g, '').length >= 8 && (
                      <a
                        href={`https://wa.me/${item.phone.replace(/\D/g, '').replace(/^0+/, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        title={`Abrir WhatsApp: ${item.phone}`}
                        style={{
                          width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                          background: 'rgba(37,211,102,0.15)',
                          border: '1px solid rgba(37,211,102,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(37,211,102,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(37,211,102,0.15)'; }}
                      >
                        <MessageCircle size={13} color="#25d366" />
                      </a>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(idx)}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 6, color: '#f87171', cursor: 'pointer', padding: '7px 8px',
                    display: 'flex', alignItems: 'center'
                  }}
                  title="Remover"
                ><X size={14} /></button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}
            style={{
              width: '100%', padding: '9px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px dashed rgba(99,102,241,0.35)',
              borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
          >
            <Plus size={13} /> Adicionar Membro
          </button>
        </div>
      )}
    </div>
  );
};

export const ResponsaveisContaPanel = ({ value, onChange, label = "Responsáveis pela Conta", hideChat = false }) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    supabase.from('employees').select('*').order('name')
      .then(({data}) => { if(data) setEmployees(data); });

    const fn = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setActiveSearchIndex(null);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const items = Array.isArray(value) ? value : [];
  const addItem = () => onChange([...items, { name: '', role: '' }]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, fieldOrUpdates, val) => {
    if (typeof fieldOrUpdates === 'object') {
      onChange(items.map((it, i) => i === idx ? { ...it, ...fieldOrUpdates } : it));
    } else {
      onChange(items.map((it, i) => i === idx ? { ...it, [fieldOrUpdates]: val } : it));
    }
  };

  const displayText = items.length === 0
    ? 'Adicionar colaborador...'
    : items.map(r => r.name || '—').join(', ');

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, padding: '10px 14px',
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${open ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, color: items.length > 0 ? 'var(--text-main)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none', textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
          <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
          {items.length > 0 && (
            <span style={{
              background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
              fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
              borderRadius: 10, flexShrink: 0
            }}>{items.length}</span>
          )}
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s', flexShrink: 0
        }} />
      </button>

      {open && (
        <div style={{
          marginTop: 6,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)', padding: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {items.length === 0 && (
              <div style={{
                padding: '14px 12px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '0.82rem',
                borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)'
              }}>Nenhum colaborador adicionado à conta ainda.</div>
            )}
            {items.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 8, padding: '10px 12px',
                display: 'grid', gridTemplateColumns: '1fr 1fr auto',
                gap: 8, alignItems: 'end'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Colaborador</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={item.name} 
                      onChange={e => {
                        updateItem(idx, 'name', e.target.value);
                        setActiveSearchIndex(idx);
                      }}
                      onFocus={() => setActiveSearchIndex(idx)}
                      placeholder="Buscar colaborador..."
                      style={{
                        width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                        color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none',
                        fontFamily: 'inherit', boxSizing: 'border-box'
                      }}
                      onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)}
                    />
                    {activeSearchIndex === idx && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: 'rgba(20,25,35,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, zIndex: 100, maxHeight: 150, overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                      }}>
                        {employees
                          .filter(e => !item.name || e.name.toLowerCase().includes(item.name.toLowerCase()))
                          .sort((a, b) => {
                            if (!item.name) return 0;
                            const term = item.name.toLowerCase();
                            const aStarts = a.name.toLowerCase().startsWith(term);
                            const bStarts = b.name.toLowerCase().startsWith(term);
                            if (aStarts && !bStarts) return -1;
                            if (!aStarts && bStarts) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map(e => (
                          <div 
                            key={e.id}
                            style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            onMouseDown={() => {
                               const updates = { name: e.name, employee_id: e.id };
                               if (!item.role && e.department) updates.role = e.department;
                               if (!item.role && e.cargo && !e.department) updates.role = e.cargo;
                               updateItem(idx, updates);
                               setActiveSearchIndex(null);
                            }}
                            onMouseOver={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseOut={ev => ev.currentTarget.style.background = 'transparent'}
                          >
                            {e.name}
                            {e.department && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: 6 }}>({e.department})</span>}
                          </div>
                        ))}
                        {employees.filter(e => !item.name || e.name.toLowerCase().includes(item.name.toLowerCase())).length === 0 && (
                           <div style={{ padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Nenhum encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Departamento</div>
                  <input
                    value={item.role} onChange={e => updateItem(idx, 'role', e.target.value)}
                    placeholder="Ex: Comercial, Suporte..."
                    style={{
                      width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      color: 'var(--text-main)', fontSize: '0.82rem', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!hideChat && item.employee_id && (
                    <a
                      href={`/chat-interno?client=${item.employee_id}`}
                      title="Abrir Chat com Colaborador"
                      style={{
                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 6, color: '#10b981', cursor: 'pointer', padding: '7px 8px',
                        display: 'flex', alignItems: 'center', textDecoration: 'none',
                        transition: 'transform 0.15s, background 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                    >
                      <MessageCircle size={14} />
                    </a>
                  )}
                  <button type="button" onClick={() => removeItem(idx)}
                    style={{
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 6, color: '#f87171', cursor: 'pointer', padding: '7px 8px',
                      display: 'flex', alignItems: 'center'
                    }}
                    title="Remover"
                  ><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}
            style={{
              width: '100%', padding: '9px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px dashed rgba(99,102,241,0.35)',
              borderRadius: 8, color: '#a5b4fc', cursor: 'pointer', fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
          >
            <Plus size={13} /> Adicionar Colaborador
          </button>
        </div>
      )}
    </div>
  );
};

const FileManager = ({ title = "Central de Arquivos do Departamento", client }) => {
  const confirm = useConfirm();
  const [driveFolderId, setDriveFolderId] = useState(client?.metadata?.drive_folder_id || '');
  const [activeView, setActiveView] = useState('drive'); // 'drive' ou 'info'
  
  const getInitialInfo = () => {
    return {
      sobre: client?.metadata?.company_info?.sobre || (typeof client?.metadata?.general_info === 'string' ? client.metadata.general_info : ''),
      segmento: client?.metadata?.company_info?.segmento || '',
      site: client?.metadata?.company_info?.site || '',
      instagram: client?.metadata?.company_info?.instagram || '',
      publico_alvo: client?.metadata?.company_info?.publico_alvo || '',
      servicos_contratados: client?.metadata?.company_info?.servicos_contratados || '',
      status_conta: client?.metadata?.company_info?.status_conta || '',
      observacoes: client?.metadata?.company_info?.observacoes || '',
      responsaveis: client?.metadata?.company_info?.responsaveis || [],
      responsaveis_conta: client?.metadata?.company_info?.responsaveis_conta || []
    };
  };

  const [companyInfo, setCompanyInfo] = useState(getInitialInfo());
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isEquipeOpen, setIsEquipeOpen] = useState(false);
  const [isResponsaveisContaOpen, setIsResponsaveisContaOpen] = useState(false);

  const toggleInfoView = () => {
    if (activeView === 'info') {
      setActiveView('drive');
      setIsEditingInfo(false);
    } else {
      setCompanyInfo(getInitialInfo());
      setActiveView('info');
    }
  };

  const saveInfoText = async () => {
    setIsSavingInfo(true);
    const newMetadata = { ...(client?.metadata || {}), company_info: companyInfo };
    delete newMetadata.general_info; // Clean up old string field if exists
    
    const { error } = await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
    setIsSavingInfo(false);
    if (!error) {
      if (client) client.metadata = newMetadata;
      setIsEditingInfo(false);
    } else {
      alert('Erro ao salvar as informações: ' + error.message);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--border-color)',
    color: 'white',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  };

  const linkGoogleDrive = async () => {
    if (!client) return;
    const url = prompt("Cole a URL ou o ID da pasta raiz deste cliente no Google Drive:\\n(A pasta precisa estar configurada para 'Qualquer pessoa com o link pode ver')");
    if (url) {
      let id = url;
      const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
      if (match) id = match[1];
      else if (url.includes('id=')) id = url.split('id=')[1];
      
      setDriveFolderId(id);
      
      const newMetadata = { ...(client.metadata || {}), drive_folder_id: id };
      await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
    }
  };

  const unlinkGoogleDrive = async () => {
    if(!client) return;
    const confirmed = await confirm({
      title: 'Remover Vínculo?',
      message: 'Tem certeza que deseja remover o vínculo com a pasta do Google Drive deste cliente?',
      confirmText: 'Sim, remover',
      isDanger: true
    });
    if(confirmed) {
      setDriveFolderId('');
      const newMetadata = { ...(client.metadata || {}) };
      delete newMetadata.drive_folder_id;
      await supabase.from('clients').update({ metadata: newMetadata }).eq('id', client.id);
    }
  };

  const openDrive = () => {
    setActiveView('drive');
    if (driveFolderId) {
      window.open(`https://drive.google.com/drive/folders/${driveFolderId}`, '_blank');
    } else {
      alert("Por favor, vincule a pasta do Google Drive primeiro.");
    }
  };

  const folders = [
    { id: 1, name: 'Briefing e Diretrizes', desc: 'Documentos estratégicos e guias' },
    { id: 2, name: 'Assets da Marca', desc: 'Logos, fontes e imagens padrão' },
    { id: 3, name: 'Vídeos de Referência', desc: 'Referências e materiais brutos' },
  ];

  return (
    <div className="file-manager glass-panel" style={{ marginTop: '32px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
          <FolderSync size={20} className="text-primary" /> {title}
        </h3>
        
        {!driveFolderId ? (
          <button 
            className="glass-btn primary" 
            style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={linkGoogleDrive}
          >
            <Cloud size={14} /> Vincular Google Drive do Cliente
          </button>
        ) : (
          <button 
            className="glass-btn" 
            style={{ fontSize: '0.75rem', padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={unlinkGoogleDrive}
            title="Desvincular Google Drive"
          >
            <X size={14} /> Remover Vínculo
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        <div className={`folder-card glass-card ${activeView === 'info' ? 'active-tab' : ''}`} onClick={toggleInfoView} style={{ background: activeView === 'info' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)', borderColor: activeView === 'info' ? '#10b981' : 'rgba(16, 185, 129, 0.2)' }}>
          <div className="folder-icon">
            <FileText size={24} color="#10b981" fill="rgba(16, 185, 129, 0.2)" />
          </div>
          <div className="folder-info">
            <h4>Informações Gerais</h4>
            <p>Sobre a empresa, links e detalhes</p>
          </div>
          <Info size={16} className="folder-link-icon" style={{ color: '#10b981', opacity: 1 }} />
        </div>

        {folders.map(folder => (
          <div key={folder.id} className="folder-card glass-card" onClick={openDrive}>
            <div className="folder-icon">
              <Folder size={24} color="#3b82f6" fill="rgba(59, 130, 246, 0.2)" />
            </div>
            <div className="folder-info">
              <h4>{folder.name}</h4>
              <p>{folder.desc}</p>
            </div>
            <ExternalLink size={16} className="folder-link-icon" />
          </div>
        ))}
      </div>

      {activeView === 'drive' && (
        <>
          {driveFolderId && (
            <div style={{ marginTop: '16px', width: '100%', height: '180px', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <iframe 
                src={`https://drive.google.com/embeddedfolderview?id=${driveFolderId}#list`} 
                width="100%" height="100%" frameBorder="0"
                title="Google Drive Folder"
              ></iframe>
            </div>
          )}

          {!driveFolderId && (
            <div className="empty-drive-state">
              <Cloud size={40} className="text-muted" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>Nenhuma pasta do Google Drive vinculada.</p>
              <span>Vincule uma pasta para que os entregáveis, briefings e vídeos sejam armazenados de forma organizada para este cliente.</span>
            </div>
          )}
        </>
      )}

      {activeView === 'info' && (
        <div className="info-inline-container glass-panel" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '24px' }}>
            <FileText size={20} color="#10b981" /> Detalhes da Empresa - {client?.name}
          </h2>
          
          {isEditingInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                  <AlignLeft size={14} /> Sobre a Empresa
                </label>
                <textarea 
                  value={companyInfo.sobre} 
                  onChange={e => setCompanyInfo({...companyInfo, sobre: e.target.value})} 
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={4}
                  placeholder="Resumo sobre a empresa, o que ela faz..."
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Tag size={14} /> Segmento
                  </label>
                  <input 
                    value={companyInfo.segmento} 
                    onChange={e => setCompanyInfo({...companyInfo, segmento: e.target.value})} 
                    style={inputStyle}
                    placeholder="Ex: Indústria Plástica"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Globe size={14} /> Site
                  </label>
                  <input 
                    value={companyInfo.site} 
                    onChange={e => setCompanyInfo({...companyInfo, site: e.target.value})} 
                    style={inputStyle}
                    placeholder="https://www.site.com.br"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Instagram size={14} /> Instagram
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      value={companyInfo.instagram} 
                      onChange={e => setCompanyInfo({...companyInfo, instagram: e.target.value})} 
                      style={{ ...inputStyle, paddingRight: companyInfo.instagram ? '46px' : '12px' }}
                      placeholder="@instagram_do_cliente"
                    />
                    {companyInfo.instagram && (
                      <a
                        href={`https://instagram.com/${companyInfo.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\?.*/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir perfil no Instagram"
                        style={{
                          position: 'absolute', right: 6,
                          width: 30, height: 30, borderRadius: 6,
                          background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          textDecoration: 'none', flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(220,39,67,0.4)',
                          transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,39,67,0.4)'; }}
                      >
                        <Instagram size={14} color="white" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Target size={14} /> Público Alvo
                  </label>
                  <input 
                    value={companyInfo.publico_alvo} 
                    onChange={e => setCompanyInfo({...companyInfo, publico_alvo: e.target.value})} 
                    style={inputStyle}
                    placeholder="Ex: Startups, B2B..."
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Briefcase size={14} /> Serviços Contratados
                  </label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Tráfego', 'Conteúdo', 'CRM'].map(servico => {
                      const selected = companyInfo.servicos_contratados?.includes(servico);
                      return (
                        <button
                          key={servico}
                          type="button"
                          onClick={() => {
                            let current = companyInfo.servicos_contratados ? companyInfo.servicos_contratados.split(',').map(s=>s.trim()).filter(Boolean) : [];
                            if (selected) {
                              current = current.filter(s => s !== servico);
                            } else {
                              current.push(servico);
                            }
                            setCompanyInfo({...companyInfo, servicos_contratados: current.join(', ')});
                          }}
                          style={{
                            flex: '1 1 30%',
                            background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                            color: selected ? '#818cf8' : 'var(--text-muted)',
                            padding: '10px 24px', borderRadius: 24, fontSize: '0.9rem', fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                          onMouseOver={e => { if(!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
                          onMouseOut={e => { if(!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                        >
                          {servico}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                    <Calendar size={14} /> Data de Entrada
                  </label>
                  <input 
                    type="date" max="9999-12-31"
                    value={companyInfo.data_entrada || ''} 
                    onChange={e => setCompanyInfo({...companyInfo, data_entrada: e.target.value})} 
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="form-group" style={{ position: 'relative', zIndex: 55 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                  <Users size={14} /> Responsáveis pela Conta
                </label>
                <ResponsaveisContaPanel 
                  value={companyInfo.responsaveis_conta} 
                  onChange={v => setCompanyInfo({...companyInfo, responsaveis_conta: v})}
                />
              </div>

              <div className="form-group" style={{ position: 'relative', zIndex: 50 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                  <Users size={14} /> Equipe (Funcionários do Cliente)
                </label>
                <ResponsaveisPanel 
                  value={companyInfo.responsaveis} 
                  onChange={v => setCompanyInfo({...companyInfo, responsaveis: v})}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 500 }}>
                  <FileText size={14} /> Observações Adicionais
                </label>
                <textarea 
                  value={companyInfo.observacoes} 
                  onChange={e => setCompanyInfo({...companyInfo, observacoes: e.target.value})} 
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  placeholder="Anotações extras, público-alvo, detalhes cruciais..."
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => setIsEditingInfo(false)} className="glass-btn" style={{ padding: '8px 16px' }}>Cancelar</button>
                <button onClick={saveInfoText} className="glass-btn primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', color: 'white', border: 'none' }} disabled={isSavingInfo}>
                  <Save size={16} /> {isSavingInfo ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                
                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <AlignLeft size={16} /> Sobre a Empresa
                  </h4>
                  {companyInfo.sobre ? (
                    <div style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{companyInfo.sobre}</div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado.</div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Tag size={14} /> Segmento</span>
                    {companyInfo.segmento ? (
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500 }}>{companyInfo.segmento}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Globe size={14} /> Site</span>
                    {companyInfo.site ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500 }}>
                          {companyInfo.site.replace(/^https?:\/\//, '')}
                        </span>
                        <a
                          href={companyInfo.site.startsWith('http') ? companyInfo.site : `https://${companyInfo.site}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Acessar o site"
                          style={{
                            width: 30, height: 30, borderRadius: 6,
                            background: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textDecoration: 'none', flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(59,130,246,0.4)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,0.6)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.4)'; }}
                        >
                          <Globe size={14} color="white" />
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Instagram size={14} /> Instagram</span>
                    {companyInfo.instagram ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500 }}>
                          {companyInfo.instagram.includes('instagram.com') ? companyInfo.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\?.*/, '') : (companyInfo.instagram.startsWith('@') ? companyInfo.instagram : `@${companyInfo.instagram}`)}
                        </span>
                        <a
                          href={`https://instagram.com/${companyInfo.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\?.*/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir perfil no Instagram"
                          style={{
                            width: 30, height: 30, borderRadius: 6,
                            background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textDecoration: 'none', flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(220,39,67,0.4)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.6)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,39,67,0.4)'; }}
                        >
                          <Instagram size={14} color="white" />
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Target size={14} /> Público Alvo</span>
                    {companyInfo.publico_alvo ? (
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500 }}>{companyInfo.publico_alvo}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Briefcase size={14} /> Serviços Contratados</span>
                    {companyInfo.servicos_contratados ? (
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500 }}>{companyInfo.servicos_contratados}</strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}><Calendar size={14} /> Data de Entrada</span>
                    {companyInfo.data_entrada ? (
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 500 }}>
                        {new Date(companyInfo.data_entrada + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Não informado</span>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Target size={20} className="text-primary" /> Escopo de Atuação e Áreas Contratadas
                  </h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {(() => {
                      const activeServices = companyInfo.servicos_contratados ? companyInfo.servicos_contratados.split(',').map(s => s.trim()).filter(Boolean) : [];
                      
                      return (
                        <>
                          {activeServices.map(label => (
                            <div key={label} style={{ 
                              padding: '10px 16px', borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              display: 'flex', alignItems: 'center', gap: 8
                            }}>
                              <CheckCircle size={16} color="#34d399" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{label}</span>
                            </div>
                          ))}
                          {activeServices.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum serviço ativo detectado.</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Users size={16} /> Responsáveis pela Conta
                  </h4>
                  
                  <div style={{ position: 'relative', zIndex: 45 }}>
                    <button
                      type="button"
                      onClick={() => setIsResponsaveisContaOpen(!isResponsaveisContaOpen)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 8, padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8, color: 'var(--text-main)',
                        cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                        <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        
                        {companyInfo.responsaveis_conta && companyInfo.responsaveis_conta.length > 0 ? (
                           <>
                             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {companyInfo.responsaveis_conta.map(r => r.name || '—').join(', ')}
                             </span>
                             <span style={{
                               background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                               fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
                               borderRadius: 10, flexShrink: 0
                             }}>{companyInfo.responsaveis_conta.length}</span>
                           </>
                        ) : (
                           <span style={{ color: 'var(--text-muted)' }}>Nenhum responsável cadastrado</span>
                        )}
                      </span>
                      <ChevronDown size={14} style={{
                        color: 'var(--text-muted)',
                        transform: isResponsaveisContaOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s', flexShrink: 0
                      }} />
                    </button>

                    {isResponsaveisContaOpen && (
                      <div style={{
                        marginTop: 6,
                        background: 'rgba(8, 14, 28, 0.98)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(20px)', padding: 12,
                        maxHeight: '320px', overflowY: 'auto',
                      }}>
                        {companyInfo.responsaveis_conta && companyInfo.responsaveis_conta.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {companyInfo.responsaveis_conta.map((resp, i) => (
                              <div key={i} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 8, padding: '10px 12px',
                                display: 'grid', gridTemplateColumns: '1fr 1fr',
                                gap: 8, alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Colaborador</div>
                                  <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                    {resp.name || '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Departamento</div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ padding: '7px 10px', flex: 1, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                      {resp.role || '—'}
                                    </div>
                                    {resp.employee_id && (
                                      <a
                                        href={`/chat-interno?client=${resp.employee_id}`}
                                        title="Abrir Chat"
                                        style={{
                                          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                                          background: 'rgba(16,185,129,0.15)',
                                          border: '1px solid rgba(16,185,129,0.3)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                                      >
                                        <MessageCircle size={15} color="#10b981" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            padding: '14px 12px', textAlign: 'center',
                            color: 'var(--text-muted)', fontSize: '0.82rem',
                            borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)'
                          }}>Nenhum responsável adicionado à conta ainda.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Users size={16} /> Equipe (Funcionários do Cliente)
                  </h4>
                  
                  <div style={{ position: 'relative', zIndex: 40 }}>
                    <button
                      type="button"
                      onClick={() => setIsEquipeOpen(!isEquipeOpen)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 8, padding: '12px 16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 8, color: 'var(--text-main)',
                        cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
                        <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        
                        {companyInfo.responsaveis && companyInfo.responsaveis.length > 0 ? (
                           <>
                             <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {companyInfo.responsaveis.map(r => r.name || '—').join(', ')}
                             </span>
                             <span style={{
                               background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                               fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px',
                               borderRadius: 10, flexShrink: 0
                             }}>{companyInfo.responsaveis.length}</span>
                           </>
                        ) : (
                           <span style={{ color: 'var(--text-muted)' }}>Nenhum funcionário cadastrado</span>
                        )}
                      </span>
                      <ChevronDown size={14} style={{
                        color: 'var(--text-muted)',
                        transform: isEquipeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s', flexShrink: 0
                      }} />
                    </button>

                    {isEquipeOpen && (
                      <div style={{
                        marginTop: 6,
                        background: 'rgba(8, 14, 28, 0.98)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(20px)', padding: 12,
                        maxHeight: '320px', overflowY: 'auto',
                      }}>
                        {companyInfo.responsaveis && companyInfo.responsaveis.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {companyInfo.responsaveis.map((resp, i) => (
                              <div key={i} style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 8, padding: '10px 12px',
                                display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr',
                                gap: 8, alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Nome</div>
                                  <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                    {resp.name || '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Função</div>
                                  <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                                    {resp.role || '—'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Contato</div>
                                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.82rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {resp.phone || '—'}
                                    </div>
                                    {resp.phone && resp.phone.includes('@') && (
                                      <a
                                        href={`mailto:${resp.phone.trim()}`}
                                        target="_blank" rel="noopener noreferrer"
                                        title={`Enviar e-mail para ${resp.phone.trim()}`}
                                        style={{
                                          width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                                          background: 'rgba(59,130,246,0.15)',
                                          border: '1px solid rgba(59,130,246,0.3)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                                        }}
                                      >
                                        <Mail size={13} color="#3b82f6" />
                                      </a>
                                    )}
                                    {resp.phone && !resp.phone.includes('@') && resp.phone.replace(/\D/g, '').length >= 8 && (
                                      <a
                                        href={`https://wa.me/${resp.phone.replace(/\D/g, '').replace(/^0+/, '')}`}
                                        target="_blank" rel="noopener noreferrer"
                                        title={`Abrir WhatsApp: ${resp.phone}`}
                                        style={{
                                          width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                                          background: 'rgba(37,211,102,0.15)',
                                          border: '1px solid rgba(37,211,102,0.3)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          textDecoration: 'none', transition: 'transform 0.15s, background 0.15s',
                                        }}
                                      >
                                        <MessageCircle size={13} color="#25d366" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '14px 12px' }}>
                            Nenhuma equipe informada.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                  <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <FileText size={16} /> Observações Adicionais
                  </h4>
                  {companyInfo.observacoes ? (
                    <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{companyInfo.observacoes}</div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Nenhuma observação.</div>
                  )}
                </div>
                
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setIsEditingInfo(true)} className="glass-btn" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={16} /> Editar Informações
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .folder-card {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: 0.2s;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
        }
        .folder-card:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }
        .folder-info {
          flex: 1;
        }
        .folder-info h4 { margin: 0 0 4px 0; color: var(--text-main); font-size: 0.95rem; }
        .folder-info p { margin: 0; color: var(--text-muted); font-size: 0.75rem; }
        .folder-link-icon {
          color: var(--text-muted);
          opacity: 0.5;
        }
        .folder-card:hover .folder-link-icon {
          color: #3b82f6;
          opacity: 1;
        }
        .empty-drive-state {
          text-align: center;
          padding: 32px 16px;
          background: rgba(0,0,0,0.2);
          border: 1px dashed rgba(255,255,255,0.1);
          border-radius: 12px;
          margin-top: 12px;
        }
        .empty-drive-state p { margin: 0 0 8px 0; font-weight: 500; color: var(--text-main); }
        .empty-drive-state span { font-size: 0.8rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default FileManager;
