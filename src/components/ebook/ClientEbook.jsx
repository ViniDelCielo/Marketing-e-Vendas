import React from 'react';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const ClientEbook = () => (
  <div className="ebook-content">
    <div className="ebook-cover">
      <h1>📘 Manual do Cliente</h1>
      <p>Plataforma ROI Expert — Guia Completo de Uso</p>
    </div>

    <nav className="ebook-index">
      <h3>📑 Índice</h3>
      <ol>
        <li><a onClick={() => scrollTo('cli-cap1')}>Acesso à Plataforma</a></li>
        <li><a onClick={() => scrollTo('cli-cap2')}>Painel Geral (Dashboard)</a></li>
        <li><a onClick={() => scrollTo('cli-cap3')}>Sucesso do Cliente de Serviços</a></li>
        <li><a onClick={() => scrollTo('cli-cap4')}>Aprovação de Materiais</a></li>
        <li><a onClick={() => scrollTo('cli-cap5')}>Chat com a Equipe</a></li>
        <li><a onClick={() => scrollTo('cli-cap6')}>Aparência e Temas</a></li>
        <li><a onClick={() => scrollTo('cli-cap7')}>Perguntas Frequentes</a></li>
        <li><a onClick={() => scrollTo('cli-cap8')}>Reuniões Agendadas</a></li>
      </ol>
    </nav>

    <section className="ebook-chapter" id="cli-cap1">
      <h2>Capítulo 1 — Acesso à Plataforma</h2>
      <img src="/ebook-screenshots/login.png" alt="Tela de Login" className="ebook-img" />
      <div className="step-block"><span className="step-num">1</span><div><strong>Receba suas credenciais</strong><p>Ao se tornar cliente da ROI Expert, você receberá um e-mail com seu <b>login (e-mail)</b> e <b>senha</b> de acesso. Caso não tenha recebido, entre em contato com seu gestor.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Acesse o sistema</strong><p>Abra o navegador e acesse o link fornecido. Na tela de login, insira seu e-mail e senha nos campos indicados e clique no botão <b>"Entrar"</b>.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Problemas de acesso?</strong><p>Se sua senha não funcionar, clique em <b>"Problemas de acesso?"</b> no rodapé da tela de login ou entre em contato com o administrador do sistema.</p></div></div>
      <div className="ebook-tip">💡 <b>Dica:</b> Salve o link da plataforma nos favoritos do seu navegador para acesso rápido.</div>
    </section>

    <section className="ebook-chapter" id="cli-cap2">
      <h2>Capítulo 2 — Painel Geral (Dashboard)</h2>
      <img src="/ebook-screenshots/dashboard.png" alt="Dashboard" className="ebook-img" />
      <p>Após o login, você será direcionado ao <b>Painel Geral</b>. Esta é sua página inicial com uma visão resumida de tudo que acontece na sua conta.</p>
      <h3>O que você encontra aqui:</h3>
      <ul>
        <li><b>Acessos Rápidos:</b> Botões de atalho para os departamentos que você tem acesso.</li>
        <li><b>Barra Superior:</b> Mostra seu nome, botão de <b>Ajuda</b> e a Central de <b>Notificações</b> (sino 🔔) que te leva diretamente aos itens que precisam de sua atenção.</li>
        <li><b>Menu Lateral (Sidebar):</b> Navegação principal com todos os módulos disponíveis.</li>
      </ul>
      <div className="ebook-tip">💡 <b>Dica:</b> Clique nos cards de "Acessos Rápidos" para ir direto ao departamento desejado.</div>
    </section>

    <section className="ebook-chapter" id="cli-cap3">
      <h2>Capítulo 3 — Sucesso do Cliente de Serviços</h2>
      <p>O módulo <b>Sucesso do Cliente</b> é o seu principal ponto de contato com a agência.</p>
      <div className="step-block"><span className="step-num">1</span><div><strong>Menu Lateral</strong><p>Clique em <b>"Sucesso do Cliente"</b> no menu à esquerda.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Visualize seus serviços</strong><p>Você verá cards com resumo de cada departamento contratado: quantidade de tarefas, status de produção e prazos.</p></div></div>
      <h3>Funcionalidades disponíveis:</h3>
      <ul>
        <li><b>Ver status das tarefas:</b> "A Fazer", "Em Andamento", "Em Revisão", "Aguardando Aprovação", "Aprovado".</li>
        <li><b>Ata de Reunião:</b> Registros de reuniões realizadas com sua equipe.</li>
        <li><b>Aprovar/Solicitar Revisão:</b> Quando um material estiver pronto para sua análise.</li>
      </ul>
    </section>

    <section className="ebook-chapter" id="cli-cap4">
      <h2>Capítulo 4 — Portal de Aprovações (Unificado)</h2>
      <p>Todas as suas aprovações pendentes foram consolidadas em uma única caixa de entrada limpa chamada <b>Portal de Aprovações</b> (disponível no menu lateral).</p>
      <div className="step-block"><span className="step-num">1</span><div><strong>Central de Notificações 🔔</strong><p>Ao receber uma notificação de novo material pronto, clique nela para ser levado instantaneamente ao <b>Portal de Aprovações</b>.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Pré-visualização de Mídias (Inline Preview)</strong><p>O portal exibe prévias de imagens e permite reproduzir vídeos diretamente na tela, sem necessidade de downloads ou abertura de links externos.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Aprovar ou Solicitar Correção</strong><p>Clique em <b>✅ Aprovar</b> para dar sinal verde, ou em <b>🔄 Solicitar Correção</b> (onde abrirá uma tela para detalhar os ajustes necessários). A equipe receberá um alerta automático em tempo real no painel dela.</p></div></div>
      <div className="ebook-tip">📝 <b>Aprovação de Postagens:</b> Além de arquivos de design ou vídeos, o Portal de Aprovações agora exibe posts planejados para redes sociais com suas respectivas legendas (copies) e canais de destino selecionados (Instagram, TikTok, etc.).</div>
      <div className="ebook-warning">⚠️ <b>WhatsApp:</b> Aprovações via WhatsApp continuam válidas! Responda <b>"1"</b> para aprovar ou <b>"2"</b> para solicitar revisão.</div>
    </section>

    <section className="ebook-chapter" id="cli-cap5">
      <h2>Capítulo 5 — Chat com a Equipe</h2>
      <img src="/ebook-screenshots/client_folder.png" alt="Chat do Cliente" className="ebook-img" />
      <div className="step-block"><span className="step-num">1</span><div><strong>Acesse qualquer departamento</strong><p>Clique em um departamento no menu lateral.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Abra o Chat</strong><p>Clique no botão <b>"💬 Chat do Cliente"</b> no canto superior direito.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Envie mensagens</strong><p>Você pode: 📎 anexar arquivos, 🎤 gravar áudio, 😀 usar emojis.</p></div></div>
      <div className="ebook-tip">💡 <b>Dica:</b> Quando houver mensagens novas, um ponto vermelho aparecerá no botão do chat!</div>
    </section>

    <section className="ebook-chapter" id="cli-cap6">
      <h2>Capítulo 6 — Aparência e Temas</h2>
      <div className="step-block"><span className="step-num">1</span><div><strong>Acesse "Aparência e Temas"</strong><p>No menu lateral, seção <b>USUÁRIO</b>, clique em <b>"Aparência e Temas"</b>.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Escolha seu tema</strong><p>Selecione entre os temas disponíveis. A mudança é aplicada instantaneamente.</p></div></div>
    </section>

    <section className="ebook-chapter" id="cli-cap7">
      <h2>Capítulo 7 — Perguntas Frequentes</h2>
      <div className="faq-item"><strong>Não consigo fazer login, o que faço?</strong><p>Verifique se o e-mail e senha estão corretos. Se persistir, entre em contato com o administrador.</p></div>
      <div className="faq-item"><strong>Como sei quando um material está pronto?</strong><p>Você receberá uma notificação na plataforma (sino 🔔) e também pelo WhatsApp. A agência pode configurar até 5 números da sua equipe para receber os avisos e aprovar.</p></div>
      <div className="faq-item"><strong>Posso acessar pelo celular?</strong><p>Sim! A plataforma é responsiva e funciona em qualquer navegador mobile.</p></div>
      <div className="faq-item"><strong>Como altero minha senha?</strong><p>Entre em contato com o administrador para solicitar a alteração.</p></div>
    </section>

    <section className="ebook-chapter" id="cli-cap8">
      <h2>Capítulo 8 — Reuniões Agendadas</h2>
      <p>Sua equipe pode agendar reuniões com você diretamente pela plataforma. As reuniões só são confirmadas após a sua aprovação.</p>
      <h3>Tipos de Reunião:</h3>
      <ul>
        <li>🖥️ <b>Online</b> — Reunião virtual. O link de acesso (Google Meet ou similar) fica disponível no card da reunião.</li>
        <li>📍 <b>Presencial</b> — Reunião no seu endereço. O endereço e o horário ficam visíveis no card.</li>
      </ul>
      <h3>Como funciona:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Notificação</strong><p>Você receberá uma notificação quando uma reunião for agendada (sino 🔔 no topo e/ou pelo WhatsApp).</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Aprovar ou Rejeitar</strong><p>Acesse o departamento e clique em ✅ Aprovar ou ❌ Rejeitar.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Reunião Online</strong><p>Após aprovada, o link do Google Meet ou da plataforma de vídeo estará visível no card da reunião.</p></div></div>
      <h3>Ata de Reunião:</h3>
      <p>Após a conclusão da reunião, a ata e os principais tópicos discutidos ficam disponíveis para consulta rápida diretamente no histórico da reunião:</p>
      <ul>
        <li>A ata compila as decisões tomadas, tarefas delegadas e próximos passos.</li>
        <li>O documento é elaborado em tempo real com apoio do assistente de IA da plataforma, garantindo registros precisos e objetivos.</li>
      </ul>

      <h3>Lembretes:</h3>
      <ul>
        <li>📅 <b>1 dia antes</b> — Você recebe um lembrete na plataforma e pelo WhatsApp</li>
        <li>⏰ <b>30 min antes</b> — Outro lembrete para não esquecer</li>
      </ul>
      <div className="ebook-tip">💡 As reuniões só acontecem após sua aprovação e as atas ficam arquivadas de forma organizada na sua conta. Você tem total controle da sua agenda e do histórico de alinhamentos!</div>
    </section>
  </div>
);

export default ClientEbook;
