// GangaHub/Relatorios.jsx — Sistema completo de Relatórios com filtros, gráficos e Supabase
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, Plus, Download, Trash2, Save, X, Check,
  BarChart2, TrendingUp, PieChart as PieIcon, Activity,
  Calendar, Filter, RefreshCw, Eye, Table2, Loader2,
  DollarSign, ShoppingBag, Package, Truck, RotateCcw, AlertTriangle, Clock
} from 'lucide-react';

/* ─── Constantes ─── */
const METRICAS_DEF = [
  { key: 'faturamento',         label: 'Faturamento',          color: '#10b981', icon: <DollarSign size={14}/>, fmt: v => `R$ ${Number(v).toLocaleString('pt-BR')}`, unit: 'R$' },
  { key: 'pedidos',             label: 'Pedidos no Mês',       color: '#3b82f6', icon: <ShoppingBag size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'ticket_medio',        label: 'Ticket Médio',         color: '#8b5cf6', icon: <TrendingUp size={14}/>, fmt: v => `R$ ${Number(v).toLocaleString('pt-BR')}`, unit: 'R$' },
  { key: 'produtos_estoque',    label: 'Produtos em Estoque',  color: '#f59e0b', icon: <Package size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'entregas_andamento',  label: 'Entregas em Andamento',color: '#06b6d4', icon: <Truck size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'devolucoes',          label: 'Devoluções no Mês',    color: '#ef4444', icon: <RotateCcw size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'alertas_ativos',      label: 'Alertas Ativos',       color: '#f97316', icon: <AlertTriangle size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'faturamento_ml',      label: 'Fat. Mercado Livre',   color: '#f59e0b', icon: <DollarSign size={14}/>, fmt: v => `R$ ${Number(v).toLocaleString('pt-BR')}`, unit: 'R$' },
  { key: 'faturamento_tiktok',  label: 'Fat. TikTok Shop',     color: '#3b82f6', icon: <DollarSign size={14}/>, fmt: v => `R$ ${Number(v).toLocaleString('pt-BR')}`, unit: 'R$' },
  { key: 'faturamento_shopify', label: 'Fat. Shopify/Site',    color: '#10b981', icon: <DollarSign size={14}/>, fmt: v => `R$ ${Number(v).toLocaleString('pt-BR')}`, unit: 'R$' },
  { key: 'pedidos_ml',          label: 'Pedidos ML',           color: '#f59e0b', icon: <ShoppingBag size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'pedidos_tiktok',      label: 'Pedidos TikTok',       color: '#3b82f6', icon: <ShoppingBag size={14}/>, fmt: v => v, unit: 'un' },
  { key: 'pedidos_shopify',     label: 'Pedidos Shopify',      color: '#10b981', icon: <ShoppingBag size={14}/>, fmt: v => v, unit: 'un' },
];

const TIPOS_GRAFICO = [
  { key: 'bar',      label: 'Barras',    icon: <BarChart2 size={15}/> },
  { key: 'line',     label: 'Linhas',    icon: <Activity size={15}/> },
  { key: 'area',     label: 'Área',      icon: <TrendingUp size={15}/> },
  { key: 'pie',      label: 'Pizza',     icon: <PieIcon size={15}/> },
  { key: 'composed', label: 'Combinado', icon: <BarChart2 size={15}/> },
];

const PERIODOS = [
  { key: '7',  label: 'Últimos 7 dias' },
  { key: '14', label: 'Últimos 14 dias' },
  { key: '30', label: 'Últimos 30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const PALETTE = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#f97316','#a78bfa','#34d399','#60a5fa'];

function fmt(key, val) {
  return METRICAS_DEF.find(m => m.key === key)?.fmt(val) ?? val;
}

/* ─── Tooltip customizado ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
      <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => {
        const m = METRICAS_DEF.find(m => m.key === p.dataKey);
        return (
          <p key={i} style={{ margin: '2px 0', color: p.color || '#fff' }}>
            {m?.label || p.dataKey}: <b>{m?.fmt(p.value) ?? p.value}</b>
          </p>
        );
      })}
    </div>
  );
};

/* ─── Gráfico dinâmico ─── */
function GraficoRelatorio({ tipo, dados, metricas }) {
  if (!dados.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sem dados para o período selecionado.</div>;
  const metas = METRICAS_DEF.filter(m => metricas.includes(m.key));

  if (tipo === 'pie') {
    // Pizza: apenas primeira métrica por dia → agrupado como total por métrica
    const pieData = metas.map(m => ({
      name: m.label,
      value: dados.reduce((a, d) => a + (Number(d[m.key]) || 0), 0),
      color: m.color,
    }));
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v, name) => [fmt(metas.find(m => m.label === name)?.key, v), name]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const commonProps = {
    data: dados,
    margin: { top: 10, right: 10, left: 10, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis dataKey="data_fmt" tick={{ fill: '#6b7280', fontSize: 11 }} />
      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
      <Tooltip content={<CustomTooltip />} />
      <Legend wrapperStyle={{ paddingTop: 12, fontSize: '0.78rem' }} />
    </>
  );

  if (tipo === 'bar') return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart {...commonProps}>
        {axes}
        {metas.map((m, i) => <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color || PALETTE[i]} radius={[4,4,0,0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );

  if (tipo === 'line') return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart {...commonProps}>
        {axes}
        {metas.map((m, i) => <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color || PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );

  if (tipo === 'area') return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart {...commonProps}>
        <defs>
          {metas.map((m, i) => (
            <linearGradient key={m.key} id={`grad_${m.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={m.color || PALETTE[i]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={m.color || PALETTE[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {axes}
        {metas.map((m, i) => (
          <Area key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color || PALETTE[i]} strokeWidth={2} fill={`url(#grad_${m.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  // composed
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart {...commonProps}>
        {axes}
        {metas.map((m, i) => i % 2 === 0
          ? <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color || PALETTE[i]} radius={[4,4,0,0]} />
          : <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color || PALETTE[i]} strokeWidth={2} dot={{ r: 3 }} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── Componente principal ─── */
export default function GangaHubRelatorios() {
  const [loading, setLoading]         = useState(true);
  const [rawData, setRawData]         = useState([]);
  const [savedRels, setSavedRels]     = useState([]);
  const [view, setView]               = useState('builder'); // 'builder' | 'saved'
  const [viewMode, setViewMode]       = useState('chart');   // 'chart' | 'table'
  const [toast, setToast]             = useState(null);

  // Config do relatório atual
  const [relNome, setRelNome]         = useState('Meu Relatório');
  const [metricas, setMetricas]       = useState(['faturamento', 'pedidos', 'ticket_medio']);
  const [tipoGrafico, setTipoGrafico] = useState('line');
  const [periodo, setPeriodo]         = useState('30');
  const [dataIni, setDataIni]         = useState('');
  const [dataFim, setDataFim]         = useState('');
  const [saving, setSaving]           = useState(false);

  const showToast = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  /* ── Carregar snapshots ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [snapRes, relRes] = await Promise.all([
      supabase.from('gangahub_kpi_snapshots').select('*').order('data_ref'),
      supabase.from('gangahub_relatorios').select('*').order('created_at', { ascending: false }),
    ]);
    if (snapRes.data) setRawData(snapRes.data);
    if (relRes.data)  setSavedRels(relRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Filtrar dados pelo período ── */
  const dadosFiltrados = (() => {
    let ini, fim = new Date();
    if (periodo === 'custom' && dataIni && dataFim) {
      ini = new Date(dataIni); fim = new Date(dataFim);
    } else {
      const dias = Number(periodo) || 30;
      ini = new Date(); ini.setDate(ini.getDate() - dias + 1);
    }
    return rawData
      .filter(d => {
        const dt = new Date(d.data_ref);
        return dt >= ini && dt <= fim;
      })
      .map(d => ({
        ...d,
        data_fmt: new Date(d.data_ref).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }));
  })();

  /* ── Totais para cards ── */
  const totais = metricas.reduce((acc, key) => {
    acc[key] = dadosFiltrados.reduce((s, d) => s + (Number(d[key]) || 0), 0);
    return acc;
  }, {});

  /* ── Toggle métrica ── */
  const toggleMetrica = (key) =>
    setMetricas(ms => ms.includes(key) ? ms.filter(m => m !== key) : [...ms, key]);

  /* ── Salvar relatório ── */
  const salvarRelatorio = async () => {
    if (!metricas.length) { showToast('Selecione ao menos uma métrica', 'err'); return; }
    setSaving(true);
    const payload = {
      nome:           relNome,
      metricas:       metricas,
      filtros:        { periodo, dataIni, dataFim },
      tipo_grafico:   tipoGrafico,
      dados_snapshot: dadosFiltrados,
    };
    const { error } = await supabase.from('gangahub_relatorios').insert(payload);
    if (error) showToast('Erro ao salvar: ' + error.message, 'err');
    else { showToast('✅ Relatório salvo no Supabase!'); fetchData(); }
    setSaving(false);
  };

  /* ── Deletar relatório salvo ── */
  const deletarRel = async (id) => {
    if (!window.confirm('Remover este relatório?')) return;
    await supabase.from('gangahub_relatorios').delete().eq('id', id);
    showToast('Relatório removido');
    setSavedRels(rs => rs.filter(r => r.id !== id));
  };

  /* ── Carregar relatório salvo ── */
  const carregarRel = (rel) => {
    setRelNome(rel.nome);
    setMetricas(rel.metricas);
    setTipoGrafico(rel.tipo_grafico);
    setPeriodo(rel.filtros?.periodo || '30');
    setDataIni(rel.filtros?.dataIni || '');
    setDataFim(rel.filtros?.dataFim || '');
    setView('builder');
    showToast('📋 Relatório carregado!');
  };

  /* ── Exportar XLSX ── */
  const exportarXLSX = () => {
    const header = ['Data', ...metricas.map(k => METRICAS_DEF.find(m => m.key === k)?.label || k)];
    const rows   = dadosFiltrados.map(d => [d.data_fmt, ...metricas.map(k => d[k] ?? 0)]);
    const ws     = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb     = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `gangahub_${relNome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('📥 Excel exportado!');
  };

  /* ── Exportar CSV ── */
  const exportarCSV = () => {
    const header = ['Data', ...metricas.map(k => METRICAS_DEF.find(m => m.key === k)?.label || k)].join(',');
    const rows   = dadosFiltrados.map(d => [d.data_fmt, ...metricas.map(k => d[k] ?? 0)].join(','));
    const csv    = [header, ...rows].join('\n');
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `gangahub_${relNome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast('📥 CSV exportado!');
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, gap:12, color:'var(--text-muted)' }}>
      <Loader2 size={28} className="ghr-spin" /> Carregando dados do Supabase...
    </div>
  );

  return (
    <div className="ghr-wrap">
      {toast && <div className={`ghr-toast ${toast.type === 'err' ? 'err' : 'ok'}`}>{toast.msg}</div>}

      {/* Cabeçalho */}
      <div className="glass-panel ghr-header">
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <FileText size={20} style={{ color:'#8b5cf6' }}/>
          <div>
            <h3 style={{ margin:0, fontSize:'1rem' }}>Central de Relatórios</h3>
            <p style={{ margin:0, fontSize:'0.75rem', color:'var(--text-muted)' }}>Crie, filtre, visualize e salve relatórios personalizados</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`ghr-tab-btn ${view === 'builder' ? 'active' : ''}`} onClick={() => setView('builder')}>
            <BarChart2 size={14}/> Criar Relatório
          </button>
          <button className={`ghr-tab-btn ${view === 'saved' ? 'active' : ''}`} onClick={() => setView('saved')}>
            <FileText size={14}/> Salvos ({savedRels.length})
          </button>
          <button className="ghr-btn" onClick={fetchData}><RefreshCw size={14}/></button>
        </div>
      </div>

      {/* ─────── VIEW: RELATÓRIOS SALVOS ─────── */}
      {view === 'saved' && (
        <div className="ghr-saved-list">
          {savedRels.length === 0 && (
            <div className="glass-panel" style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
              <FileText size={36} style={{ opacity:0.3, marginBottom:12 }}/><br/>Nenhum relatório salvo ainda.<br/>
              <button className="ghr-btn primary" style={{ marginTop:14 }} onClick={() => setView('builder')}><Plus size={14}/> Criar Relatório</button>
            </div>
          )}
          {savedRels.map(rel => (
            <div key={rel.id} className="glass-panel ghr-saved-card">
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, marginBottom:4 }}>{rel.nome}</div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', display:'flex', flexWrap:'wrap', gap:8 }}>
                  <span><Calendar size={11}/> {new Date(rel.created_at).toLocaleDateString('pt-BR')}</span>
                  <span><Filter size={11}/> {rel.filtros?.periodo ? `Últimos ${rel.filtros.periodo} dias` : 'Personalizado'}</span>
                  <span><BarChart2 size={11}/> {TIPOS_GRAFICO.find(t => t.key === rel.tipo_grafico)?.label}</span>
                </div>
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {(rel.metricas || []).map(k => {
                    const m = METRICAS_DEF.find(m => m.key === k);
                    return m ? <span key={k} style={{ background:`${m.color}25`, color:m.color, padding:'2px 8px', borderRadius:20, fontSize:'0.7rem', fontWeight:600 }}>{m.label}</span> : null;
                  })}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button className="ghr-btn" onClick={() => carregarRel(rel)}><Eye size={14}/> Abrir</button>
                <button className="ghr-btn danger" onClick={() => deletarRel(rel.id)}><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────── VIEW: BUILDER ─────── */}
      {view === 'builder' && (
        <div className="ghr-builder">
          {/* Painel de configuração */}
          <div className="glass-panel ghr-config">
            <div className="ghr-config-section">
              <label className="ghr-label">Nome do Relatório</label>
              <input value={relNome} onChange={e => setRelNome(e.target.value)} className="ghr-input" placeholder="Ex: Faturamento Semanal" />
            </div>

            <div className="ghr-config-section">
              <label className="ghr-label">📅 Período</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {PERIODOS.map(p => (
                  <button key={p.key} className={`ghr-period-btn ${periodo === p.key ? 'active' : ''}`} onClick={() => setPeriodo(p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
              {periodo === 'custom' && (
                <div style={{ display:'flex', gap:10, marginTop:8 }}>
                  <div className="ghr-field"><label>De</label><input type="date" max="9999-12-31" value={dataIni} onChange={e => setDataIni(e.target.value)} className="ghr-input" /></div>
                  <div className="ghr-field"><label>Até</label><input type="date" max="9999-12-31" value={dataFim} onChange={e => setDataFim(e.target.value)} className="ghr-input" /></div>
                </div>
              )}
            </div>

            <div className="ghr-config-section">
              <label className="ghr-label">📊 Tipo de Gráfico</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {TIPOS_GRAFICO.map(t => (
                  <button key={t.key} className={`ghr-period-btn ${tipoGrafico === t.key ? 'active' : ''}`} onClick={() => setTipoGrafico(t.key)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ghr-config-section">
              <label className="ghr-label">📈 Métricas ({metricas.length} selecionadas)</label>
              <div className="ghr-metricas-grid">
                {METRICAS_DEF.map(m => {
                  const sel = metricas.includes(m.key);
                  return (
                    <button key={m.key} className={`ghr-metrica-btn ${sel ? 'active' : ''}`}
                      style={{ '--m-color': m.color }} onClick={() => toggleMetrica(m.key)}>
                      <span className="ghr-metrica-ico" style={{ color: m.color }}>{m.icon}</span>
                      <span className="ghr-metrica-label">{m.label}</span>
                      {sel && <Check size={11} style={{ marginLeft:'auto', color: m.color }}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="ghr-btn primary" onClick={salvarRelatorio} disabled={saving}>
                {saving ? <Loader2 size={13} className="ghr-spin"/> : <Save size={13}/>} Salvar no Supabase
              </button>
              <button className="ghr-btn" onClick={exportarXLSX}><Download size={13}/> Excel</button>
              <button className="ghr-btn" onClick={exportarCSV}><Download size={13}/> CSV</button>
            </div>
          </div>

          {/* Área de resultado */}
          <div className="ghr-result">
            {/* KPI cards resumo */}
            <div className="ghr-kpi-row">
              {metricas.slice(0,4).map(key => {
                const m = METRICAS_DEF.find(m => m.key === key);
                if (!m) return null;
                const val = totais[key] || 0;
                return (
                  <div key={key} className="glass-panel ghr-kpi-card" style={{ borderTop: `2px solid ${m.color}` }}>
                    <div style={{ color: m.color, marginBottom:6 }}>{m.icon}</div>
                    <div style={{ fontSize:'1.3rem', fontWeight:900, color: m.color }}>{m.fmt(val)}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>{m.label}</div>
                    <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>
                      {dadosFiltrados.length} dias • total acumulado
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Toggle chart / table */}
            <div className="glass-panel ghr-chart-panel">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:'0.9rem', display:'flex', alignItems:'center', gap:8 }}>
                  <BarChart2 size={16} style={{ color:'#8b5cf6' }}/> {relNome}
                  <span style={{ fontSize:'0.72rem', fontWeight:400, color:'var(--text-muted)', background:'rgba(139,92,246,0.15)', padding:'2px 8px', borderRadius:20 }}>
                    {dadosFiltrados.length} períodos
                  </span>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  <button className={`ghr-view-btn ${viewMode === 'chart' ? 'active' : ''}`} onClick={() => setViewMode('chart')}>
                    <BarChart2 size={13}/> Gráfico
                  </button>
                  <button className={`ghr-view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
                    <Table2 size={13}/> Planilha
                  </button>
                </div>
              </div>

              {viewMode === 'chart' && (
                <GraficoRelatorio tipo={tipoGrafico} dados={dadosFiltrados} metricas={metricas} />
              )}

              {viewMode === 'table' && (
                <div style={{ overflowX:'auto' }}>
                  <table className="ghr-table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        {metricas.map(k => {
                          const m = METRICAS_DEF.find(m => m.key === k);
                          return <th key={k} style={{ color: m?.color }}>{m?.label || k}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {dadosFiltrados.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily:'monospace', color:'var(--text-muted)', fontSize:'0.8rem' }}>{row.data_fmt}</td>
                          {metricas.map(k => {
                            const m = METRICAS_DEF.find(m => m.key === k);
                            const val = row[k] ?? 0;
                            return (
                              <td key={k} style={{ fontWeight:600, color: m?.color }}>
                                {m?.fmt(val) ?? val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Linha de totais */}
                      <tr className="ghr-totals-row">
                        <td style={{ fontWeight:800 }}>TOTAL</td>
                        {metricas.map(k => {
                          const m = METRICAS_DEF.find(m => m.key === k);
                          return (
                            <td key={k} style={{ fontWeight:900, color: m?.color }}>
                              {m?.fmt(totais[k] || 0)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ghr-wrap { display:flex; flex-direction:column; gap:14px; position:relative; }
        .ghr-toast { position:fixed; bottom:24px; right:24px; z-index:2000; padding:12px 20px; border-radius:10px; font-size:0.85rem; font-weight:600; animation:ghr-up 0.3s ease; }
        .ghr-toast.ok  { background:rgba(16,185,129,0.9); color:white; }
        .ghr-toast.err { background:rgba(239,68,68,0.9); color:white; }
        @keyframes ghr-up { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }

        .ghr-header { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; flex-wrap:wrap; gap:10px; }
        .ghr-tab-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid var(--border-color); background:rgba(255,255,255,0.06); color:var(--text-muted); font-size:0.82rem; cursor:pointer; transition:0.2s; }
        .ghr-tab-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; border-color:rgba(139,92,246,0.4); }
        .ghr-btn { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; border:1px solid var(--border-color); background:rgba(255,255,255,0.06); color:white; font-size:0.82rem; cursor:pointer; transition:0.2s; white-space:nowrap; }
        .ghr-btn:hover { background:rgba(255,255,255,0.12); }
        .ghr-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .ghr-btn.primary { background:linear-gradient(135deg,#8b5cf6,#6366f1); border-color:transparent; font-weight:600; }
        .ghr-btn.danger { color:#fca5a5; border-color:rgba(239,68,68,0.3); }
        .ghr-btn.danger:hover { background:rgba(239,68,68,0.15); }

        .ghr-builder { display:grid; grid-template-columns:320px 1fr; gap:14px; align-items:start; }
        .ghr-config { padding:18px; display:flex; flex-direction:column; gap:18px; }
        .ghr-config-section { display:flex; flex-direction:column; gap:8px; }
        .ghr-label { font-size:0.76rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; }
        .ghr-input { background:rgba(0,0,0,0.25); border:1px solid var(--border-color); color:white; padding:8px 12px; border-radius:8px; outline:none; font-size:0.85rem; width:100%; box-sizing:border-box; }
        .ghr-input:focus { border-color:#8b5cf6; }
        .ghr-field { display:flex; flex-direction:column; gap:4px; flex:1; }
        .ghr-field label { font-size:0.75rem; color:var(--text-muted); }

        .ghr-period-btn { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:20px; border:1px solid var(--border-color); background:none; color:var(--text-muted); font-size:0.75rem; cursor:pointer; transition:0.2s; }
        .ghr-period-btn.active { background:rgba(139,92,246,0.2); color:#a78bfa; border-color:rgba(139,92,246,0.5); }
        .ghr-period-btn:hover:not(.active) { background:rgba(255,255,255,0.05); color:white; }

        .ghr-metricas-grid { display:flex; flex-direction:column; gap:5px; max-height:300px; overflow-y:auto; padding-right:4px; }
        .ghr-metrica-btn { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.03); color:var(--text-muted); font-size:0.8rem; cursor:pointer; transition:0.18s; text-align:left; }
        .ghr-metrica-btn.active { background:rgba(var(--m-color-rgb, 139,92,246), 0.12); color:white; border-color:rgba(255,255,255,0.1); }
        .ghr-metrica-btn:hover:not(.active) { background:rgba(255,255,255,0.06); color:white; }
        .ghr-metrica-ico { display:flex; flex-shrink:0; }
        .ghr-metrica-label { flex:1; }

        .ghr-result { display:flex; flex-direction:column; gap:12px; }
        .ghr-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .ghr-kpi-card { padding:14px 16px; display:flex; flex-direction:column; }

        .ghr-chart-panel { padding:20px; }
        .ghr-view-btn { display:flex; align-items:center; gap:5px; padding:5px 12px; border-radius:8px; border:1px solid var(--border-color); background:none; color:var(--text-muted); font-size:0.78rem; cursor:pointer; transition:0.2s; }
        .ghr-view-btn.active { background:rgba(139,92,246,0.15); color:#a78bfa; border-color:rgba(139,92,246,0.4); }

        .ghr-table { width:100%; border-collapse:collapse; font-size:0.83rem; }
        .ghr-table th { text-align:left; padding:9px 12px; background:rgba(0,0,0,0.25); font-size:0.72rem; font-weight:700; text-transform:uppercase; white-space:nowrap; }
        .ghr-table td { padding:9px 12px; border-bottom:1px solid rgba(255,255,255,0.05); white-space:nowrap; }
        .ghr-table tr:hover td { background:rgba(255,255,255,0.02); }
        .ghr-totals-row td { background:rgba(139,92,246,0.1) !important; border-top:2px solid rgba(139,92,246,0.3); }

        .ghr-saved-list { display:flex; flex-direction:column; gap:8px; }
        .ghr-saved-card { display:flex; align-items:center; gap:16px; padding:16px 20px; }

        .ghr-spin { animation:spin 1s linear infinite; }
        @keyframes spin { 100%{transform:rotate(360deg)} }

        @media(max-width:1000px){
          .ghr-builder { grid-template-columns:1fr; }
          .ghr-kpi-row { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:600px){
          .ghr-kpi-row { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
