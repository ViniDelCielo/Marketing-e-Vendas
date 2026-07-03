import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Plus, Search, Edit3, Trash2, X, Save,
  Building2, Mail, Phone, FileText, TrendingUp,
  Calendar, DollarSign, AlertCircle, CheckCircle,
  ChevronDown, Loader2, ShieldCheck, PackageCheck, Clock, Key, Lock,
  Copy, ExternalLink, MessageCircle, RefreshCw, Eye, Folder, MapPin, Filter, Instagram
} from 'lucide-react';
import { isSameClient } from '../../utils/stringUtils';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../context/AuthContext';
import { useServices } from '../../hooks/useServices';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import PhotoUpload from '../../components/PhotoUpload';
import ContractUpload from '../../components/ContractUpload';

const STATUS_OPTIONS = ['Ativo', 'Inativo', 'Suspenso', 'Configurando', 'PAGO', 'DEVENDO'];
const PLAN_OPTIONS = ['ROI Tráfego', 'ROI Conteúdo', 'ROI CRM', 'ROI Plus', 'ROI Expert', 'Personalizado'];
// SegmentInput: campo livre com sugestões derivadas dos clientes já cadastrados
const SegmentInput = ({ value, onChange, existingSegments = [] }) => {
  const [focused, setFocused] = useState(false);
  const [inputVal, setInputVal] = useState(value || '');
  const ref = useRef(null);

  // Sincroniza quando o form muda externamente (ex: abrir cliente para editar)
  useEffect(() => { setInputVal(value || ''); }, [value]);

  // Filtra sugestões: segmentos únicos que contêm o que o usuário digitou
  const suggestions = existingSegments.filter(s =>
    s && s.toLowerCase().includes((inputVal || '').toLowerCase()) && s !== inputVal
  );

  // Fechar ao clicar fora
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setFocused(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const select = (seg) => {
    setInputVal(seg);
    onChange(seg);
    setFocused(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={inputVal}
          placeholder="Digite o segmento (ex: Clínica, Concessionária...)"
          onFocus={() => setFocused(true)}
          onChange={e => {
            setInputVal(e.target.value);
            onChange(e.target.value);
          }}
          style={{
            width: '100%',
            paddingRight: inputVal ? '34px' : undefined,
            border: focused ? '1px solid #6366f1' : undefined,
            boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : undefined,
            outline: 'none',
          }}
        />
        {inputVal && (
          <button
            type="button"
            onClick={() => { setInputVal(''); onChange(''); }}
            style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}
          >
            <X size={13} />
          </button>
        )}
      </div>


      {/* Sugestões de segmentos já existentes */}
      {focused && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 10, zIndex: 9999,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}>
          {existingSegments.length === 0 && !inputVal ? (
            <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Nenhum segmento cadastrado ainda. Digite e salve para criar o primeiro!
            </div>
          ) : suggestions.length === 0 && inputVal ? (
            <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 6, padding: '2px 10px', fontSize: '0.8rem' }}>
                {inputVal}
              </span>
              <span>— será salvo como novo segmento ✓</span>
            </div>
          ) : (
            <>
              {inputVal && !existingSegments.includes(inputVal) && (
                <div
                  style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onMouseDown={() => select(inputVal)}
                >
                  <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 6, padding: '2px 10px', fontSize: '0.78rem' }}>novo</span>
                  <span style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{inputVal}</span>
                </div>
              )}
              {suggestions.map(seg => (
                <div
                  key={seg}
                  onMouseDown={() => select(seg)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem',
                    color: value === seg ? '#a5b4fc' : 'var(--text-main)',
                    background: value === seg ? 'rgba(99,102,241,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = value === seg ? 'rgba(99,102,241,0.1)' : 'transparent'}
                >
                  <TrendingUp size={12} style={{ color: 'var(--text-muted)' }} />
                  {seg}
                  {value === seg && <span style={{ marginLeft: 'auto', color: '#6366f1' }}>✓</span>}
                </div>
              ))}
              {/* Mostrar todos quando não está digitando */}
              {!inputVal && existingSegments.filter(s => !suggestions.includes(s)).map(seg => (
                <div
                  key={seg}
                  onMouseDown={() => select(seg)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem',
                    color: value === seg ? '#a5b4fc' : 'var(--text-main)',
                    background: value === seg ? 'rgba(99,102,241,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = value === seg ? 'rgba(99,102,241,0.1)' : 'transparent'}
                >
                  <TrendingUp size={12} style={{ color: 'var(--text-muted)' }} />
                  {seg}
                  {value === seg && <span style={{ marginLeft: 'auto', color: '#6366f1' }}>✓</span>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const AVATAR_COLORS = [
  '#6366f1', '#3b82f6', '#8b5cf6', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'
];

const STATUS_STYLES = {
  Ativo: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  Inativo: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  Configurando: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
  Suspenso: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
};

const EMPTY_FORM = {
  name: '', company: '', email: '', phone: '', document: '',
  cpf: '', cnpj: '',
  segment: '', status: 'Ativo', plan: '', monthly_value: '',
  has_payment_schedule: false, payment_schedule: [{ value: '', duration: '' }],
  start_date: '', end_date: '', address: '', notes: '', auto_renew: false,
  avatar_color: '#6366f1', avatar_url: null,
  contract_url: null, new_password: '', system_password: '', manager: '',
  drive_folder_url: '', whatsapp_notifications: false,
  contacts: [], display_name: '', extra_phones: [], instagram: '',
  addr_cep: '', addr_street: '', addr_number: '', addr_city: '', addr_neighborhood: '',
  responsaveis: []
};

// Iniciais do nome para o avatar
const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

// Formata valor em BRL
const formatCurrency = (val) => {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Máscara de documento (CPF/CNPJ)
const formatDocument = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

const formatCPF = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCNPJ = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Validação real de CPF
const validateCPF = (cpf) => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10), 10)) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11), 10)) return false;
  
  return true;
};

// Validação real de CNPJ
const validateCNPJ = (cnpj) => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;
  
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;
  
  return true;
};

// Máscara de telefone
const formatPhone = (value) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
};

// Retorna o valor mensal atual com base no calendário de pagamento
const getCurrentMonthlyValue = (client) => {
  if (client.metadata?.has_payment_schedule && Array.isArray(client.metadata.payment_schedule) && client.metadata.payment_schedule.length > 0) {
    let monthsPassed = 0;
    if (client.start_date) {
      // Usar a mesma timezone (UTC) da data gravada, ou fallback para T00:00:00
      const startStr = client.start_date.includes('T') ? client.start_date : `${client.start_date}T00:00:00`;
      const start = new Date(startStr);
      const now = new Date();
      monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (now.getDate() < start.getDate()) {
        monthsPassed--;
      }
      monthsPassed = Math.max(0, monthsPassed);
    }

    let currentVal = null;
    let accumulatedMonths = 0;
    for (const schedule of client.metadata.payment_schedule) {
      const duration = parseInt(schedule.duration, 10) || 0;
      const valStr = String(schedule.value).replace(/\./g, '').replace(',', '.');
      const val = parseFloat(valStr) || 0;
      accumulatedMonths += duration;
      currentVal = val;
      if (monthsPassed < accumulatedMonths) {
        break;
      }
    }
    return currentVal !== null ? currentVal : (client.monthly_value || 0);
  }
  return client.monthly_value || 0;
};

// Máscara de moeda: converte dígitos crus em formato BRL (ex: "200000" → "2.000,00")
const formatMoneyInput = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const number = parseInt(digits, 10) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Converte valor numérico do banco para dígitos crus (ex: 2000.50 → "200050")
const toMoneyDigits = (numericValue) => {
  if (!numericValue && numericValue !== 0) return '';
  return String(Math.round(parseFloat(numericValue) * 100));
};

// Máscara de CEP: "12345678" → "12345-678"
const formatCEP = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return digits.slice(0, 5) + '-' + digits.slice(5);
  return digits;
};

// Formatação Visual de Prazo de Contrato
const renderContractInfo = (client) => {
  if (!client.start_date && !client.end_date) return <span style={{ color: 'var(--text-muted)' }}>Sem datas</span>;

  const start = client.start_date ? new Date(client.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
  let endText = null;

  if (client.end_date) {
    const end = new Date(client.end_date);
    const today = new Date();
    // Neutraliza as horas para cálculo puro de dias
    end.setUTCHours(0, 0, 0, 0);
    today.setUTCHours(0, 0, 0, 0);

    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    // Status visual
    let color = diff < 0 ? '#f87171' : (diff <= 15 ? '#fbbf24' : '#34d399');
    let label = diff < 0 ? `Vencido há ${Math.abs(diff)}d` : (diff === 0 ? 'Vence hoje' : `Restam ${diff}d`);

    endText = (
      <span style={{ fontSize: '0.72rem', color: color, fontWeight: 700, background: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: 10, marginTop: 4, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>
        <Clock size={9} style={{ verticalAlign: 'middle', marginRight: 3, marginBottom: 1 }} />
        {label}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{start}</span>
      {endText}
    </div>
  );
};

// Salva os serviços contratados de um cliente
async function saveClientServices(clientId, selectedServices) {
  // Delete existing, then re-insert
  await supabase.from('client_services').delete().eq('client_id', clientId);
  if (selectedServices.length === 0) return;
  const rows = selectedServices.map(s => ({
    client_id: clientId,
    service_id: s.service_id,
    status: s.status || 'active',
    role: s.role || 'Cliente',
    notes: s.notes || null,
  }));
  const { error } = await supabase.from('client_services').insert(rows);
  if (error) throw new Error(error.message);
}

// Busca serviços de um cliente específico
async function fetchClientServices(clientId) {
  const { data } = await supabase
    .from('client_services')
    .select('*, services(name,color,icon)')
    .eq('client_id', clientId);
  return data || [];
}

// Mini badge que mostra quantos serviços um cliente tem
function ClientServicesBadge({ clientId, refreshTrigger }) {
  const [svcs, setSvcs] = useState([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    supabase.from('client_services').select('role, services(name, color)').eq('client_id', clientId)
      .then(({ data }) => setSvcs(data || []));
  }, [clientId, refreshTrigger]);

  if (svcs.length === 0) return <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nenhum</span>;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#a5b4fc',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: '0.7rem',
          fontWeight: 600,
          border: '1px solid rgba(99,102,241,0.2)',
          cursor: 'default',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}
      >
        {svcs.length} SERVIÇO{svcs.length > 1 ? 'S' : ''}
      </div>

      {isHovered && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          minWidth: '160px'
        }}>
          {svcs.map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', fontSize: '0.75rem', fontWeight: 500 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.services?.color || '#ccc', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{s.services?.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{s.role || 'Cliente'}</span>
              </div>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cores do dot de status ────────────────────────────────────────────
const STATUS_DOT_COLORS = {
  'Ativo': '#10b981',
  'Inativo': '#6b7280',
  'Configurando': '#f59e0b',
  'Suspenso': '#ef4444',
  'PAGO': '#10b981',
  'DEVENDO': '#ef4444',
};

const getFinancialBadgeStyle = (status) => {
  switch (status) {
    case 'PAGO':
      return { bg: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'rgba(16,185,129,0.2)' };
    case 'DEVENDO':
      return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)' };
    case 'A VENCER':
      return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'rgba(245,158,11,0.2)' };
    case 'SEM COBRANÇA':
    case 'VERIFICAR':
    default:
      return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'rgba(255,255,255,0.1)' };
  }
};

// ─── Dropdown customizado (substitui <select> nativo) ────────────────────
const CustomSelect = ({ value, onChange, options, placeholder = 'Selecione...', showDots = false, padding = '10px 14px' }) => {

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const dotColor = showDots && value ? STATUS_DOT_COLORS[value] : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8,
          padding: padding,
          background: 'rgba(0,0,0,0.25)',
          border: `1px solid ${open ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, color: value ? 'var(--text-main)' : 'var(--text-muted)',
          cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dotColor && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: dotColor,
              flexShrink: 0, boxShadow: `0 0 6px ${dotColor}`
            }} />
          )}
          {value || placeholder}
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s', flexShrink: 0
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 10, zIndex: 9999,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {/* Opção vazia */}
          <div
            onClick={() => { onChange(''); setOpen(false); }}
            style={{
              padding: '10px 16px', cursor: 'pointer',
              fontSize: '0.8rem', color: 'var(--text-muted)',
              borderBottom: '1px solid rgba(255,255,255,0.06)', fontStyle: 'italic',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Selecione...
          </div>

          {/* Opções */}
          {options.map(opt => {
            const isSelected = value === opt;
            const dc = showDots ? STATUS_DOT_COLORS[opt] : null;
            return (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: isSelected ? '#a5b4fc' : 'var(--text-main)',
                  background: isSelected ? 'rgba(99,102,241,0.18)' : 'transparent',
                  borderLeft: `3px solid ${isSelected ? '#6366f1' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.18)' : 'transparent'; }}
              >
                {dc && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', background: dc,
                    flexShrink: 0, boxShadow: `0 0 6px ${dc}`
                  }} />
                )}
                <span style={{ flex: 1 }}>{opt}</span>
                {isSelected && <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Painel de Responsáveis (múltiplos, com Nome + Setor) ────────────────────
const ResponsaveisPanel = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const items = value || [];
  const addItem = () => onChange([...items, { name: '', setor: '' }]);
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) =>
    onChange(items.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const label = items.length === 0
    ? 'Adicionar responsável...'
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
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 10, zIndex: 9999,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)', padding: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {items.length === 0 && (
              <div style={{
                padding: '14px 12px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: '0.82rem',
                borderRadius: 8, border: '1px dashed rgba(255,255,255,0.08)'
              }}>Nenhum responsável cadastrado</div>
            )}
            {items.map((item, idx) => (
              <div key={idx} style={{
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8, padding: '10px 12px',
                display: 'grid', gridTemplateColumns: '1fr 1fr auto',
                gap: 8, alignItems: 'end'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Nome</div>
                  <input
                    value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="Ex: João Silva"
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
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 2 }}>Setor</div>
                  <input
                    value={item.setor} onChange={e => updateItem(idx, 'setor', e.target.value)}
                    placeholder="Ex: Marketing"
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
            <Plus size={13} /> Adicionar responsável
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Painel de Equipe (colapsável, mesmo padrão de Responsáveis) ──────────────
const EquipePanel = ({ value, onChange }) => {
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
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'rgba(8, 14, 28, 0.98)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 10, zIndex: 9999,
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
                background: 'rgba(99,102,241,0.07)',
                border: '1px solid rgba(99,102,241,0.2)',
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

export default function Clientes({ inConfigMode = false, onExternalEdit, initialEditMode, onCloseEdit }) {
  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient } = useClients();
  const { user, hasService } = useAuth();
  const { services } = useServices();
  const isAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.can_manage_logins || hasService('financeiro');

  // Popula o form se viermos direto para edição (aba externa)
  useEffect(() => {
    if (initialEditMode) {
      // Limpa dados anteriores antes de carregar o novo
      setSelectedServices([]);
      setEditingClient(initialEditMode);
      const docDigits = (initialEditMode.document || '').replace(/\D/g, '');
      const isCpf = docDigits.length <= 11;
      setForm({
        name: initialEditMode.name || '',
        company: initialEditMode.company || '',
        email: initialEditMode.email || '',
        phone: initialEditMode.phone || '',
        document: initialEditMode.document || '',
        cpf: isCpf ? formatCPF(docDigits) : '',
        cnpj: !isCpf ? formatCNPJ(docDigits) : '',
        segment: initialEditMode.segment || '',
        status: initialEditMode.status || 'Ativo',
        plan: initialEditMode.plan || '',
        monthly_value: initialEditMode.monthly_value
          ? formatMoneyInput(toMoneyDigits(initialEditMode.monthly_value))
          : '',
        has_payment_schedule: initialEditMode.metadata?.has_payment_schedule || false,
        payment_schedule: initialEditMode.metadata?.payment_schedule || [{ value: '', duration: '' }],
        start_date: initialEditMode.start_date || '',
        end_date: initialEditMode.end_date || '',
        address: initialEditMode.address || '',
        notes: initialEditMode.notes || '',
        avatar_color: initialEditMode.avatar_color || '#6366f1',
        avatar_url: initialEditMode.avatar_url || null,
        contract_url: initialEditMode.contract_url || null,
        new_password: '',
        system_password: '',
        manager: initialEditMode.metadata?.responsaveis?.[0]?.name || initialEditMode.metadata?.manager || '',
        whatsapp_notifications: initialEditMode.whatsapp_notifications || false,
        contacts: initialEditMode.metadata?.contacts || [],
        extra_phones: initialEditMode.metadata?.extra_phones || [],
        instagram: initialEditMode.metadata?.instagram || '',
        addr_cep: initialEditMode.metadata?.addr_cep || '',
        addr_street: initialEditMode.metadata?.addr_street || '',
        addr_number: initialEditMode.metadata?.addr_number || '',
        addr_city: initialEditMode.metadata?.addr_city || '',
        addr_neighborhood: initialEditMode.metadata?.addr_neighborhood || '',
        responsaveis: initialEditMode.metadata?.responsaveis || []
      });
      // Busca serviços do cliente
      fetchClientServices(initialEditMode.id).then(svcs => {
        setSelectedServices(svcs.map(s => ({
          service_id: s.service_id,
          status: s.status,
          role: s.role || 'Cliente',
          notes: s.notes
        })));
      });
      setModalTab('dados');
    } else {
      // Limpa quando não há cliente em edição externa
      setEditingClient(null);
      setForm(EMPTY_FORM);
      setSelectedServices([]);
    }
  }, [initialEditMode]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [expandStatus, setExpandStatus] = useState(false);
  const [expandReceita, setExpandReceita] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [modalTab, setModalTab] = useState('dados'); // 'dados' | 'acesso' | 'servicos'
  const [showSavedPassword, setShowSavedPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loadingAsaas, setLoadingAsaas] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [reactivatingSuspended, setReactivatingSuspended] = useState(null);
  const [showIgnoredPanel, setShowIgnoredPanel] = useState(false); // painel de ignorados no sync
  const [syncPage, setSyncPage] = useState(1); // página atual da tabela de sync
  const syncItemsPerPage = 20;
  const [subTab, setSubTab] = useState('agencia'); // 'agencia' | 'asaas'
  const [refreshBadges, setRefreshBadges] = useState(0); // Trigger for ClientServicesBadge
  const [checkingReceita, setCheckingReceita] = useState(null);
  const isSyncingRef = useRef(false);
  const [bulkActivating, setBulkActivating] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedLinkClient, setSelectedLinkClient] = useState(null);
  const [linkServices, setLinkServices] = useState([]);
  const [syncResults, setSyncResults] = useState(null);
  const [savingSync, setSavingSync] = useState(false);
  const [syncingAllReceita, setSyncingAllReceita] = useState(false);
  const [selectedSyncClients, setSelectedSyncClients] = useState([]); // índices dos clientes selecionados na aba sync
  const [syncSearch, setSyncSearch] = useState(''); // busca na aba sync
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async (clientId) => {
    if (!clientId) return;
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('workflow_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar logs:', err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setCurrentPage(1);
    setSyncPage(1); // reset sync page on search/filter change
    setShowIgnoredPanel(false);
  }, [search, filterStatus, subTab, syncSearch]);


  // Fecha com a tecla ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    if (modalOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Link copiado para a área de transferência!');
    });
  };

  const handleExportExcel = () => {
    // Filtra conforme a aba ativa
    let dataSource = clients;
    let sheetName = 'Clientes';
    let filename  = 'Cadastro_Clientes.xlsx';

    if (subTab === 'agencia') {
      dataSource = clients.filter(c => c.metadata?.show_in_agency === true);
      sheetName  = 'Clientes da Agência';
      filename   = 'Clientes_Agencia.xlsx';
    } else if (subTab === 'asaas') {
      dataSource = clients.filter(c => c.metadata?.show_in_agency !== true);
      sheetName  = 'Base Geral Asaas';
      filename   = 'Base_Geral_Asaas.xlsx';
    }

    const dataToExport = dataSource.map(c => ({
      'Nome (Card)':    c.metadata?.display_name || c.name || '',
      'Razão Social':   c.name || '',
      Empresa:          c.company || '',
      Email:            c.email || '',
      Telefone:         c.phone || '',
      Documento:        c.document || '',
      Segmento:         c.segment || '',
      Status:           c.status || '',
      Plano:            c.plan || '',
      'Valor Mensal':   getCurrentMonthlyValue(c) || '',
      'Início':         c.start_date || '',
      'Fim':            c.end_date || '',
      Endereço:         c.address || '',
      Notas:            c.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
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
          if (!row.Nome) continue;
          await createClient({
            name: row.Nome,
            company: row.Empresa || '',
            email: row.Email || '',
            phone: row.Telefone || '',
            document: String(row.Documento || ''),
            segment: row.Segmento || '',
            status: row.Status || 'Ativo',
            plan: row.Plano || '',
            monthly_value: parseFloat(row['Valor Mensal']) || null,
            start_date: row['Início'] || null,
            end_date: row['Fim'] || null,
            address: row.Endereço || '',
            notes: row.Notas || ''
          });
          count++;
        }
        showToast(`Importação concluída: ${count} clientes cadastrados!`);
      } catch (err) {
        showToast("Erro ao importar planilha: " + err.message, "error");
      }
      e.target.value = null; // reseta o input
    };
    reader.readAsBinaryString(file);
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setSelectedServices([]);
    setModalTab('dados');
    setModalOpen(true);
  };

  const openEdit = async (client) => {
    console.log('openEdit called for client:', client);
    if (onExternalEdit) {
      onExternalEdit(client);
      return;
    }
    // Limpa dados de seleções anteriores antes de abrir o novo
    setSelectedServices([]);
    setModalOpen(true); // Abre o modal imediatamente para feedback visual

    try {
      setEditingClient(client);
      const docDigits = (client.document || '').replace(/\D/g, '');
      const isCpf = docDigits.length <= 11;
      setForm({
        name: client.name || '',
        company: client.company || '',
        email: client.email || '',
        phone: client.phone || '',
        document: client.document || '',
        cpf: isCpf ? formatCPF(docDigits) : '',
        cnpj: !isCpf ? formatCNPJ(docDigits) : '',
        segment: client.segment || '',
        status: client.status || 'Ativo',
        plan: client.plan || '',
        monthly_value: client.monthly_value
          ? formatMoneyInput(toMoneyDigits(client.monthly_value))
          : '',
        has_payment_schedule: client.metadata?.has_payment_schedule || false,
        payment_schedule: client.metadata?.payment_schedule || [{ value: '', duration: '' }],
        start_date: client.start_date || '',
        end_date: client.end_date || '',
        auto_renew: client.metadata?.auto_renew || false,
        address: client.address || '',
        notes: client.notes || '',
        avatar_color: client.avatar_color || '#6366f1',
        avatar_url: client.avatar_url || null,
        contract_url: client.contract_url || null,
        new_password: '',
        system_password: '',
        manager: client.metadata?.responsaveis?.[0]?.name || client.metadata?.manager || '',
        drive_folder_url: client.metadata?.drive_folder_url || '',
        whatsapp_notifications: client.whatsapp_notifications || false,
        contacts: client.metadata?.contacts || [],
        extra_phones: client.metadata?.extra_phones || [],
        instagram: client.metadata?.instagram || '',
        display_name: client.metadata?.display_name || '',
        addr_cep: client.metadata?.addr_cep || '',
        addr_street: client.metadata?.addr_street || '',
        addr_number: client.metadata?.addr_number || '',
        addr_city: client.metadata?.addr_city || '',
        addr_neighborhood: client.metadata?.addr_neighborhood || '',
        responsaveis: client.metadata?.responsaveis || []
      });
      // Busca serviços contratados
      console.log('fetching services for', client.id);
      const svcs = await fetchClientServices(client.id);
      console.log('services fetched:', svcs);
      setSelectedServices(svcs.map(s => ({
        service_id: s.service_id,
        status: s.status,
        role: s.role || 'Cliente',
        notes: s.notes
      })));
      setModalTab('dados');
      if (isAdmin) {
        fetchLogs(client.id);
      }
    } catch (err) {
      console.error('Error in openEdit:', err);
      alert('Erro ao abrir edição: ' + err.message);
      setModalOpen(false); // Fecha se der erro crítico
    }
  };

  const closeModal = () => {
    if (onCloseEdit) {
      onCloseEdit();
      return;
    }
    setModalOpen(false);
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setSelectedServices([]);
    setModalTab('dados');
  };

  // Toggle serviço na lista de selecionados
  const toggleService = (serviceId) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.service_id === serviceId);
      if (exists) return prev.filter(s => s.service_id !== serviceId);
      return [...prev, { service_id: serviceId, status: 'active', role: 'Cliente', notes: '' }];
    });
  };

  const updateServiceStatus = (serviceId, status) => {
    setSelectedServices(prev =>
      prev.map(s => s.service_id === serviceId ? { ...s, status } : s)
    );
  };

  // Busca CEP via ViaCEP e preenche campos automaticamente
  const fetchCEP = async (cep) => {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(f => ({
          ...f,
          addr_street: data.logradouro || f.addr_street,
          addr_neighborhood: data.bairro || f.addr_neighborhood,
          addr_city: data.localidade || f.addr_city,
        }));
      }
    } catch (e) { }
  };

  const handlePlanChange = (v) => {
    setForm(f => ({ ...f, plan: v }));

    if (v === 'Personalizado' || !v) return;

    let keywords = [];
    if (v === 'ROI Tráfego') keywords = ['tráfego', 'vídeo', 'video', 'captação', 'captacao', 'design', 'sucesso', 'tarefas', 'conectividade', 'financeiro'];
    else if (v === 'ROI Conteúdo') keywords = ['mídia', 'midia', 'vídeo', 'video', 'captação', 'captacao', 'design', 'sucesso', 'tarefas', 'conectividade', 'financeiro'];
    else if (v === 'ROI CRM') keywords = ['crm', 'sucesso', 'tarefas', 'conectividade', 'financeiro'];
    else if (v === 'ROI Plus') keywords = ['tráfego', 'mídia', 'midia', 'vídeo', 'video', 'captação', 'captacao', 'design', 'sucesso', 'tarefas', 'conectividade', 'financeiro'];

    let planServices = [];
    if (v === 'ROI Expert') {
      planServices = services;
    } else {
      planServices = services.filter(svc => {
        const name = (svc.name || '').toLowerCase();
        return keywords.some(k => name.includes(k));
      });
    }

    const newSelectedServices = planServices.map(svc => ({
      service_id: svc.id,
      status: 'active',
      role: 'Cliente',
      notes: ''
    }));

    setSelectedServices(newSelectedServices);
    showToast(`Serviços do plano ${v} selecionados automaticamente.`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Por favor, preencha o Nome da Empresa.', 'error');
      return;
    }

    // Validação real de CPF/CNPJ
    const cleanCPF = form.cpf ? form.cpf.replace(/\D/g, '') : '';
    const cleanCNPJ = form.cnpj ? form.cnpj.replace(/\D/g, '') : '';

    if (cleanCPF && cleanCNPJ) {
      showToast('Por favor, preencha apenas o CPF ou apenas o CNPJ, não ambos.', 'error');
      return;
    }

    let consolidatedDocument = '';

    if (cleanCPF) {
      if (!validateCPF(form.cpf)) {
        showToast('CPF inválido. Verifique os números.', 'error');
        return;
      }
      consolidatedDocument = cleanCPF;
    } else if (cleanCNPJ) {
      if (!validateCNPJ(form.cnpj)) {
        showToast('CNPJ inválido. Verifique os números.', 'error');
        return;
      }
      consolidatedDocument = cleanCNPJ;
    }

    setSaving(true);
    let createdClient = null;
    try {
      const { has_payment_schedule, payment_schedule, extra_phones, instagram, system_password, auto_renew, ...restForm } = form;
      const addrParts = [form.addr_street, form.addr_number, form.addr_neighborhood, form.addr_city, form.addr_cep].filter(Boolean);
      const payload = {
        ...restForm,
        document: consolidatedDocument,
        address: addrParts.length ? addrParts.join(', ') : form.address,
        metadata: {
          ...(editingClient?.metadata || {}),
          manager: form.responsaveis?.[0]?.name || form.manager || '',
          drive_folder_url: form.drive_folder_url,
          contacts: form.contacts,
          extra_phones: form.extra_phones?.filter(p => p.trim()) || [],
          instagram: form.instagram,
          display_name: form.display_name,
          responsaveis: form.responsaveis,
          addr_cep: form.addr_cep,
          addr_street: form.addr_street,
          addr_number: form.addr_number,
          addr_city: form.addr_city,
          addr_neighborhood: form.addr_neighborhood,
          // PROTEÇÃO: qualquer cliente editado manualmente pelo admin é marcado como
          // show_in_agency=true, garantindo que a deduplicação sempre o preserve como master.
          show_in_agency: true,
          manually_edited_at: new Date().toISOString(), // timestamp de edição manual
          has_payment_schedule: form.has_payment_schedule,
          payment_schedule: form.has_payment_schedule ? form.payment_schedule : [],
          auto_renew: form.auto_renew
        },
        monthly_value: form.monthly_value
          ? parseFloat(String(form.monthly_value).replace(/\./g, '').replace(',', '.'))
          : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      delete payload.manager;
      delete payload.new_password;
      delete payload.system_password;
      delete payload.drive_folder_url;
      delete payload.contacts;
      delete payload.display_name;
      delete payload.addr_cep;
      delete payload.addr_street;
      delete payload.addr_number;
      delete payload.addr_city;
      delete payload.addr_neighborhood;
      delete payload.responsaveis;
      delete payload.cpf;
      delete payload.cnpj;

      let clientId;
      if (editingClient) {
        await updateClient(editingClient.id, payload);
        clientId = editingClient.id;
        showToast('Alteração salva com sucesso!');
      } else {
        const existingMatch = clients.find(c => isSameClient(payload, c));

        if (existingMatch && existingMatch.metadata?.asaas_id) {
          const wantsToLink = window.confirm(`Já existe um registro importado do Asaas parecido (${existingMatch.name}).\n\nDeseja mesclar essas informações ao registro existente em vez de criar um duplicado?`);

          if (wantsToLink) {
            payload.metadata.asaas_id = existingMatch.metadata.asaas_id;
            payload.metadata.show_in_agency = true;
            payload.status = payload.status !== 'Indefinido' ? payload.status : 'Ativo';

            await updateClient(existingMatch.id, payload);
            clientId = existingMatch.id;
            showToast('Cliente vinculado e atualizado com sucesso!');
          } else {
            const newClient = await createClient(payload);
            createdClient = newClient;
            clientId = newClient.id;
            showToast('Cliente cadastrado com sucesso!');
          }
        } else if (existingMatch && !existingMatch.metadata?.asaas_id) {
          const wantsToLink = window.confirm(`Já existe um cliente na base com nome ou documento parecido (${existingMatch.name}).\n\nDeseja atualizar o registro existente em vez de criar um novo?`);

          if (wantsToLink) {
            await updateClient(existingMatch.id, payload);
            clientId = existingMatch.id;
            showToast('Alteração salva com sucesso!');
          } else {
            const newClient = await createClient(payload);
            createdClient = newClient;
            clientId = newClient.id;
            showToast('Cliente cadastrado com sucesso!');
          }
        } else {
          const newClient = await createClient(payload);
          createdClient = newClient;
          clientId = newClient.id;
          showToast('Cliente cadastrado com sucesso!');
        }
      }

      if (form.new_password) {
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-manage-user', {
          body: {
            email: form.email,
            password: form.new_password,
            entityType: 'client',
            entityId: clientId,
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

      // Salva serviços contratados
      await saveClientServices(clientId, selectedServices);

      // Força a atualização visual das badges na tabela
      setRefreshBadges(prev => prev + 1);

      // Nunca fecha o modal automaticamente ao salvar (mesmo no Enter).
      // Se era um novo cliente, transformamos a tela atual em modo de edição
      // para que a pessoa possa continuar alterando sem duplicar o cadastro.
      if (!editingClient && !initialEditMode) {
        setEditingClient({ ...payload, id: clientId });
      }
    } catch (err) {
      if (createdClient) {
        try {
          await deleteClient(createdClient.id);
        } catch (rollbackErr) {
          console.error("Erro ao fazer rollback de cadastro:", rollbackErr);
        }
      }
      alert("Houve um erro ao salvar o cliente: " + err.message);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteClient(id);
      showToast('Cliente removido.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  // Filtragem
  const filtered = clients.filter(c => {
    if (c.metadata?.is_employee_shadow === true) return false;

    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());

    let matchStatus = filterStatus === 'Todos';
    if (['PAGO', 'DEVENDO', 'A VENCER', 'SEM COBRANÇA'].includes(filterStatus)) {
      matchStatus = c.metadata?.financial_status === filterStatus;
    } else if (filterStatus !== 'Todos') {
      matchStatus = c.status === filterStatus;
    }

    // Filtro por abas
    const isAgencyClient = c.metadata?.show_in_agency === true;
    const matchTab = subTab === 'agencia' ? isAgencyClient : true;

    return matchSearch && matchStatus && matchTab;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedClients = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const syncAllReceitas = async () => {
    if (!window.confirm(`Isso irá verificar a Receita de TODOS os ${filtered.length} clientes mostrados na tela. Deseja continuar?`)) return;
    setSyncingAllReceita(true);
    let updated = 0;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      for (const client of filtered) {
        try {
          const { data, error } = await supabase.functions.invoke('asaas-proxy', {
            body: { action: 'check-financial-status', payload: { clientId: client.id } },
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (data?.success) updated++;
        } catch (err) {
          console.warn('Erro ao checar receita do cliente', client.id, err);
        }
      }
      showToast(`Verificação concluída! ${updated} clientes verificados com sucesso.`);
      fetchClients(true);
    } finally {
      setSyncingAllReceita(false);
    }
  };

  // KPIs
  const actualClients = clients.filter(c => c.metadata?.is_employee_shadow !== true);
  const totalAtivos = actualClients.filter(c => c.status === 'Ativo').length;
  const totalCetados = actualClients.filter(c => c.status === 'Ativo' && c.metadata?.show_in_agency === true).length;
  const mrr = actualClients
    .filter(c => c.status === 'Ativo')
    .reduce((sum, c) => sum + parseFloat(getCurrentMonthlyValue(c) || 0), 0);

  const deduplicateClients = async (silent = false) => {
    try {
      if (!silent) showToast('Analisando duplicados via servidor...', 'info');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'deduplicate-clients' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (data.data.deletedCount > 0) {
        if (!silent) showToast(`Removidos ${data.data.deletedCount} duplicados em ${data.data.mergedGroupsCount} grupos!`, 'success');
        fetchClients(true);
      } else {
        if (!silent) showToast('Nenhum cliente duplicado encontrado.', 'info');
      }
    } catch (err) {
      console.error('Erro na remoção de duplicados:', err);
      if (!silent) showToast('Erro ao remover duplicados: ' + err.message, 'error');
    }
  };

  const clearAsaasClients = async () => {
    if (!window.confirm("ATENÇÃO: Isso excluirá permanentemente todos os clientes importados do Asaas e seus dados vinculados (tarefas, reuniões, mensagens, etc.). Tem certeza que deseja continuar?")) {
      return;
    }

    try {
      showToast('Limpando base do Asaas via servidor...', 'info');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'clear-asaas-database' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      showToast(`Base do Asaas limpa com sucesso! ${data.data.deletedCount} clientes removidos.`, 'success');
      fetchClients(true);
    } catch (err) {
      console.error('Erro ao zerar base do Asaas:', err);
      showToast('Erro ao zerar base: ' + err.message, 'error');
    }
  };

  const handleCheckReceita = async (client) => {
    setCheckingReceita(client.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'check-financial-status', payload: { clientId: client.id } },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro desconhecido');

      const renewMsg = data.data?.autoRenewed ? ' | Contrato renovado automaticamente!' : '';
      showToast(`Status atualizado para: ${data.data?.financialStatus || 'PAGO'}${renewMsg}`, 'success');
      // Atualiza os clientes
      fetchClients(true);

      // Atualiza o modal caso esteja aberto no mesmo cliente
      if (editingClient && editingClient.id === client.id) {
        setEditingClient(prev => ({
          ...prev,
          ...(data.data?.autoRenewed && data.data?.newEndDate ? { end_date: data.data.newEndDate } : {}),
          metadata: {
            ...prev.metadata,
            financial_status: data.data?.financialStatus,
            financial_details: data.data?.financialDetails
          }
        }));
        // Atualiza o form também se houve renovação
        if (data.data?.autoRenewed && data.data?.newEndDate) {
          setForm(f => ({ ...f, end_date: data.data.newEndDate }));
        }
      }
    } catch (err) {
      console.error('Erro ao verificar receita:', err);
      showToast('Erro ao verificar receita: ' + err.message, 'error');
    } finally {
      setCheckingReceita(null);
    }
  };

  const importAsaasCustomers = async (isAuto = false) => {
    // Evita concorrência
    if (isSyncingRef.current) {
      console.log('Sync já em andamento, ignorando chamada concorrente.');
      return;
    }

    try {
      isSyncingRef.current = true;
      if (!isAuto) {
        setLoadingAsaas(true);
        showToast('Baixando clientes do Asaas...', 'info');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'sync-customers' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (data.data && data.data.errors) {
        throw new Error('Erro do Asaas: ' + data.data.errors[0].description);
      }

      const customers = data.data.data;
      if (!customers || customers.length === 0) {
        if (!isAuto) showToast('Nenhum cliente encontrado no Asaas.', 'warning');
        return;
      }

      // Busca lista fresca e atualizada direto do banco
      const { data: freshClients, error: fetchErr } = await supabase
        .from('clients')
        .select('*');
      if (fetchErr) throw fetchErr;

      let localClients = [...(freshClients || [])];
      let newCount = 0;
      let updatedCount = 0;

      for (const cus of customers) {
        // Normaliza para correspondência exata e sem case sensitivity
        let match = localClients.find(c => c.metadata?.asaas_id === cus.id);
        if (!match && cus.email) {
          match = localClients.find(c => c.email?.toLowerCase().trim() === cus.email.toLowerCase().trim());
        }
        if (!match && cus.cpfCnpj) {
          match = localClients.find(c => c.document?.trim() === cus.cpfCnpj.trim());
        }

        const payload = {
          name: cus.name,
          company: cus.company || '',
          email: cus.email || '',
          phone: cus.mobilePhone || cus.phone || '',
          document: cus.cpfCnpj || '',
          address: `${cus.address || ''}, ${cus.addressNumber || ''} ${cus.complement ? `(${cus.complement})` : ''} - ${cus.province || ''}, ${cus.cityName || cus.city || ''} - ${cus.state || ''} CEP: ${cus.postalCode || ''}`.replace(/^(, )|(- , )|( - , )/g, '').trim(),
          notes: cus.observations || '',
          status: 'Ativo',
          metadata: { asaas_id: cus.id },
        };

        if (match) {
          // PROTEÇÃO: cliente já existe localmente → NUNCA sobrescrever campos editados
          // manualmente (name, company, email, phone, document, address, notes, status).
          // Salva os dados originais do Asaas em metadata para referência sem apagar nada.
          const metadataOnlyUpdate = {
            metadata: {
              ...match.metadata,
              asaas_id: cus.id,           // vínculo Asaas
              asaas_name: cus.name,       // nome original Asaas (só para referência)
              asaas_company: cus.company, // company original Asaas (só para referência)
            }
          };
          const updated = await updateClient(match.id, metadataOnlyUpdate);
          // Atualiza a lista local com o registro modificado
          localClients = localClients.map(c => c.id === match.id ? updated : c);
          updatedCount++;
        } else {
          payload.avatar_color = '#6366f1';
          payload.metadata = { ...payload.metadata, show_in_agency: false };
          const created = await createClient(payload);
          // Adiciona à lista local para evitar duplicar na mesma rodada
          localClients.push(created);
          newCount++;
        }
      }

      // Roda a rotina de deduplicação silenciosa para garantir a consistência
      await deduplicateClients(true);

      if (!isAuto) showToast(`Integração Asaas Concluída! ${newCount} importados, ${updatedCount} atualizados.`);
      fetchClients(true);
    } catch (err) {
      if (!isAuto) showToast('Erro Asaas: ' + err.message, 'error');
      else console.error('Erro no Auto Sync Asaas:', err.message);
    } finally {
      isSyncingRef.current = false;
      if (!isAuto) setLoadingAsaas(false);
    }
  };

  const smartSyncAsaasCustomers = async () => {
    if (isSyncingRef.current) {
      showToast('Sincronização já em andamento.', 'warning');
      return;
    }

    try {
      isSyncingRef.current = true;
      showToast('Iniciando varredura inteligente do Asaas...', 'info');

      // 1. Aquisição (Topo do Funil): Puxar todos os clientes do Asaas
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const { data, error } = await supabase.functions.invoke('asaas-proxy', {
        body: { action: 'sync-customers' },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (data.data && data.data.errors) {
        throw new Error('Erro do Asaas: ' + data.data.errors[0].description);
      }

      const asaasCustomers = data.data.data;
      if (!asaasCustomers || asaasCustomers.length === 0) {
        showToast('Nenhum cliente encontrado na Base Geral do Asaas.', 'warning');
        return;
      }

      // 2. Base de Dados Total (Nossa Base Completa)
      const { data: localClients, error: fetchErr } = await supabase
        .from('clients')
        .select('*');

      if (fetchErr) throw fetchErr;

      let existingCount = 0;

      // 3. Cruzamento e Peneira
      const results = [];
      const ignoredClients = []; // clientes encontrados no Asaas mas já existem localmente

      for (const cus of asaasCustomers) {
        // Verifica se ESSE cliente do Asaas já existe na base local
        let matchReason = null;
        const match = localClients.find(c => {
          // Match por asaas_id
          if (c.metadata?.asaas_id === cus.id) {
            matchReason = `ID Asaas (${cus.id})`;
            return true;
          }
          // Match por documento
          const docA = (cus.cpfCnpj || '').replace(/\D/g, '');
          const docB = (c.document || '').replace(/\D/g, '');
          if (docA && docB && docA === docB) {
            matchReason = `Documento ${cus.cpfCnpj}`;
            return true;
          }
          // Match por email
          const emailA = (cus.email || '').toLowerCase().trim();
          const emailB = (c.email || '').toLowerCase().trim();
          if (emailA && emailB && emailA === emailB) {
            matchReason = `E-mail ${cus.email}`;
            return true;
          }
          // Match por nome (isSameClient)
          if (isSameClient({ ...cus, document: cus.cpfCnpj }, c)) {
            matchReason = `Nome similar: "${c.name}"`;
            return true;
          }
          return false;
        });

        if (match) {
          existingCount++;
          ignoredClients.push({
            asaasName: cus.name,
            asaasEmail: cus.email || '',
            asaasDoc: cus.cpfCnpj || '',
            matchReason,
            localName: match.name,
            localStatus: match.status,
          });
          continue;
        }

        // Novo cliente — adicionar à lista de importação
        const payload = {
          name: cus.name,
          company: cus.company || '',
          email: cus.email || '',
          phone: cus.mobilePhone || cus.phone || '',
          document: cus.cpfCnpj || '',
          address: `${cus.address || ''}, ${cus.addressNumber || ''} ${cus.complement ? `(${cus.complement})` : ''} - ${cus.province || ''}, ${cus.cityName || cus.city || ''} - ${cus.state || ''} CEP: ${cus.postalCode || ''}`.replace(/^(, )|(- , )|( - , )/g, '').trim(),
          notes: cus.observations || '',
          status: 'Configurando',
          avatar_color: '#6366f1',
          metadata: { asaas_id: cus.id, show_in_agency: null },
        };

        results.push(payload);
      }

      setSyncResults({
        newClients: results,
        existingCount,
        ignoredClients,
      });


      showToast(`Varredura concluída! ${results.length} clientes novos encontrados. (${existingCount} já existiam)`, 'success');

    } catch (err) {
      showToast('Erro na Sincronização Inteligente: ' + err.message, 'error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  const confirmSmartSync = async () => {
    if (!syncResults || syncResults.newClients.length === 0) return;

    // Salva apenas os clientes selecionados (ou todos se nenhum selecionado explicitamente)
    const toSave = selectedSyncClients.length > 0
      ? syncResults.newClients.filter((_, idx) => selectedSyncClients.includes(idx))
      : syncResults.newClients;

    if (toSave.length === 0) {
      showToast('Selecione ao menos um cliente para salvar.', 'error');
      return;
    }

    setSavingSync(true);
    try {
      let count = 0;
      for (const client of toSave) {
        await createClient(client);
        count++;
      }
      showToast(`${count} clientes salvos com sucesso na Agência!`, 'success');
      setSyncResults(null);
      setSelectedSyncClients([]);
      setSyncSearch('');
      fetchClients(true);
      setSubTab('agencia');
    } catch (err) {
      showToast('Erro ao salvar os novos clientes: ' + err.message, 'error');
    } finally {
      setSavingSync(false);
    }
  };


  // Sincronização automática a cada 30 segundos removida conforme solicitado

  useEffect(() => {
    if (isAdmin) {
      // Executa a deduplicação silenciosamente ao carregar a página
      deduplicateClients(true);
    }
  }, [isAdmin]);

  const toggleSelectClient = (id) => {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === filtered.length && filtered.length > 0) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filtered.map(c => c.id));
    }
  };

  const setClientStatus = async (client, newStatus) => {
    try {
      const isAgencyStatus = newStatus === 'Ativo';
      await updateClient(client.id, {
        status: newStatus,
        metadata: { ...client.metadata, show_in_agency: isAgencyStatus }
      });
      showToast(`Status atualizado para ${newStatus}!`);
      fetchClients(true);
    } catch (err) {
      showToast('Erro ao atualizar status: ' + err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedClients.length} cliente(s) selecionado(s)?`)) return;
    setBulkDeleting(true);
    try {
      for (const id of selectedClients) {
        await deleteClient(id);
      }
      showToast(`${selectedClients.length} cliente(s) removido(s) com sucesso.`);
      setSelectedClients([]);
    } catch (err) {
      showToast('Erro na exclusão em massa: ' + err.message, 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedClients.length === 0) return;
    if (!window.confirm(`Deseja ativar ${selectedClients.length} cliente(s) selecionado(s) na Agência?`)) return;
    setBulkActivating(true);
    try {
      for (const id of selectedClients) {
        const client = clients.find(c => c.id === id);
        if (client) {
          await updateClient(id, {
            metadata: { ...client.metadata, show_in_agency: true }
          });
        }
      }
      showToast(`${selectedClients.length} cliente(s) ativado(s) na Agência com sucesso!`);
      setSelectedClients([]);
      fetchClients(true);
    } catch (err) {
      showToast('Erro ao ativar em lote: ' + err.message, 'error');
    } finally {
      setBulkActivating(false);
    }
  };

  return (
    <div className="clientes-page">

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog glass-panel" onClick={e => e.stopPropagation()}>
            <AlertCircle size={36} color="#f87171" />
            <h3>Remover Cliente?</h3>
            <p>Esta ação é irreversível. O cliente <strong>{confirmDelete.name}</strong> será permanentemente excluído.</p>
            <div className="confirm-actions">
              <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deleting === confirmDelete.id}
              >
                {deleting === confirmDelete.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                Sim, remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Clientes Suspensos ─────────────────────────────── */}
      {showSuspendedModal && (
        <div className="modal-overlay" onClick={() => setShowSuspendedModal(false)}>
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(560px, 95vw)',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            }}
          >
            {/* Cabeçalho */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertCircle size={20} color="#f87171" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Clientes Suspensos</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    {actualClients.filter(c => c.status === 'Suspenso').length} cliente(s) suspenso(s) — clique em Reativar para restaurar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuspendedModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                onMouseOver={e => e.currentTarget.style.color = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.color = '#64748b'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de suspensos */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actualClients.filter(c => c.status === 'Suspenso').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <CheckCircle size={32} color="#34d399" style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#34d399', fontWeight: 600 }}>Nenhum cliente suspenso!</p>
                </div>
              ) : (
                actualClients
                  .filter(c => c.status === 'Suspenso')
                  .map(client => (
                    <div
                      key={client.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 14px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: 10,
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Avatar */}
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                          background: client.avatar_color || '#ef4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: '0.9rem'
                        }}>
                          {(client.metadata?.display_name || client.name || 'C').charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.metadata?.display_name || client.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {client.metadata?.display_name ? client.name : (client.email || 'Sem empresa')}
                        </p>
                      </div>

                      {/* Plano */}
                      {client.plan && (
                        <span style={{
                          fontSize: '0.7rem', color: '#a5b4fc',
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 6, padding: '2px 8px', flexShrink: 0
                        }}>
                          {client.plan}
                        </span>
                      )}

                      {/* Botão Reativar */}
                      <button
                        onClick={async () => {
                          setReactivatingSuspended(client.id);
                          try {
                            await updateClient(client.id, {
                              status: 'Ativo',
                              metadata: { ...client.metadata, show_in_agency: true }
                            });
                            showToast(`${client.name} reativado com sucesso! ✅`);
                            fetchClients(true);
                          } catch (err) {
                            showToast('Erro ao reativar: ' + err.message, 'error');
                          } finally {
                            setReactivatingSuspended(null);
                          }
                        }}
                        disabled={reactivatingSuspended === client.id}
                        style={{
                          padding: '7px 14px',
                          background: 'rgba(16,185,129,0.12)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 8, color: '#34d399',
                          cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 5,
                          flexShrink: 0, transition: 'all 0.2s',
                          opacity: reactivatingSuspended === client.id ? 0.6 : 1
                        }}
                        onMouseOver={e => { if (reactivatingSuspended !== client.id) e.currentTarget.style.background = 'rgba(16,185,129,0.22)'; }}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.12)'}
                        title="Reativar este cliente"
                      >
                        {reactivatingSuspended === client.id
                          ? <><Loader2 size={13} className="spin" /> Ativando...</>
                          : <><CheckCircle size={13} /> Reativar</>
                        }
                      </button>

                      {/* Botão Editar */}
                      <button
                        onClick={() => { setShowSuspendedModal(false); openEdit(client); }}
                        style={{
                          padding: '7px 10px',
                          background: 'rgba(99,102,241,0.1)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 8, color: '#a5b4fc',
                          cursor: 'pointer', fontSize: '0.78rem',
                          display: 'flex', alignItems: 'center', gap: 4,
                          flexShrink: 0, transition: 'all 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                        title="Editar cliente"
                      >
                        <Edit3 size={13} /> Editar
                      </button>
                    </div>
                  ))
              )}
            </div>

            {/* Rodapé */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                💡 Reativar irá mudar o status para <strong style={{ color: '#34d399' }}>Ativo</strong> e tornar visível na Agência.
              </span>
              <button
                onClick={() => setShowSuspendedModal(false)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {!initialEditMode && (
        <>
          {/* Header KPIs */}
          <header className="page-header">
            <div>
              <h1><Users size={26} style={{ verticalAlign: 'middle', marginRight: 10 }} />Clientes</h1>
              <p>Gerencie toda a carteira de clientes da agência.</p>
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedClients.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {subTab === 'asaas' && (
                      <button className="btn-primary" onClick={handleBulkActivate} disabled={bulkActivating} title="Ativar selecionados na Agência" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {bulkActivating ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />} Ativar ({selectedClients.length})
                      </button>
                    )}
                    <button className="btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting} title="Excluir selecionados" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {bulkDeleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />} Excluir ({selectedClients.length})
                    </button>
                  </div>
                )}
                <input type="file" id="excel-import" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportExcel} />
                <button className="btn-ghost" onClick={() => document.getElementById('excel-import').click()} title="Importar Excel via Planilha Tabulada">
                  Upload Excel
                </button>
                <button className="btn-ghost" onClick={handleExportExcel} title="Exportar tabela completa">
                  Exportar
                </button>
                {(subTab === 'agencia' || subTab === 'asaas') && (
                  <button
                    className="btn-primary"
                    onClick={syncAllReceitas}
                    disabled={syncingAllReceita}
                    title="Sincronizar Receita (Verificar Pagamentos) de todos exibidos"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                  >
                    {syncingAllReceita ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                    Atualizar Receitas
                  </button>
                )}
                {subTab === 'asaas' && (
                  <>
                    <button className="btn-danger" onClick={clearAsaasClients} title="Apagar todos os clientes importados do Asaas e seus dados vinculados" style={{ marginRight: '8px' }}>
                      Zerar Base Asaas
                    </button>
                    <button className="btn-ghost" onClick={() => deduplicateClients(false)} title="Mesclar e remover clientes duplicados">
                      Limpar Duplicados
                    </button>
                  </>
                )}
                {subTab === 'agencia' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" onClick={() => setLinkModalOpen(true)} title="Vincular cliente existente do Asaas na Agência" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PackageCheck size={16} /> Vincular do Asaas
                    </button>
                    <button className="btn-primary" onClick={openCreate} id="new-client-btn">
                      <Plus size={18} /> Novo Cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Abas */}
          <div className="admin-tabs" style={{ marginBottom: 16 }}>
            <button
              className={`admin-tab ${subTab === 'agencia' ? 'active' : ''}`}
              onClick={() => { setSubTab('agencia'); setSelectedClients([]); }}
            >
              Clientes da Agência
            </button>
            <button
              className={`admin-tab ${subTab === 'asaas' ? 'active' : ''}`}
              onClick={() => { setSubTab('asaas'); setSelectedClients([]); }}
            >
              Base Geral Asaas
            </button>
            <button
              className={`admin-tab ${subTab === 'sync' ? 'active' : ''}`}
              onClick={() => { setSubTab('sync'); setSelectedClients([]); }}
            >
              Sincronizador Asaas
            </button>
          </div>

          {/* KPIs */}
          <div className="kpi-row">
            <div className="kpi-card glass-card">
              <span className="kpi-label">Clientes Ativos</span>
              <strong className="kpi-value" style={{ color: '#34d399' }}>{totalCetados}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">Total de Clientes</span>
              <strong className="kpi-value">{totalAtivos}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">MRR (Receita Mensal)</span>
              <strong className="kpi-value" style={{ color: '#6366f1' }}>{formatCurrency(mrr)}</strong>
            </div>
            <div className="kpi-card glass-card">
              <span className="kpi-label">Configurando</span>
              <strong className="kpi-value" style={{ color: '#fcd34d' }}>
                {clients.filter(c => c.status === 'Configurando').length}
              </strong>
            </div>
            {/* KPI Clientes Suspensos — clicável, abre modal */}
            {(() => {
              const suspendedCount = actualClients.filter(c => c.status === 'Suspenso').length;
              return (
                <div
                  className="kpi-card glass-card"
                  onClick={() => suspendedCount > 0 && setShowSuspendedModal(true)}
                  style={{
                    cursor: suspendedCount > 0 ? 'pointer' : 'default',
                    border: suspendedCount > 0 ? '1px solid rgba(239,68,68,0.3)' : undefined,
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseOver={e => { if (suspendedCount > 0) e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; }}
                  title={suspendedCount > 0 ? 'Clique para ver e reativar clientes suspensos' : 'Nenhum cliente suspenso'}
                >
                  <span className="kpi-label" style={{ color: suspendedCount > 0 ? '#f87171' : undefined }}>Suspensos</span>
                  <strong className="kpi-value" style={{ color: '#f87171' }}>{suspendedCount}</strong>
                  {suspendedCount > 0 && (
                    <span style={{
                      position: 'absolute', bottom: 6, right: 10,
                      fontSize: '0.65rem', color: '#f87171', opacity: 0.7,
                      display: 'flex', alignItems: 'center', gap: 3
                    }}>
                      <AlertCircle size={10} /> Ver detalhes
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Barra de Filtros */}
          <div className="filters-bar glass-card" style={{ position: 'relative', zIndex: 50 }}>
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder={subTab === 'sync' ? 'Filtrar clientes do Asaas por nome ou empresa...' : 'Buscar por nome, empresa ou e-mail...'}
                value={subTab === 'sync' ? syncSearch : search}
                onChange={e => subTab === 'sync' ? setSyncSearch(e.target.value) : setSearch(e.target.value)}
              />
              {(subTab === 'sync' ? syncSearch : search) && (
                <button className="clear-search" onClick={() => subTab === 'sync' ? setSyncSearch('') : setSearch('')}><X size={14} /></button>
              )}
            </div>
            <div className="status-filters" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                style={{
                  background: filterStatus !== 'Todos' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '10px',
                  borderRadius: 8,
                  color: filterStatus !== 'Todos' ? '#818cf8' : 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '42px',
                  minWidth: '42px',
                  justifyContent: 'center'
                }}
                title="Filtrar Clientes"
              >
                <Filter size={18} />
              </button>

              {showFilterMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--panel-bg, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 8, minWidth: 200, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  <button onClick={() => setFilterStatus('Todos')} style={{ padding: '8px 12px', textAlign: 'left', background: filterStatus === 'Todos' ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 6, color: filterStatus === 'Todos' ? '#818cf8' : 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Todos</button>

                  <button onClick={() => setExpandStatus(!expandStatus)} style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', borderRadius: 6, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 8, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Status <Plus size={14} />
                  </button>
                  {expandStatus && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, marginTop: 4 }}>
                      {['Ativo', 'Inativo', 'Suspenso', 'Configurando'].map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          style={{ padding: '6px 8px', textAlign: 'left', fontSize: '0.8rem', background: filterStatus === s ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 4, color: filterStatus === s ? '#818cf8' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setExpandReceita(!expandReceita)} style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', borderRadius: 6, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 8, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Receita <Plus size={14} />
                  </button>
                  {expandReceita && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, marginTop: 4 }}>
                      {['PAGO', 'DEVENDO', 'A VENCER', 'SEM COBRANÇA'].map(s => (
                        <button
                          key={s}
                          onClick={() => setFilterStatus(s)}
                          style={{ padding: '6px 8px', textAlign: 'left', fontSize: '0.8rem', background: filterStatus === s ? 'rgba(99,102,241,0.2)' : 'transparent', borderRadius: 4, color: filterStatus === s ? '#818cf8' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Lista de Clientes */}
      {loading ? (
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
          <span>Carregando clientes...</span>
        </div>
      ) : error ? (
        <div className="error-state glass-card">
          <AlertCircle size={24} color="#f87171" />
          <span>Erro ao carregar: {error}</span>
        </div>
      ) : initialEditMode ? (
        <div className="modal-overlay" onClick={onCloseEdit}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Editar: {form.name}</h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Dados cadastrais e serviços contratados</p>
              </div>
              <button className="modal-close" onClick={onCloseEdit}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="modal-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', overflowY: 'auto' }}>
              <div className="modal-col">
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Dados do Cliente</h3>
                <div className="form-grid">
                  <div className="form-field span-2"><label><Users size={14} /> Nome / Empresa *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                  {/* Equipe */}
                  <div className="form-field span-2">
                    <label><Users size={14} /> Equipe (Funcionários do Cliente)</label>
                    <EquipePanel
                      value={form.contacts}
                      onChange={v => setForm(f => ({ ...f, contacts: v }))}
                    />
                  </div>
                  <div className="form-field">
                    <label><FileText size={14} /> CNPJ</label>
                    <input value={formatCNPJ(form.cnpj)} onChange={e => setForm(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))} placeholder="00.000.000/0001-00" />
                  </div>
                  <div className="form-field">
                    <label><FileText size={14} /> CPF</label>
                    <input value={formatCPF(form.cpf)} onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-field span-2">
                    <label><Users size={14} /> Responsáveis pela Conta</label>
                    <ResponsaveisPanel
                      value={form.responsaveis}
                      onChange={v => setForm(f => ({ ...f, responsaveis: v }))}
                    />
                  </div>
                  <div className="form-field span-2"><label><Folder size={14} /> Pasta do Google Drive (Link)</label><input type="url" placeholder="https://drive.google.com/..." value={form.drive_folder_url} onChange={e => setForm(f => ({ ...f, drive_folder_url: e.target.value }))} /></div>
                  <div className="form-field"><label><Mail size={14} /> E-mail</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="form-field"><label><Phone size={14} /> Telefone</label><input value={formatPhone(form.phone)} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(00) 00000-0000" /></div>
                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <div className={`svc-toggle-sw ${form.whatsapp_notifications ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      <div className="svc-knob" />
                    </div>
                    <label style={{ fontSize: '0.85rem', color: form.whatsapp_notifications ? 'white' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      Notificar Aprovações via WhatsApp
                    </label>
                  </div>
                  <div className="form-field">
                    <label>Status</label>
                    <CustomSelect
                      value={form.status}
                      onChange={v => setForm(f => ({ ...f, status: v || 'Ativo' }))}
                      options={STATUS_OPTIONS}
                      showDots={true}
                    />
                  </div>
                  <div className="form-field">
                    <label>Plano</label>
                    <CustomSelect
                      value={form.plan}
                      onChange={handlePlanChange}
                      options={PLAN_OPTIONS}
                    />
                  </div>
                  <div className="form-field"><label><DollarSign size={14} /> Valor/Mês</label><input
                    type="text"
                    inputMode="numeric"
                    value={form.monthly_value}
                    onChange={e => setForm(f => ({ ...f, monthly_value: formatMoneyInput(e.target.value) }))}
                    placeholder="0,00"
                  /></div>
                  <div className="form-field"><label><Calendar size={14} /> Início</label><input type="date" max="9999-12-31" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div className="form-field span-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                    <label>Login (E-mail)</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@acesso.com" />

                    <label style={{ marginTop: '12px' }}>Senha Atual Salva</label>
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

                    <label style={{ marginTop: '12px' }}>Nova Senha</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.new_password}
                        onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
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
              </div>

              <div className="modal-col" style={{ paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18} /> Serviços Contratados</h3>
                <div className="services-section">
                  <div className="svc-list">
                    {services.map(svc => {
                      const sel = selectedServices.find(s => s.service_id === svc.id);
                      const isOn = !!sel;
                      return (
                        <div key={svc.id} className={`svc-row ${isOn ? 'on' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div className="svc-left" onClick={() => toggleService(svc.id)}>
                              <div className={`svc-toggle-sw ${isOn ? 'on' : ''}`}><div className="svc-knob" /></div>
                              <div className="svc-dot" style={{ background: svc.color }} />
                              <strong>{svc.name}</strong>
                            </div>

                            {isOn && (
                              <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Perfil:</label>
                                <div style={{ width: '120px' }}>
                                  <CustomSelect
                                    value={sel.role || 'Cliente'}
                                    onChange={v => {
                                      const r = v || 'Cliente';
                                      setSelectedServices(prev => prev.map(s => s.service_id === svc.id ? { ...s, role: r } : s));
                                    }}
                                    options={['Cliente', 'Gestor', 'Executor', 'Revisor']}
                                    placeholder="Cliente"
                                    padding="6px 10px"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {isOn && (
                            <div className="svc-details" style={{ paddingLeft: '44px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                              <div className="svc-status-pills" style={{ marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status do Serviço:</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {['active', 'pending', 'suspended'].map(v => (
                                    <button key={v} type="button" className={`svc-status-pill ${sel.status === v ? 'active' : ''} ${v}`} onClick={() => updateServiceStatus(svc.id, v)}>{v}</button>
                                  ))}
                                </div>
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
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar</button>
              </div>
            </form>
          </div>
        </div>
      ) : subTab === 'sync' ? (
        syncResults ? (
          <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '1.4rem' }}>Novos Clientes Encontrados</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Encontramos {syncResults.newClients.length} clientes novos
                  {syncResults.existingCount > 0 && (
                    <>
                      {' '}e ignoramos{' '}
                      <button
                        onClick={() => setShowIgnoredPanel(v => !v)}
                        style={{
                          background: 'rgba(251,191,36,0.15)',
                          border: '1px solid rgba(251,191,36,0.3)',
                          color: '#fbbf24', borderRadius: 6,
                          padding: '1px 8px', fontSize: '0.82rem',
                          cursor: 'pointer', fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                        title="Ver quais clientes foram ignorados e por quê"
                      >
                        {syncResults.existingCount} já existentes
                        <ChevronDown size={13} style={{ transform: showIgnoredPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                    </>
                  )}
                  .
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-ghost" onClick={() => { setSyncResults(null); setSelectedSyncClients([]); setSyncSearch(''); }} disabled={savingSync}>
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  onClick={confirmSmartSync}
                  disabled={savingSync || syncResults.newClients.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {savingSync ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  Salvar na Agência
                  {selectedSyncClients.length > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {selectedSyncClients.length}
                    </span>
                  )}
                </button>
                <button
                  className="btn-ghost"
                  onClick={smartSyncAsaasCustomers}
                  disabled={isSyncingRef.current || savingSync}
                  title="Buscar clientes novamente"
                  style={{ width: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isSyncingRef.current ? <Loader2 size={18} className="spin" /> : <RefreshCw size={18} />}
                </button>
              </div>
            </div>

            {/* Contador de selecionados */}
            {selectedSyncClients.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                  background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                  borderRadius: 8, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600,
                  border: '1px solid rgba(99,102,241,0.25)'
                }}>
                  {selectedSyncClients.length} selecionado(s) — apenas esses serão salvos
                </span>
              </div>
            )}

            {syncResults.newClients.length > 0 ? (() => {
              // Filtra por busca
              const filtered = syncResults.newClients
                .map((c, originalIdx) => ({ client: c, originalIdx }))
                .filter(({ client }) => {
                  if (!syncSearch.trim()) return true;
                  const q = syncSearch.toLowerCase();
                  return (
                    (client.name || '').toLowerCase().includes(q) ||
                    (client.company || '').toLowerCase().includes(q) ||
                    (client.email || '').toLowerCase().includes(q)
                  );
                });

              // Paginação
              const syncTotalPages = Math.ceil(filtered.length / syncItemsPerPage);
              const safeSyncPage = Math.min(syncPage, syncTotalPages || 1);
              const paginated = filtered.slice((safeSyncPage - 1) * syncItemsPerPage, safeSyncPage * syncItemsPerPage);

              const allFilteredSelected = filtered.length > 0 && filtered.every(({ originalIdx }) => selectedSyncClients.includes(originalIdx));
              const someSelected = filtered.some(({ originalIdx }) => selectedSyncClients.includes(originalIdx));

              const toggleAll = () => {
                const filteredIndices = filtered.map(({ originalIdx }) => originalIdx);
                if (allFilteredSelected) {
                  // Desmarcar todos os filtrados
                  setSelectedSyncClients(prev => prev.filter(idx => !filteredIndices.includes(idx)));
                } else {
                  // Marcar todos os filtrados
                  setSelectedSyncClients(prev => [...new Set([...prev, ...filteredIndices])]);
                }
              };

              const toggleOne = (originalIdx) => {
                setSelectedSyncClients(prev =>
                  prev.includes(originalIdx)
                    ? prev.filter(i => i !== originalIdx)
                    : [...prev, originalIdx]
                );
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <div className="clients-table-wrapper">
                    {filtered.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Nenhum cliente encontrado para &ldquo;{syncSearch}&rdquo;
                      </div>
                    ) : (
                    <table className="clients-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40, paddingLeft: 16 }}>
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              ref={el => { if (el) el.indeterminate = someSelected && !allFilteredSelected; }}
                              onChange={toggleAll}
                              style={{ cursor: 'pointer', width: 16, height: 16 }}
                              title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                            />
                          </th>
                          <th>Cliente</th>
                          <th>Segmento</th>
                          <th>Plano</th>
                          <th>Valor/Mês</th>
                          <th>Prazos</th>
                          <th>Arq.</th>
                          <th>Status</th>
                          <th>Serviços</th>
                          <th style={{ textAlign: 'right', paddingRight: '16px', minWidth: '140px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(({ client, originalIdx }) => {
                          const isChecked = selectedSyncClients.includes(originalIdx);
                          return (
                            <tr
                              key={originalIdx}
                              className="client-row"
                              style={{
                                opacity: selectedSyncClients.length > 0 && !isChecked ? 0.55 : 1,
                                transition: 'opacity 0.15s'
                              }}
                            >
                              <td style={{ paddingLeft: 16 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleOne(originalIdx)}
                                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                                />
                              </td>
                              <td>
                                <div className="client-cell">
                                  <div className="client-avatar" style={{ background: client.avatar_color || '#6366f1' }}>
                                    {getInitials(client.name)}
                                  </div>
                                  <div>
                                    <div className="client-name">{client.name}</div>
                                    <div className="client-sub">{client.company || client.email || '—'}</div>
                                  </div>
                                </div>
                              </td>
                              <td><span className="pill pill-segment">—</span></td>
                              <td>—</td>
                              <td className="value-cell">—</td>
                              <td className="date-cell">Sem datas</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <span style={{ color: 'var(--border-color)', display: 'inline-flex', padding: '4px' }}><FileText size={16} /></span>
                                  <span style={{ color: 'var(--border-color)', display: 'inline-flex', padding: '4px' }}><Folder size={16} /></span>
                                </div>
                              </td>
                              <td>
                                <div className="status-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                                  <span className="status-badge" style={{
                                    background: STATUS_STYLES[client.status]?.bg || 'rgba(255,255,255,0.05)',
                                    color: STATUS_STYLES[client.status]?.color || 'var(--text-muted)',
                                    border: `1px solid ${STATUS_STYLES[client.status]?.border || 'rgba(255,255,255,0.1)'}`,
                                    cursor: 'pointer'
                                  }}>
                                    {client.status}
                                  </span>
                                  <div className="status-dropdown-menu">
                                    {['Ativo', 'Inativo', 'Suspenso', 'Configurando'].map(opt => (
                                      <div
                                        key={opt}
                                        className="status-dropdown-item"
                                        style={{
                                          background: 'transparent',
                                          color: STATUS_STYLES[opt]?.color || 'var(--text-muted)',
                                          fontWeight: '600',
                                          margin: '2px 0',
                                          borderRadius: '4px'
                                        }}
                                        onClick={() => {
                                          const updated = [...syncResults.newClients];
                                          if (!updated[originalIdx].metadata) updated[originalIdx].metadata = {};
                                          updated[originalIdx].metadata.show_in_agency = opt === 'Ativo';
                                          updated[originalIdx].status = opt;
                                          setSyncResults({ ...syncResults, newClients: updated });
                                        }}
                                      >
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>Nenhum</td>
                              <td style={{ textAlign: 'right', paddingRight: '16px', minWidth: '140px' }}>
                                <div className="row-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    className="action-btn delete-btn"
                                    onClick={() => {
                                      const updated = syncResults.newClients.filter((_, idx) => idx !== originalIdx);
                                      setSyncResults({ ...syncResults, newClients: updated });
                                      setSelectedSyncClients(prev => prev.filter(i => i !== originalIdx).map(i => i > originalIdx ? i - 1 : i));
                                    }}
                                    title="Remover da lista de importação"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    )}
                  </div>

                  {/* Controles de Paginação do Sync */}
                  {syncTotalPages > 1 && (
                    <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Exibindo {paginated.length} de {filtered.length} cliente(s) encontrados
                        {syncSearch && <> (filtrado de {syncResults.newClients.length} total)</>}
                      </span>
                      <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={safeSyncPage === 1}
                          onClick={() => setSyncPage(prev => Math.max(1, prev - 1))}
                          style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', opacity: safeSyncPage === 1 ? 0.4 : 1, cursor: safeSyncPage === 1 ? 'not-allowed' : 'pointer' }}
                        >
                          Anterior
                        </button>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Página {safeSyncPage} de {syncTotalPages}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={safeSyncPage === syncTotalPages}
                          onClick={() => setSyncPage(prev => Math.min(syncTotalPages, prev + 1))}
                          style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', opacity: safeSyncPage === syncTotalPages ? 0.4 : 1, cursor: safeSyncPage === syncTotalPages ? 'not-allowed' : 'pointer' }}
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                Todos os clientes do Asaas já constam na sua base! Nada de novo para adicionar.
              </div>
            )}

            {/* Painel de Clientes Ignorados */}
            {showIgnoredPanel && syncResults.ignoredClients && syncResults.ignoredClients.length > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.05)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 12, overflow: 'hidden'
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(251,191,36,0.08)',
                  borderBottom: '1px solid rgba(251,191,36,0.15)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <AlertCircle size={16} color="#fbbf24" />
                  <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.88rem' }}>
                    Clientes já existentes — ignorados pela sincronização
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', marginLeft: 4 }}>
                    Se algum não deveria ser ignorado, pode ser falso positivo de nome.
                  </span>
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Nome no Asaas</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>E-mail / Doc</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Motivo do ignore</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Local encontrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncResults.ignoredClients.map((ig, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px 12px', color: '#e2e8f0', fontWeight: 500 }}>{ig.asaasName}</td>
                          <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                            <div>{ig.asaasEmail || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ig.asaasDoc || '—'}</div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              background: 'rgba(251,191,36,0.1)',
                              border: '1px solid rgba(251,191,36,0.2)',
                              color: '#fbbf24', borderRadius: 6,
                              padding: '2px 8px', fontSize: '0.75rem'
                            }}>
                              {ig.matchReason}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ color: '#a5b4fc', fontWeight: 500 }}>{ig.localName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ig.localStatus}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', minHeight: '400px', justifyContent: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <RefreshCw size={32} color="#818cf8" />
            </div>
            <h2 style={{ color: '#f8fafc', margin: 0, fontSize: '1.5rem' }}>Sincronização Inteligente</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
              Esta ferramenta fará o cruzamento de dados entre os <strong>Clientes da Agência</strong> e a <strong>Base Geral Asaas</strong>. Apenas clientes novos ou divergentes serão importados de forma segura.
            </p>
            <button
              className="btn-primary"
              style={{ padding: '16px 36px', fontSize: '1.05rem', marginTop: '16px', borderRadius: '12px' }}
              onClick={smartSyncAsaasCustomers}
              disabled={isSyncingRef.current}
            >
              {isSyncingRef.current ? <Loader2 size={20} className="spin" style={{ marginRight: 8 }} /> : <RefreshCw size={20} style={{ marginRight: 8 }} />}
              Buscar Novos Clientes
            </button>
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="empty-state glass-card">
          <Users size={48} style={{ opacity: 0.3 }} />
          <p>{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</p>
          {isAdmin && !search && (
            <button className="btn-primary" onClick={openCreate}>
              <Plus size={16} /> Cadastrar primeiro cliente
            </button>
          )}
        </div>
      ) : (
        <div className="clients-table-wrapper glass-card">
          <table className="clients-table">
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{ width: 40, paddingLeft: 16 }}>
                    <input type="checkbox" checked={selectedClients.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} title="Selecionar todos" />
                  </th>
                )}
                <th>Cliente</th>
                <th>Segmento</th>
                <th>Plano</th>
                <th>Valor/Mês</th>
                <th>Prazos</th>
                <th>Arq.</th>
                <th>Status</th>
                <th style={{ minWidth: 110, whiteSpace: 'nowrap' }}>Receita</th>
                <th>Serviços</th>
                {isAdmin && <th style={{ textAlign: 'right', paddingRight: '16px', minWidth: '140px' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map(client => {
                const st = STATUS_STYLES[client.status] || STATUS_STYLES.Ativo;
                return (
                  <tr key={client.id} className="client-row" style={{ background: selectedClients.includes(client.id) ? 'rgba(99,102,241,0.05)' : '' }}>
                    {isAdmin && (
                      <td style={{ paddingLeft: 16 }}>
                        <input type="checkbox" checked={selectedClients.includes(client.id)} onChange={() => toggleSelectClient(client.id)} style={{ cursor: 'pointer' }} />
                      </td>
                    )}
                    <td>
                      <div className="client-cell">
                        {client.avatar_url ? (
                          <img src={client.avatar_url} alt={client.name} className="client-avatar-img" />
                        ) : (
                          <div className="client-avatar" style={{ background: client.avatar_color || '#6366f1' }}>
                            {getInitials(client.metadata?.display_name || client.name)}
                          </div>
                        )}
                        <div>
                          <div className="client-name">{client.metadata?.display_name || client.name}</div>
                          <div className="client-sub">
                            {client.metadata?.display_name ? client.name : (client.segment || client.email || '—')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="pill pill-segment" style={{ minWidth: 140, textAlign: 'center', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150, verticalAlign: 'middle' }} title={client.segment || ''}>
                        {client.segment || '—'}
                      </span>
                    </td>
                    <td>{client.plan || '—'}</td>
                    <td className="value-cell">{formatCurrency(getCurrentMonthlyValue(client))}</td>
                    <td className="date-cell">
                      {renderContractInfo(client)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {client.contract_url ? (
                          <a href={client.contract_url} target="_blank" rel="noreferrer" style={{ color: '#10b981', display: 'inline-flex', padding: '4px', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }} title="Visualizar Contrato">
                            <FileText size={16} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--border-color)', display: 'inline-flex', padding: '4px' }} title="Sem contrato">
                            <FileText size={16} />
                          </span>
                        )}
                        {client.metadata?.drive_folder_url ? (
                          <a href={client.metadata.drive_folder_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', display: 'inline-flex', padding: '4px', background: 'rgba(59,130,246,0.1)', borderRadius: '6px' }} title="Acessar Pasta no Drive">
                            <Folder size={16} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--border-color)', display: 'inline-flex', padding: '4px' }} title="Sem pasta no Drive">
                            <Folder size={16} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="status-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                        <span className="status-badge" style={{ 
                            background: st.bg, 
                            color: st.color, 
                            border: `1px solid ${st.border}`, 
                            cursor: 'pointer' 
                          }}>
                          {client.status}
                        </span>
                        <div className="status-dropdown-menu">
                          {['Ativo', 'Inativo', 'Suspenso', 'Configurando'].map(opt => (
                            <div 
                              key={opt} 
                              className="status-dropdown-item"
                              style={{
                                background: 'transparent',
                                color: STATUS_STYLES[opt]?.color || 'var(--text-muted)',
                                fontWeight: '600',
                                margin: '2px 0',
                                borderRadius: '4px'
                              }}
                              onClick={() => setClientStatus(client, opt)}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const fStatus = client.metadata?.financial_status || 'VERIFICAR';
                          const fStyle = getFinancialBadgeStyle(fStatus);
                          return (
                            <span className="status-badge" style={{
                              background: fStyle.bg,
                              color: fStyle.color,
                              border: `1px solid ${fStyle.border}`,
                              minWidth: 105,
                              textAlign: 'center',
                              display: 'inline-block',
                            }}>
                              {fStatus}
                            </span>
                          );
                        })()}
                        <button
                          className="btn-ghost"
                          onClick={() => handleCheckReceita(client)}
                          disabled={checkingReceita === client.id}
                          title="Sincronizar com Asaas"
                          style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {checkingReceita === client.id ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <ClientServicesBadge clientId={client.id} refreshTrigger={refreshBadges} />
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right', paddingRight: '16px', minWidth: '140px' }}>
                        <div className="row-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="action-btn edit-btn" onClick={() => openEdit(client)} title="Editar">
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => setConfirmDelete(client)}
                            title="Remover"
                            disabled={deleting === client.id}
                          >
                            {deleting === client.id ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span>Exibindo {paginatedClients.length} de {filtered.length} clientes (Total na base: {clients.length})</span>
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  type="button"
                  className="btn-ghost" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Anterior
                </button>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button 
                  type="button"
                  className="btn-ghost" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Cadastro / Edição - Portal para evitar cortes */}
      {modalOpen && createPortal(
        <>
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-panel glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Dados cadastrais e serviços contratados</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {editingClient && !editingClient.metadata?.asaas_id && (
                  <button type="button" className="btn-ghost" onClick={() => setLinkModalOpen('merge')} title="Mesclar com uma duplicata do Asaas" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem' }}>
                    <PackageCheck size={16} /> Mesclar Duplicata
                  </button>
                )}
                {modalTab === 'dados' && (
                  <>
                    <button type="button" className="btn-ghost" onClick={closeModal} style={{ padding: '6px 14px', fontSize: '0.82rem' }}>Cancelar</button>
                    <button type="button" className="btn-primary" disabled={saving} onClick={() => { document.getElementById('client-edit-form')?.requestSubmit(); }} style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                      {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                    </button>
                  </>
                )}
                <button className="modal-close" onClick={closeModal}><X size={20} /></button>
              </div>
            </div>

            {isAdmin && editingClient && (
              <div className="modal-tabs" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '20px', gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('dados')}
                  style={{
                    padding: '8px 16px',
                    background: modalTab === 'dados' ? 'rgba(99,102,241,0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${modalTab === 'dados' ? '#6366f1' : 'transparent'}`,
                    borderRadius: '6px 6px 0 0',
                    color: modalTab === 'dados' ? '#a5b4fc' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Cadastro e Serviços
                </button>
                <button
                  type="button"
                  onClick={() => { setModalTab('logs'); fetchLogs(editingClient.id); }}
                  style={{
                    padding: '8px 16px',
                    background: modalTab === 'logs' ? 'rgba(99,102,241,0.08)' : 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${modalTab === 'logs' ? '#6366f1' : 'transparent'}`,
                    borderRadius: '6px 6px 0 0',
                    color: modalTab === 'logs' ? '#a5b4fc' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Histórico de Logs
                </button>
              </div>
            )}

            {modalTab === 'dados' ? (
              <form id="client-edit-form" onSubmit={handleSave} className="modal-form" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', overflowY: 'auto' }}>
              <div className="modal-col">
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Dados do Cliente</h3>
                {/* Upload de Foto + Nome de Exibição */}
                <div className="photo-section" style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <PhotoUpload
                    currentUrl={form.avatar_url}
                    fallbackColor={form.avatar_color}
                    fallbackText={getInitials(form.display_name || form.name)}
                    type="client"
                    entityId={editingClient?.id}
                    onUpload={(url) => setForm(f => ({ ...f, avatar_url: url }))}
                    size={80}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Nome de Exibição (Card)
                    </label>
                    <input
                      value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder={form.name || 'Ex: João Silva'}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                      Este nome aparece no card da lista de clientes
                    </span>
                  </div>
                </div>

                <div className="color-picker-row" style={{ marginTop: -10 }}>
                  <div className="avatar-preview" style={{ background: form.avatar_color }}>
                    {getInitials(form.name)}
                  </div>
                  <div className="color-options">
                    <span className="field-label">Cor do Avatar (Fallback)</span>
                    <div className="color-swatches">
                      {AVATAR_COLORS.map(c => (
                        <button
                          key={c} type="button"
                          className={`color-swatch ${form.avatar_color === c ? 'selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  {/* Nome */}
                  <div className="form-field span-2">
                    <label><Users size={14} /> Nome Fantasia / Nome do Cliente *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: ALIFORT ou João Silva" />
                  </div>

                  {/* Responsáveis */}
                  <div className="form-field span-2">
                    <label><Users size={14} /> Responsáveis pela Conta</label>
                    <ResponsaveisPanel
                      value={form.responsaveis}
                      onChange={v => setForm(f => ({ ...f, responsaveis: v }))}
                    />
                  </div>

                  {/* Equipe */}
                  <div className="form-field span-2">
                    <label><Users size={14} /> Equipe (Funcionários do Cliente)</label>
                    <EquipePanel
                      value={form.contacts}
                      onChange={v => setForm(f => ({ ...f, contacts: v }))}
                    />
                  </div>

                  {/* Documento (CNPJ) */}
                  <div className="form-field">
                    <label><FileText size={14} /> CNPJ (Asaas)</label>
                    <input value={formatCNPJ(form.cnpj)} onChange={e => setForm(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))} placeholder="00.000.000/0001-00" />
                  </div>

                  {/* Documento (CPF) */}
                  <div className="form-field">
                    <label><FileText size={14} /> CPF (Asaas)</label>
                    <input value={formatCPF(form.cpf)} onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" />
                  </div>

                  <div className="form-field span-2">
                    <label><Folder size={14} /> Pasta do Google Drive (Link)</label>
                    <input type="url" value={form.drive_folder_url} onChange={e => setForm(f => ({ ...f, drive_folder_url: e.target.value }))} placeholder="https://drive.google.com/..." />
                  </div>

                  {/* Telefone e Instagram */}
                  <div className="form-field">
                    <label><Phone size={14} /> Celular / WhatsApp (Asaas)</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={formatPhone(form.phone)} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" style={{ flex: 1 }} />
                      <button type="button" className="btn-ghost" onClick={() => setForm(f => ({ ...f, extra_phones: [...(f.extra_phones || []), ''] }))} style={{ padding: '8px', height: 42, flexShrink: 0 }} title="Adicionar outro número"><Plus size={16} /></button>
                    </div>
                    {form.extra_phones?.map((p, i) => (
                      <div key={`extra_phone_${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                        <input value={formatPhone(p)} onChange={e => {
                          const newArr = [...form.extra_phones];
                          newArr[i] = formatPhone(e.target.value);
                          setForm(f => ({ ...f, extra_phones: newArr }));
                        }} placeholder="Outro WhatsApp" style={{ flex: 1 }} />
                        <button type="button" className="btn-ghost" onClick={() => {
                          const newArr = [...form.extra_phones];
                          newArr.splice(i, 1);
                          setForm(f => ({ ...f, extra_phones: newArr }));
                        }} style={{ padding: '8px', height: 42, flexShrink: 0, color: '#f87171' }}><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>

                  <div className="form-field">
                    <label><Instagram size={14} /> Instagram</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        value={form.instagram || ''}
                        onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                        placeholder="@instagram_do_cliente"
                        style={{ paddingRight: form.instagram ? '48px' : '14px' }}
                      />
                      {form.instagram && (
                        <a
                          href={`https://instagram.com/${form.instagram.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Abrir perfil @${form.instagram.replace(/^@/, '')} no Instagram`}
                          style={{
                            position: 'absolute', right: 8,
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textDecoration: 'none', flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(220,39,67,0.4)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,39,67,0.6)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,39,67,0.4)'; }}
                        >
                          <Instagram size={16} color="white" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <div className={`svc-toggle-sw ${form.whatsapp_notifications ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      <div className="svc-knob" />
                    </div>
                    <label style={{ fontSize: '0.85rem', color: form.whatsapp_notifications ? 'white' : 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setForm(f => ({ ...f, whatsapp_notifications: !f.whatsapp_notifications }))}>
                      Notificar Aprovações via WhatsApp
                    </label>
                  </div>

                  {/* Segmento */}
                  <div className="form-field">
                    <label><TrendingUp size={14} /> Segmento</label>
                    <SegmentInput
                      value={form.segment}
                      onChange={v => setForm(f => ({ ...f, segment: v }))}
                      existingSegments={[...new Set(clients.map(c => c.segment).filter(Boolean))].sort()}
                    />
                  </div>

                  {/* Status */}
                  <div className="form-field">
                    <label>Status</label>
                    <CustomSelect
                      value={form.status}
                      onChange={v => setForm(f => ({ ...f, status: v || 'Ativo' }))}
                      options={STATUS_OPTIONS}
                      showDots={true}
                    />
                  </div>

                  {/* Plano */}
                  <div className="form-field">
                    <label>Plano Contratado</label>
                    <CustomSelect
                      value={form.plan}
                      onChange={handlePlanChange}
                      options={PLAN_OPTIONS}
                    />
                  </div>

                  {/* Valor Mensal e Acordos */}
                  <div className="form-field span-2" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0 }}><DollarSign size={14} /> Valor Mensal / Acordo de Pagamento</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valores Variáveis?</label>
                        <div className={`svc-toggle-sw ${form.has_payment_schedule ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, has_payment_schedule: !f.has_payment_schedule }))}>
                          <div className="svc-knob" />
                        </div>
                      </div>
                    </div>

                    {!form.has_payment_schedule ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.monthly_value}
                        onChange={e => setForm(f => ({ ...f, monthly_value: formatMoneyInput(e.target.value) }))}
                        placeholder="0,00"
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        {form.payment_schedule.map((item, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="form-field" style={{ flex: 1, margin: 0 }}>
                              <input
                                type="text"
                                placeholder="Valor (Ex: 3.500,00)"
                                value={item.value}
                                onChange={e => {
                                  const newSchedule = [...form.payment_schedule];
                                  newSchedule[index].value = formatMoneyInput(e.target.value);
                                  setForm(f => ({ ...f, payment_schedule: newSchedule }));
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>por</span>
                            <div className="form-field" style={{ width: 100, margin: 0 }}>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder="Meses"
                                value={item.duration}
                                onChange={e => {
                                  const newSchedule = [...form.payment_schedule];
                                  newSchedule[index].duration = e.target.value;
                                  setForm(f => ({ ...f, payment_schedule: newSchedule }));
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>meses</span>

                            <button
                              type="button"
                              onClick={() => {
                                const newSchedule = form.payment_schedule.filter((_, i) => i !== index);
                                setForm(f => ({ ...f, payment_schedule: newSchedule }));
                              }}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, payment_schedule: [...f.payment_schedule, { value: '', duration: '' }] }));
                          }}
                          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                        >
                          <Plus size={14} /> Adicionar Variação
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Datas */}
                  <div className="form-field">
                    <label><Calendar size={14} /> Data Início</label>
                    <input type="date" max="9999-12-31" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label><Clock size={14} /> Fim do Contrato (Opcional)</label>
                    <input type="date" max="9999-12-31" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>

                  {/* Auto-Renovação */}
                  {form.end_date && (
                    <div style={{ gridColumn: '2', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: -8 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>Renovação Automática</span>
                      <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={form.auto_renew}
                          onChange={e => setForm(f => ({ ...f, auto_renew: e.target.checked }))}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                        />
                        <span style={{
                          position: 'absolute', inset: 0, borderRadius: 11,
                          background: form.auto_renew ? '#10b981' : 'rgba(255,255,255,0.12)',
                          transition: 'background 0.25s',
                          cursor: 'pointer'
                        }}>
                          <span style={{
                            position: 'absolute', top: 2, left: form.auto_renew ? 20 : 2,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#fff',
                            transition: 'left 0.25s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                          }} />
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Endereço Dividido */}
                  <div className="form-field span-2">
                    <label><MapPin size={14} /> Endereço</label>

                    {/* Linha 1: CEP | Rua | Nº */}
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          value={form.addr_cep}
                          maxLength={9}
                          onChange={e => {
                            const formatted = formatCEP(e.target.value);
                            setForm(f => ({ ...f, addr_cep: formatted }));
                            fetchCEP(formatted);
                          }}
                          placeholder="00000-000"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>CEP</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          value={form.addr_street}
                          onChange={e => setForm(f => ({ ...f, addr_street: e.target.value }))}
                          placeholder="Ex: Av. Paulista"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Rua / Avenida</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          value={form.addr_number}
                          onChange={e => setForm(f => ({ ...f, addr_number: e.target.value }))}
                          placeholder="Nº"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Número</span>
                      </div>
                    </div>

                    {/* Linha 2: Bairro | Cidade */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          value={form.addr_neighborhood}
                          onChange={e => setForm(f => ({ ...f, addr_neighborhood: e.target.value }))}
                          placeholder="Ex: Centro"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Bairro</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          value={form.addr_city}
                          onChange={e => setForm(f => ({ ...f, addr_city: e.target.value }))}
                          placeholder="Ex: São Paulo"
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 4 }}>Cidade</span>
                      </div>
                    </div>
                  </div>

                  {/* Google Drive Raiz */}
                  <div className="form-field span-2">
                    <label style={{ color: '#4285F4' }}><PackageCheck size={14} /> Link da Pasta Raiz no Google Drive</label>
                    <input
                      type="url"
                      value={form.drive_folder_url}
                      onChange={e => setForm(f => ({ ...f, drive_folder_url: e.target.value }))}
                      placeholder="https://drive.google.com/drive/folders/..."
                      style={{ borderLeft: '3px solid #4285F4' }}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                      Esta pasta será a base para todos os departamentos (Captação, Edição, Design, etc).
                    </small>
                  </div>

                  {/* Receitas (Asaas) */}
                  <div className="form-field span-2">
                    <label style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DollarSign size={14} /> Resumo Financeiro (Asaas)
                      </div>
                      <button
                        type="button"
                        onClick={() => editingClient && handleCheckReceita(editingClient)}
                        disabled={checkingReceita === editingClient?.id}
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}
                      >
                        {checkingReceita === editingClient?.id ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                        Atualizar Dados
                      </button>
                    </label>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      padding: 16,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 16
                    }}>
                      {(() => {
                        const fin = editingClient?.metadata?.financial_details || null;
                        const status = editingClient?.metadata?.financial_status || 'VERIFICAR';
                        const style = getFinancialBadgeStyle(status);

                        return (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status da Receita</span>
                              <span style={{
                                marginTop: 6,
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                alignSelf: 'flex-start'
                              }}>
                                {status}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Meses Pagos</span>
                              <span style={{ marginTop: 6, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                                {fin?.paidMonths ?? '-'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Meses Faltantes</span>
                              <span style={{ marginTop: 6, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                                {fin?.pendingMonths ?? '-'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Último Pagamento</span>
                              <span style={{ marginTop: 6, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                                {fin?.lastPaidDate ? new Date(fin.lastPaidDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Próximo Pagamento</span>
                              <span style={{ marginTop: 6, fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>
                                {fin?.nextDueDate ? new Date(fin.nextDueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                              </span>
                              {fin?.daysUntilNext !== null && fin?.daysUntilNext !== undefined && (
                                <span style={{ fontSize: '0.75rem', color: fin.daysUntilNext < 0 ? '#ef4444' : 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                                  {fin.daysUntilNext < 0 ? `Vencido há ${Math.abs(fin.daysUntilNext)} dias` : `Faltam ${fin.daysUntilNext} dias`}
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Arquivo de Contrato */}
                  <div className="form-field span-2">
                    <label>Contrato Assinado (Arquivo)</label>
                    <ContractUpload
                      currentUrl={form.contract_url}
                      type="client"
                      entityId={editingClient?.id}
                      onUpload={(url) => setForm(f => ({ ...f, contract_url: url }))}
                    />
                  </div>

                  {/* Notas */}
                  <div className="form-field span-2">
                    <label>Observações Adicionais (Asaas / Internas)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Informações relevantes sobre o cliente..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="access-tab-content" style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24 }}>
                  <div style={{ textAlign: 'center', marginBottom: 32, padding: '20px 0' }}>
                    <div style={{ width: 64, height: 64, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 16px' }}>
                      <Key size={32} color="#818cf8" style={{ margin: 'auto' }} />
                    </div>
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>Acesso ao Sistema</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Configure as credenciais do cliente para o portal.
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label><Mail size={14} /> E-mail de Login *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="contato@cliente.com"
                      />
                    </div>

                    <div className="form-field">
                      <label>Status do Acesso</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ flex: 1, color: form.email ? '#34d399' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {form.email ? '✓ Acesso Ativo (Senha Protegida)' : 'Acesso Não Configurado'}
                        </span>
                      </div>
                    </div>

                    <div className="form-field span-2">
                      <label><Lock size={14} /> Nova Senha</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.new_password}
                          onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                          placeholder={editingClient ? "Preencha apenas para alterar..." : "Definir senha nova..."}
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
                        style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', opacity: 0.8 }}
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
                          const url = `https://wa.me/${form.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
                          window.open(url, '_blank');
                        }}
                        title="Enviar por WhatsApp"
                        disabled={!form.phone}
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Este link preenche automaticamente o e-mail no login do cliente.
                    </p>
                  </div>

                  <div className="glass-card" style={{ marginTop: 32, padding: 20, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <CheckCircle size={18} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#f8fafc', marginBottom: 4 }}>Liberação Automática</strong>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          Ao salvar, o cliente poderá acessar a plataforma usando estas credenciais. Se for um novo cliente, o acesso será criado no primeiro login.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-col" style={{ paddingLeft: 32, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="col-title" style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={18} /> Serviços Contratados</h3>
                <div className="services-section">
                  <p className="svc-hint">
                    <PackageCheck size={15} /> Selecione os serviços contratados, defina o perfil e o status de cada um.
                  </p>
                  <div className="svc-list">
                    {services.map(svc => {
                      const sel = selectedServices.find(s => s.service_id === svc.id);
                      const isOn = !!sel;
                      return (
                        <div key={svc.id} className={`svc-row ${isOn ? 'on' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div className="svc-left" onClick={() => toggleService(svc.id)}>
                              <div className={`svc-toggle-sw ${isOn ? 'on' : ''}`}><div className="svc-knob" /></div>
                              <div className="svc-dot" style={{ background: svc.color }} />
                              <div>
                                <strong className="svc-name">{svc.name}</strong>
                                <p className="svc-desc">{svc.description}</p>
                              </div>
                            </div>

                            {isOn && (
                              <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Perfil:</label>
                                <div style={{ width: '120px' }}>
                                  <CustomSelect
                                    value={sel.role || 'Cliente'}
                                    onChange={v => {
                                      const r = v || 'Cliente';
                                      setSelectedServices(prev => prev.map(s => s.service_id === svc.id ? { ...s, role: r } : s));
                                    }}
                                    options={['Cliente', 'Gestor', 'Executor', 'Revisor']}
                                    placeholder="Cliente"
                                    padding="6px 10px"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {isOn && (
                            <div className="svc-details" style={{ paddingLeft: '44px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '4px' }}>
                              <div className="svc-status-pills">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Status do Serviço:</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {[{ v: 'active', label: 'Aprovado', icon: <CheckCircle size={12} /> }, { v: 'pending', label: 'Pendente', icon: <Clock size={12} /> }, { v: 'suspended', label: 'Suspenso', icon: <AlertCircle size={12} /> }].map(opt => (
                                    <button
                                      key={opt.v} type="button"
                                      className={`svc-status-pill ${sel.status === opt.v ? 'active' : ''} ${opt.v}`}
                                      onClick={() => updateServiceStatus(svc.id, opt.v)}
                                    >
                                      {opt.icon} {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ gridColumn: '1 / -1', marginTop: 16, position: 'relative', minHeight: toast ? 'auto' : '0px' }}>
                {toast && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 10,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                      color: toast.type === 'success' ? '#34d399' : '#f87171',
                      animation: 'slideInFromLeft 0.3s ease',
                      backdropFilter: 'blur(10px)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {toast.msg}
                  </div>
                )}
              </div>
            </form>
            ) : (
              <div className="modal-logs-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 8px', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', gridColumn: '1 / -1' }}>
                <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> Histórico de Alterações (Logs)</h3>
                
                {loadingLogs ? (
                  <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
                    <Loader2 size={32} className="spin" />
                    <span>Carregando histórico...</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div style={{ padding: '40px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    Nenhum histórico registrado para este cliente.
                  </div>
                ) : (
                  <div className="logs-table-wrapper" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Data/Hora</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Ação</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Executor</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Departamento</th>
                          <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => {
                          const date = new Date(log.created_at).toLocaleString('pt-BR');
                          let detailStr = '—';
                          if (log.details) {
                            if (typeof log.details === 'object') {
                              detailStr = Object.entries(log.details)
                                .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                                .join(', ');
                            } else {
                              detailStr = String(log.details);
                            }
                          }
                          return (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{date}</td>
                              <td style={{ padding: '12px 16px', color: '#a5b4fc', fontWeight: 600 }}>{log.action}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>{log.actor}</td>
                              <td style={{ padding: '12px 16px' }}><span className="pill pill-segment" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>{log.department}</span></td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detailStr}>{detailStr}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="modal-footer" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-ghost" onClick={closeModal}>Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
          {toast && (
            <div
              style={{
                position: 'fixed',
                bottom: 32,
                left: 32,
                zIndex: 100010,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '13px 20px',
                borderRadius: 12,
                fontSize: '0.9rem',
                fontWeight: 600,
                background: toast.type === 'success' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                color: toast.type === 'success' ? '#34d399' : '#f87171',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                animation: 'slideInFromLeft 0.3s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.msg}
            </div>
          )}
        </>,
        document.getElementById('modal-root') || document.body
      )}

      {/* Modal de Vínculo do Asaas (Ideia 3) e Mesclagem */}
      {linkModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => { setLinkModalOpen(false); setSelectedLinkClient(null); setLinkServices([]); }}>
          <div className="modal-panel glass-panel" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>
                  {linkModalOpen === 'merge' ? 'Mesclar Duplicata do Asaas' : 'Vincular Cliente do Asaas'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {linkModalOpen === 'merge' ? 'Selecione o registro importado do Asaas para transferir o vínculo.' : 'Ative um cliente da base geral do Asaas na agência'}
                </p>
              </div>
              <button className="modal-close" onClick={() => { setLinkModalOpen(false); setSelectedLinkClient(null); setLinkServices([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '60vh', overflowY: 'auto', flex: 1 }}>
              {!selectedLinkClient ? (
                <>
                  <div className="search-box" style={{ flex: '0 0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px' }}>
                    <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Buscar cliente na base do Asaas..."
                      value={linkSearch}
                      onChange={e => setLinkSearch(e.target.value)}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#f8fafc', outline: 'none', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {clients
                      .filter(c => c.metadata?.is_employee_shadow !== true && c.id !== editingClient?.id && (linkModalOpen === 'merge' || c.metadata?.show_in_agency !== true))
                      .filter(c => !linkSearch || (c.name || '').toLowerCase().includes(linkSearch.toLowerCase()) || (c.email || '').toLowerCase().includes(linkSearch.toLowerCase()))
                      .slice(0, 500)
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setSelectedLinkClient(c); setLinkServices([]); }}
                          style={{
                            padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px',
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', transition: 'all 0.2s'
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                        >
                          <div>
                            <strong style={{ display: 'block', fontSize: '0.9rem', color: '#f8fafc' }}>{c.name}</strong>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email || 'Sem e-mail'} • {c.company || 'Sem empresa'}</span>
                          </div>
                          <Plus size={16} style={{ color: '#818cf8' }} />
                        </div>
                      ))}
                    {clients.filter(c => c.metadata?.is_employee_shadow !== true && c.metadata?.show_in_agency !== true && (linkModalOpen !== 'merge' || c.metadata?.asaas_id)).length === 0 && (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        Nenhum cliente disponível para vincular na base geral.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', padding: '16px', borderRadius: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>{linkModalOpen === 'merge' ? 'Duplicata Selecionada' : 'Cliente Selecionado'}</span>
                    <h3 style={{ margin: '4px 0 0', color: '#f8fafc', fontSize: '1.05rem' }}>{selectedLinkClient.name}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedLinkClient.email || 'Sem e-mail'}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedLinkClient(null)}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.78rem', cursor: 'pointer', padding: 0, marginTop: '8px', textDecoration: 'underline' }}
                    >
                      Alterar cliente
                    </button>
                  </div>

                  {linkModalOpen !== 'merge' && (
                    <div>
                      <h4 style={{ margin: '0 0 12px', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 600 }}>Selecione os Serviços Contratados:</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {services.map(svc => {
                          const sel = linkServices.find(s => s.service_id === svc.id);
                          const isOn = !!sel;
                          return (
                            <div key={svc.id} className={`svc-row ${isOn ? 'on' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', background: isOn ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.01)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div className="svc-left" onClick={() => {
                                  setLinkServices(prev => {
                                    const exists = prev.find(s => s.service_id === svc.id);
                                    if (exists) return prev.filter(s => s.service_id !== svc.id);
                                    return [...prev, { service_id: svc.id, status: 'active', role: 'Cliente', notes: '' }];
                                  });
                                }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                  <div className={`svc-toggle-sw ${isOn ? 'on' : ''}`} style={{ width: '38px', height: '20px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="svc-knob" style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: isOn ? '20px' : '2px', transition: 'all 0.25s' }} />
                                  </div>
                                  <div className="svc-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: svc.color }} />
                                  <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>{svc.name}</strong>
                                </div>
                                {isOn && (
                                  <div className="role-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Perfil:</label>
                                    <div style={{ width: '110px' }}>
                                      <CustomSelect
                                        value={sel.role || 'Cliente'}
                                        onChange={v => {
                                          const r = v || 'Cliente';
                                          setLinkServices(prev => prev.map(s => s.service_id === svc.id ? { ...s, role: r } : s));
                                        }}
                                        options={['Cliente', 'Gestor', 'Executor', 'Revisor']}
                                        placeholder="Cliente"
                                        padding="4px 8px"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,1)', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderRadius: '0 0 10px 10px' }}>
              <button type="button" className="btn-ghost" onClick={() => { setLinkModalOpen(false); setSelectedLinkClient(null); setLinkServices([]); }}>Cancelar</button>
              {selectedLinkClient && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      setSaving(true);

                      if (linkModalOpen === 'merge' && editingClient) {
                        const asaasId = selectedLinkClient.metadata?.asaas_id;
                        await updateClient(editingClient.id, {
                          metadata: { ...editingClient.metadata, asaas_id: asaasId, show_in_agency: true }
                        });
                        await deleteClient(selectedLinkClient.id);
                        showToast(`Cliente mesclado com sucesso!`);

                        // Atualiza o formulário atual de edição com o asaas_id recém-adquirido
                        setForm(f => ({ ...f, metadata: { ...f.metadata, asaas_id: asaasId } }));
                      } else {
                        await updateClient(selectedLinkClient.id, {
                          metadata: { ...selectedLinkClient.metadata, show_in_agency: true }
                        });
                        await saveClientServices(selectedLinkClient.id, linkServices);
                        showToast(`Cliente "${selectedLinkClient.name}" vinculado à Agência com sucesso!`);
                      }

                      setLinkModalOpen(false);
                      setSelectedLinkClient(null);
                      setLinkServices([]);
                      fetchClients(true);
                    } catch (err) {
                      showToast(`Erro ao ${linkModalOpen === 'merge' ? 'mesclar' : 'vincular'}: ` + err.message, 'error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                  {linkModalOpen === 'merge' ? 'Mesclar Cliente' : 'Confirmar Vínculo'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}

      <style>{`
        .clientes-page {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 100%;
          position: relative;
        }

        /* Admin Tabs Segmented Control */
        .admin-tabs {
          display: inline-flex;
          background: rgba(0,0,0,0.3);
          padding: 6px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .admin-tab {
          padding: 10px 24px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.95rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-tab:hover:not(.active) {
          color: var(--text-main);
          background: rgba(255,255,255,0.05);
        }
        .admin-tab.active {
          background: #6366f1;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(99,102,241,0.4);
        }

        /* Header */
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-header h1 {
          margin: 0 0 6px;
          font-size: 1.75rem;
          color: var(--text-main);
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .page-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

        /* Buttons */
        .btn-primary {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          color: white; border: none; border-radius: 10px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          white-space: nowrap;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-ghost {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: transparent;
          color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 10px;
          font-size: 0.9rem; font-weight: 500; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }

        .btn-danger {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          background: rgba(239,68,68,0.15);
          color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 10px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.25); }
        .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

        /* KPIs */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
        }
        .kpi-card {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kpi-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 1.8rem; font-weight: 800; color: var(--text-main); }

        /* Filters */
        .filters-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          flex-wrap: wrap;
        }
        .search-box {
          display: flex; align-items: center; gap: 10px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 8px 14px;
          flex: 1; min-width: 220px;
          color: var(--text-muted);
        }
        .search-box input {
          flex: 1; background: none; border: none; outline: none;
          color: var(--text-main); font-size: 0.9rem;
        }
        .search-box input::placeholder { color: var(--text-muted); }
        .clear-search { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; }
        .status-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-chip {
          padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 500;
          background: transparent; border: 1px solid rgba(255,255,255,0.07);
          color: var(--text-muted); cursor: pointer; transition: all 0.2s;
        }
        .filter-chip:hover { background: rgba(255,255,255,0.05); }
        .filter-chip.active { background: rgba(99,102,241,0.2); border-color: rgba(99,102,241,0.5); color: #a5b4fc; }

        /* Table */
        .clients-table-wrapper { padding: 0; overflow-x: auto; }
        .clients-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .clients-table thead { background: rgba(0,0,0,0.2); }
        .clients-table th {
          padding: 14px 8px; text-align: left;
          font-size: 0.75rem; font-weight: 600;
          color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .client-row td {
          padding: 14px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          color: var(--text-main);
          vertical-align: middle;
        }
        .client-row:last-child td { border-bottom: none; }
        .client-row:hover { background: rgba(255,255,255,0.02); }
        .client-cell { display: flex; align-items: center; gap: 12px; }
        .client-avatar-img {
          width: 38px; height: 38px; border-radius: 10px;
          object-fit: cover; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .client-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.85rem; color: white; flex-shrink: 0;
        }
        .client-name { font-weight: 600; color: var(--text-main); white-space: normal; word-wrap: break-word; max-width: 200px; }
        .client-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; white-space: normal; word-wrap: break-word; max-width: 200px; }
        .pill {
          padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 500;
          background: rgba(99,102,241,0.12); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2);
        }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
        .value-cell { font-weight: 600; color: #34d399; }
        .date-cell { color: var(--text-muted); font-size: 0.85rem; }
        .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .action-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.2s;
          background: transparent;
        }
        .edit-btn { color: #93c5fd; }
        .edit-btn:hover { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); }
        .delete-btn { color: #f87171; }
        .delete-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); }
        .table-footer {
          padding: 12px 16px; font-size: 0.8rem;
          color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.04);
        }

        /* States */
        .loading-state, .empty-state, .error-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; padding: 60px; color: var(--text-muted);
          text-align: center;
        }
        .error-state { color: #f87171; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); display:flex; justify-content:flex-end; z-index:99999; animation:fadeIn 0.3s ease; }
        .modal-panel { width: 100%; max-width: 1200px; height: 100vh; background: #0f172a; display: flex; flex-direction: column; animation: slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); border-left: 1px solid rgba(255,255,255,0.1); box-shadow: -20px 0 50px rgba(0,0,0,0.8); }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          z-index: 10;
          background: rgba(15,23,42,1); backdrop-filter: none;
          flex-shrink: 0;
        }
        .modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #f8fafc; }
        .modal-close {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted); border-radius: 8px; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }

        /* Form */
        .modal-form { padding: 28px; flex: 1; overflow-y: auto; }
        .color-picker-row { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .avatar-preview {
          width: 64px; height: 64px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; font-weight: 700; color: white; flex-shrink: 0;
          transition: background 0.3s;
        }
        .color-options { display: flex; flex-direction: column; gap: 10px; }
        .field-label { font-size: 0.8rem; color: var(--text-muted); }
        .color-swatches { display: flex; gap: 8px; }
        .color-swatch {
          width: 28px; height: 28px; border-radius: 8px; border: 2px solid transparent;
          cursor: pointer; transition: transform 0.15s, border-color 0.15s;
        }
        .color-swatch:hover { transform: scale(1.1); }
        .color-swatch.selected { border-color: white; transform: scale(1.15); }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; }
        .form-field.span-2 { grid-column: span 2; }
        .form-field label {
          font-size: 0.8rem; font-weight: 500; color: var(--text-muted);
          display: flex; align-items: center; gap: 6px;
        }
        .form-field input, .form-field textarea, .form-field select {
          width: 100%; padding: 10px 14px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: var(--text-main);
          font-size: 0.85rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .form-field input:focus, .form-field textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .form-field textarea { resize: vertical; font-family: inherit; }
        .select-wrapper { position: relative; }
        .select-wrapper select {
          appearance: none; cursor: pointer; padding-right: 36px;
        }
        .select-wrapper select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .select-arrow {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); pointer-events: none;
        }

        .modal-footer {
          display: flex; justify-content: flex-end; gap: 12px;
          padding: 20px 28px;
          background: rgba(15,23,42,1);
          border-top: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }

        /* Confirm Dialog */
        .confirm-dialog {
          max-width: 420px; width: 100%;
          text-align: center; padding: 40px;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .confirm-dialog h3 { margin: 0; font-size: 1.2rem; color: var(--text-main); }
        .confirm-dialog p { margin: 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; }
        .confirm-actions { display: flex; gap: 12px; margin-top: 8px; }

        /* Toast (fallback global - agora usado dentro do modal) */
        .toast-notif {
          position: fixed; bottom: 28px; left: 28px; z-index: 999999;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; border-radius: 12px;
          font-size: 0.9rem; font-weight: 500;
          animation: slideInFromLeft 0.3s ease;
          box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        }
        .toast-notif.success {
          background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3);
          color: #34d399;
        }
        .toast-notif.error {
          background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
          color: #f87171;
        }
        @keyframes slideInFromLeft { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }

        /* Spinner */
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* === Abas do Modal === */
        .modal-tabs {
          display: flex; gap: 0;
          padding: 0 28px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(15,23,42,1);
          flex-shrink: 0;
        }
        .modal-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 20px;
          background: transparent; border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted); font-size: 0.85rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          background: rgba(15,23,42,1); margin-bottom: -1px;
          flex-shrink: 0;
        }
        .modal-tab:hover { color: var(--text-main); }
        .modal-tab.active { color: #a5b4fc; border-bottom-color: #6366f1; }
        .tab-badge {
          background: #6366f1; color: white;
          border-radius: 20px; padding: 1px 7px;
          font-size: 0.72rem; font-weight: 700;
        }

        /* === Serviços Contratados === */
        .services-section { display: flex; flex-direction: column; gap: 14px; }
        .svc-hint {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.85rem; color: var(--text-muted);
          padding: 10px 14px;
          background: rgba(99,102,241,0.08);
          border-radius: 8px; border: 1px solid rgba(99,102,241,0.15);
          margin: 0;
        }
        .svc-list { display: flex; flex-direction: column; gap: 8px; }
        .svc-row {
          padding: 14px 16px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(15, 23, 42, 0.4);
          transition: all 0.3s;
        }
        .svc-row.on { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .svc-left {
          display: flex; align-items: center; gap: 12px;
          cursor: pointer;
        }
        .svc-toggle-sw {
          width: 42px; height: 22px; border-radius: 12px;
          background: rgba(255,255,255,0.05);
          position: relative; transition: all 0.3s; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .svc-toggle-sw.on { 
          background: linear-gradient(135deg, #6366f1, #3b82f6); 
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 0 10px rgba(99,102,241,0.4);
        }
        .svc-knob {
          width: 16px; height: 16px; border-radius: 50%; background: white;
          position: absolute; top: 2px; left: 2px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .svc-toggle-sw.on .svc-knob { left: 22px; }
        .svc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
        .svc-name { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
        .svc-desc { margin: 2px 0 0; font-size: 0.78rem; color: var(--text-muted); }
        .svc-status-pills {
          display: flex; gap: 8px; margin-top: 12px; margin-left: 54px; flex-wrap: wrap;
        }
        .svc-status-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.02); color: var(--text-muted);
          transition: all 0.2s;
        }
        .svc-status-pill.active.active { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #34d399; box-shadow: 0 4px 12px rgba(16,185,129,0.1); }
        .svc-status-pill.pending.active { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #fcd34d; box-shadow: 0 4px 12px rgba(245,158,11,0.1); }
        .svc-status-pill.suspended.active { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #f87171; box-shadow: 0 4px 12px rgba(239,68,68,0.1); }

        /* Responsive */
        @media (max-width: 700px) {
          .form-grid { grid-template-columns: 1fr; }
          .form-field.span-2 { grid-column: span 1; }
          .kpi-row { grid-template-columns: 1fr 1fr; }
          .filters-bar { flex-direction: column; align-items: stretch; }
          .clients-table th:nth-child(4),
          .clients-table td:nth-child(4),
          .clients-table th:nth-child(5),
          .clients-table td:nth-child(5) { display: none; }
        }

        /* Menu Suspenso de Status */
        .status-dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--card-bg, #0f172a);
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
          border-radius: 8px;
          padding: 4px;
          z-index: 1000;
          min-width: 120px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          margin-top: 4px;
        }

        .status-dropdown-container:hover .status-dropdown-menu {
          display: block;
        }

        .status-dropdown-item {
          padding: 8px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .status-dropdown-item:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}
