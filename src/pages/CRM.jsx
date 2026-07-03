import { Filter, BarChart2 } from 'lucide-react';
import ClientFolderManager from '../components/ClientFolderManager';
import DepartmentPipeline from '../components/DepartmentPipeline';
import DepartmentGuide from '../components/DepartmentGuide';
import GoogleDriveConnector from '../components/GoogleDriveConnector';
import MeetingScheduler from '../components/MeetingScheduler';

const CRM = () => {
  return (
    <ClientFolderManager title="Análise de CRM" description="Visualizando o funil de vendas e saúde da conta integrada via API (Kommo).">
      {(client) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <DepartmentGuide department="CRM" />
            <GoogleDriveConnector client={client} department="CRM" />
          </div>
          <DepartmentPipeline client={client} departmentName="CRM" />
          
          <div className="dept-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
            <section className="glass-panel" style={{ gridColumn: 'span 2', padding: 16 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
                <Filter size={20} /> Pipeline Kommo ({client.name})
              </div>
              
              <div className="funnel-container" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                <div className="funnel-stage" style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="stage-header" style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>Novos Leads <span className="stage-count">42</span></div>
                  <div className="glass-card lead-card">João Pereira (Instagram)</div>
                  <div className="glass-card lead-card">Empresa X (Google Ads)</div>
                </div>
                
                <div className="funnel-stage" style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="stage-header text-primary" style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>Em Negociação <span className="stage-count">5</span></div>
                  <div className="glass-card lead-card">Mariana B. - Reunião Agendada</div>
                </div>

                <div className="funnel-stage" style={{ flex: 1, minWidth: '200px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="stage-header text-success" style={{ fontWeight: 'bold', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>Fechados <span className="stage-count">2</span></div>
                  <div className="glass-card lead-card">Contrato Assinado</div>
                </div>
              </div>
            </section>

            <section className="glass-panel" style={{ gridColumn: 'span 1', padding: 16 }}>
              <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
                <BarChart2 size={20} /> Saúde da Conta
              </div>
              <div className="health-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="metric">
                  <span>Taxa de Resposta</span>
                  <strong>95%</strong>
                </div>
                <div className="metric">
                  <span>Tempo Médio (TMA)</span>
                  <strong>14 min</strong>
                </div>
                <div className="metric">
                  <span>Leads Perdidos</span>
                  <strong style={{color: 'var(--danger)'}}>3</strong>
                </div>
              </div>
            </section>
          </div>

          {/* ═══ COMPARATIVO DE FUNIS — MÊS ANTERIOR vs MÊS ATUAL ═══ */}
          <section className="glass-panel" style={{ padding: 20, marginTop: 24 }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.1rem', fontWeight: 'bold' }}>
                <BarChart2 size={20} /> Comparativo de Funis — Evolução Mensal
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="legend-dot" style={{ background: '#64748b' }}></span> Mês Anterior</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="legend-dot" style={{ background: '#6366f1' }}></span> Mês Atual</span>
              </div>
            </div>

            {/* Funnel Stages Comparison */}
            <div className="funnel-comparison">
              {[
                { stage: 'Novos Leads', prev: 35, curr: 42, icon: '🎯' },
                { stage: 'Qualificados', prev: 18, curr: 24, icon: '✅' },
                { stage: 'Em Negociação', prev: 8, curr: 5, icon: '🤝' },
                { stage: 'Proposta Enviada', prev: 4, curr: 7, icon: '📄' },
                { stage: 'Fechados (Won)', prev: 2, curr: 2, icon: '🏆' },
                { stage: 'Perdidos (Lost)', prev: 5, curr: 3, icon: '❌' },
              ].map((item, i) => {
                const diff = item.curr - item.prev;
                const pct = item.prev > 0 ? Math.round((diff / item.prev) * 100) : 0;
                const isUp = diff > 0;
                const isDown = diff < 0;
                const isLost = item.stage.includes('Perdidos');
                const trendColor = isLost ? (isDown ? '#10b981' : '#ef4444') : (isUp ? '#10b981' : isDown ? '#ef4444' : '#64748b');
                const maxVal = Math.max(item.prev, item.curr, 1);
                return (
                  <div key={i} className="funnel-compare-row">
                    <div className="fcr-label">
                      <span className="fcr-icon">{item.icon}</span>
                      <span className="fcr-name">{item.stage}</span>
                    </div>
                    <div className="fcr-bars">
                      <div className="fcr-bar-group">
                        <div className="fcr-bar prev" style={{ width: `${(item.prev / maxVal) * 100}%` }}>
                          <span>{item.prev}</span>
                        </div>
                        <div className="fcr-bar curr" style={{ width: `${(item.curr / maxVal) * 100}%` }}>
                          <span>{item.curr}</span>
                        </div>
                      </div>
                    </div>
                    <div className="fcr-evolution" style={{ color: trendColor }}>
                      <span className="fcr-arrow">{isUp ? '▲' : isDown ? '▼' : '—'}</span>
                      <span className="fcr-pct">{isUp ? '+' : ''}{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Cards */}
            <div className="funnel-summary-cards">
              <div className="fscard">
                <span className="fscard-label">Taxa de Conversão</span>
                <div className="fscard-row">
                  <span className="fscard-prev">5.7%</span>
                  <span className="fscard-arrow" style={{ color: '#10b981' }}>→</span>
                  <span className="fscard-curr">4.8%</span>
                </div>
                <span className="fscard-trend" style={{ color: '#ef4444' }}>▼ -0.9pp</span>
              </div>
              <div className="fscard">
                <span className="fscard-label">Ticket Médio</span>
                <div className="fscard-row">
                  <span className="fscard-prev">R$ 2.800</span>
                  <span className="fscard-arrow" style={{ color: '#10b981' }}>→</span>
                  <span className="fscard-curr">R$ 3.450</span>
                </div>
                <span className="fscard-trend" style={{ color: '#10b981' }}>▲ +23%</span>
              </div>
              <div className="fscard">
                <span className="fscard-label">Ciclo de Venda</span>
                <div className="fscard-row">
                  <span className="fscard-prev">18 dias</span>
                  <span className="fscard-arrow" style={{ color: '#10b981' }}>→</span>
                  <span className="fscard-curr">14 dias</span>
                </div>
                <span className="fscard-trend" style={{ color: '#10b981' }}>▼ -22% ✓</span>
              </div>
              <div className="fscard">
                <span className="fscard-label">ROI do Funil</span>
                <div className="fscard-row">
                  <span className="fscard-prev">3.2x</span>
                  <span className="fscard-arrow" style={{ color: '#10b981' }}>→</span>
                  <span className="fscard-curr">4.1x</span>
                </div>
                <span className="fscard-trend" style={{ color: '#10b981' }}>▲ +28%</span>
              </div>
            </div>
          </section>
          
          <style>{`
            .stage-count { background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; }
            .lead-card { padding: 14px; font-size: 0.9rem; margin-bottom: 12px; cursor: pointer; border-left: 3px solid transparent; }
            .lead-card:hover { border-left-color: var(--primary); transform: translateX(2px); }
            .metric { display: flex; justify-content: space-between; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 12px; font-size: 0.95rem; align-items: center; border: 1px solid rgba(255,255,255,0.02); }
            .text-success { color: var(--secondary); font-weight: 500; }
            .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
            .funnel-comparison { display: flex; flex-direction: column; gap: 14px; }
            .funnel-compare-row { display: flex; align-items: center; gap: 16px; padding: 10px 14px; background: rgba(0,0,0,0.15); border-radius: 10px; border: 1px solid rgba(255,255,255,0.04); transition: 0.2s; }
            .funnel-compare-row:hover { background: rgba(0,0,0,0.25); border-color: rgba(99,102,241,0.2); }
            .fcr-label { display: flex; align-items: center; gap: 10px; min-width: 160px; flex-shrink: 0; }
            .fcr-icon { font-size: 1.1rem; }
            .fcr-name { font-size: 0.88rem; font-weight: 600; color: var(--text-main, white); white-space: nowrap; }
            .fcr-bars { flex: 1; display: flex; flex-direction: column; gap: 4px; }
            .fcr-bar-group { display: flex; flex-direction: column; gap: 4px; }
            .fcr-bar { height: 22px; border-radius: 6px; display: flex; align-items: center; padding: 0 10px; font-size: 0.75rem; font-weight: 700; color: white; min-width: 36px; transition: width 0.6s ease; }
            .fcr-bar.prev { background: rgba(100,116,139,0.4); border: 1px solid rgba(100,116,139,0.3); }
            .fcr-bar.curr { background: linear-gradient(90deg, rgba(99,102,241,0.5), rgba(139,92,246,0.5)); border: 1px solid rgba(99,102,241,0.3); }
            .fcr-bar span { text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
            .fcr-evolution { display: flex; align-items: center; gap: 4px; min-width: 70px; justify-content: flex-end; flex-shrink: 0; }
            .fcr-arrow { font-size: 0.7rem; }
            .fcr-pct { font-size: 0.85rem; font-weight: 700; }
            .funnel-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 20px; }
            .fscard { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
            .fscard-label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .fscard-row { display: flex; align-items: center; gap: 8px; }
            .fscard-prev { font-size: 0.9rem; color: #94a3b8; text-decoration: line-through; opacity: 0.7; }
            .fscard-arrow { font-size: 0.8rem; }
            .fscard-curr { font-size: 1.1rem; font-weight: 700; color: var(--text-main, white); }
            .fscard-trend { font-size: 0.8rem; font-weight: 700; }
            @media (max-width: 768px) {
              .funnel-summary-cards { grid-template-columns: repeat(2, 1fr); }
              .fcr-label { min-width: 120px; }
            }
          `}</style>
          <MeetingScheduler client={client} department="CRM" />
        </div>
      )}
    </ClientFolderManager>
  );
};

export default CRM;
