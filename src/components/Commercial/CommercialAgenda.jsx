import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Video, MapPin, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const CommercialAgenda = ({ employees }) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: '', scheduled_at: '', type: 'online', meeting_link: '', location: '', description: '', lead_id: '' });
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchMeetings();
    fetchLeads();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_meetings')
      .select('*')
      .eq('department', 'Comercial')
      .order('scheduled_at', { ascending: true });
    setMeetings(data || []);
    setLoading(false);
  };

  const fetchLeads = async () => {
    const { data } = await supabase.from('commercial_leads').select('id, name');
    setLeads(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (form.lead_id) {
        // Checagem de Conflitos
        const eventDate = new Date(form.scheduled_at).toDateString();
        const { data: conflicts } = await supabase
          .from('client_meetings')
          .select('*')
          .filter('metadata->>lead_id', 'eq', form.lead_id);
        
        if (conflicts && conflicts.length > 0) {
          const sameDayConflicts = conflicts.filter(c => new Date(c.scheduled_at).toDateString() === eventDate);
          if (sameDayConflicts.length > 0) {
            const conflict = sameDayConflicts[0];
            const time = new Date(conflict.scheduled_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
            const msg = `Este Lead já possui uma reunião agendada para este dia às ${time}.\nAssunto: ${conflict.title}\n\nDeseja unir-se à reunião existente? \n[OK] para ingressar nesta mesma reunião\n[Cancelar] para escolher outra data`;
            
            if (window.confirm(msg)) {
              alert("Aviso de participação conjunta registrado! Converse com o responsável.");
              setShowModal(false);
              return;
            } else {
              return; // Permite o usuário escolher outra data
            }
          }
        }
      }

      const link = form.type === 'online' && !form.meeting_link ? 'https://meet.google.com/new' : form.meeting_link;
      const { error } = await supabase.from('client_meetings').insert([{
        title: form.subject,
        subject: form.subject,
        scheduled_at: form.scheduled_at,
        type: form.type,
        meeting_link: link,
        location: form.location,
        description: form.description,
        department: 'Comercial',
        created_by: user?.id,
        status: 'Agendado',
        client_approval: 'approved',
        metadata: { lead_id: form.lead_id }
      }]);
      if (error) throw error;
      
      if (form.lead_id) {
        // Log interaction for this lead
        await supabase.from('commercial_interactions').insert([{
          lead_id: form.lead_id,
          employee_id: user?.employeeId,
          type: 'meeting',
          content: `Reunião agendada: ${form.subject} para ${new Date(form.scheduled_at).toLocaleString()}`
        }]);
        
        // Auto update lead status
        await supabase.from('commercial_leads').update({ status: 'Reunião Agendada' }).eq('id', form.lead_id);
      }

      setShowModal(false);
      setForm({ subject: '', scheduled_at: '', type: 'online', meeting_link: '', location: '', description: '', lead_id: '' });
      fetchMeetings();
    } catch (err) {
      alert('Erro ao agendar reunião: ' + err.message);
    }
  };

  const fmt = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const upcoming = meetings.filter(m => new Date(m.scheduled_at) >= new Date() && m.status !== 'Cancelado');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={20} className="text-primary"/> Agenda do Hub Comercial</h3>
        <button onClick={() => setShowModal(true)} className="glass-btn primary"><Plus size={16}/> Agendar Reunião</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Carregando agenda...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {upcoming.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma reunião comercial agendada.</p>}
          {upcoming.map(m => {
            const leadId = m.metadata?.lead_id;
            const leadName = leads.find(l => l.id === leadId)?.name;
            return (
              <div key={m.id} className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{m.subject}</strong>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 12 }}>Agendado</span>
                </div>
                {leadName && <div style={{ fontSize: '0.85rem', color: '#a5b4fc', fontWeight: 600 }}>Lead: {leadName}</div>}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14}/> {fmt(m.scheduled_at)}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.type === 'online' ? <><Video size={14}/> Online</> : <><MapPin size={14}/> {m.location || 'Presencial'}</>}
                </div>
                {m.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>{m.description}</p>}
                
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noreferrer" className="glass-btn" style={{ flex: 1, textAlign: 'center', padding: '6px', fontSize: '0.8rem', color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)' }}>Abrir Link Meet</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 400, padding: 24, position: 'relative' }}>
            <button onClick={() => setShowModal(false)} className="icon-btn text-muted" style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={20} className="text-primary" /> Agendar Reunião</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assunto *</label><input required className="glass-input" style={{ width: '100%' }} value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} /></div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vincular a um Lead (Opcional)</label>
                <select className="glass-input" style={{ width: '100%' }} value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}>
                  <option value="">Sem vínculo</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Data/Hora *</label><input required type="datetime-local" max="9999-12-31T23:59" className="glass-input" style={{ width: '100%' }} value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} /></div>
                <div><label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tipo</label><select className="glass-input" style={{ width: '100%' }} value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="online">Online (Meet)</option><option value="presencial">Presencial</option></select></div>
              </div>
              <div><label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pauta / Detalhes</label><textarea className="glass-input" style={{ width: '100%' }} rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} className="glass-btn" style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="glass-btn primary" style={{ flex: 1 }}>Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialAgenda;
