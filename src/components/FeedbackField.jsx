import { useState, useEffect } from 'react';
import { Send, MessageSquareText, FileWarning, Paperclip, Volume2 } from 'lucide-react';

const FeedbackField = ({ initialFeedback = '', onSubmit, readOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setFeedback(initialFeedback || '');
  }, [initialFeedback]);

  const handleSend = () => {
    if (!feedback.trim()) return;
    setSent(true);
    if (onSubmit) onSubmit(feedback);
    setTimeout(() => {
      setIsOpen(false);
      setSent(false);
    }, 3000);
  };

  const hasFeedback = initialFeedback && initialFeedback.trim().length > 0;

  // Rich feedback parser
  const renderRichFeedback = (text) => {
    if (!text) return null;
    
    const audios = [];
    const files = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    const matches = text.match(urlRegex) || [];
    matches.forEach(url => {
      const isAudio = url.toLowerCase().includes('.webm') || url.toLowerCase().includes('.mp3') || url.toLowerCase().includes('.wav');
      if (isAudio) {
        audios.push(url);
      } else {
        files.push(url);
      }
    });

    let cleanText = text
      .replace(/📎\s*(?:Anexo)?:\s*https?:\/\/[^\s]+/gi, '')
      .replace(/🔊\s*(?:Áudio)?:\s*https?:\/\/[^\s]+/gi, '')
      .replace(/https?:\/\/[^\s]+/gi, '')
      .trim();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cleanText && (
          <div style={{ lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
            {cleanText}
          </div>
        )}
        
        {audios.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            {audios.map((url, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#fb7185', fontWeight: 600 }}>
                  <Volume2 size={12} /> Áudio de Ajuste
                </span>
                <audio src={url} controls style={{ width: '100%', height: '32px', borderRadius: '4px', outline: 'none' }} />
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {files.map((url, i) => {
              const rawName = url.split('/').pop().split('?')[0] || 'arquivo';
              const decodedName = decodeURIComponent(rawName).replace(/^\d+_[a-z0-9]+_/, '');
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    fontSize: '0.72rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    transition: '0.2s',
                    fontWeight: 600
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                >
                  <Paperclip size={12} />
                  {decodedName}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '8px', width: '100%' }}>
      {hasFeedback && !isOpen && (
        <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '3px solid #ef4444', marginBottom: '8px', fontSize: '0.8rem', color: '#fca5a5' }}>
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fca5a5', opacity: 0.8 }}>Motivo / Correção:</strong>
          {renderRichFeedback(initialFeedback)}
        </div>
      )}
      
      {!isOpen && !sent && !readOnly && (
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          style={{ background: 'none', border: 'none', color: hasFeedback ? '#ef4444' : 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', transition: '0.2s', fontWeight: hasFeedback ? '600' : 'normal' }}
          onMouseOver={(e) => e.currentTarget.style.color = hasFeedback ? '#f87171' : 'var(--text-main)'}
          onMouseOut={(e) => e.currentTarget.style.color = hasFeedback ? '#ef4444' : 'var(--text-muted)'}
        >
          {hasFeedback ? <FileWarning size={14} /> : <MessageSquareText size={14} />} 
          {hasFeedback ? 'Editar Motivo/Correção' : 'Rejeitar / Solicitar Alteração'}
        </button>
      )}
      
      {isOpen && !sent && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input 
            type="text" 
            placeholder="O que precisa ser corrigido?" 
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.85rem', outline: 'none' }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
              if (e.key === 'Escape') setIsOpen(false);
            }}
          />
          <button 
            onClick={(e) => { e.stopPropagation(); handleSend(); }}
            style={{ background: '#ef4444', border: 'none', borderRadius: '8px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}
          >
            <Send size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      )}

      {sent && (
        <span style={{ fontSize: '0.85rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', padding: '6px 0' }}>
          ✓ Feedback enviado!
        </span>
      )}
    </div>
  );
};

export default FeedbackField;
