import { useState, useRef } from 'react';
import { Upload, X, Loader2, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ContractUpload({
  currentUrl,
  type = 'client',
  entityId,
  onUpload
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 10 MB.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const folder = type === 'employee' ? 'employees' : 'clients';
      const id = entityId || `temp-${Date.now()}`;
      const path = `${folder}/contract-${id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(path);

      onUpload?.(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeContract = () => {
    onUpload?.(null);
  };

  return (
    <div className="contract-upload-root">
      {!currentUrl && (
        <button
          type="button"
          className="contract-upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 size={16} className="spin" /> Enviando...</>
          ) : (
            <><Upload size={16} /> Anexar Contrato (PDF/Word)</>
          )}
        </button>
      )}

      {currentUrl && (
        <div className="contract-active">
          <div className="contract-info">
            <div className="contract-icon"><FileText size={18} color="#10b981" /></div>
            <div>
              <span className="contract-name">Contrato Anexado</span>
              <a href={currentUrl} target="_blank" rel="noreferrer" className="contract-link">
                Visualizar <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <button type="button" className="remove-btn" onClick={removeContract} title="Remover Contrato">
            <X size={16} />
          </button>
        </div>
      )}

      {error && <span className="error-text">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: 'none' }}
      />

      <style>{`
        .contract-upload-root {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .contract-upload-btn {
          display: flex; align-items: center; gap: 8px; justify-content: center;
          padding: 12px 16px; border-radius: 10px; width: 100%;
          border: 1px dashed rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.1);
          color: var(--text-main); font-weight: 500;
          cursor: pointer; transition: all 0.2s;
        }
        .contract-upload-btn:hover:not(:disabled) {
          border-color: var(--primary); background: rgba(99,102,241,0.1); color: #a5b4fc;
        }
        .contract-active {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-radius: 10px;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
        }
        .contract-info {
          display: flex; align-items: center; gap: 12px;
        }
        .contract-icon {
          width: 36px; height: 36px; border-radius: 8px; background: rgba(16,185,129,0.2);
          display: flex; align-items: center; justify-content: center;
        }
        .contract-name { display: block; font-size: 0.9rem; font-weight: 600; color: #34d399; margin-bottom: 2px;}
        .contract-link { display: flex; align-items: center; gap: 4px; font-size: 0.8rem; color: #a5b4fc; text-decoration: none; }
        .contract-link:hover { text-decoration: underline; }
        .remove-btn {
          background: rgba(239,68,68,0.1); border: none; color: #f87171;
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
        }
        .remove-btn:hover { background: rgba(239,68,68,0.2); }
        .error-text { font-size: 0.8rem; color: #f87171; }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
