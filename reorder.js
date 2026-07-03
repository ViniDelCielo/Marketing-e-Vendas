import fs from 'fs';

let content = fs.readFileSync('src/pages/Trafego.jsx', 'utf-8');

const newReturnHTML = `  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <DepartmentGuide department="Tráfego Pago" />
        <GoogleDriveConnector client={client} department="Tráfego Pago" />
      </div>

      {/* Checklist Diário — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
            <CheckSquare size={20} className="text-primary" /> Rotina Diária Obrigatória
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {dailyRoutine.map(task => (
              <div key={task.id} onClick={() => toggleTask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: task.done ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: task.done ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer' }}>
                <div style={{ color: task.done ? '#10b981' : 'var(--text-muted)' }}>
                  {task.done ? <CheckCircle size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />}
                </div>
                <span style={{ fontSize: '0.9rem', color: task.done ? '#10b981' : 'white', textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DepartmentPipeline — somente funcionários */}
      {!isClient && (
        <DepartmentPipeline client={client} departmentName="Tráfego Pago" />
      )}

      {/* Saldo e Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* SALDO DAS CONTAS */}
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold' }}>
              <PieChart size={20} className="text-primary" /> Saldo Disponível para Anúncios
            </div>
            <button onClick={() => setIsConnModalOpen(true)} className="glass-btn primary small" style={{ fontSize: '0.75rem' }}>
              <Link size={14} /> Vincular Conta
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="balance-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Meta Ads</span>
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>R$ {Number(metaBalance).toLocaleString('pt-BR')}</span>
              </div>
              <div className="balance-bar-bg"><div className="balance-bar-fill" style={{ width: '65%', background: '#3b82f6' }}></div></div>
            </div>
            <div className="balance-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Google Ads</span>
                <span style={{ fontSize: '0.8rem', color: '#34d399' }}>R$ {Number(googleBalance).toLocaleString('pt-BR')}</span>
              </div>
              <div className="balance-bar-bg"><div className="balance-bar-fill" style={{ width: '40%', background: '#ea4335' }}></div></div>
            </div>
          </div>
        </section>

        {/* RESUMO DA CONTA */}
        {!isClient && (
          <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold' }}>
              <FileText size={20} className="text-primary" /> Resumo da Conta
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
              {logs.map(log => (
                <div key={log.id} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.75rem' }}>{log.author_name}</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{log.content}</p>
                </div>
              ))}
              {logs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 20 }}>Nenhum registro hoje.</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <textarea 
                value={newLog}
                onChange={e => setNewLog(e.target.value)}
                placeholder="Descreva as ações do dia..."
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'none', minHeight: 60 }}
              />
              <button onClick={handleAddLog} className="glass-btn primary" style={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} />
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="dept-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* MÉTRICAS E GRÁFICO */}
        <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={20} className="text-primary" /> Desempenho Mensal</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setIsEditingData(!isEditingData)} className="icon-btn">{isEditingData ? <CloseIcon size={16}/> : <Edit2 size={16}/>}</button>
              <button onClick={handleSyncAds} disabled={isSyncing} className="glass-btn primary small" style={{ fontSize: '0.7rem' }}>
                <RefreshCw size={14} className={isSyncing ? 'spin' : ''} /> Sync
              </button>
            </div>
          </div>

          {isEditingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="glass-input" placeholder="Leads Meta" value={leadsMeta} onChange={e=>setLeadsMeta(e.target.value)}/>
                  <input className="glass-input" placeholder="Cliques Meta" value={clicksMeta} onChange={e=>setClicksMeta(e.target.value)}/>
                  <input className="glass-input" placeholder="Leads Google" value={leadsGoogle} onChange={e=>setLeadsGoogle(e.target.value)}/>
                  <input className="glass-input" placeholder="Cliques Google" value={clicksGoogle} onChange={e=>setClicksGoogle(e.target.value)}/>
               </div>
               <button onClick={handleSaveData} className="glass-btn primary">Salvar</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="stat-card">
                  <label>Total de Leads</label>
                  <div className="value">{totalLeads}</div>
                  <div className="sub-value"><span style={{color: '#3b82f6'}}>M: {leadsMeta}</span> • <span style={{color: '#ea4335'}}>G: {leadsGoogle}</span></div>
                </div>
                <div className="stat-card">
                  <label>Total de Cliques</label>
                  <div className="value" style={{color: '#10b981'}}>{totalClicks}</div>
                  <div className="sub-value"><span style={{color: '#3b82f6'}}>M: {clicksMeta}</span> • <span style={{color: '#ea4335'}}>G: {clicksGoogle}</span></div>
                </div>
              </div>
              <div style={{ height: 180, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="leads" stroke="var(--primary)" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        {/* CAMPANHAS E ALERTAS */}
        <section className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BarChart size={20} className="text-primary" /> Campanhas Ativas</div>
            <button onClick={() => setCampaigns([...campaigns, {id: Date.now(), platform: 'Meta Ads', name: 'Nova Campanha', costPerLead: '0.00', status: 'Ativa'}])} className="icon-btn"><Plus size={18}/></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {campaigns.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                   <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{c.name}</div>
                   <div style={{ fontSize: '0.7rem', color: c.platform.includes('Meta') ? '#3b82f6' : '#ea4335' }}>{c.platform}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.85rem', color: '#10b981' }}>R$ {c.costPerLead}/lead</div>
                   <div className="status-badge active">Ativa</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
             <h5 style={{ margin: '0 0 8px 0', color: '#ea4335', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14}/> Alertas Críticos</h5>
             {alerts.map(a => <div key={a.id} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>• {a.text}</div>)}
          </div>
        </section>
      </div>

      {/* BIBLIOTECA DE CRIATIVOS — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <PieChart size={20} className="text-primary" /> Biblioteca de Criativos de Alta Conversão
            </div>
            <button className="glass-btn primary small" style={{ fontSize: '0.75rem' }}>
              <Plus size={14} /> Solicitar Novo Criativo
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { id: 1, img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop', ctr: '3.2%', cpc: 'R$ 0,80', nome: 'Criativo_Ebook_01' },
              { id: 2, img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop', ctr: '2.8%', cpc: 'R$ 1,05', nome: 'Criativo_Consultoria' },
              { id: 3, img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=250&fit=crop', ctr: '4.5%', cpc: 'R$ 0,55', nome: 'Vídeo_Promocional_V1' },
              { id: 4, img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=250&fit=crop', ctr: '2.1%', cpc: 'R$ 1,20', nome: 'Carrossel_Servicos' }
            ].map(criativo => (
              <div key={criativo.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <img src={criativo.img} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                 <div style={{ padding: 12 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>{criativo.nome}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>CTR: {criativo.ctr}</span>
                      <span>CPC: {criativo.cpc}</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CONTAS VINCULADAS LISTA — somente funcionários */}
      {!isClient && (
        <section className="glass-panel" style={{ padding: 16 }}>
           <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 'bold', marginBottom: 16 }}>
              <Globe size={20} className="text-primary" /> Conexões Ativas
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {connections.map(conn => (
                <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }} />
                  <div>
                     <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{conn.platform.toUpperCase()}</div>
                     <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{conn.account_id}</div>
                  </div>
                </div>
              ))}
              {connections.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma conta vinculada.</p>}
           </div>
        </section>
      )}`;

const split1 = content.split(\`  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <DepartmentGuide department="Tráfego Pago" />
        <GoogleDriveConnector client={client} department="Tráfego Pago" />
      </div>\`);
const split2 = split1[1].split('      {isConnModalOpen && (');

if (split1.length > 1 && split2.length > 1) {
  content = split1[0] + newReturnHTML + '\\n\\n      {isConnModalOpen && (' + split2[1];
  fs.writeFileSync('src/pages/Trafego.jsx', content, 'utf-8');
  console.log("Success");
} else {
  console.log("Failed to split");
}
