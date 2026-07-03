import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Plus, X, ChevronDown, Edit2, Trash2, CheckCircle2,
  AlertCircle, Zap, Wrench, Sparkles, Settings, Users,
  FileText, TrendingUp, RefreshCw, CheckCheck, ArrowLeft,
  ArrowRight, Calendar, LayoutGrid, ChevronLeft, ChevronRight,
  Check, User
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
═══════════════════════════════════════════════════════════ */
const CATEGORIES = [
  { value: 'melhoria', label: 'Melhoria', icon: <TrendingUp size={11} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  { value: 'correcao', label: 'Correção', icon: <Wrench size={11} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { value: 'feature', label: 'Nova Feature', icon: <Sparkles size={11} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  { value: 'configuracao', label: 'Configuração', icon: <Settings size={11} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  { value: 'reuniao', label: 'Reunião', icon: <Users size={11} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  { value: 'conteudo', label: 'Conteúdo', icon: <FileText size={11} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
  { value: 'outro', label: 'Outro', icon: <Zap size={11} />, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
];

const MESES = [
  { num: 1, label: 'Janeiro', short: 'Jan', color: '#6366f1', accent: 'rgba(99,102,241,0.12)' },
  { num: 2, label: 'Fevereiro', short: 'Fev', color: '#8b5cf6', accent: 'rgba(139,92,246,0.12)' },
  { num: 3, label: 'Março', short: 'Mar', color: '#3b82f6', accent: 'rgba(59,130,246,0.12)' },
  { num: 4, label: 'Abril', short: 'Abr', color: '#06b6d4', accent: 'rgba(6,182,212,0.12)' },
  { num: 5, label: 'Maio', short: 'Mai', color: '#10b981', accent: 'rgba(16,185,129,0.12)' },
  { num: 6, label: 'Junho', short: 'Jun', color: '#22c55e', accent: 'rgba(34,197,94,0.12)' },
  { num: 7, label: 'Julho', short: 'Jul', color: '#f59e0b', accent: 'rgba(245,158,11,0.12)' },
  { num: 8, label: 'Agosto', short: 'Ago', color: '#f97316', accent: 'rgba(249,115,22,0.12)' },
  { num: 9, label: 'Setembro', short: 'Set', color: '#ef4444', accent: 'rgba(239,68,68,0.12)' },
  { num: 10, label: 'Outubro', short: 'Out', color: '#ec4899', accent: 'rgba(236,72,153,0.12)' },
  { num: 11, label: 'Novembro', short: 'Nov', color: '#a855f7', accent: 'rgba(168,85,247,0.12)' },
  { num: 12, label: 'Dezembro', short: 'Dez', color: '#64748b', accent: 'rgba(100,116,139,0.12)' },
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: '#10b981', bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.32)' },
  { value: 'media', label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.32)' },
  { value: 'alta', label: 'Alta', color: '#f97316', bg: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.32)' },
  { value: 'urgente', label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.13)', border: 'rgba(239,68,68,0.32)' },
];
const LOCAIS = ['Captação', 'Edição', 'Chat Interno', 'Visão Cliente', 'Comercial', 'Financeiro', 'Marketing', 'Suporte', 'Outro'];
const getPrio = (v) => PRIORIDADES.find(p => p.value === v) || null;
const getItemPrio = (v) => v ? PRIORIDADES.find(p => p.value === v) : null;
const PRIO_CYCLE = [null, 'baixa', 'media', 'alta', 'urgente'];


/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const getCat = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[CATEGORIES.length - 1];
const getMes = (n) => MESES.find(m => m.num === n) || MESES[0];
const todayISO = () => new Date().toISOString().split('T')[0];
const genId = () => Math.random().toString(36).slice(2, 9);

const fmtDateLong = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};
const fmtDateCard = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ═══════════════════════════════════════════════════════════
   MultiCatSelect — selecionar múltiplas categorias
═══════════════════════════════════════════════════════════ */
const MultiCatSelect = ({ value = [], onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (v) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const selected = CATEGORIES.filter(c => value.includes(c.value));

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 42, background: 'rgba(255,255,255,0.05)', border: `1px solid ${open ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', transition: '0.2s' }}>
        {selected.length === 0
          ? <span style={{ color: '#64748b', fontSize: '0.8rem', flex: 1 }}>Selecionar categorias...</span>
          : selected.map(cat => (
            <span key={cat.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.63rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: cat.color, background: cat.bg, border: `1px solid ${cat.border}` }}>
              {cat.icon} {cat.label}
            </span>
          ))
        }
        <ChevronDown size={11} style={{ color: '#64748b', marginLeft: 'auto', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,0.6)', overflow: 'hidden', animation: 'pgDrop 0.13s ease' }}>
          {CATEGORIES.map(cat => {
            const sel = value.includes(cat.value);
            return (
              <div key={cat.value} onClick={() => toggle(cat.value)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', cursor: 'pointer', background: sel ? 'rgba(99,102,241,0.08)' : 'transparent', borderLeft: `3px solid ${sel ? cat.color : 'transparent'}`, transition: '0.12s' }}
                onMouseOver={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${sel ? cat.color : 'rgba(255,255,255,0.2)'}`, background: sel ? cat.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '0.15s' }}>
                  {sel && <Check size={10} style={{ color: 'white' }} />}
                </div>
                <span style={{ color: cat.color }}>{cat.icon}</span>
                <span style={{ fontSize: '0.8rem', color: '#f1f5f9' }}>{cat.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ChecklistBuilder — criar itens no formulário
═══════════════════════════════════════════════════════════ */
const ChecklistBuilder = ({ items, onChange }) => {
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef(null);
  const dragRef = useRef({ dragging: null });

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const add = () => {
    const text = input.trim();
    if (!text) return;
    onChange([...items, { id: genId(), text, done: false }]);
    setInput('');
    setTimeout(() => {
      if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.focus(); }
    }, 0);
  };
  const remove = (id) => onChange(items.filter(i => i.id !== id));

  /* cicla prioridade do item: null → baixa → media → alta → urgente → null */
  const cyclePrio = (id) => {
    const item = items.find(i => i.id === id);
    const cur = item?.prioridade || null;
    const idx = PRIO_CYCLE.indexOf(cur);
    const next = PRIO_CYCLE[(idx + 1) % PRIO_CYCLE.length];
    onChange(items.map(i => i.id === id ? { ...i, prioridade: next } : i));
  };

  const startEdit = (item) => { setEditId(item.id); setEditText(item.text); };
  const saveEdit = () => {
    if (!editText.trim()) return;
    onChange(items.map(i => i.id === editId ? { ...i, text: editText.trim() } : i));
    setEditId(null); setEditText('');
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } };
  const handleEditKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { setEditId(null); }
  };

  /* drag-to-reorder */
  const onDragStart = (e, id) => {
    dragRef.current.dragging = id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { try { e.target.style.opacity = '0.35'; } catch { } }, 0);
  };
  const onDragEnd = (e) => { try { e.currentTarget.style.opacity = '1'; } catch { } dragRef.current.dragging = null; };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (e, targetId) => {
    e.preventDefault();
    const fromId = dragRef.current.dragging;
    if (!fromId || fromId === targetId) return;
    const fromIdx = items.findIndex(i => i.id === fromId);
    const toIdx = items.findIndex(i => i.id === targetId);
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, idx) => (
        <div key={item.id}
          draggable
          onDragStart={e => onDragStart(e, item.id)}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={e => onDrop(e, item.id)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: editId === item.id ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px', border: `1px solid ${editId === item.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s', cursor: 'default' }}>
          {/* handle drag */}
          <span title="Arrastar para reordenar"
            style={{ color: '#334155', fontSize: '0.85rem', paddingTop: 3, flexShrink: 0, cursor: 'grab', userSelect: 'none', lineHeight: 1 }}>&#8942;&#8942;</span>
          <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, minWidth: 18, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>{idx + 1}.</span>
          {editId === item.id ? (
            <textarea autoFocus value={editText}
              onChange={e => { setEditText(e.target.value); autoResize(e.target); }}
              onKeyDown={handleEditKey}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'none', overflowY: 'hidden', lineHeight: 1.55, padding: '2px 0' }} />
          ) : (
            <span style={{ flex: 1, fontSize: '0.8rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingTop: 3, lineHeight: 1.5 }}>{item.text}</span>
          )}
          {/* tag de prioridade do item */}
          {editId !== item.id && (() => {
            const ip = getItemPrio(item.prioridade);
            return (
              <button onClick={(e) => { e.stopPropagation(); cyclePrio(item.id); }}
                title={ip ? `Prioridade: ${ip.label} (clique para mudar)` : 'Sem prioridade (clique para adicionar)'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: ip ? 'auto' : 18, height: 18, borderRadius: 4, padding: ip ? '0 6px' : '0', border: `1.5px solid ${ip ? ip.color : 'rgba(255,255,255,0.1)'}`, background: ip ? ip.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', gap: 3 }}>
                {ip
                  ? <span style={{ fontSize: '0.58rem', fontWeight: 900, color: ip.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{ip.label}</span>
                  : <span style={{ fontSize: '0.65rem', color: '#334155', lineHeight: 1 }}>&#9679;</span>
                }
              </button>
            );
          })()}
          {editId === item.id ? (
            <button onClick={saveEdit}
              style={{ background: 'rgba(16,185,129,0.18)', border: 'none', color: '#10b981', cursor: 'pointer', padding: '3px 9px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>&#10003;</button>
          ) : (
            <button onClick={() => startEdit(item)} title="Editar"
              style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center', transition: '0.15s', flexShrink: 0 }}
              onMouseOver={e => e.currentTarget.style.color = '#a5b4fc'}
              onMouseOut={e => e.currentTarget.style.color = '#475569'}>
              <Edit2 size={11} />
            </button>
          )}
          <button onClick={() => remove(item.id)} title="Remover"
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 3, borderRadius: 4, display: 'flex', alignItems: 'center', transition: '0.15s', flexShrink: 0 }}
            onMouseOver={e => e.currentTarget.style.color = '#f87171'}
            onMouseOut={e => e.currentTarget.style.color = '#475569'}>
            <X size={12} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <textarea ref={inputRef} value={input}
          onChange={e => { setInput(e.target.value); autoResize(e.target); }}
          onKeyDown={handleKey}
          placeholder="Adicionar item... (Enter para confirmar)"
          rows={1}
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: '0.79rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s, height 0.15s', resize: 'none', overflowY: 'hidden', lineHeight: 1.55, minHeight: 36 }}
          onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.55)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
        <button onClick={add}
          style={{ padding: '8px 13px', borderRadius: 8, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 700, transition: '0.15s', flexShrink: 0 }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.32)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ModalShell + MHead + MFoot
═══════════════════════════════════════════════════════════ */
const ModalShell = ({ children, onClose, maxWidth = 520 }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ width: '100%', maxWidth, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: 15, maxHeight: '90vh', overflowY: 'auto' }}>
      {children}
    </div>
  </div>
);
const MHead = ({ title, sub, onClose }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
    <div>
      <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#f1f5f9', fontWeight: 800 }}>{title}</h3>
      {sub && <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748b' }}>{sub}</p>}
    </div>
    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', padding: '5px 7px', borderRadius: 7, display: 'flex', alignItems: 'center', transition: '0.2s', flexShrink: 0 }}
      onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}>
      <X size={15} />
    </button>
  </div>
);
const MFoot = ({ onClose, onSave, saving, label }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 2 }}>
    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.81rem', transition: '0.2s' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>Cancelar</button>
    <button onClick={onSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.81rem', display: 'flex', alignItems: 'center', gap: 6, boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)', transition: '0.2s' }}>
      {saving ? <><RefreshCw size={12} style={{ animation: 'pgSpin 0.8s linear infinite' }} /> Salvando...</> : <><CheckCircle2 size={12} /> {label}</>}
    </button>
  </div>
);
const INP = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 12px', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box', transition: '0.2s', fontFamily: 'inherit' };
const LBL = { fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 };
const focOn = e => { e.target.style.borderColor = 'rgba(99,102,241,0.55)'; };
const focOff = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; };

/* ═══════════════════════════════════════════════════════════
   ErrBanner + IBtn + Badge
═══════════════════════════════════════════════════════════ */
const ErrBanner = ({ msg }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '8px 12px', color: '#f87171', fontSize: '0.79rem' }}>
    <AlertCircle size={13} /> {msg}
  </div>
);
const IBtn = ({ onClick, title, children, hc, ht }) => (
  <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px 5px', borderRadius: 5, transition: '0.2s', display: 'flex', alignItems: 'center' }}
    onMouseOver={e => { e.currentTarget.style.background = hc; e.currentTarget.style.color = ht; }}
    onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#475569'; }}>
    {children}
  </button>
);
const Badge = ({ data }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.63rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, color: data.color, background: data.bg, border: `1px solid ${data.border || data.bg}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
    {data.icon} {data.label}
  </span>
);

/* ═══════════════════════════════════════════════════════════
   PgModal — Criar / Editar demanda
═══════════════════════════════════════════════════════════ */
const PgModal = ({ entry, table, defaultMes, defaultAno, onClose, onSaved, user }) => {
  const isEdit = !!entry?.id;
  const isAfazer = table === 'programacao_afazer';
  const [form, setForm] = useState({
    data: entry?.data || todayISO(),
    categorias: entry?.categorias || [],
    checklists: entry?.checklists || [],
    description: entry?.description || '',
    prioridade: entry?.prioridade || 'media',
    local_ajuste: entry?.local_ajuste || '',
  });
  const [descExpanded, setDescExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const save = async () => {
    if (form.categorias.length === 0) { setError('Selecione ao menos uma categoria.'); return; }
    setSaving(true); setError('');
    try {
      const d = new Date(form.data + 'T00:00:00');
      const dataMes = d.getMonth() + 1;
      const dataAno = d.getFullYear();
      const diaStr = String(d.getDate()).padStart(2, '0');
      const mesStr = String(dataMes).padStart(2, '0');

      /* helper: checa duplicata de data na tabela finalizadas */
      const checkDup = async (mes, ano, data) => {
        const { data: rows } = await supabase.from('programacao_finalizadas')
          .select('id').eq('data', data).eq('mes', mes).eq('ano', ano).limit(1);
        return !!(rows && rows.length);
      };

      /* Validação: mês da data ≠ coluna clicada */
      if (table === 'programacao_finalizadas' && !isEdit && defaultMes && dataMes !== defaultMes) {
        setSaving(false);
        const mesColuna = getMes(defaultMes).label;
        const mesData = getMes(dataMes).label;
        const fmtD = `${diaStr}/${mesStr}`;
        const resp = window.confirm(
          `⚠️ Atenção!\n\nVocê está criando uma demanda na coluna de ${mesColuna}, mas a data informada é ${fmtD} (referente a ${mesData}).\n\nDeseja criar o card em ${mesData} com a data ${fmtD}?\n\n✅ OK = Criar em ${mesData} (${fmtD})\n❌ Cancelar = Voltar para ajustar`
        );
        if (!resp) return;
        /* verifica duplicata no mês correto */
        const isDup = await checkDup(dataMes, dataAno, form.data);
        if (isDup) { setError(`Já existe uma demanda com a data ${diaStr}/${mesStr} em ${getMes(dataMes).label}.`); return; }
        setSaving(true);
        const { error: err } = await supabase.from(table).insert({ data: form.data, categorias: form.categorias, checklists: form.checklists, description: form.description.trim(), user_name: user?.name || 'Desconhecido', user_id: user?.id || null, mes: dataMes, ano: dataAno });
        if (err) throw err;
        onSaved(); return;
      }

      /* Verifica duplicata no mês normal */
      if (table === 'programacao_finalizadas' && !isEdit) {
        const isDup = await checkDup(dataMes, dataAno, form.data);
        if (isDup) { setError(`Já existe uma demanda com a data ${diaStr}/${mesStr} em ${getMes(dataMes).label}.`); setSaving(false); return; }
      }

      /* payload base */
      const basePayload = {
        categorias: form.categorias,
        checklists: form.checklists,
        description: form.description.trim(),
        user_name: user?.name || 'Desconhecido',
        user_id: user?.id || null,
      };

      if (isAfazer) {
        /* A Fazer: sem data, com prioridade + local */
        const payload = { ...basePayload, prioridade: form.prioridade, local_ajuste: form.local_ajuste.trim() };
        const { error: err } = isEdit
          ? await supabase.from(table).update(payload).eq('id', entry.id)
          : await supabase.from(table).insert(payload);
        if (err) throw err;
        onSaved(); return;
      }

      const payload = {
        ...basePayload,
        data: form.data,
        ...(table === 'programacao_finalizadas' ? {
          mes: dataMes,
          ano: dataAno,
        } : {}),
      };
      const { error: err } = isEdit
        ? await supabase.from(table).update(payload).eq('id', entry.id)
        : await supabase.from(table).insert(payload);
      if (err) throw err;
      onSaved();
    } catch (e) { setError(e?.message || 'Erro ao salvar.'); } finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose}>
      <MHead title={isEdit ? '✏️ Editar Demanda' : '📝 Nova Demanda'}
        sub={isAfazer ? 'Preencha prioridade, área, categorias, checklist e descrição.' : 'Preencha a data, categorias, checklist e descrição.'}
        onClose={onClose} />
      {error && <ErrBanner msg={error} />}

      {/* Campo Data — apenas para Finalizadas */}
      {!isAfazer && (
        <div>
          <label style={LBL}>📅 Data *</label>
          <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
            style={{ ...INP, colorScheme: 'dark' }} onFocus={focOn} onBlur={focOff} />
        </div>
      )}

      {/* Prioridade — apenas para A Fazer */}
      {isAfazer && (
        <div>
          <label style={LBL}>⚡ Prioridade *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {PRIORIDADES.map(p => (
              <button key={p.value} type="button"
                onClick={() => set('prioridade', p.value)}
                style={{ padding: '8px 6px', borderRadius: 9, border: `2px solid ${form.prioridade === p.value ? p.color : 'rgba(255,255,255,0.08)'}`, background: form.prioridade === p.value ? p.bg : 'rgba(255,255,255,0.03)', color: form.prioridade === p.value ? p.color : '#64748b', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.18s', letterSpacing: '0.01em' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Local do Ajuste — apenas para A Fazer */}
      {isAfazer && (
        <div>
          <label style={LBL}>📌 Área / Local <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(onde será o ajuste)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: form.local_ajuste && !LOCAIS.includes(form.local_ajuste) ? 6 : 0 }}>
            {LOCAIS.map(loc => (
              <button key={loc} type="button"
                onClick={() => set('local_ajuste', form.local_ajuste === loc ? '' : loc)}
                style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${form.local_ajuste === loc ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: form.local_ajuste === loc ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', color: form.local_ajuste === loc ? '#a5b4fc' : '#64748b', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                {loc}
              </button>
            ))}
          </div>
          <input value={form.local_ajuste} onChange={e => set('local_ajuste', e.target.value)}
            placeholder="Ou digite uma área personalizada..."
            style={{ ...INP, marginTop: 6 }} onFocus={focOn} onBlur={focOff} />
        </div>
      )}

      <div>
        <label style={LBL}>🏷️ Categorias * <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>(múltipla seleção)</span></label>
        <MultiCatSelect value={form.categorias} onChange={v => set('categorias', v)} />
      </div>

      <div>
        <label style={LBL}>✅ Checklist <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none' }}>({form.checklists.length} {form.checklists.length === 1 ? 'item' : 'itens'})</span></label>
        <ChecklistBuilder items={form.checklists} onChange={v => set('checklists', v)} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ ...LBL, marginBottom: 0 }}>📄 Descrição</label>
          <button
            type="button"
            onClick={() => setDescExpanded(!descExpanded)}
            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s' }}
            onMouseOver={e => e.target.style.color = '#818cf8'}
            onMouseOut={e => e.target.style.color = '#6366f1'}
          >
            {descExpanded ? 'Recolher Campo' : 'Expandir Campo'}
          </button>
        </div>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Descreva os detalhes desta demanda..."
          rows={descExpanded ? 12 : 3} style={{ ...INP, resize: 'vertical', lineHeight: 1.6 }} onFocus={focOn} onBlur={focOff} />
      </div>

      <MFoot onClose={onClose} onSave={save} saving={saving} label={isEdit ? 'Salvar' : 'Criar'} />
    </ModalShell>
  );
};

/* ═══════════════════════════════════════════════════════════
   CardDetailModal — visualizar card
═══════════════════════════════════════════════════════════ */
const CardDetailModal = ({ entry, table, onClose, onEdit, onDelete, onUpdate }) => {
  const isAfazer = table === 'programacao_afazer';
  const cats = (entry.categorias || []).map(v => getCat(v));
  const [items, setItems] = useState(entry.checklists || []);
  const total = items.length;
  const done = items.filter(c => c.done).length;

  const toggleItem = async (id) => {
    if (!isAfazer) return;
    const next = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setItems(next);
    const { data: updated, error } = await supabase
      .from('programacao_afazer')
      .update({ checklists: next })
      .eq('id', entry.id)
      .select()
      .single();
    if (!error && updated) onUpdate?.(updated);
  };

  return (
    <ModalShell onClose={onClose} maxWidth={560}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {isAfazer ? (() => {
              const prio = getPrio(entry.prioridade) || PRIORIDADES[0];
              return (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.78rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20, color: prio.color, background: prio.bg, border: `1px solid ${prio.border}` }}>{prio.label}</span>
                  {entry.local_ajuste && <span style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '2px 9px', fontWeight: 600 }}>{entry.local_ajuste}</span>}
                </>
              );
            })() : (
              <>
                <Calendar size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#f1f5f9', fontWeight: 800, textTransform: 'capitalize' }}>{fmtDateLong(entry.data)}</h3>
              </>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {cats.map(cat => <Badge key={cat.value} data={cat} />)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          <IBtn onClick={onEdit} title="Editar" hc='rgba(99,102,241,0.18)' ht='#a5b4fc'><Edit2 size={13} /></IBtn>
          <IBtn onClick={onDelete} title="Excluir" hc='rgba(239,68,68,0.18)' ht='#f87171'><Trash2 size={13} /></IBtn>
          <IBtn onClick={onClose} title="Fechar" hc='rgba(255,255,255,0.07)' ht='#94a3b8'><X size={13} /></IBtn>
        </div>
      </div>

      {/* Checklist */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={LBL}>Checklist</label>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: done === total && total > 0 ? '#10b981' : '#64748b' }}>{done}/{total} concluídos</span>
          </div>
          {/* Barra de progresso (apenas A Fazer) */}
          {isAfazer && (
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ height: '100%', borderRadius: 4, background: done === total && total > 0 ? '#10b981' : '#6366f1', width: `${total > 0 ? (done / total) * 100 : 0}%`, transition: 'width 0.4s ease' }} />
            </div>
          )}
          {items.map((item, idx) => (
            <div key={item.id || idx}
              onClick={() => isAfazer && toggleItem(item.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 13px', borderRadius: 9, background: isAfazer && item.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isAfazer && item.done ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.07)'}`, cursor: isAfazer ? 'pointer' : 'default', transition: 'all 0.18s', userSelect: 'none' }}
              onMouseOver={e => { if (isAfazer) e.currentTarget.style.background = item.done ? 'rgba(16,185,129,0.09)' : 'rgba(255,255,255,0.05)'; }}
              onMouseOut={e => { if (isAfazer) e.currentTarget.style.background = item.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)'; }}>
              {isAfazer ? (
                <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${item.done ? '#10b981' : '#334155'}`, background: item.done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, transition: 'all 0.2s' }}>
                  {item.done && <Check size={10} color="white" strokeWidth={3} />}
                </div>
              ) : (
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569', minWidth: 22, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>{idx + 1}.</span>
              )}
              <span style={{ flex: 1, fontSize: '0.83rem', color: isAfazer && item.done ? '#475569' : '#e2e8f0', lineHeight: 1.55, textDecoration: isAfazer && item.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>{item.text}</span>
              {/* tag de prioridade do item */}
              {item.prioridade && (() => {
                const ip = getItemPrio(item.prioridade);
                return ip ? (
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, padding: '2px 7px', borderRadius: 4, color: ip.color, background: ip.bg, border: `1px solid ${ip.border}`, flexShrink: 0, letterSpacing: '0.02em', opacity: item.done ? 0.45 : 1 }}>
                    {ip.label}
                  </span>
                ) : null;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Descrição */}
      {entry.description && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '13px 15px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <label style={LBL}>Descrição</label>
          <p style={{ margin: 0, fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{entry.description}</p>
        </div>
      )}

      {total === 0 && !entry.description && (
        <p style={{ margin: 0, textAlign: 'center', color: '#475569', fontSize: '0.78rem', padding: '12px 0' }}>Sem checklist ou descrição adicionados.</p>
      )}
    </ModalShell>
  );
};

/* ═══════════════════════════════════════════════════════════
   PgCard — card clicável (título = data, badges = categorias)
═══════════════════════════════════════════════════════════ */
const PgCard = ({ entry, onOpen, onEdit, onDelete, isAfazer, onConcluir }) => {
  const cats = (entry.categorias || []).map(v => getCat(v));
  const total = entry.checklists?.length || 0;
  const done = entry.checklists?.filter(c => c.done).length || 0;
  const accent = cats[0]?.color || '#6366f1';
  const [conc, setConc] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleConcluir = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Mover esta demanda para Finalizadas?')) return;
    setConc(true);
    const d = new Date(entry.data + 'T00:00:00');
    await supabase.from('programacao_afazer').delete().eq('id', entry.id);
    await supabase.from('programacao_finalizadas').insert({
      data: entry.data,
      categorias: entry.categorias,
      checklists: entry.checklists,
      description: entry.description,
      mes: d.getMonth() + 1,
      ano: d.getFullYear(),
      user_name: entry.user_name,
      user_id: entry.user_id,
    });
    setConc(false);
    onConcluir?.();
  };

  return (
    <div
      data-drag-card="true"
      draggable={!isAfazer}
      onDragStart={!isAfazer ? (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({ id: entry.id, mes: entry.mes }));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { try { e.target.style.opacity = '0.45'; e.target.style.transform = 'scale(0.97)'; } catch { } }, 0);
      } : undefined}
      onDragEnd={!isAfazer ? (e) => {
        e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = '';
      } : undefined}
      onClick={onOpen}
      style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${accent}`, borderRadius: 11, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 9, cursor: isAfazer ? 'pointer' : 'grab', transition: 'box-shadow 0.2s, transform 0.15s', userSelect: 'none' }}
      onMouseOver={e => { e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px ${accent}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>

      {/* Linha 1: Prioridade (afazer) ou Data (finalizadas) + ações */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isAfazer ? (() => {
            const prio = getPrio(entry.prioridade) || PRIORIDADES[0];
            return (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 800, padding: '2px 9px', borderRadius: 20, color: prio.color, background: prio.bg, border: `1px solid ${prio.border}` }}>
                {prio.label}
              </span>
            );
          })() : (
            <>
              <Calendar size={12} style={{ color: accent, flexShrink: 0 }} />
              <span style={{ fontSize: '0.87rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.01em' }}>{fmtDateCard(entry.data)}</span>
            </>
          )}
          {isAfazer && entry.local_ajuste && (
            <span style={{ fontSize: '0.65rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1px 7px', fontWeight: 600 }}>{entry.local_ajuste}</span>
          )}
          {isAfazer && entry.user_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.63rem', color: '#94a3b8', background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 10, padding: '1px 7px', fontWeight: 600, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <User size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
              {entry.user_name.split(' ')[0]}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 1 }} onClick={e => e.stopPropagation()}>
          <IBtn onClick={onEdit} title="Editar" hc='rgba(99,102,241,0.18)' ht='#a5b4fc'><Edit2 size={10} /></IBtn>
          <IBtn onClick={onDelete} title="Excluir" hc='rgba(239,68,68,0.18)' ht='#f87171'><Trash2 size={10} /></IBtn>
        </div>
      </div>

      {/* Linha 2: Categorias */}
      {cats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {cats.map(cat => <Badge key={cat.value} data={cat} />)}
        </div>
      )}

      {/* Descrição resumida com botão de expansão */}
      {entry.description && (
        <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{
            margin: 0,
            fontSize: '0.76rem',
            color: '#94a3b8',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: isExpanded ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {entry.description}
          </p>
          {entry.description.length > 80 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              style={{
                background: 'none',
                border: 'none',
                color: accent,
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 0',
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {isExpanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>
      )}

      {/* Linha 3: Progresso do checklist */}
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', color: '#475569' }}>Checklist</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: done === total ? '#10b981' : '#64748b' }}>{done}/{total}</span>
          </div>
          <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: done === total ? '#10b981' : accent, width: `${(done / total) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* Linha 4: rodapé */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize: '0.6rem', color: '#334155', letterSpacing: '0.02em' }}>↗ clique para detalhes</span>
        {isAfazer && (
          <button onClick={handleConcluir} disabled={conc}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: '0.62rem', fontWeight: 700, transition: '0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(16,185,129,0.22)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}>
            {conc ? <RefreshCw size={9} style={{ animation: 'pgSpin 0.8s linear infinite' }} /> : <CheckCheck size={9} />} Finalizar
          </button>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   KCol — coluna Kanban genérica (suporta drop zone)
═══════════════════════════════════════════════════════════ */
const KCol = ({ col, children, onAdd, count, maxH = 'calc(100vh - 310px)', targetMes, onDropCard }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    if (!onDropCard) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!onDropCard) return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.id && data.mes !== targetMes) onDropCard(data.id, targetMes);
    } catch { }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', minWidth: 260, flex: '1 1 260px', maxWidth: 390, background: isDragOver ? `${col.color}08` : 'rgba(255,255,255,0.02)', borderRadius: 14, border: isDragOver ? `2px solid ${col.color}55` : '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', boxShadow: isDragOver ? `0 0 0 3px ${col.color}18, inset 0 0 40px ${col.color}06` : 'none', transition: 'all 0.18s ease' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '2px solid rgba(255,255,255,0.06)', background: `linear-gradient(180deg,${col.accent},transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {col.icon && <span style={{ color: col.color }}>{col.icon}</span>}
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f1f5f9' }}>{col.label}</span>
          <span style={{ background: `${col.color}25`, color: col.color, fontSize: '0.67rem', fontWeight: 800, padding: '1px 8px', borderRadius: 10 }}>{count}</span>
        </div>
        {onAdd && (
          <button onClick={onAdd}
            style={{ background: `${col.color}18`, border: `1px solid ${col.color}30`, color: col.color, cursor: 'pointer', padding: '4px 8px', borderRadius: 7, display: 'flex', alignItems: 'center', transition: '0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = `${col.color}30`}
            onMouseOut={e => e.currentTarget.style.background = `${col.color}18`}>
            <Plus size={13} />
          </button>
        )}
      </div>
      <div style={{ padding: '9px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', maxHeight: maxH, minHeight: 100 }}>
        {children}
        {count === 0 && (
          <div style={{ textAlign: 'center', padding: '18px 0 8px', color: '#475569', fontSize: '0.74rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} style={{ opacity: 0.35 }} />
            </div>
            {isDragOver ? <span style={{ color: col.color, fontWeight: 700 }}>Soltar aqui!</span> : 'Nada aqui ainda'}
          </div>
        )}
        {onAdd && (
          <button onClick={onAdd}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, width: '100%', padding: '8px', marginTop: 2, borderRadius: 8, border: `1.5px dashed ${col.color}40`, background: 'transparent', color: `${col.color}80`, cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s', flexShrink: 0 }}
            onMouseOver={e => { e.currentTarget.style.background = `${col.color}10`; e.currentTarget.style.color = col.color; e.currentTarget.style.borderColor = `${col.color}70`; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = `${col.color}80`; e.currentTarget.style.borderColor = `${col.color}40`; }}>
            <Plus size={12} /> Adicionar
          </button>
        )}
      </div>
    </div>
  );
};

/* Skeleton + SQLErr */
const Skeleton = ({ cols = 2 }) => (
  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
    {Array.from({ length: cols }, (_, i) => (
      <div key={i} style={{ minWidth: 260, flex: '1 1 260px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ height: 42, background: 'rgba(255,255,255,0.04)', animation: 'pgPulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
        <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[1, 2].map(j => <div key={j} style={{ height: 90, borderRadius: 9, background: 'rgba(255,255,255,0.03)', animation: 'pgPulse 1.5s ease infinite', animationDelay: `${j * 0.15}s` }} />)}
        </div>
      </div>
    ))}
  </div>
);
const SQLErr = ({ name, sql, onRetry }) => (
  <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 11, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><AlertCircle size={15} style={{ color: '#f59e0b' }} /><h3 style={{ margin: 0, color: '#f59e0b', fontSize: '0.88rem', fontWeight: 700 }}>Tabela "{name}" não encontrada</h3></div>
    <pre style={{ background: '#0f172a', borderRadius: 8, padding: 14, fontSize: '0.67rem', color: '#a5b4fc', lineHeight: 1.9, overflowX: 'auto', margin: 0, border: '1px solid rgba(99,102,241,0.2)', fontFamily: 'monospace' }}>{sql}</pre>
    <button onClick={onRetry} style={{ alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 7, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.79rem' }}
      onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.3)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}>
      <RefreshCw size={12} /> Tentar novamente
    </button>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function TarefasFeitas() {
  const { user } = useAuth();

  /* Vista */
  const [vista, setVista] = useState('main');
  const [ano, setAno] = useState(new Date().getFullYear());

  /* A Fazer */
  const [afazer, setAfazer] = useState([]);
  const [loadingA, setLoadingA] = useState(true);
  const [tableErrA, setTableErrA] = useState(false);

  /* Finalizadas */
  const [finalizadas, setFinalizadas] = useState([]);
  const [loadingF, setLoadingF] = useState(true);
  const [tableErrF, setTableErrF] = useState(false);

  /* Modal criar/editar */
  const [pgModal, setPgModal] = useState(false);
  const [pgTable, setPgTable] = useState('programacao_afazer');
  const [pgEntry, setPgEntry] = useState(null);
  const [pgMes, setPgMes] = useState(1);
  const [pgAno, setPgAno] = useState(new Date().getFullYear());

  /* Modal detalhe */
  const [detModal, setDetModal] = useState(false);
  const [detEntry, setDetEntry] = useState(null);
  const [detTable, setDetTable] = useState('');

  /* DnD cards entre colunas de meses */
  const handleCardDrop = async (cardId, targetMes) => {
    const card = finalizadas.find(e => e.id === cardId);
    if (!card) return;

    const orig = new Date(card.data + 'T00:00:00');
    const day = orig.getDate();
    const year = orig.getFullYear();

    /* calcula novo mês, respeitando limite de dias (ex: 31 em fev) */
    const maxDay = new Date(year, targetMes, 0).getDate();
    const newDay = Math.min(day, maxDay);
    const newData = `${year}-${String(targetMes).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;

    /* impede data duplicada na coluna destino */
    const dupLocal = finalizadas.find(e => e.id !== cardId && e.mes === targetMes && e.data === newData);
    if (dupLocal) {
      alert(`⚠️ Conflito!\n\nJá existe um card com a data ${fmtDateCard(newData)} em ${getMes(targetMes).label}.\n\nNão é permitido duplicar a mesma data na mesma coluna.`);
      return;
    }

    /* atualiza otimisticamente: mes + data */
    setFinalizadas(prev => prev.map(e => e.id === cardId ? { ...e, mes: targetMes, data: newData } : e));

    const { error } = await supabase.from('programacao_finalizadas')
      .update({ mes: targetMes, data: newData })
      .eq('id', cardId);
    if (error) { alert('Erro ao mover card: ' + error.message); loadF(); }
  };

  /* Drag-scroll com inércia (meses) */
  const scrollRef = useRef(null);
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0, velX: 0, lastX: 0, lastT: 0, rafId: null });

  const onScrollMouseDown = (e) => {
    if (e.target.closest?.('[data-drag-card]')) return; /* não scroll quando arrastar card */
    const s = scrollRef.current; const d = dragState.current;
    if (d.rafId) cancelAnimationFrame(d.rafId);
    d.active = true; d.startX = e.pageX; d.scrollLeft = s.scrollLeft;
    d.lastX = e.pageX; d.lastT = Date.now(); d.velX = 0;
    s.style.cursor = 'grabbing'; s.style.userSelect = 'none';
  };
  const onDragMove = (e) => {
    const s = scrollRef.current; const d = dragState.current;
    if (!d.active) return; e.preventDefault();
    const dx = e.pageX - d.startX;
    s.scrollLeft = d.scrollLeft - dx;
    const now = Date.now(); const dt = now - d.lastT;
    if (dt > 0) d.velX = (e.pageX - d.lastX) / dt;
    d.lastX = e.pageX; d.lastT = now;
  };
  const onDragEnd = () => {
    const s = scrollRef.current; const d = dragState.current;
    if (!d.active) return;
    d.active = false; s.style.cursor = 'grab'; s.style.userSelect = '';
    const glide = () => {
      if (!scrollRef.current || Math.abs(d.velX) < 0.3) return;
      scrollRef.current.scrollLeft -= d.velX * 14;
      d.velX *= 0.91;
      d.rafId = requestAnimationFrame(glide);
    };
    d.rafId = requestAnimationFrame(glide);
  };

  /* Load */
  const loadA = useCallback(async () => {
    setLoadingA(true);
    const { data, error } = await supabase.from('programacao_afazer').select('*').order('data', { ascending: false }).order('created_at', { ascending: false });
    if (error) { if (error.code === '42P01') setTableErrA(true); } else { setAfazer(data || []); setTableErrA(false); }
    setLoadingA(false);
  }, []);

  const loadF = useCallback(async () => {
    setLoadingF(true);
    const { data, error } = await supabase.from('programacao_finalizadas').select('*').eq('ano', ano).order('data', { ascending: false });
    if (error) { if (error.code === '42P01') setTableErrF(true); } else { setFinalizadas(data || []); setTableErrF(false); }
    setLoadingF(false);
  }, [ano]);

  useEffect(() => { loadA(); }, [loadA]);
  useEffect(() => { if (vista === 'meses') loadF(); }, [vista, loadF]);

  /* Helpers de ação */
  const openNew = (table, mes) => {
    setPgTable(table); setPgEntry(null);
    if (mes) { setPgMes(mes); setPgAno(ano); }
    setPgModal(true);
  };
  const openEdit = (entry, table) => {
    if (table === 'programacao_finalizadas') { setPgMes(entry.mes); setPgAno(entry.ano); }
    setPgTable(table); setPgEntry(entry); setPgModal(true);
    setDetModal(false);
  };
  const openDetail = (entry, table) => { setDetEntry(entry); setDetTable(table); setDetModal(true); };
  const handleDelete = async (entry, table) => {
    if (!window.confirm('Excluir esta demanda?')) return;
    await supabase.from(table).delete().eq('id', entry.id);
    if (table === 'programacao_afazer') setAfazer(p => p.filter(e => e.id !== entry.id));
    else setFinalizadas(p => p.filter(e => e.id !== entry.id));
    setDetModal(false);
  };
  const handleUpdate = (updated, table) => {
    if (table === 'programacao_afazer') setAfazer(p => p.map(e => e.id === updated.id ? updated : e));
    else setFinalizadas(p => p.map(e => e.id === updated.id ? updated : e));
    if (detEntry?.id === updated.id) setDetEntry(updated);
  };

  /* Grupos de meses */
  const mesBuckets = MESES.reduce((acc, m) => { acc[m.num] = finalizadas.filter(f => f.mes === m.num); return acc; }, {});

  /* ══ VISTA: MAIN ══════════════════════════════════════ */
  if (vista === 'main') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>🖥️ Programação</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.77rem', color: '#64748b' }}>Controle de demandas — exclusivo para administradores.</p>
        </div>
        <button onClick={() => openNew('programacao_afazer')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', fontWeight: 700, fontSize: '0.81rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', transition: '0.2s', flexShrink: 0 }}
          onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 22px rgba(99,102,241,0.55)'}
          onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)'}>
          <Plus size={14} /> Nova Demanda
        </button>
      </div>

      {tableErrA && <SQLErr name="programacao_afazer" sql={SQL_AFAZER} onRetry={loadA} />}

      {!tableErrA && (loadingA ? <Skeleton cols={2} /> : (
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          {/* Coluna A Fazer */}
          <KCol
            col={{ label: 'A Fazer', icon: <LayoutGrid size={14} />, color: '#6366f1', accent: 'rgba(99,102,241,0.12)' }}
            count={afazer.length}
            onAdd={() => openNew('programacao_afazer')}>
            {afazer.map(e => (
              <PgCard key={e.id} entry={e} isAfazer
                onOpen={() => openDetail(e, 'programacao_afazer')}
                onEdit={() => openEdit(e, 'programacao_afazer')}
                onDelete={() => handleDelete(e, 'programacao_afazer')}
                onConcluir={() => loadA()} />
            ))}
          </KCol>

          {/* Coluna Finalizadas — botão especial */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 260, flex: '1 1 260px', maxWidth: 390 }}>
            <button onClick={() => { setVista('meses'); loadF(); }}
              style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', flexDirection: 'column', transition: 'all 0.25s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(16,185,129,0.12)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.04)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '2px solid rgba(16,185,129,0.12)', background: 'linear-gradient(180deg,rgba(16,185,129,0.1),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCheck size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#f1f5f9' }}>Finalizadas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ background: 'rgba(16,185,129,0.25)', color: '#10b981', fontSize: '0.67rem', fontWeight: 800, padding: '1px 8px', borderRadius: 10 }}>12 meses</span>
                  <ChevronRight size={14} style={{ color: '#10b981' }} />
                </div>
              </div>
              <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 13, width: '100%', boxSizing: 'border-box' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.65 }}>
                  Clique para abrir o histórico de demandas <strong style={{ color: '#f1f5f9' }}>finalizadas</strong>, organizadas por <strong style={{ color: '#10b981' }}>mês</strong>.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
                  {MESES.map(m => (
                    <div key={m.num} style={{ background: `${m.color}15`, border: `1px solid ${m.color}25`, borderRadius: 7, padding: '5px 4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: m.color }}>{m.short}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 9, border: '1.5px dashed rgba(16,185,129,0.3)', color: '#10b981', fontSize: '0.77rem', fontWeight: 700 }}>
                  <LayoutGrid size={13} /> Ver Finalizadas por Mês
                </div>
              </div>
            </button>
          </div>
        </div>
      ))}

      {/* Modais */}
      {pgModal && <PgModal entry={pgEntry} table={pgTable} defaultMes={pgMes} defaultAno={pgAno}
        onClose={() => { setPgModal(false); setPgEntry(null); }}
        onSaved={() => { setPgModal(false); setPgEntry(null); loadA(); }} user={user} />}
      {detModal && detEntry && (
        <CardDetailModal entry={detEntry} table={detTable}
          onClose={() => setDetModal(false)}
          onEdit={() => openEdit(detEntry, detTable)}
          onDelete={() => handleDelete(detEntry, detTable)}
          onUpdate={(u) => handleUpdate(u, detTable)} />
      )}

      <style>{`
        @keyframes pgSpin  { to { transform: rotate(360deg); } }
        @keyframes pgPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes pgDrop  { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );

  /* ══ VISTA: MESES ══════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setVista('main')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: '0.2s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#f1f5f9'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
            <ArrowLeft size={13} /> Voltar
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9' }}>✅ Finalizadas — <span style={{ color: '#10b981' }}>{ano}</span></h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748b' }}>Demandas concluídas organizadas por mês.</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Seletor de ano */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '4px 6px' }}>
            <button onClick={() => setAno(a => a - 1)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: '0.15s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f1f5f9'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f1f5f9', minWidth: 44, textAlign: 'center' }}>{ano}</span>
            <button onClick={() => setAno(a => a + 1)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', transition: '0.15s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#f1f5f9'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={() => openNew('programacao_finalizadas', new Date().getMonth() + 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 15px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: '0.81rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', transition: '0.2s' }}
            onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 22px rgba(16,185,129,0.5)'}
            onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.35)'}>
            <Plus size={14} /> Nova Finalizada
          </button>
        </div>
      </div>

      {tableErrF && <SQLErr name="programacao_finalizadas" sql={SQL_FIN} onRetry={loadF} />}

      {!tableErrF && (loadingF ? <Skeleton cols={12} /> : (
        <div
          ref={scrollRef}
          className="pg-drag-scroll"
          onMouseDown={onScrollMouseDown}
          onMouseMove={onDragMove}
          onMouseUp={onDragEnd}
          onMouseLeave={onDragEnd}
          style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start', cursor: 'grab', scrollbarWidth: 'none' }}>
          {MESES.map(m => (
            <KCol key={m.num}
              col={{ label: m.label, icon: <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{m.short}</span>, color: m.color, accent: m.accent }}
              count={mesBuckets[m.num]?.length || 0}
              onAdd={() => openNew('programacao_finalizadas', m.num)}
              targetMes={m.num}
              onDropCard={handleCardDrop}
              maxH="calc(100vh - 290px)">
              {(mesBuckets[m.num] || []).map(e => (
                <PgCard key={e.id} entry={e}
                  onOpen={() => openDetail(e, 'programacao_finalizadas')}
                  onEdit={() => openEdit(e, 'programacao_finalizadas')}
                  onDelete={() => handleDelete(e, 'programacao_finalizadas')} />
              ))}
            </KCol>
          ))}
        </div>
      ))}

      {/* Modais */}
      {pgModal && <PgModal entry={pgEntry} table={pgTable} defaultMes={pgMes} defaultAno={pgAno}
        onClose={() => { setPgModal(false); setPgEntry(null); }}
        onSaved={() => { setPgModal(false); setPgEntry(null); loadA(); loadF(); }} user={user} />}
      {detModal && detEntry && (
        <CardDetailModal entry={detEntry} table={detTable}
          onClose={() => setDetModal(false)}
          onEdit={() => openEdit(detEntry, detTable)}
          onDelete={() => handleDelete(detEntry, detTable)}
          onUpdate={(u) => handleUpdate(u, detTable)} />
      )}

      <style>{`
        @keyframes pgSpin  { to { transform: rotate(360deg); } }
        @keyframes pgPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        @keyframes pgDrop  { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
        .pg-drag-scroll::-webkit-scrollbar { display: none; }
        .pg-drag-scroll { -ms-overflow-style: none; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SQL — execute no Supabase Editor
═══════════════════════════════════════════════════════════ */
const SQL_AFAZER = `-- Recriar tabela com nova estrutura
DROP TABLE IF EXISTS programacao_afazer;
CREATE TABLE programacao_afazer (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'Desconhecido',
  data date NOT NULL DEFAULT CURRENT_DATE,
  categorias text[] NOT NULL DEFAULT '{}',
  checklists jsonb NOT NULL DEFAULT '[]',
  description text DEFAULT ''
);
ALTER TABLE programacao_afazer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pg_af_all" ON programacao_afazer FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('owner','admin')));`;

const SQL_FIN = `-- Recriar tabela com nova estrutura
DROP TABLE IF EXISTS programacao_finalizadas;
CREATE TABLE programacao_finalizadas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL DEFAULT 'Desconhecido',
  data date NOT NULL DEFAULT CURRENT_DATE,
  categorias text[] NOT NULL DEFAULT '{}',
  checklists jsonb NOT NULL DEFAULT '[]',
  description text DEFAULT '',
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())
);
ALTER TABLE programacao_finalizadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pg_fin_all" ON programacao_finalizadas FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('owner','admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('owner','admin')));`;
