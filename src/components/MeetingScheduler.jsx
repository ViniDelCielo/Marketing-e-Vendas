import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, Video, MapPin, Clock, Users, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { useMeetings } from '../hooks/useMeetings';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import MeetingCalendar from './MeetingCalendar';
import MeetingAssistant from './MeetingAssistant';
import { supabase } from '../lib/supabase';

const SC = { 'Aguardando Aprovação':'#eab308', 'Agendado':'#10b981', 'Cancelado':'#ef4444', 'Realizado':'#6366f1' };
const SL = { 'Aguardando Aprovação':'Pendente', 'Agendado':'Aprovada', 'Cancelado':'Cancelada', 'Realizado':'Realizada' };
const AL = { pending:'⏳ Aguardando Cliente', approved:'✅ Aprovada', rejected:'❌ Rejeitada' };

const MeetingScheduler = ({ client, department }) => {
  const confirm = useConfirm();
  const { user } = useAuth();
  const { meetings, allClientMeetings, loading, createMeeting, updateMeeting, deleteMeeting, requestJoin, approveJoin, rejectJoin, checkConflicts } = useMeetings(client?.id, department);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [form, setForm] = useState({ title:'', subject:'', scheduled_at:'', type:'online', meeting_link:'', location:'', description:'', whatsapp_phone:'', ata:'', participants:[] });
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [agencyUsers, setAgencyUsers] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, name, dept').neq('role', 'client').order('name');
      if (data) setAgencyUsers(data);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowDetail(null);
        setIsEditingDetail(false);
      }
    };
    if (showModal || showDetail) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showDetail]);

  if (!client) return null;
  const isClient = user?.role === 'client';
  const today = new Date();
  const upcoming = meetings.filter(m => new Date(m.scheduled_at) >= today && m.status !== 'Cancelado');
  const past = meetings.filter(m => new Date(m.scheduled_at) < today || m.status === 'Realizado');
  const otherDept = allClientMeetings.filter(m => m.department !== department && new Date(m.scheduled_at) >= today && m.status !== 'Cancelado');
  const pendingJoins = meetings.filter(m => (m.join_requests||[]).some(r => r.status === 'pending'));

  const handleDateChange = v => { setForm(f=>({...f, scheduled_at:v})); setConflicts(checkConflicts(v)); setErrorMsg(''); };
  const fmt = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const addPart = () => { if(!pName.trim())return; setForm(f=>({...f,participants:[...f.participants,{name:pName,email:pEmail,role:'client'}]})); setPName(''); setPEmail(''); };

  const handleSubmit = async () => {
    setErrorMsg('');
    if(!form.subject.trim()) return setErrorMsg('O assunto da reunião é obrigatório!');
    if(!form.scheduled_at) return setErrorMsg('Selecione data e hora!');
    try {
      const link = form.type==='online' && !form.meeting_link ? 'https://meet.google.com/new' : form.meeting_link;
      const { ata, ...meetingToCreate } = form;
      await createMeeting({...meetingToCreate, meeting_link:link, created_by:user?.id, participants:form.participants});
      setShowModal(false);
      setForm({title:'',subject:'',scheduled_at:'',type:'online',meeting_link:'',location:'',description:'',whatsapp_phone:'',ata:'',participants:[]});
      setConflicts([]);
    } catch (error) {
      console.error('Error creating meeting:', error);
      setErrorMsg('Erro do banco de dados: ' + (error.message || 'Verifique o console.'));
    }
  };

  const handleJoinReq = async id => { await requestJoin(id, department, user?.id, user?.name||'Colaborador'); alert('Solicitação enviada!'); };

  return (
    <section className="glass-panel" style={{padding:20,marginTop:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,fontSize:'1.1rem',fontWeight:'bold'}}><Calendar size={20}/> Reuniões — {department}</div>
        {!isClient && <button className="glass-btn primary small" onClick={()=>setShowModal(true)} style={{display:'flex',alignItems:'center',gap:6}}><Plus size={16}/> Nova Reunião</button>}
      </div>

      {/* Calendário Visual */}
      <MeetingCalendar meetings={allClientMeetings} onDayClick={d => { if(!isClient){ const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T10:00`; setForm(f=>({...f,scheduled_at:iso})); setConflicts(checkConflicts(iso)); setShowModal(true); }}} />

      {/* Join requests pendentes */}
      {pendingJoins.length > 0 && <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
        {pendingJoins.map(m => (m.join_requests||[]).filter(r=>r.status==='pending').map((r,i) => (
          <div key={`${m.id}-${i}`} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(234,179,8,.08)',border:'1px solid rgba(234,179,8,.2)',borderRadius:10,fontSize:'.85rem',color:'var(--text-muted)'}}>
            <AlertTriangle size={16} color="#eab308"/>
            <span style={{flex:1}}><b>{r.requestedByName}</b> ({r.dept}) quer participar de "<b>{m.subject}</b>"</span>
            <button onClick={()=>approveJoin(m.id,r.dept)} style={{background:'rgba(16,185,129,.2)',color:'#10b981',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontWeight:700}}>✓</button>
            <button onClick={()=>rejectJoin(m.id,r.dept)} style={{background:'rgba(239,68,68,.2)',color:'#ef4444',border:'none',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontWeight:700}}>✗</button>
          </div>
        )))}
      </div>}

      {/* Lista reuniões */}
      {loading ? <p style={{color:'var(--text-muted)',textAlign:'center',padding:20}}>Carregando...</p> : <>
        {upcoming.length===0 && <p style={{color:'var(--text-muted)',textAlign:'center',padding:16,fontSize:'.9rem'}}>Nenhuma reunião agendada.</p>}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {upcoming.map(m => {
            const allD = [m.department,...(m.co_departments||[])].join(' + ');
            return (
              <div key={m.id} onClick={()=>{setShowDetail(m);setIsEditingDetail(false);}} style={{display:'flex',alignItems:'center',gap:14,padding:14,background:'rgba(0,0,0,.15)',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,cursor:'pointer',transition:'.2s'}}>
                <div style={{width:50,height:54,background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.2))',border:'1px solid rgba(99,102,241,.2)',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:'1.2rem',fontWeight:800,color:'var(--text-main,#fff)',lineHeight:1}}>{new Date(m.scheduled_at).getDate()}</span>
                  <span style={{fontSize:'.65rem',textTransform:'uppercase',color:'var(--text-muted)',fontWeight:600}}>{new Date(m.scheduled_at).toLocaleString('pt-BR',{month:'short'})}</span>
                </div>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:3}}>
                  <strong style={{fontSize:'.9rem',color:'var(--text-main,#fff)'}}>{m.subject}</strong>
                  <span style={{fontSize:'.78rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:5}}><Clock size={13}/> {fmt(m.scheduled_at)}</span>
                  <span style={{fontSize:'.78rem',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:5}}>{m.type==='online'?<><Video size={13}/> Online</>:<><MapPin size={13}/> Presencial</>} • {allD}</span>
                  {(m.co_departments||[]).length>0 && <span style={{fontSize:'.72rem',color:'#10b981',background:'rgba(16,185,129,.1)',padding:'2px 8px',borderRadius:6,fontWeight:600,width:'fit-content'}}>🤝 Conjunta</span>}
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  <span style={{padding:'4px 10px',borderRadius:8,fontSize:'.75rem',fontWeight:700,background:SC[m.status]+'22',color:SC[m.status],border:`1px solid ${SC[m.status]}44`}}>{SL[m.status]}</span>
                  <span style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{AL[m.client_approval]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aprovação do cliente */}
        {isClient && upcoming.filter(m=>m.client_approval==='pending').length>0 && <div style={{marginTop:20}}>
          <h4 style={{fontSize:'.9rem',color:'#eab308',marginBottom:10}}>⏳ Aguardando Sua Aprovação</h4>
          {upcoming.filter(m=>m.client_approval==='pending').map(m => (
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:14,padding:14,background:'rgba(234,179,8,.05)',border:'1px solid rgba(234,179,8,.15)',borderRadius:12,marginBottom:8}}>
              <div style={{flex:1}}><strong style={{color:'#fff',fontSize:'.9rem'}}>{m.subject}</strong><br/><span style={{fontSize:'.8rem',color:'var(--text-muted)'}}>{fmt(m.scheduled_at)} • {m.department}</span>{m.description && <p style={{fontSize:'.8rem',color:'var(--text-muted)',marginTop:4}}>{m.description}</p>}</div>
              <button onClick={()=>updateMeeting(m.id,{client_approval:'approved',status:'approved'})} style={{background:'rgba(16,185,129,.2)',color:'#10b981',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:700}}>✅ Aprovar</button>
              <button onClick={()=>updateMeeting(m.id,{client_approval:'rejected',status:'rejected'})} style={{background:'rgba(239,68,68,.2)',color:'#ef4444',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:700}}>❌</button>
            </div>
          ))}
        </div>}

        {/* Outros departamentos */}
        {!isClient && otherDept.length>0 && <div style={{marginTop:20}}>
          <h4 style={{fontSize:'.9rem',color:'var(--text-muted)',marginBottom:10,display:'flex',alignItems:'center',gap:8}}><Users size={16}/> Outros Departamentos</h4>
          {otherDept.map(m => {
            const req = (m.join_requests||[]).some(r=>r.dept===department);
            const joined = (m.co_departments||[]).includes(department);
            return (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:14,padding:12,background:'rgba(0,0,0,.1)',borderLeft:'3px solid #64748b',borderRadius:10,marginBottom:8}}>
                <div style={{flex:1}}><strong style={{fontSize:'.85rem',color:'#fff'}}>{m.subject}</strong><br/><span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{fmt(m.scheduled_at)} • {m.department}</span></div>
                {joined ? <span style={{fontSize:'.78rem',color:'#10b981'}}>🤝 Participando</span> : req ? <span style={{fontSize:'.78rem',color:'#eab308'}}>⏳ Solicitado</span> : <button onClick={()=>handleJoinReq(m.id)} style={{background:'rgba(99,102,241,.15)',color:'#a5b4fc',border:'none',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:'.78rem',fontWeight:600}}>🤝 Participar</button>}
              </div>
            );
          })}
        </div>}

        {past.length>0 && <details style={{marginTop:20}}><summary style={{cursor:'pointer',fontSize:'.9rem',color:'var(--text-muted)',fontWeight:600}}>📜 Histórico ({past.length})</summary>
          <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:6}}>
            {past.slice(0,10).map(m => <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:10,background:'rgba(0,0,0,.1)',borderRadius:8,opacity:.6,fontSize:'.85rem'}}><span style={{color:'#fff'}}>{m.subject} — {fmt(m.scheduled_at)}</span><span style={{color:SC[m.status||'done']}}>{SL[m.status||'done']}</span></div>)}
          </div>
        </details>}
      </>}

      {/* MODAL — Nova Reunião */}
      {showModal && createPortal(
        <div style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setShowModal(false)}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,maxHeight:'85vh',background:'var(--surface,#0f172a)',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,.5)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.1)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(0,0,0,.3)',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem',display:'flex',alignItems:'center',gap:8}}><Plus size={18}/> Nova Reunião</h3>
            <button onClick={()=>setShowModal(false)} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'var(--text-muted)',width:32,height:32,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
          </div>
          <div style={{padding:16,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Assunto *</label>
              <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Ex: Revisão mensal" style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',boxSizing:'border-box'}}/></div>
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Data e Hora *</label>
              <input type="datetime-local" max="9999-12-31T23:59" value={form.scheduled_at} onChange={e=>handleDateChange(e.target.value)} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',boxSizing:'border-box'}}/></div>
            </div>

            {conflicts.length>0 && <div style={{display:'flex',gap:8,padding:10,background:'rgba(234,179,8,.08)',border:'1px solid rgba(234,179,8,.2)',borderRadius:8,fontSize:'.8rem'}}>
              <AlertTriangle size={14} color="#eab308" style={{flexShrink:0,marginTop:2}}/>
              <div><strong style={{color:'#fcd34d',fontSize:'.8rem'}}>⚠️ Conflito!</strong>
                {conflicts.map((c,i) => <div key={i} style={{marginTop:4,color:'var(--text-muted)'}}>{fmt(c.scheduled_at)} — <b>{c.department}</b> ({c.subject})
                  <button onClick={()=>{handleJoinReq(c.id);setShowModal(false)}} style={{marginLeft:6,background:'rgba(99,102,241,.15)',color:'#a5b4fc',border:'none',padding:'2px 8px',borderRadius:6,cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>🤝 Participar</button></div>)}
              </div>
            </div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Tipo</label>
              <div style={{display:'flex',gap:6}}>
                {['online','presencial'].map(t => <button key={t} onClick={()=>setForm(f=>({...f,type:t,...(t==='presencial' && client?.address && !f.location ? {location:client.address} : {})}))} style={{flex:1,padding:'7px 0',background:form.type===t?'rgba(99,102,241,.15)':'rgba(255,255,255,.03)',border:`1px solid ${form.type===t?'rgba(99,102,241,.3)':'rgba(255,255,255,.08)'}`,borderRadius:8,color:form.type===t?'#a5b4fc':'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontWeight:600,fontSize:'.78rem'}}>{t==='online'?<><Video size={14}/> Online</>:<><MapPin size={14}/> Presencial</>}</button>)}
              </div></div>
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>{form.type==='online'?'Link Meet (auto)':'Local'}</label>
              {form.type==='online' ? <input value={form.meeting_link} onChange={e=>setForm(f=>({...f,meeting_link:e.target.value}))} placeholder="https://meet.google.com/..." style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',boxSizing:'border-box'}}/>
              : <div style={{display:'flex',gap:6}}><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Endereço ou sala" style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',boxSizing:'border-box'}}/>
                {form.location && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`} target="_blank" rel="noreferrer" style={{background:'rgba(99,102,241,.15)',color:'#a5b4fc',border:'none',padding:'8px',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}} title="Abrir no Google Maps"><MapPin size={16}/></a>}</div>}
              </div>
            </div>

            <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Observações / Pauta</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Tópicos da reunião..." rows={2} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',resize:'vertical',boxSizing:'border-box'}}/></div>

            <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Telefone para Convite (WhatsApp)</label>
            <input value={form.whatsapp_phone} onChange={e=>setForm(f=>({...f,whatsapp_phone:e.target.value}))} placeholder="Ex: 11999999999" style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'var(--text-main,#fff)',fontSize:'.85rem',outline:'none',boxSizing:'border-box'}}/></div>

            <div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600}}>Participantes</label>
              {!form.participants.some(p=>p.name===client?.name) && <button onClick={()=>setForm(f=>({...f,participants:[...f.participants,{name:client.name,email:client.email||'',role:'client'}]}))} style={{background:'rgba(16,185,129,.15)',color:'#10b981',border:'none',padding:'2px 8px',borderRadius:6,fontSize:'.7rem',cursor:'pointer',fontWeight:600}}>+ Incluir {client.name.split(' ')[0]}</button>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
              <div style={{display:'flex',gap:4}}>
                <input value={pName} onChange={e=>setPName(e.target.value)} placeholder="Nome cliente/externo" style={{flex:1,padding:'6px 8px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.8rem',outline:'none',minWidth:0}}/>
                <button onClick={addPart} style={{background:'rgba(99,102,241,.2)',color:'#a5b4fc',border:'none',padding:'0 10px',borderRadius:8,cursor:'pointer'}}><Plus size={14}/></button>
              </div>
              <select onChange={e=>{
                const u = agencyUsers.find(x=>x.id===e.target.value);
                if(u && !form.participants.some(p=>p.name===u.name)){ setForm(f=>({...f,participants:[...f.participants,{name:u.name,email:'',role:'colaborador',dept:u.dept}]})); }
                e.target.value="";
              }} style={{width:'100%',padding:'6px 8px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.8rem',outline:'none',cursor:'pointer'}}>
                <option value="" style={{background:'#0f172a'}}>+ Convidar Equipe...</option>
                {agencyUsers.map(u=><option key={u.id} value={u.id} style={{background:'#0f172a'}}>{u.name} ({u.dept})</option>)}
              </select>
            </div>
            {form.participants.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{form.participants.map((p,i) => <span key={i} style={{background:p.role==='colaborador'?'rgba(234,179,8,.15)':'rgba(99,102,241,.15)',color:p.role==='colaborador'?'#fcd34d':'#a5b4fc',padding:'3px 8px',borderRadius:6,fontSize:'.75rem',display:'flex',alignItems:'center',gap:4}}>{p.name} {p.role==='colaborador'&&`(${p.dept})`} <button onClick={()=>setForm(f=>({...f,participants:f.participants.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'.9rem',padding:0}}>×</button></span>)}</div>}
            </div>
            {errorMsg && <div style={{padding:'8px 12px',background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,color:'#fca5a5',fontSize:'.8rem',marginBottom:10}}>{errorMsg}</div>}
            <button onClick={handleSubmit} style={{width:'100%',padding:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:'.9rem',cursor:'pointer'}}>📅 Agendar Reunião</button>
          </div>
        </div>
      </div>, document.getElementById('modal-root') || document.body)}

      {/* MODAL — Detalhes */}
      {showDetail && createPortal(
        <div style={{position:'fixed',inset:0,zIndex:99998,background:'rgba(0,0,0,.6)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20} } onClick={()=>{setShowDetail(null);setIsEditingDetail(false);}}>
        <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,maxHeight:'85vh',display:'flex',flexDirection:'column',background:'var(--surface,#0f172a)',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,.5)'}}>
          <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.1)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(0,0,0,.3)',flexShrink:0}}>
            <h3 style={{margin:0,fontSize:'1rem'}}>📋 Detalhes</h3>
            <div style={{display:'flex',gap:10}}>
              {!isClient && !isEditingDetail && <button onClick={()=>setIsEditingDetail(true)} style={{background:'rgba(99,102,241,.15)',color:'#a5b4fc',border:'none',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:'.75rem',fontWeight:600}}>✏️ Editar</button>}
              <button onClick={()=>{setShowDetail(null);setIsEditingDetail(false);}} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'var(--text-muted)',width:32,height:32,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button>
            </div>
          </div>
          <div style={{padding:20,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
            {!isEditingDetail ? <>
              {[['Assunto',showDetail.subject],['Data',fmt(showDetail.scheduled_at)],['Tipo',showDetail.type==='online'?'💻 Online':'📍 Presencial'],['Departamento',[showDetail.department,...(showDetail.co_departments||[])].join(' + ')],['Status',SL[showDetail.status]],['Cliente',AL[showDetail.client_approval]]].map(([k,v],i) => <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:'.9rem',color:'var(--text-muted)'}}><strong style={{color:'var(--text-main,#fff)',marginRight:8}}>{k}:</strong>{v}</div>)}
              {showDetail.description && <div style={{padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:'.9rem',color:'var(--text-muted)'}}><strong style={{color:'#fff',marginRight:8}}>Pauta:</strong>{showDetail.description}</div>}
            </> : <>
              {/* Form de Edição */}
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Assunto</label>
              <input value={showDetail.subject} onChange={e=>setShowDetail(s=>({...s,subject:e.target.value}))} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.85rem'}}/></div>
              
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Data e Hora</label>
              <input type="datetime-local" max="9999-12-31T23:59" value={showDetail.scheduled_at} onChange={e=>setShowDetail(s=>({...s,scheduled_at:e.target.value}))} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.85rem'}}/></div>
              
              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>Observações / Pauta</label>
              <textarea value={showDetail.description||''} onChange={e=>setShowDetail(s=>({...s,description:e.target.value}))} rows={2} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.85rem'}}/></div>

              <div><label style={{fontSize:'.75rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:3}}>WhatsApp Adicional</label>
              <input value={showDetail.whatsapp_phone||''} onChange={e=>setShowDetail(s=>({...s,whatsapp_phone:e.target.value}))} style={{width:'100%',padding:'8px 10px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.85rem'}}/></div>

              <div style={{display:'flex',gap:10,marginTop:10}}>
                <button onClick={async ()=>{
                  await updateMeeting(showDetail.id, {subject:showDetail.subject, scheduled_at:showDetail.scheduled_at, description:showDetail.description, whatsapp_phone:showDetail.whatsapp_phone});
                  setIsEditingDetail(false);
                }} style={{flex:2,padding:10,background:'#10b981',border:'none',borderRadius:8,color:'#fff',fontWeight:700,cursor:'pointer'}}>💾 Salvar Alterações</button>
                <button onClick={()=>setIsEditingDetail(false)} style={{flex:1,padding:10,background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,color:'#fff',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
              </div>

              {/* Botão de Excluir Definitivamente */}
              <div style={{marginTop: 16}}>
                <button onClick={async ()=>{
                  const confirmed = await confirm({
                    title: 'Excluir Reunião?',
                    message: 'Tem certeza que deseja EXCLUIR DEFINITIVAMENTE esta reunião? Esta ação não pode ser desfeita.',
                    confirmText: 'Sim, excluir',
                    isDanger: true
                  });
                  if(confirmed) {
                    await deleteMeeting(showDetail.id);
                    setShowDetail(null);
                    setIsEditingDetail(false);
                  }
                }} style={{width:'100%',padding:10,background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,color:'#fca5a5',fontWeight:700,cursor:'pointer'}}>🚨 Excluir Reunião Definitivamente</button>
              </div>
              <hr style={{borderColor:'rgba(255,255,255,.05)',margin:'10px 0'}}/>
            </>}
            {showDetail.meeting_link && <a href={showDetail.meeting_link} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',borderRadius:10,color:'#fff',textDecoration:'none',fontWeight:700,fontSize:'.9rem',marginTop:4}}><Video size={18}/> Acessar Google Meet <ExternalLink size={14}/></a>}
            {showDetail.location && <div style={{padding:'8px 0',fontSize:'.9rem',color:'var(--text-muted)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><strong style={{color:'#fff',marginRight:8}}>Local:</strong>{showDetail.location}</div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(showDetail.location)}`} target="_blank" rel="noreferrer" style={{background:'rgba(99,102,241,.15)',color:'#a5b4fc',padding:'4px 8px',borderRadius:6,textDecoration:'none',fontSize:'.75rem',display:'flex',alignItems:'center',gap:4}}><MapPin size={12}/> Ver no Mapa</a>
            </div>}
            
            {showDetail.whatsapp_phone && (
              <div style={{marginTop: 8}}>
                <a href={`https://wa.me/55${showDetail.whatsapp_phone.replace(/\\D/g, '')}?text=${encodeURIComponent(`Olá! Nossa reunião "${showDetail.subject}" está agendada para ${fmt(showDetail.scheduled_at)}. ${showDetail.meeting_link ? `Link do Meet: ${showDetail.meeting_link}` : ''}`)}`} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#25D366',color:'#fff',borderRadius:8,textDecoration:'none',fontSize:'.8rem',fontWeight:600}}>
                  📱 Enviar Convite via WhatsApp
                </a>
              </div>
            )}

            {!isClient && showDetail.status !== 'Realizado' && showDetail.status !== 'Cancelado' && (
              <MeetingAssistant 
                meeting={showDetail} 
                onAtaGenerated={async (ataText) => {
                  const currentAta = showDetail.metadata?.ata || '';
                  const updatedAta = currentAta ? currentAta + '\n\n' + ataText : ataText;
                  const updatedMeta = { ...(showDetail.metadata || {}), ata: updatedAta };
                  await updateMeeting(showDetail.id, { metadata: updatedMeta });
                  setShowDetail({...showDetail, metadata: updatedMeta});
                }} 
              />
            )}

            {showDetail && (
              <div style={{marginTop: 12}}>
                <label style={{fontSize:'.8rem',color:'var(--text-muted)',fontWeight:600,display:'block',marginBottom:4}}>Ata da Reunião</label>
                <textarea 
                  value={showDetail.metadata?.ata || ''} 
                  onChange={(e) => setShowDetail(s => ({
                    ...s, 
                    metadata: { ...(s.metadata || {}), ata: e.target.value }
                  }))}
                  placeholder="A ata gerada ou anotações manuais aparecerão aqui..." 
                  rows={4} 
                  style={{width:'100%',padding:'10px',background:'rgba(0,0,0,.3)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,color:'#fff',fontSize:'.85rem',resize:'vertical',outline:'none'}}
                />
                {!isClient && (
                  <button onClick={() => updateMeeting(showDetail.id, { metadata: showDetail.metadata })} style={{marginTop: 8, background:'rgba(16,185,129,.15)',color:'#10b981',border:'none',padding:'6px 12px',borderRadius:6,fontSize:'.8rem',fontWeight:600,cursor:'pointer'}}>
                    💾 Salvar Ata
                  </button>
                )}
              </div>
            )}

            {!isEditingDetail && !isClient && showDetail.status!=='Realizado' && <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={()=>{updateMeeting(showDetail.id,{status:'Realizado'});setShowDetail(null)}} style={{flex:1,background:'rgba(99,102,241,.2)',color:'#a5b4fc',border:'none',padding:10,borderRadius:8,cursor:'pointer',fontWeight:700}}>✅ Realizada</button>
              <button onClick={()=>{updateMeeting(showDetail.id,{status:'Cancelado'});setShowDetail(null)}} style={{flex:1,background:'rgba(239,68,68,.1)',color:'#ef4444',border:'none',padding:10,borderRadius:8,cursor:'pointer',fontWeight:700}}>🚫 Cancelar</button>
            </div>}
          </div>
        </div>
      </div>, document.getElementById('modal-root') || document.body)}
    </section>
  );
};
export default MeetingScheduler;
