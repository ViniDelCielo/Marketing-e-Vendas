import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, Book, Link, Globe, Info, PlayCircle, HardDrive } from 'lucide-react';

const HelpCenter = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState('trafego');

  const topics = [
    { id: 'trafego', title: 'Tráfego Pago', icon: <Globe size={18} /> },
    { id: 'social', title: 'Social Media', icon: <PlayCircle size={18} /> },
    { id: 'ganga', title: 'Ganga Hub', icon: <Link size={18} /> },
    { id: 'geral', title: 'Geral e SLA', icon: <Book size={18} /> },
  ];

  const content = {
    trafego: (
      <>
        <h4>Como realizar integrações no Tráfego Pago</h4>
        <div className="step-item">
          <span className="step-num">1</span>
          <div>
            <strong>Google Ads:</strong> No perfil do cliente, vá até o bloco "Integração de Dados ADS". Clique em "Vincular Conta", selecione Google Ads e insira o ID da conta (ex: 123-456-7890).
          </div>
        </div>
        <div className="step-item">
          <span className="step-num">2</span>
          <div>
            <strong>Meta Ads:</strong> Repita o processo anterior, selecionando "Meta Ads" e inserindo o ID da conta de anúncios (ex: act_123456789).
          </div>
        </div>
        <div className="step-item">
          <span className="step-num">3</span>
          <div>
            <strong>Google Drive:</strong> No painel de cada departamento, localize o bloco <HardDrive size={12} style={{display:'inline', verticalAlign:'middle'}}/> <strong>"Pasta do Google Drive"</strong>. Cole o link da pasta compartilhada e salve. O botão de acesso aparecerá automaticamente para toda a equipe.
          </div>
        </div>
      </>
    ),
    social: (
      <>
        <h4>Conexões de Social Media</h4>
        <div className="step-item">
          <span className="step-num">1</span>
          <div>
            <strong>mLabs:</strong> No painel de Social Media do cliente, vá em "Configurações de Postagem". Insira o código da conta mLabs para que o sistema possa rastrear o status de publicação.
          </div>
        </div>
        <div className="step-item">
          <span className="step-num">2</span>
          <div>
            <strong>Google Drive / Artes:</strong> Sempre anexe o link da pasta de "Artes e Legendas" no campo de metadados da tarefa para que o revisor consiga acessar.
          </div>
        </div>
      </>
    ),
    ganga: (
      <>
        <h4>Ganga Hub e Leads</h4>
        <div className="step-item">
          <span className="step-num">1</span>
          <div>
            <strong>Sincronização:</strong> Para receber leads no Ganga Hub, você deve copiar o "Webhook URL" na aba Integrações e colar nas configurações do seu formulário ou site.
          </div>
        </div>
      </>
    ),
    geral: (
      <>
        <h4>Prazos e SLAs</h4>
        <div className="step-item">
          <span className="step-num">1</span>
          <div>
            <strong>SLA da Atividade:</strong> Cada tarefa tem um tempo definido pelo seu gestor. Se precisar de mais tempo, insira o prazo desejado; o gestor receberá um alerta para aprovar sua exceção.
          </div>
        </div>
      </>
    )
  };

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay no-print">
      <div className="help-modal glass-panel">
        <header className="help-header">
          <div className="title">
             <HelpCircle className="text-primary" />
             <h3>Central de Ajuda e Integrações</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="help-body">
          <aside className="help-sidebar">
            {topics.map(t => (
              <button key={t.id} className={`topic-btn ${activeTopic === t.id ? 'active' : ''}`} onClick={() => setActiveTopic(t.id)}>
                {t.icon} <span>{t.title}</span> <ChevronRight size={14} className="arrow" />
              </button>
            ))}
          </aside>

          <main className="help-content">
             <div className="content-scroll">
                {content[activeTopic]}
             </div>
             <div className="support-info">
                <Info size={16} /> <p>Não encontrou o que precisava? Fale com o suporte técnico da Roi Expert.</p>
             </div>
          </main>
        </div>
      </div>

      <style>{`
        .help-modal { width: 100%; max-width: 800px; height: 500px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .help-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
        .help-header .title { display: flex; align-items: center; gap: 12px; }
        .help-header h3 { margin: 0; font-size: 1.2rem; }
        .close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: 0.2s; }
        .close-btn:hover { color: white; transform: rotate(90deg); }

        .help-body { flex: 1; display: flex; overflow: hidden; }
        .help-sidebar { width: 220px; border-right: 1px solid rgba(255,255,255,0.05); padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .topic-btn { display: flex; align-items: center; gap: 12px; padding: 12px; border: none; background: transparent; color: var(--text-muted); border-radius: 10px; cursor: pointer; transition: 0.2s; text-align: left; }
        .topic-btn span { flex: 1; font-size: 0.9rem; font-weight: 600; }
        .topic-btn .arrow { opacity: 0; transition: 0.2s; }
        .topic-btn.active { background: rgba(99, 102, 241, 0.1); color: #a5b4fc; }
        .topic-btn.active .arrow { opacity: 1; transform: translateX(4px); }
        .topic-btn:hover:not(.active) { background: rgba(255,255,255,0.03); color: white; }

        .help-content { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; background: rgba(0,0,0,0.2); }
        .content-scroll { flex: 1; }
        .help-content h4 { margin: 0 0 20px 0; color: white; font-size: 1.1rem; }
        
        .step-item { display: flex; gap: 16px; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .step-num { width: 24px; height: 24px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; }
        .step-item div { font-size: 0.9rem; line-height: 1.6; color: var(--text-muted); }
        .step-item div strong { color: white; display: block; margin-bottom: 4px; font-size: 0.95rem; }

        .support-info { display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 10px; margin-top: auto; }
        .support-info p { margin: 0; font-size: 0.75rem; color: #a5b4fc; }
      `}</style>
    </div>
  );
};

export default HelpCenter;
