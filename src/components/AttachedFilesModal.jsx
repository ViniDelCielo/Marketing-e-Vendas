import { useState } from 'react';
import { X, CheckCircle, Clock, FileText, Image as ImageIcon, Video, FileCheck, ArrowLeft, Download } from 'lucide-react';

const MOCK_ATTACHMENTS = [
  { id: 1, name: 'video_vendas_final_v2.mp4', type: 'video', status: 'Aprovado', observation: 'Ficou excelente! Aprovado para subir na campanha de amanhã.', date: '16/Ago/2026' },
  { id: 2, name: 'carrossel_dicas_instagram.png', type: 'image', status: 'Revisão', observation: 'Por favor, trocar a cor do fundo no terceiro slide para um tom mais azul (cor da marca).', date: '17/Ago/2026' },
  { id: 3, name: 'roteiro_youtube_outubro.pdf', type: 'doc', status: 'Revisão', observation: 'O gatilho mental do final está fraco. Podemos adicionar mais urgência na call to action?', date: '18/Ago/2026' },
  { id: 4, name: 'criativo_estatico_promo.jpg', type: 'image', status: 'Aprovado', observation: 'Perfeito, não precisa mexer em nada.', date: '18/Ago/2026' },
];

const AttachedFilesModal = ({ isOpen, onClose, departmentName, client }) => {
  const [activeTab, setActiveTab] = useState('Aprovado');
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  const filteredFiles = MOCK_ATTACHMENTS.filter(f => f.status === activeTab);

  const getIcon = (type, size = 24) => {
    if (type === 'image') return <ImageIcon size={size} color="#3b82f6" />;
    if (type === 'video') return <Video size={size} color="#8b5cf6" />;
    return <FileText size={size} color="#10b981" />;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Arquivos Anexados ({departmentName})</h3>
            <span className="modal-subtitle">Cliente: {client?.name}</span>
          </div>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

        {/* Content Area */}
        {!selectedFile ? (
          <div className="modal-body">
            <div className="tabs-container">
              <button
                className={`tab-btn ${activeTab === 'Aprovado' ? 'active-aprovado' : ''}`}
                onClick={() => setActiveTab('Aprovado')}
              >
                <CheckCircle size={16} /> Aprovados
              </button>
              <button
                className={`tab-btn ${activeTab === 'Revisão' ? 'active-revisao' : ''}`}
                onClick={() => setActiveTab('Revisão')}
              >
                <Clock size={16} /> Solicitado Revisão
              </button>
            </div>

            <div className="files-grid">
              {filteredFiles.length === 0 ? (
                <div className="empty-state">Nenhum arquivo nesta categoria.</div>
              ) : (
                filteredFiles.map(file => (
                  <div key={file.id} className="attachment-card glass-card" onClick={() => setSelectedFile(file)}>
                    <div className="attachment-icon">{getIcon(file.type, 32)}</div>
                    <div className="attachment-info">
                      <h4 title={file.name}>{file.name}</h4>
                      <span>{file.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* File Detail / Feedback View */
          <div className="modal-body file-detail-view">
            <button className="back-link glass-btn" onClick={() => setSelectedFile(null)}>
              <ArrowLeft size={16} /> Voltar para a lista
            </button>

            <div className="preview-container glass-card">
              <div className="preview-placeholder">
                {getIcon(selectedFile.type, 64)}
                <p>{selectedFile.name}</p>
                <button className="glass-btn btn-primary" style={{ marginTop: '16px' }}><Download size={16} /> Baixar Arquivo</button>
              </div>
            </div>

            <div className="feedback-container">
              <h4 className="feedback-title">
                <FileCheck size={18} className={selectedFile.status === 'Aprovado' ? 'text-green' : 'text-orange'} />
                Observação do Cliente ({selectedFile.status})
              </h4>
              <div className="feedback-box">
                <p>"{selectedFile.observation}"</p>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000;
        }
        .modal-content {
          width: 90%;
          max-width: 800px;
          height: 80vh;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(0,0,0,0.2);
        }
        .modal-header h3 { margin: 0 0 4px 0; color: var(--text-main); font-size: 1.3rem; }
        .modal-subtitle { color: var(--text-muted); font-size: 0.9rem; }
        .close-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-muted); cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; transition: 0.2s; }
        .close-btn:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger); border-color: rgba(239, 68, 68, 0.3); }
        
        .modal-body { padding: 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        
        .tabs-container { display: flex; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; }
        .tab-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; border: 1px solid transparent; background: rgba(255,255,255,0.05); color: var(--text-muted); cursor: pointer; transition: 0.2s; font-weight: 500; }
        .tab-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-main); }
        .active-aprovado { background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); color: #34d399; }
        .active-revisao { background: rgba(245, 158, 11, 0.2); border-color: rgba(245, 158, 11, 0.5); color: #fbbf24; }
        
        .files-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .attachment-card { padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; transition: 0.2s; border: 1px solid var(--border-color); }
        .attachment-card:hover { transform: translateY(-4px); border-color: var(--primary); box-shadow: 0 10px 20px rgba(99, 102, 241, 0.1); }
        .attachment-icon { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 16px; margin-bottom: 16px; }
        .attachment-info h4 { margin: 0 0 6px 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; color: var(--text-main); }
        .attachment-info span { font-size: 0.8rem; color: var(--text-muted); }
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 1.1rem; }

        /* Detail View */
        .file-detail-view { gap: 24px; }
        .back-link { align-self: flex-start; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; margin-bottom: 8px; }
        .preview-container { height: 300px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); border-radius: 16px; border: 1px dashed var(--border-color); }
        .preview-placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-muted); }
        
        .feedback-container { background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; }
        .feedback-title { display: flex; align-items: center; gap: 8px; margin: 0 0 16px 0; font-size: 1.1rem; color: var(--text-main); }
        .feedback-box { background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary); font-size: 1.05rem; line-height: 1.6; color: rgba(255,255,255,0.9); font-style: italic; }
        
        .text-green { color: #10b981; }
        .text-orange { color: #f59e0b; }
      `}</style>
    </div>
  );
};
export default AttachedFilesModal;
