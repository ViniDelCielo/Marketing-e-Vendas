import React, { useState, useEffect } from 'react';
import { HardDrive, Link, ExternalLink, Check, Save, RefreshCw, Folder, Camera, Video, Palette, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DEPT_ICONS = {
  'Captação': <Camera size={14} />,
  'Edição': <Video size={14} />,
  'Design': <Palette size={14} />,
  'Social Media': <Megaphone size={14} />
};

const GoogleDriveConnector = ({ client, department }) => {
  const [driveUrl, setDriveUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasSpecificLink, setHasSpecificLink] = useState(false);
  const [rootLink, setRootLink] = useState('');

  const driveLinks = client?.metadata?.drive_links || {};

  useEffect(() => {
    const specific = client?.metadata?.drive_links?.[department];
    const root = client?.metadata?.drive_folder_url;
    
    setRootLink(root || '');
    
    if (specific) {
      setDriveUrl(specific);
      setHasSpecificLink(true);
    } else {
      setDriveUrl(root || '');
      setHasSpecificLink(false);
    }
  }, [client, department]);

  const handleSave = async () => {
    if (!driveUrl.trim()) return;
    setSaving(true);
    try {
      const currentLinks = client.metadata?.drive_links || {};
      const newMetadata = {
        ...(client.metadata || {}),
        drive_links: {
          ...currentLinks,
          [department]: driveUrl
        }
      };

      const { error } = await supabase
        .from('clients')
        .update({ metadata: newMetadata })
        .eq('id', client.id);

      if (error) throw error;
      setHasSpecificLink(true);
      alert(`Link da pasta de ${department} salvo com sucesso!`);
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDrive = (url) => {
    const target = url || driveUrl;
    if (target) window.open(target, '_blank');
  };

  return (
    <div className="drive-connector-card glass-panel" style={{ 
      padding: '20px', 
      border: '1px solid rgba(66, 133, 244, 0.3)',
      background: 'rgba(66, 133, 244, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      height: '100%',
      position: 'relative'
    }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '12px', 
            background: 'linear-gradient(135deg, #4285F4, #34a853)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'white',
            boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)'
          }}>
             <HardDrive size={20} />
          </div>
          <div style={{ flex: 1 }}>
             <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>PASTA DO CLIENTE: {department.toUpperCase()}</h5>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {!hasSpecificLink && rootLink && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.2)', color: '#fcd34d', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    EXIBINDO PASTA RAIZ
                  </span>
                )}
                {hasSpecificLink && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    PASTA ESPECÍFICA CONECTADA
                  </span>
                )}
             </div>
          </div>
          <button 
            onClick={() => openDrive()} 
            className="icon-btn-premium" 
            style={{ color: '#4285F4', background: 'rgba(66, 133, 244, 0.1)', padding: 8, borderRadius: 10, cursor: 'pointer', border: 'none' }} 
            title="Abrir no Google Drive"
            disabled={!driveUrl}
          >
             <ExternalLink size={18} />
          </button>
       </div>

       <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
             <Link size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(66, 133, 244, 0.6)' }} />
             <input 
                type="text" 
                className="premium-input" 
                style={{ 
                  width: '100%', padding: '10px 10px 10px 36px', fontSize: '0.8rem',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: 'white', outline: 'none'
                }} 
                placeholder="Link da sub-pasta específica..." 
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
             />
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving || !driveUrl} 
            className="premium-action-btn"
            style={{ 
              padding: '0 15px', borderRadius: '10px', background: '#4285F4', 
              color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: '0.2s'
            }}
          >
            {saving ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
            <span style={{ fontSize: '0.75rem' }}>SALVAR</span>
          </button>
       </div>

       {/* Interligação: Atalhos para outras pastas */}
       <div style={{ 
         marginTop: 4, 
         paddingTop: 10, 
         borderTop: '1px solid rgba(255,255,255,0.05)',
         display: 'flex',
         flexDirection: 'column',
         gap: 8
       }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>
            Acesso Rápido - Outras Pastas
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Pasta Raiz */}
            {rootLink && (
              <button 
                onClick={() => openDrive(rootLink)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
              >
                <Folder size={12} /> Raiz
              </button>
            )}
            
            {/* Outros Departamentos */}
            {Object.keys(DEPT_ICONS).map(dept => {
              if (dept === department) return null;
              const link = driveLinks[dept];
              if (!link) return null;
              return (
                <button 
                  key={dept}
                  onClick={() => openDrive(link)}
                  style={{ background: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.2)', borderRadius: 8, padding: '6px 10px', color: '#93c5fd', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  title={`Abrir pasta de ${dept}`}
                >
                  {DEPT_ICONS[dept]} {dept}
                </button>
              );
            })}
          </div>
       </div>
       
       <style>{`
         .premium-input:focus { border-color: #4285F4 !important; background: rgba(0,0,0,0.4) !important; }
         .premium-action-btn:hover:not(:disabled) { background: #3b82f6 !important; }
         .icon-btn-premium:hover { background: rgba(66, 133, 244, 0.2) !important; }
       `}</style>
    </div>
  );
};

export default GoogleDriveConnector;
