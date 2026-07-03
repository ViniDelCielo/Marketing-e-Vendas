import React from 'react';
import { HelpCircle, ChevronRight, ExternalLink } from 'lucide-react';

const DepartmentGuide = ({ department }) => {
  const guides = {
    'Tráfego Pago': {
      title: 'Guia de Conectividade ADS',
      steps: [
        'Vincule as contas de Google/Meta no bloco "Integração de Dados ADS".',
        'Use o ID da conta para permitir a sincronização em tempo real.',
        'Sempre valide se o ID está correto (ex: act_ para Meta).'
      ],
      color: '#6366f1'
    },
    'Social Media': {
      title: 'Guia de Postagem e mLabs',
      steps: [
        'Conecte o perfil do cliente ao mLabs para automação.',
        'Anexe o link do Google Drive para aprovação de artes.',
        'Certifique-se de que o link do Drive tenha permissão de visualização.'
      ],
      color: '#ec4899'
    },
    'Ganga Hub': {
      title: 'Guia de Captação de Leads',
      steps: [
        'Configure o Webhook no formulário de origem.',
        'Verifique se os campos estão mapeados corretamente no Ganga Hub.',
        'Ative as notificações de novos leads no seu perfil.'
      ],
      color: '#10b981'
    }
  };

  const guide = guides[department] || {
    title: 'Orientações Gerais',
    steps: [
      'Verifique seu SLA diário no painel "Meu Status".',
      'Anexe todos os materiais necessários no campo de metadados.',
      'Em caso de dúvidas, consulte a Central de Ajuda no topo.'
    ],
    color: '#94a3b8'
  };

  return (
    <div className="dept-orientation-box no-print" style={{ borderLeft: `4px solid ${guide.color}` }}>
       <div className="box-header">
          <HelpCircle size={18} style={{ color: guide.color }} />
          <span>{guide.title}</span>
       </div>
       <ul className="guide-steps">
          {guide.steps.map((step, idx) => (
            <li key={idx}><ChevronRight size={12} /> {step}</li>
          ))}
       </ul>
       <style>{`
         .dept-orientation-box { background: rgba(255,255,255,0.03); padding: 16px; borderRadius: 12px; margin-bottom: 24px; }
         .box-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }
         .guide-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
         .guide-steps li { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: flex-start; gap: 6px; line-height: 1.4; }
         .guide-steps li svg { margin-top: 3px; flex-shrink: 0; opacity: 0.5; }
       `}</style>
    </div>
  );
};

export default DepartmentGuide;
