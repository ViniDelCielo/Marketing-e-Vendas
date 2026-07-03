import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const MeetingCalendar = ({ meetings = [], onDayClick }) => {
  const [current, setCurrent] = useState(new Date());
  const [tooltip, setTooltip] = useState(null);
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));

  const getMeetingsForDay = (day) => {
    return meetings.filter(m => {
      const d = new Date(m.scheduled_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="mc-cell empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayMeetings = getMeetingsForDay(d);
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const isPast = new Date(year, month, d) < new Date(new Date().setHours(0,0,0,0));
    const hasMtg = dayMeetings.length > 0;
    cells.push(
      <div key={d} className={`mc-cell${isToday ? ' today' : ''}${hasMtg ? ' has-mtg' : ''}`}
        style={{ opacity: isPast ? 0.35 : 1, pointerEvents: isPast ? 'none' : 'auto', cursor: isPast ? 'not-allowed' : 'pointer' }}
        onClick={() => onDayClick && onDayClick(new Date(year, month, d))}
        onMouseEnter={(e) => hasMtg && setTooltip({ x: e.clientX, y: e.clientY, meetings: dayMeetings })}
        onMouseLeave={() => setTooltip(null)}>
        <span>{d}</span>
        {hasMtg && <div className="mc-dots">{dayMeetings.slice(0,3).map((m,i) => <span key={i} className="mc-dot" style={{background: m.client_approval==='approved'?'#10b981':m.client_approval==='rejected'?'#ef4444':'#eab308'}} />)}</div>}
      </div>
    );
  }

  return (
    <div className="mc-wrap">
      <div className="mc-header">
        <button onClick={prev} className="mc-nav"><ChevronLeft size={16}/></button>
        <span className="mc-title">{MONTHS[month]} {year}</span>
        <button onClick={next} className="mc-nav"><ChevronRight size={16}/></button>
      </div>
      <div className="mc-days">{DAYS.map(d => <div key={d} className="mc-day-label">{d}</div>)}</div>
      <div className="mc-grid">{cells}</div>
      {tooltip && (
        <div className="mc-tooltip" style={{position:'fixed',left:tooltip.x+10,top:tooltip.y-10,zIndex:100000}}>
          {tooltip.meetings.map((m,i) => (
            <div key={i} className="mc-tt-item">
              <strong>{m.subject}</strong>
              <span>{new Date(m.scheduled_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} • {m.department}</span>
              <span style={{fontSize:'.7rem',color:m.client_approval==='approved'?'#10b981':'#eab308'}}>{m.client_approval==='approved'?'✅ Aprovada':'⏳ Pendente'}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .mc-wrap{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;margin-bottom:16px}
        .mc-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .mc-title{font-size:.95rem;font-weight:700;color:var(--text-main,#fff)}
        .mc-nav{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:var(--text-muted);border-radius:8px;padding:4px 8px;cursor:pointer;display:flex;align-items:center}
        .mc-nav:hover{background:rgba(99,102,241,.15);color:#a5b4fc}
        .mc-days,.mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
        .mc-day-label{text-align:center;font-size:.7rem;color:var(--text-muted);font-weight:600;padding:4px 0}
        .mc-cell{text-align:center;padding:6px 2px;border-radius:8px;cursor:pointer;font-size:.82rem;color:var(--text-muted);transition:.15s;position:relative;min-height:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
        .mc-cell:not(.empty):hover{background:rgba(99,102,241,.12);color:#fff}
        .mc-cell.today{background:rgba(99,102,241,.2);color:#a5b4fc;font-weight:700;border:1px solid rgba(99,102,241,.3)}
        .mc-cell.has-mtg{font-weight:700;color:var(--text-main,#fff)}
        .mc-cell.empty{cursor:default}
        .mc-dots{display:flex;gap:2px;justify-content:center}
        .mc-dot{width:5px;height:5px;border-radius:50%}
        .mc-tooltip{background:#1e293b;border:1px solid rgba(99,102,241,.3);border-radius:10px;padding:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);min-width:180px;max-width:260px;pointer-events:none}
        .mc-tt-item{display:flex;flex-direction:column;gap:2px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}
        .mc-tt-item:last-child{border-bottom:none}
        .mc-tt-item strong{font-size:.8rem;color:#fff}
        .mc-tt-item span{font-size:.72rem;color:var(--text-muted)}
      `}</style>
    </div>
  );
};
export default MeetingCalendar;
