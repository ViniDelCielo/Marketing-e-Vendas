import React, { useRef, useState } from 'react';
import { X, Download, User, Users, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ClientEbook from './ClientEbook';
import CollaboratorEbook from './CollaboratorEbook';
import AdminEbook from './AdminEbook';

const TABS = [
  { id: 'admin', label: '📕 Gestor / Admin', icon: <Shield size={16} />, color: '#ef4444' },
  { id: 'employee', label: '📗 Colaborador', icon: <Users size={16} />, color: '#10b981' },
  { id: 'client', label: '📘 Cliente', icon: <User size={16} />, color: '#3b82f6' },
];

const TrainingEbook = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const contentRef = useRef(null);
  const role = user?.role || 'client';
  const canSeeAll = role === 'owner' || role === 'admin';
  const defaultTab = canSeeAll ? 'admin' : role === 'employee' ? 'employee' : 'client';
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (!isOpen) return null;

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[2];
  const ebookTitle = activeTab === 'admin' ? 'Manual do Gestor e Administrador' : activeTab === 'employee' ? 'Manual do Colaborador' : 'Manual do Cliente';

  const handleDownloadPDF = () => {
    const content = contentRef.current;
    if (!content) return;
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${ebookTitle} - ROI Expert</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;line-height:1.7;padding:40px}.ebook-cover{text-align:center;padding:60px 20px;margin-bottom:40px;border-bottom:3px solid #6366f1}.ebook-cover h1{font-size:2rem;margin-bottom:8px}.ebook-cover p{color:#64748b;font-size:1.1rem}.ebook-chapter{margin-bottom:32px;page-break-inside:avoid}.ebook-chapter h2{font-size:1.4rem;color:#6366f1;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px}.ebook-chapter h3{font-size:1.1rem;color:#334155;margin:16px 0 8px}.ebook-chapter p,.ebook-chapter li{font-size:.95rem;color:#475569}.ebook-chapter ul{padding-left:24px;margin:8px 0}.ebook-chapter li{margin-bottom:6px}.ebook-img{max-width:100%;border:1px solid #e2e8f0;border-radius:8px;margin:12px 0}.step-block{display:flex;gap:14px;margin:12px 0;padding:12px;background:#f8fafc;border-radius:8px;border-left:3px solid #6366f1}.step-num{width:28px;height:28px;background:#6366f1;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;flex-shrink:0}.step-block strong{color:#1e293b;display:block;margin-bottom:4px}.ebook-tip{background:#eff6ff;border:1px solid #bfdbfe;padding:12px 16px;border-radius:8px;font-size:.9rem;color:#1e40af;margin:12px 0}.ebook-warning{background:#fef3c7;border:1px solid #fde68a;padding:12px 16px;border-radius:8px;font-size:.9rem;color:#92400e;margin:12px 0}.kanban-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.kb-col{background:#6366f1;color:white;padding:4px 10px;border-radius:6px;font-size:.8rem;font-weight:600}.ebook-table{width:100%;border-collapse:collapse;margin:12px 0}.ebook-table th,.ebook-table td{padding:10px;border:1px solid #e2e8f0;text-align:left;font-size:.9rem}.ebook-table th{background:#f1f5f9;font-weight:700}.faq-item{margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:8px}.faq-item strong{display:block;margin-bottom:4px}.faq-item p{color:#64748b;font-size:.9rem}@media print{body{padding:20px}.ebook-chapter{page-break-inside:avoid}}</style></head><body>${content.innerHTML}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  };

  return (
    <div className="ebook-overlay" onClick={onClose}>
      <div className="ebook-modal" onClick={e => e.stopPropagation()}>
        <header className="ebook-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: currentTab.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{currentTab.icon}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{ebookTitle}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROI Expert — Guia Interativo</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleDownloadPDF} className="ebook-action-btn" title="Baixar PDF"><Download size={18} /> <span>Baixar PDF</span></button>
            <button onClick={onClose} className="ebook-close-btn"><X size={20} /></button>
          </div>
        </header>

        {canSeeAll && (
          <div className="ebook-tabs">
            {TABS.map(tab => (
              <button key={tab.id} className={`ebook-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ '--tab-color': tab.color }}>{tab.label}</button>
            ))}
          </div>
        )}

        <div className="ebook-body" ref={contentRef}>
          {activeTab === 'admin' ? <AdminEbook /> : activeTab === 'employee' ? <CollaboratorEbook /> : <ClientEbook />}
        </div>
      </div>

      <style>{`
        .ebook-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}
        .ebook-modal{width:100%;max-width:900px;height:90vh;background:var(--surface,#0f172a);border:1px solid rgba(255,255,255,0.1);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)}
        .ebook-header{padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:rgba(0,0,0,0.3)}
        .ebook-tabs{display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;background:rgba(0,0,0,0.15);padding:0 16px}
        .ebook-tab{flex:1;padding:12px 16px;background:transparent;border:none;color:var(--text-muted);font-size:0.85rem;font-weight:600;cursor:pointer;transition:0.2s;border-bottom:3px solid transparent;display:flex;align-items:center;justify-content:center;gap:6px}
        .ebook-tab:hover{color:var(--text-main,white);background:rgba(255,255,255,0.03)}
        .ebook-tab.active{color:var(--text-main,white);border-bottom-color:var(--tab-color);background:rgba(255,255,255,0.05)}
        .ebook-action-btn{background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px;font-weight:600;font-size:0.85rem;transition:0.2s}
        .ebook-action-btn:hover{transform:scale(1.03);box-shadow:0 4px 15px rgba(99,102,241,0.4)}
        .ebook-action-btn span{white-space:nowrap}
        .ebook-close-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-muted);padding:8px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:0.2s}
        .ebook-close-btn:hover{background:rgba(239,68,68,0.1);color:#ef4444}
        .ebook-body{flex:1;overflow-y:auto;padding:32px}
        .ebook-body::-webkit-scrollbar{width:6px}
        .ebook-body::-webkit-scrollbar-track{background:transparent}
        .ebook-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        .ebook-content{max-width:700px;margin:0 auto}
        .ebook-cover{text-align:center;padding:40px 20px 32px;margin-bottom:32px;border-bottom:2px solid rgba(99,102,241,0.3)}
        .ebook-cover h1{font-size:1.8rem;color:var(--text-main,white);margin-bottom:8px}
        .ebook-cover p{color:var(--text-muted);font-size:1rem}
        .ebook-index{background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:20px 24px;margin-bottom:32px}
        .ebook-index h3{margin:0 0 12px;font-size:1rem;color:#a5b4fc}
        .ebook-index ol{padding-left:20px;margin:0}
        .ebook-index li{margin-bottom:6px;font-size:0.9rem}
        .ebook-index a{color:#93c5fd;cursor:pointer;text-decoration:none;transition:0.2s;border-bottom:1px dashed rgba(147,197,253,0.3)}
        .ebook-index a:hover{color:#c4b5fd;border-bottom-color:#c4b5fd}
        .ebook-chapter{margin-bottom:40px}
        .ebook-chapter h2{font-size:1.3rem;color:#a5b4fc;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:10px;margin-bottom:16px}
        .ebook-chapter h3{font-size:1.05rem;color:var(--text-main,white);margin:20px 0 10px}
        .ebook-chapter p{color:var(--text-muted);font-size:0.9rem;line-height:1.7;margin-bottom:8px}
        .ebook-chapter ul{padding-left:20px;margin:8px 0 12px}
        .ebook-chapter li{color:var(--text-muted);font-size:0.9rem;margin-bottom:6px;line-height:1.6}
        .ebook-img{width:100%;border:1px solid rgba(255,255,255,0.1);border-radius:12px;margin:16px 0;box-shadow:0 4px 20px rgba(0,0,0,0.3)}
        .step-block{display:flex;gap:14px;margin:14px 0;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;border-left:3px solid #6366f1}
        .step-num{width:28px;height:28px;background:#6366f1;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;margin-top:2px}
        .step-block strong{color:var(--text-main,white);display:block;margin-bottom:4px;font-size:0.95rem}
        .step-block p{margin:0}
        .ebook-tip{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);padding:12px 16px;border-radius:10px;font-size:0.85rem;color:#93c5fd;margin:14px 0}
        .ebook-warning{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);padding:12px 16px;border-radius:10px;font-size:0.85rem;color:#fcd34d;margin:14px 0}
        .kanban-flow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0;font-size:0.9rem;color:var(--text-muted)}
        .kb-col{background:rgba(99,102,241,0.2);color:#a5b4fc;padding:4px 10px;border-radius:6px;font-size:0.78rem;font-weight:600;border:1px solid rgba(99,102,241,0.3)}
        .ebook-table{width:100%;border-collapse:collapse;margin:14px 0}
        .ebook-table th,.ebook-table td{padding:10px 12px;border:1px solid rgba(255,255,255,0.08);text-align:left;font-size:0.85rem;color:var(--text-muted)}
        .ebook-table th{background:rgba(255,255,255,0.03);color:var(--text-main,white);font-weight:700}
        .faq-item{margin-bottom:14px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px}
        .faq-item strong{color:var(--text-main,white);display:block;margin-bottom:6px;font-size:0.95rem}
        .faq-item p{margin:0}
        @media(max-width:768px){.ebook-modal{height:100vh;border-radius:0;max-width:100%}.ebook-body{padding:20px}.ebook-action-btn span{display:none}.ebook-tab{font-size:0.75rem;padding:10px 8px}}
      `}</style>
    </div>
  );
};

export default TrainingEbook;
