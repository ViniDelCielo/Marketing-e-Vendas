// GangaHub/Estoque.jsx — Controle de Estoque com edição inline e Supabase
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package, Plus, Search, Download, Upload, AlertTriangle,
  Edit2, Trash2, Check, X, Filter, Tag, Loader2,
  TrendingUp, History, Save, RefreshCw
} from 'lucide-react';

const CATEGORIAS = ['Todos', 'Microfones', 'Tripés & Suportes', 'Teleprompters', 'Iluminação', 'Kits Completos', 'Acessórios'];

const STATUS_BADGE = {
  ok: { label: 'Normal', bg: 'rgba(16,185,129,0.2)', color: '#6ee7b7' },
  alerta: { label: 'Alerta', bg: 'rgba(245,158,11,0.2)', color: '#fcd34d' },
  critico: { label: 'Crítico', bg: 'rgba(239,68,68,0.2)', color: '#fca5a5' },
};

const EMPTY_FORM = {
  sku: '', nome: '', categoria: 'Microfones', preco_custo: '',
  preco_venda: '', estoque_atual: '', estoque_minimo: '', fornecedor: '', origem: 'China'
};

/* ─────────────────────────────────────────────────────────────
   Componente de célula com edição inline (clique para editar)
───────────────────────────────────────────────────────────── */
function EditableCell({ value, type = 'number', prefix = '', suffix = '', onSave, color, fontWeight }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef();

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = async () => {
    const num = Number(draft);
    if (isNaN(num) || num < 0) { setDraft(value); setEditing(false); return; }
    if (num === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(num);
    setSaving(false);
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return (
      <td className="ghe-cell-editing">
        <div className="ghe-inline-edit">
          {prefix && <span className="ghe-prefix">{prefix}</span>}
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            className="ghe-inline-input"
            step="0.01"
            min="0"
          />
          <button className="ghe-inline-save" onClick={commit} disabled={saving}>
            {saving ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
          </button>
          <button className="ghe-inline-cancel" onClick={() => { setDraft(value); setEditing(false); }}>
            <X size={12} />
          </button>
        </div>
      </td>
    );
  }

  return (
    <td
      className="ghe-cell-editable"
      onClick={() => setEditing(true)}
      title="Clique para editar"
      style={{ color, fontWeight }}
    >
      <span className="ghe-cell-value">{prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}{suffix}</span>
      <Edit2 size={11} className="ghe-edit-hint" />
    </td>
  );
}

/* ─────────────────────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────────────────────── */
export default function GangaHubEstoque() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showHist, setShowHist] = useState(null); // produto para ver histórico
  const [historico, setHistorico] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  /* ── Helpers ── */
  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Carregar produtos do Supabase ── */
  const fetchProdutos = useCallback(async () => {
    setSyncing(true);
    const { data, error } = await supabase
      .from('gangahub_produtos')
      .select('*')
      .order('sku');
    if (error) { console.error(error); showToast('Erro ao carregar produtos', 'err'); }
    else setProdutos(data || []);
    setSyncing(false);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProdutos(); }, [fetchProdutos]);

  /* ── Atualização de campo único (edição inline) ── */
  const updateField = async (id, field, value) => {
    const { error } = await supabase
      .from('gangahub_produtos')
      .update({ [field]: value })
      .eq('id', id);
    if (error) { showToast(`Erro ao atualizar ${field}`, 'err'); return; }
    // Atualiza localmente (o banco recalcula margem/status via trigger)
    // Re-fetch para pegar valores calculados pelo Postgres
    const { data } = await supabase
      .from('gangahub_produtos')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setProdutos(ps => ps.map(p => p.id === id ? data : p));
      showToast('✅ Valor atualizado e salvo!');
    }
  };

  /* ── Salvar novo produto / edição via modal ── */
  const handleSave = async () => {
    const payload = {
      sku: form.sku,
      nome: form.nome,
      categoria: form.categoria,
      fornecedor: form.fornecedor,
      origem: form.origem,
      preco_custo: Number(form.preco_custo),
      preco_venda: Number(form.preco_venda),
      estoque_atual: Number(form.estoque_atual),
      estoque_minimo: Number(form.estoque_minimo),
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('gangahub_produtos').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('gangahub_produtos').insert(payload));
    }

    if (error) { showToast('Erro ao salvar produto: ' + error.message, 'err'); return; }
    showToast(editId ? '✅ Produto atualizado!' : '✅ Produto criado!');
    setShowForm(false); setEditId(null); setForm(EMPTY_FORM);
    fetchProdutos();
  };

  const handleEdit = (p) => {
    setForm({
      sku: p.sku, nome: p.nome, categoria: p.categoria,
      preco_custo: p.preco_custo, preco_venda: p.preco_venda,
      estoque_atual: p.estoque_atual, estoque_minimo: p.estoque_minimo,
      fornecedor: p.fornecedor || '', origem: p.origem || 'China'
    });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este produto do estoque?')) return;
    const { error } = await supabase.from('gangahub_produtos').delete().eq('id', id);
    if (error) showToast('Erro ao remover produto', 'err');
    else { showToast('Produto removido'); setProdutos(ps => ps.filter(p => p.id !== id)); }
  };

  /* ── Histórico de preços ── */
  const verHistorico = async (produto) => {
    setShowHist(produto); setHistLoading(true);
    const { data } = await supabase
      .from('gangahub_historico_precos')
      .select('*')
      .eq('produto_id', produto.id)
      .order('alterado_em', { ascending: false })
      .limit(20);
    setHistorico(data || []);
    setHistLoading(false);
  };

  /* ── Exportar CSV ── */
  const exportCSV = () => {
    const header = 'SKU,Nome,Categoria,Custo,Venda,Margem%,Markup%,Lucro Un.,Estoque,Min,Valor Estoque,Fornecedor,Origem,Status';
    const rows = produtos.map(p =>
      `"${p.sku}","${p.nome}","${p.categoria}",${p.preco_custo},${p.preco_venda},${p.margem_bruta_pct},${p.markup_pct},${p.lucro_unitario},${p.estoque_atual},${p.estoque_minimo},${p.valor_estoque_total},"${p.fornecedor}","${p.origem}","${p.status_estoque}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gangahub_estoque_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    showToast('📥 CSV exportado com sucesso!');
  };

  /* ── Importar CSV ── */
  const importCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').slice(1).filter(Boolean);
    const novos = lines.map(line => {
      const cols = line.split(',').map(s => s.replace(/"/g, '').replace(/^\uFEFF/, '').trim());
      return {
        sku: cols[0], nome: cols[1], categoria: cols[2],
        preco_custo: Number(cols[3]) || 0, preco_venda: Number(cols[4]) || 0,
        estoque_atual: Number(cols[8]) || 0, estoque_minimo: Number(cols[9]) || 0,
        fornecedor: cols[11] || '', origem: cols[12] || 'China',
      };
    }).filter(p => p.sku && p.nome);

    const { error } = await supabase.from('gangahub_produtos').upsert(novos, { onConflict: 'sku' });
    if (error) showToast('Erro na importação: ' + error.message, 'err');
    else { showToast(`✅ ${novos.length} produtos importados!`); fetchProdutos(); }
    e.target.value = '';
  };

  /* ── Filtros ── */
  const filtrados = produtos.filter(p => {
    const matchCat = catFiltro === 'Todos' || p.categoria === catFiltro;
    const matchBusca = p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      p.sku?.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  });

  /* ── Sumário ── */
  const totalValorEstoque = produtos.reduce((acc, p) => acc + (p.valor_estoque_total || 0), 0);
  const criticos = produtos.filter(p => p.status_estoque === 'critico').length;
  const margemMedia = produtos.length
    ? (produtos.reduce((a, p) => a + (p.margem_bruta_pct || 0), 0) / produtos.length).toFixed(1)
    : 0;

  /* ─────── RENDER ─────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-muted)' }}>
      <Loader2 size={28} className="spin" /> Carregando estoque do Supabase...
    </div>
  );

  return (
    <div className="ghe-wrap">

      {/* Toast */}
      {toast && (
        <div className={`ghe-toast ${toast.type === 'err' ? 'err' : 'ok'}`}>{toast.msg}</div>
      )}

      {/* Sumário */}
      <div className="ghe-summary">
        <div className="glass-panel ghe-sum-card">
          <Package size={20} style={{ color: '#6366f1' }} />
          <div><b>{produtos.length}</b><span>SKUs Ativos</span></div>
        </div>
        <div className="glass-panel ghe-sum-card">
          <Tag size={20} style={{ color: '#10b981' }} />
          <div><b>R$ {totalValorEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b><span>Valor em Estoque (custo)</span></div>
        </div>
        <div className="glass-panel ghe-sum-card">
          <TrendingUp size={20} style={{ color: '#3b82f6' }} />
          <div><b style={{ color: margemMedia > 40 ? '#6ee7b7' : '#fcd34d' }}>{margemMedia}%</b><span>Margem Média</span></div>
        </div>
        <div className="glass-panel ghe-sum-card">
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          <div><b style={{ color: '#fca5a5' }}>{criticos}</b><span>Produtos Críticos</span></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ghe-toolbar glass-panel">
        <div className="ghe-search">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input placeholder="Buscar por nome ou SKU..." value={busca} onChange={e => setBusca(e.target.value)} className="ghe-search-input" />
        </div>
        <div className="ghe-cats">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {CATEGORIAS.map(c => (
            <button key={c} className={`ghe-cat ${catFiltro === c ? 'active' : ''}`} onClick={() => setCatFiltro(c)}>{c}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghe-btn" onClick={fetchProdutos} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Sync
          </button>
          <button className="ghe-btn" onClick={exportCSV}><Download size={15} /> Exportar CSV</button>
          <button className="ghe-btn" onClick={() => fileRef.current.click()}><Upload size={15} /> Importar CSV</button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={importCSV} />
          <button className="ghe-btn primary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
            <Plus size={15} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="ghe-table-container">
          <table className="ghe-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th title="Clique na célula para editar"><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>💰 <span>Custo</span> <span style={{ fontSize: '0.7rem' }}>✏️</span></div></th>
                <th title="Clique na célula para editar"><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🏷️ <span>Venda</span> <span style={{ fontSize: '0.7rem' }}>✏️</span></div></th>
                <th>📊 Margem</th>
                <th>📈 Markup</th>
                <th>💵 Lucro Un.</th>
                <th title="Clique na célula para editar"><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📦 <span>Estoque</span> <span style={{ fontSize: '0.7rem' }}>✏️</span></div></th>
                <th>Mín.</th>
                <th>Valor Total</th>
                <th>Fornecedor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const sb = STATUS_BADGE[p.status_estoque] || STATUS_BADGE.ok;
                const margem = Number(p.margem_bruta_pct) || 0;
                const markup = Number(p.markup_pct) || 0;
                return (
                  <tr key={p.id}>
                    <td><code style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>{p.sku}</code></td>
                    <td style={{ fontWeight: 600 }}>{p.nome}</td>
                    <td>
                      <span className="ghe-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                        {p.categoria}
                      </span>
                    </td>

                    {/* ── EDIÇÃO INLINE: CUSTO ── */}
                    <EditableCell
                      value={Number(p.preco_custo)}
                      prefix="R$ "
                      color="var(--text-muted)"
                      onSave={val => updateField(p.id, 'preco_custo', val)}
                    />

                    {/* ── EDIÇÃO INLINE: VENDA ── */}
                    <EditableCell
                      value={Number(p.preco_venda)}
                      prefix="R$ "
                      fontWeight={700}
                      color="white"
                      onSave={val => updateField(p.id, 'preco_venda', val)}
                    />

                    {/* Margem — calculada pelo Postgres, exibida mas NÃO editável */}
                    <td style={{ fontWeight: 700, color: margem >= 40 ? '#6ee7b7' : margem >= 20 ? '#fcd34d' : '#fca5a5' }}>
                      {margem.toFixed(1)}%
                    </td>

                    <td style={{ color: '#a5b4fc' }}>{markup.toFixed(0)}%</td>

                    <td style={{ color: '#6ee7b7', fontWeight: 600 }}>
                      R$ {Number(p.lucro_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    {/* ── EDIÇÃO INLINE: ESTOQUE ── */}
                    <EditableCell
                      value={Number(p.estoque_atual)}
                      color={p.status_estoque === 'critico' ? '#fca5a5' : p.status_estoque === 'alerta' ? '#fcd34d' : '#6ee7b7'}
                      fontWeight={700}
                      onSave={val => updateField(p.id, 'estoque_atual', val)}
                    />

                    <td style={{ color: 'var(--text-muted)' }}>{p.estoque_minimo}</td>

                    <td style={{ color: '#a5b4fc', fontSize: '0.82rem' }}>
                      R$ {Number(p.valor_estoque_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ fontSize: '0.8rem' }}>{p.fornecedor}</td>

                    <td>
                      <span style={{ background: sb.bg, color: sb.color, padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                        {sb.label}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="ghe-icon-btn" title="Histórico de preços" onClick={() => verHistorico(p)}>
                          <History size={14} />
                        </button>
                        <button className="ghe-icon-btn" title="Editar" onClick={() => handleEdit(p)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="ghe-icon-btn danger" title="Excluir" onClick={() => handleDelete(p.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={14} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Nenhum produto encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo / Editar produto */}
      {showForm && (
        <div className="ghe-modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="ghe-modal glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button className="ghe-icon-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="ghe-form-grid">
              {[
                ['SKU', 'sku'], ['Nome do Produto', 'nome'],
                ['Fornecedor', 'fornecedor'], ['Origem', 'origem'],
                ['Preço de Custo (R$)', 'preco_custo', 'number'],
                ['Preço de Venda (R$)', 'preco_venda', 'number'],
                ['Estoque Atual', 'estoque_atual', 'number'],
                ['Estoque Mínimo', 'estoque_minimo', 'number'],
              ].map(([label, key, type]) => (
                <div key={key} className="ghe-field">
                  <label>{label}</label>
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="ghe-input"
                  />
                </div>
              ))}
              <div className="ghe-field">
                <label>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="ghe-input">
                  {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Preview de margem em tempo real */}
            {form.preco_custo && form.preco_venda && (
              <div className="ghe-preview">
                {(() => {
                  const c = Number(form.preco_custo), v = Number(form.preco_venda);
                  const m = v > 0 ? (((v - c) / v) * 100).toFixed(1) : 0;
                  const mk = c > 0 ? (((v - c) / c) * 100).toFixed(0) : 0;
                  const l = (v - c).toFixed(2);
                  return (
                    <>
                      <span>Margem: <b style={{ color: m >= 40 ? '#6ee7b7' : '#fcd34d' }}>{m}%</b></span>
                      <span>Markup: <b style={{ color: '#a5b4fc' }}>{mk}%</b></span>
                      <span>Lucro Un.: <b style={{ color: '#6ee7b7' }}>R$ {l}</b></span>
                    </>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="ghe-btn" onClick={() => setShowForm(false)}><X size={14} /> Cancelar</button>
              <button className="ghe-btn primary" onClick={handleSave}><Save size={14} /> Salvar no Supabase</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Histórico de preços */}
      {showHist && (
        <div className="ghe-modal-overlay" onClick={e => e.target === e.currentTarget && setShowHist(null)}>
          <div className="ghe-modal glass-panel" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Histórico de Preços</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{showHist.nome}</p>
              </div>
              <button className="ghe-icon-btn" onClick={() => setShowHist(null)}><X size={18} /></button>
            </div>
            {histLoading ? (
              <div style={{ textAlign: 'center', padding: 30 }}><Loader2 className="spin" /></div>
            ) : historico.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Nenhuma alteração registrada ainda.</p>
            ) : (
              <table className="ghe-table">
                <thead>
                  <tr><th>Campo</th><th>Anterior</th><th>Novo</th><th>Quando</th></tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id}>
                      <td><span className="ghe-badge" style={{ background: h.campo === 'preco_custo' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)', color: h.campo === 'preco_custo' ? '#a5b4fc' : '#6ee7b7' }}>
                        {h.campo === 'preco_custo' ? 'Custo' : 'Venda'}
                      </span></td>
                      <td style={{ color: '#fca5a5' }}>R$ {Number(h.valor_anterior).toFixed(2)}</td>
                      <td style={{ color: '#6ee7b7', fontWeight: 700 }}>R$ {Number(h.valor_novo).toFixed(2)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(h.alterado_em).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Estilos ── */}
      <style>{`
        .ghe-wrap { display: flex; flex-direction: column; gap: 12px; position: relative; }
        .ghe-toast { position: fixed; bottom: 24px; right: 24px; z-index: 2000; padding: 12px 20px; border-radius: 10px; font-size: 0.85rem; font-weight: 600; animation: slideUp 0.3s ease; }
        .ghe-toast.ok  { background: rgba(16,185,129,0.9);  color: white; }
        .ghe-toast.err { background: rgba(239,68,68,0.9); color: white; }
        @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        .ghe-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .ghe-sum-card { display: flex; align-items: center; gap: 12px; padding: 14px 18px; }
        .ghe-sum-card div { display: flex; flex-direction: column; }
        .ghe-sum-card b { font-size: 1.2rem; font-weight: 800; }
        .ghe-sum-card span { font-size: 0.72rem; color: var(--text-muted); }
        .ghe-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; }
        .ghe-search { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 12px; flex: 1; min-width: 180px; }
        .ghe-search-input { background: none; border: none; outline: none; color: white; font-size: 0.85rem; flex: 1; }
        .ghe-cats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ghe-cat { padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border-color); background: none; color: var(--text-muted); font-size: 0.74rem; cursor: pointer; transition: 0.2s; }
        .ghe-cat.active,.ghe-cat:hover { background: rgba(245,158,11,0.15); color: #fcd34d; border-color: rgba(245,158,11,0.4); }
        .ghe-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.06); color: white; font-size: 0.82rem; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .ghe-btn:hover { background: rgba(255,255,255,0.12); }
        .ghe-btn.primary { background: linear-gradient(135deg,#f59e0b,#ef4444); border-color: transparent; font-weight: 600; }
        .ghe-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghe-hint { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 0.8rem; color: var(--text-muted); border-left: 3px solid #f59e0b; }
        .ghe-hint b { color: #fcd34d; }
        .ghe-table-container { overflow-x: auto; width: 100%; padding-bottom: 4px; }
        .ghe-table-container::-webkit-scrollbar { height: 8px; }
        .ghe-table-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .ghe-table-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .ghe-table-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        .ghe-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
        .ghe-table th { text-align: left; padding: 10px 12px; background: rgba(0,0,0,0.25); color: var(--text-muted); font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
        .ghe-table th[title] { display: flex; align-items: center; gap: 4px; height: 100%; }
        .ghe-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; white-space: nowrap; }
        .ghe-table tr:hover td { background: rgba(255,255,255,0.02); }
        /* Células editáveis */
        .ghe-cell-editable {
          cursor: pointer; position: relative;
          transition: background 0.15s;
        }
        .ghe-cell-editable:hover { background: rgba(245,158,11,0.1) !important; border-radius: 4px; }
        .ghe-cell-value { margin-right: 4px; }
        .ghe-edit-hint { opacity: 0; color: #f59e0b; display: inline-block; vertical-align: middle; transition: opacity 0.2s; }
        .ghe-cell-editable:hover .ghe-edit-hint { opacity: 1; }
        .ghe-cell-editing { padding: 4px 6px !important; }
        .ghe-inline-edit { display: flex; align-items: center; gap: 4px; }
        .ghe-prefix { font-size: 0.75rem; color: var(--text-muted); }
        .ghe-inline-input { background: rgba(0,0,0,0.4); border: 1px solid #f59e0b; color: white; padding: 4px 8px; border-radius: 6px; width: 80px; font-size: 0.85rem; outline: none; }
        .ghe-inline-save { background: rgba(16,185,129,0.3); border: none; color: #6ee7b7; padding: 4px; border-radius: 4px; cursor: pointer; display:flex; }
        .ghe-inline-cancel { background: rgba(239,68,68,0.2); border: none; color: #fca5a5; padding: 4px; border-radius: 4px; cursor: pointer; display:flex; }
        /* Badge, icon-btn, modal */
        .ghe-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
        .ghe-icon-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 6px; display: flex; transition: 0.2s; }
        .ghe-icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
        .ghe-icon-btn.danger:hover { background: rgba(239,68,68,0.15); color: #fca5a5; }
        .ghe-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ghe-modal { padding: 28px; width: 620px; max-width: 95vw; border-radius: 16px; max-height: 90vh; overflow-y: auto; }
        .ghe-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ghe-field { display: flex; flex-direction: column; gap: 6px; }
        .ghe-field label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .ghe-input { background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white; padding: 8px 12px; border-radius: 8px; outline: none; font-size: 0.85rem; transition: 0.2s; }
        .ghe-input:focus { border-color: #f59e0b; }
        .ghe-input option { background: #1e1e2e; }
        .ghe-preview { display: flex; gap: 20px; padding: 12px 16px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(245,158,11,0.3); margin-top: 12px; font-size: 0.85rem; color: var(--text-muted); flex-wrap: wrap; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media(max-width:900px){ .ghe-summary{grid-template-columns:repeat(2,1fr);} }
      `}</style>
    </div>
  );
}
