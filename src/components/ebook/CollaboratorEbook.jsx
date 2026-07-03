import React from 'react';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const CollaboratorEbook = () => (
  <div className="ebook-content">
    <div className="ebook-cover">
      <h1>📗 Manual do Colaborador</h1>
      <p>Plataforma ROI Expert — Guia Operacional Completo</p>
    </div>

    <nav className="ebook-index">
      <h3>📑 Índice</h3>
      <ol>
        <li><a onClick={() => scrollTo('col-cap1')}>Acesso à Plataforma</a></li>
        <li><a onClick={() => scrollTo('col-cap2')}>Dashboard e Navegação</a></li>
        <li><a onClick={() => scrollTo('col-cap3')}>Trabalhando nos Departamentos</a></li>
        <li><a onClick={() => scrollTo('col-cap4')}>Kanban de Produção (Pipeline)</a></li>
        <li><a onClick={() => scrollTo('col-cap5')}>Enviar para Aprovação</a></li>
        <li><a onClick={() => scrollTo('col-cap6')}>Google Drive (Pastas)</a></li>
        <li><a onClick={() => scrollTo('col-cap7')}>Handoff entre Departamentos</a></li>
        <li><a onClick={() => scrollTo('col-cap8')}>Chat e Comunicação</a></li>
        <li><a onClick={() => scrollTo('col-cap9')}>Captação (Agendamentos)</a></li>
        <li><a onClick={() => scrollTo('col-cap10')}>SLA e Prazos</a></li>
        <li><a onClick={() => scrollTo('col-cap11')}>CRM — Comparativo de Funis</a></li>
        <li><a onClick={() => scrollTo('col-cap12')}>Agendamento de Reuniões</a></li>
        <li><a onClick={() => scrollTo('col-cap13')}>Centro de Operações (Painel TV)</a></li>
        <li><a onClick={() => scrollTo('col-cap14')}>Agenda Global Consolidada</a></li>
        <li><a onClick={() => scrollTo('col-cap15')}>Hub Comercial e Vendas</a></li>
        <li><a onClick={() => scrollTo('col-cap16')}>Tabela de Clientes: Novidades Visuais</a></li>
        <li><a onClick={() => scrollTo('col-cap17')}>Sub-abas e Fluxo de Social Media</a></li>
        <li><a onClick={() => scrollTo('col-cap18')}>Navegação Mobile — Novidades</a></li>
      </ol>
    </nav>

    <section className="ebook-chapter" id="col-cap1">
      <h2>Capítulo 1 — Acesso à Plataforma</h2>
      <img src="/ebook-screenshots/login.png" alt="Tela de Login" className="ebook-img" />
      <div className="step-block"><span className="step-num">1</span><div><strong>Credenciais</strong><p>Seu gestor criará seu acesso na área administrativa. Você receberá um <b>e-mail</b> e uma <b>senha</b>.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Login</strong><p>Acesse o link da plataforma, insira suas credenciais e clique em <b>"Entrar"</b>.</p></div></div>
      <div className="ebook-tip">💡 Após o login, o sistema identifica automaticamente seus departamentos e exibe apenas os módulos que você tem permissão.</div>
    </section>

    <section className="ebook-chapter" id="col-cap2">
      <h2>Capítulo 2 — Dashboard e Navegação</h2>
      <img src="/ebook-screenshots/dashboard.png" alt="Dashboard" className="ebook-img" />
      <ul>
        <li><b>Menu Lateral Retrátil:</b> O menu lista seus departamentos. Você pode recolher a barra clicando no ícone no topo para aumentar seu espaço de tela.</li>
        <li><b>Barra Superior:</b> Nome do usuário, Ajuda e a Central de Notificações Unificada (sino 🔔) que alerta sobre atrasos, aprovações e transferências. Ao clicar, o sistema direciona automaticamente para a tela correta.</li>
        <li><b>Acessos Rápidos:</b> Cards para navegar diretamente aos departamentos.</li>
        <li><b>Rodapé:</b> Status do servidor (deve mostrar "Servidor Ativo" em verde).</li>
      </ul>
      <div className="ebook-warning">⚠️ Se o status mostrar "Servidor Inativo", atualize a página (F5).</div>
    </section>

    <section className="ebook-chapter" id="col-cap3">
      <h2>Capítulo 3 — Trabalhando nos Departamentos</h2>
      <img src="/ebook-screenshots/captacao.png" alt="Lista de Clientes" className="ebook-img" />
      <div className="step-block"><span className="step-num">1</span><div><strong>Selecione o departamento</strong><p>Clique no departamento desejado no menu lateral.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Escolha o cliente</strong><p>Clique no card do cliente para abrir sua pasta.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Área do Cliente</strong><p>Dentro da pasta você terá: Orientações Gerais, Google Drive, Kanban de Produção, Chat do Cliente e Arquivos Anexados.</p></div></div>
    </section>

    <section className="ebook-chapter" id="col-cap4">
      <h2>Capítulo 4 — Kanban de Produção</h2>
      <img src="/ebook-screenshots/client_folder.png" alt="Pipeline" className="ebook-img" />
      <div className="kanban-flow"><span className="kb-col">A Fazer</span> → <span className="kb-col">Em Andamento</span> → <span className="kb-col">Em Revisão</span> → <span className="kb-col">Aguardando Aprovação</span> → <span className="kb-col">Aprovado</span></div>
      <h3>Criar Nova Tarefa:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Clique em "+ Nova Tarefa"</strong><p>A tela flutuante abrirá (pressione <b>ESC</b> a qualquer momento para fechar).</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Preencha</strong><p>Título, descrição, responsável, SLA, link do Drive e plataforma.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Salve</strong><p>O card aparecerá na coluna "A Fazer".</p></div></div>
      <h3>Movimentar um Card:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Movimentação Exclusiva por Arrastar e Soltar (Drag & Drop)</strong><p>O seletor manual de status foi removido para evitar quebras de fluxo. Clique, segure e arraste o card diretamente para a coluna da próxima etapa desejada.</p></div></div>

      <h3>🖥️ Modo Tela Cheia e Rolagem Arrastável (Drag-Scroll)</h3>
      <ul>
        <li><b>Tela Cheia:</b> Clique no botão de expandir no canto superior direito do Kanban para ocultar a navegação lateral e focar apenas no pipeline de produção.</li>
        <li><b>Rolagem Arrastável (Drag-Scroll):</b> Clique e segure com o mouse em qualquer espaço livre do Kanban e arraste horizontalmente para navegar rapidamente entre as colunas com um movimento fluido.</li>
      </ul>

      <h3>Excluir um Card:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Abra o card → role até o final → clique "Excluir Tarefa" → confirme.</strong></div></div>
      <div className="ebook-warning">⚠️ A exclusão é permanente e não pode ser desfeita!</div>
    </section>

    <section className="ebook-chapter" id="col-cap5">
      <h2>Capítulo 5 — Enviar para Aprovação</h2>
      <div className="step-block"><span className="step-num">1</span><div><strong>Mova o card ou envie o material</strong><p>Para tarefas comuns, mova o card no Kanban para a coluna <b>"Aguardando Aprovação Cliente"</b>. Para Social Media, use a aba **Solicitar Aprovações** para cadastrar posts ou cópias (legendas).</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Anexe o link do material final</strong><p>Anexe o link do Google Drive, arquivo ou link de visualização (preview) para que o cliente o avalie.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Notificação Automática e Feedback Instantâneo (Bidirecional)</strong><p>O cliente é alertado imediatamente pelo sino 🔔 no painel dele e pelo WhatsApp. Quando ele toma ação (Aprovar ou Solicitar Revisão), uma mensagem com emoji de controle (✅ ou 🔄) chega ao chat do departamento em tempo real, atualizando o status do Kanban sem necessidade de recarregar (F5).</p></div></div>
    </section>

    <section className="ebook-chapter" id="col-cap6">
      <h2>Capítulo 6 — Google Drive</h2>
      <div className="step-block"><span className="step-num">1</span><div><strong>Localize o bloco "Pasta do Cliente"</strong><p>No canto superior direito da pasta do cliente.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Abra a pasta</strong><p>Clique no ícone 🔗 para abrir no Google Drive.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Vincule uma sub-pasta</strong><p>Cole o link e clique em <b>"SALVAR"</b>.</p></div></div>
      <div className="ebook-tip">💡 Use os botões "Acesso Rápido" para navegar entre pastas de outros departamentos.</div>
    </section>

    <section className="ebook-chapter" id="col-cap7">
      <h2>Capítulo 7 — Handoff entre Departamentos (Automatizado)</h2>
      <p>O seletor manual de "Encaminhar para..." foi removido. Agora as transferências ocorrem de forma 100% automatizada com base na movimentação das colunas do Kanban:</p>
      <div className="step-block"><span className="step-num">1</span><div><strong>Arraste para a coluna de integração</strong><p>Por exemplo: ao arrastar um card na <b>Captação</b> para a coluna <i>"Enviar p/ Edição"</i>, o modal de arquivos brutos é aberto automaticamente. Ao salvar, a tarefa da Captação é concluída e as novas demandas para a Edição são criadas em <i>"A Fazer"</i>.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Aprovação Interna Pendente</strong><p>Ao mover um card na <b>Edição</b> para a coluna <i>"Em Revisão Interna"</i>, a demanda de aprovação dupla é ativada. Um widget de aprovação aparece nos painéis da Captação e Social Media para que aprovem ou reprovem.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Retorno para Correções</strong><p>Se a demanda for reprovada por qualquer departamento ou pelo cliente, ela retorna automaticamente para a coluna <i>"Refazer"</i> da Edição com o feedback detalhado da equipe.</p></div></div>
    </section>

    <section className="ebook-chapter" id="col-cap8">
      <h2>Capítulo 8 — Chat e Comunicação</h2>
      <ul>
        <li>📝 <b>Mensagens de texto</b></li>
        <li>📎 <b>Anexos</b> — imagens, PDFs, vídeos</li>
        <li>🎤 <b>Áudio</b> — mensagens de voz</li>
        <li>😀 <b>Emojis</b></li>
        <li>🔒 <b>Mensagem Interna</b> — só a equipe vê</li>
        <li>👤 <b>Ocultar Analista</b> — envia como "Time de Atendimento"</li>
        <li>📥 <b>Exportar Histórico</b> — baixe em .TXT</li>
        <li>🔔 <b>Notificações WhatsApp:</b> Ao enviar mensagens no chat interno, se habilitado, o sistema notifica em tempo real os contatos configurados do cliente pelo WhatsApp (com suporte a anexos).</li>
      </ul>
      <div className="ebook-tip">💡 Use o <b>Chat Interno</b> (menu lateral → USUÁRIO) para comunicação entre colaboradores.</div>
    </section>

    <section className="ebook-chapter" id="col-cap9">
      <h2>Capítulo 9 — Captação (Agendamentos)</h2>
      <div className="step-block"><span className="step-num">1</span><div><strong>Clique em "+ Novo Agendamento"</strong><p>(A tela é flutuante e independente, use <b>ESC</b> para cancelar).</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Preencha: título, local, data/hora e captador</strong></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Aguarde aprovação do cliente (SLA 24h)</strong></div></div>
      <div className="step-block"><span className="step-num">4</span><div><strong>"APROVAR MANUAL" se confirmado por fora</strong></div></div>
      <div className="step-block"><span className="step-num">5</span><div><strong>"REALIZAR CAPTAÇÃO" para gerar card no Kanban</strong></div></div>
    </section>

    <section className="ebook-chapter" id="col-cap10">
      <h2>Capítulo 10 — SLA e Prazos</h2>
      <ul>
        <li>🟢 <b>Verde:</b> Dentro do prazo</li>
        <li>🟡 <b>Amarelo:</b> Próximo do vencimento</li>
        <li>🔴 <b>Vermelho:</b> Atrasado</li>
      </ul>
      <div className="ebook-warning">⚠️ Tarefas atrasadas geram notificações automáticas para o gestor.</div>
    </section>

    <section className="ebook-chapter" id="col-cap11">
      <h2>Capítulo 11 — CRM: Comparativo de Funis</h2>
      <p>No módulo <b>CRM</b>, você encontra o <b>Comparativo de Funis — Evolução Mensal</b>, inspirado no estilo Kommo.</p>
      <h3>O que ele mostra:</h3>
      <ul>
        <li><b>Barras comparativas:</b> Para cada etapa do funil (Novos Leads, Qualificados, Em Negociação, Proposta Enviada, Fechados, Perdidos), o sistema exibe barras do <b>mês anterior</b> (cinza) e <b>mês atual</b> (roxo).</li>
        <li><b>Indicador de evolução:</b> No lado direito de cada linha, a porcentagem de variação com seta ▲ (crescimento verde) ou ▼ (queda vermelha).</li>
        <li><b>Lógica inteligente:</b> Para "Perdidos", a lógica é invertida — queda é positiva (verde) porque significa menos perdas.</li>
      </ul>
      <h3>Cards de Resumo:</h3>
      <ul>
        <li>📊 <b>Taxa de Conversão</b> — % de leads que viraram clientes</li>
        <li>💰 <b>Ticket Médio</b> — Valor médio dos contratos fechados</li>
        <li>⏱️ <b>Ciclo de Venda</b> — Tempo médio para fechar um negócio</li>
        <li>📈 <b>ROI do Funil</b> — Retorno sobre investimento do funil de vendas</li>
      </ul>
      <div className="ebook-tip">💡 Os valores do mês anterior aparecem riscados ao lado do valor atual para facilitar a comparação visual.</div>
    </section>

    <section className="ebook-chapter" id="col-cap12">
      <h2>Capítulo 12 — Agendamento de Reuniões</h2>
      <p>Cada departamento possui um <b>calendário de reuniões</b> integrado. Na aba <b>Sucesso do Cliente</b>, o sistema possui filtros inteligentes:</p>
      <h3>Dropdown de Cliente (Sucesso do Cliente):</h3>
      <ul>
        <li>Somente clientes <b>da Agência</b> com <b>status Ativo</b> aparecem na lista.</li>
        <li>O nome exibido é o <b>Nome de Exibição</b> que o gestor cadastrou (ex: "ALIFORT" em vez do nome completo).</li>
      </ul>
      <h3>Calendário — como os eventos aparecem:</h3>
      <p>Cada evento no calendário exibe <b>3 linhas</b>:</p>
      <ul>
        <li><b>Linha 1:</b> Hora + Nome de Exibição da empresa (negrito)</li>
        <li><b>Linha 2:</b> Título da reunião</li>
        <li><b>Linha 3:</b> Tipo — <b>Online</b> ou <b>Presencial</b></li>
      </ul>
      <h3>Criar Reunião:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Clique em "+ Nova Reunião"</strong><p>(Use <b>ESC</b> para fechar a tela flutuante).</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Selecione o cliente e preencha o assunto, data/hora e tipo</strong><br/><span style={{fontSize:'.85rem',color:'var(--text-muted)'}}>Tipos disponíveis: <b>Online</b> (com link) ou <b>Presencial</b> (com endereço).</span></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Convide colaboradores</strong><p>Selecione membros da equipe que participarão da reunião.</p></div></div>
      <div className="step-block"><span className="step-num">4</span><div><strong>Salve</strong><p>O evento aparecerá no calendário com as 3 linhas de informação.</p></div></div>
      <h3>Anti-Choque de Agenda (Sistema Anti-Conflito):</h3>
      <ul>
        <li>Se outro departamento já tem reunião com o mesmo cliente no mesmo dia, o sistema <b>bloqueia e alerta automaticamente</b>.</li>
        <li>Você pode <b>Cancelar</b> para escolher outra data, ou solicitar <b>participação conjunta</b> na reunião já existente.</li>
      </ul>
      <h3>Lembretes Automáticos:</h3>
      <ul>
        <li>📅 <b>1 dia antes</b> — Notificação na plataforma + WhatsApp</li>
        <li>⏰ <b>30 min antes</b> — Notificação na plataforma + WhatsApp</li>
        <li><b>Ata de Reunião com IA e Armazenamento Resiliente:</b> Utilize a gaveta de Ata de Reunião para preencher as anotações e decisões de cada encontro. Você pode contar com o assistente de IA integrado para redigir o resumo da ata automaticamente. Todos os dados são salvos de forma estruturada no campo JSONB <code>metadata.ata</code> para total resiliência contra falhas ou perdas de dados.</li>
      </ul>
      <div className="ebook-warning">⚠️ O assunto da reunião é campo obrigatório. Sem ele, o agendamento não será salvo.</div>
    </section>

    <section className="ebook-chapter" id="col-cap13">
      <h2>Capítulo 13 — Centro de Operações (Painel TV)</h2>
      <div className="ebook-tip">🔒 <b>Módulo Restrito:</b> Esta funcionalidade é exclusiva para perfis de <b>Gestores</b>, <b>Líderes</b> e <b>Administradores</b>.</div>
      <p>Localizado no menu <b>GESTÃO {'>'} Painel Global (TV)</b>, este é um painel dinâmico estilo NOC, projetado para monitorar a linha de produção inteira da agência em tempo real.</p>
      <h3>Visão Departamental (Para Líderes):</h3>
      <ul>
        <li>Se você for um Gestor de um departamento (ex: Captação), clique na aba com o nome do seu setor no topo do painel.</li>
        <li>A tela se transformará em um Kanban expandido mostrando todas as tarefas em: <b>A Fazer (Fila), Em Andamento, Em Revisão, e Refazer</b>.</li>
        <li>A barra lateral direita carregará automaticamente as próximas reuniões exclusivas do seu setor.</li>
        <li>Utilize o botão de "Tela Cheia" no canto direito para exibir na TV da sua sala, e a tela piscará e atualizará os cards sozinha a cada 30 segundos.</li>
      </ul>
    </section>

    <section className="ebook-chapter" id="col-cap14">
      <h2>Capítulo 14 — Agenda Global Consolidada</h2>
      <p>Localizada no menu <b>GESTÃO {'>'} Agenda Global</b>, é uma página para visualização rápida de todas as reuniões agendadas na empresa (de todos os departamentos).</p>
      <h3>Como utilizar:</h3>
      <ul>
        <li>Você pode visualizar os próximos agendamentos nas listas de "Reuniões de Hoje" ou "Próximos 7 Dias".</li>
        <li>O tipo de reunião aparece como <b>Online</b> (antes chamado de "Call") ou <b>Presencial</b>.</li>
        <li>Acompanhe o <b>Calendário Mensal</b> no fim da página para ter uma noção clara da carga de reuniões da empresa em um determinado dia.</li>
        <li><b>Modal Interativo:</b> Clique em cima de qualquer card ou evento no calendário para abrir uma janela flutuante com detalhes da reunião (horário, cliente, pauta, quem agendou e link do Meet).</li>
      </ul>
      <div className="ebook-tip">💡 Se você precisa agendar uma reunião Online com um cliente difícil, dê uma olhadinha rápida na Agenda Global antes, para ver se ele já não tem outro compromisso com a agência naquele dia!</div>
    </section>

    <section className="ebook-chapter" id="col-cap15">
      <h2>Capítulo 15 — Hub Comercial e Vendas</h2>
      <div className="ebook-tip">O Comercial foi promovido a um verdadeiro CRM! Aqui é onde novos clientes nascem.</div>
      <p>A seção <b>Comercial</b> funciona de maneira um pouco diferente dos outros departamentos (que atendem clientes já ativos). O Comercial foca exclusivamente em <b>Leads (Prospectos)</b>.</p>
      <h3>Principais Funções para o Vendedor:</h3>
      <ul>
        <li><b>Pipeline de Vendas (Kanban):</b> Movimente seus leads pelas etapas do funil de vendas. Lembre-se que cada card arrastado para "Ganho" impacta diretamente na sua meta no Dashboard! Você também pode excluir um card clicando no ícone de lixeira, caso seja necessário.</li>
        <li><b>Adicionar Lead:</b> Recebeu um contato ou fez uma ligação fria (Outbound)? Vá na aba "Raio-X" e cadastre o novo lead imediatamente.</li>
        <li><b>Raio-X (Histórico):</b> Clique em qualquer lead para abrir a gaveta lateral. Lá, você deve registrar todas as interações (ligações, e-mails enviados, reuniões). Isso mantém o gestor informado sobre o aquecimento do lead.</li>
        <li><b>Agenda:</b> Você pode agendar reuniões com os leads pela aba "Agenda Comercial", marcando reuniões presenciais ou online (com link automático do Meet).</li>
      </ul>
      <div className="ebook-warning">⚠️ Ao atingir "Ganho" com o lead, a equipe de administração fará a migração dele para a lista oficial de "Clientes", liberando a produção para Captação e Design.</div>
    </section>

    <section className="ebook-chapter" id="col-cap16">
      <h2>Capítulo 16 — Tabela de Clientes: Novidades Visuais</h2>
      <p>A tabela de <b>Clientes da Agência</b> possui melhorias visuais para facilitar a leitura e ação rápida:</p>
      <ul>
        <li>🏷️ <b>Coluna Segmento:</b> Exibe o segmento do cliente com largura fixa uniforme. Segmentos muito longos são truncados com "..." e o nome completo aparece ao passar o mouse.</li>
        <li>💰 <b>Coluna Receita:</b> Os badges (PAGO, DEVENDO, A VENCER, VERIFICAR, SEM COBRANÇA) têm todos a mesma largura. O botão 🔄 ao lado sincroniza o status com o Asaas instantaneamente.</li>
        <li>📅 <b>Coluna Prazos:</b> A data e o badge "Restam Xd" ficam sempre em uma única linha.</li>
        <li>📸 <b>Campo Instagram:</b> No cadastro do cliente, ao digitar o @, um ícone do Instagram aparece. Clique nele para abrir o perfil do cliente em nova aba.</li>
        <li>🏷️ <b>Nome de Exibição (Card):</b> O subtítulo de cada cliente na tabela agora exibe o <b>Nome Fantasia</b> (Nome de Exibição se preenchido, ou o nome cadastrado). Nunca mais a Razão Social.</li>
      </ul>
      <div className="ebook-tip">💡 O segmento do cliente agora é um campo livre — você digita qualquer nome e ele ficará disponível para seleção em outros clientes futuramente.</div>
    </section>

    <section className="ebook-chapter" id="col-cap17">
      <h2>Capítulo 17 — Sub-abas e Fluxo de Social Media</h2>
      <p>Na aba <b>Social Media</b>, a visão do colaborador é dividida em 4 sub-abas específicas:</p>
      <ul>
        <li>📋 <b>Kanban:</b> Fluxo de cartões operacionais comuns de Social Media.</li>
        <li>📅 <b>Calendário:</b> Grid completo para planejar postagens mensais por canal e tipo (Arte, Reels, Stories) de forma ágil.</li>
        <li>👥 <b>Reuniões:</b> Criação e gerenciamento de pautas e encontros de alinhamento com o cliente.</li>
        <li>📤 <b>Solicitar Aprovações:</b> Central específica de envio de posts e legendas. Quando o cliente rejeita ou pede ajustes pelo portal dele, você vê a notificação e o feedback do cliente diretamente nesta aba para rápida alteração.</li>
      </ul>

      <h3>✅ Fluxo de Aprovação Interna e Pessoal</h3>
      <p>O fluxo de aprovação pessoal para Social Media foi otimizado para maior clareza operacional:</p>
      <ul>
        <li><b>Remoção de 'Aprovar p/ Cliente':</b> O botão foi removido pois a revisão do setor é para aprovação pessoal da equipe.</li>
        <li><b>Botões Claros:</b> Os cards na coluna de revisão exibem as ações explícitas <b>Aprovar Demanda</b> (verde) e <b>Reprovar Demanda</b> (vermelho).</li>
        <li><b>Modal de Reprovação Completo:</b> Ao reprovar, abre-se um painel idêntico ao do cliente, permitindo digitar o feedback, anexar arquivos de referência e gravar áudio via microfone (com timer e preview).</li>
        <li><b>Envio ao Cliente:</b> Ao clicar em <b>Aprovar Demanda</b>, o card avança para a coluna <i>"Aguardando Cliente"</i> (para revisão externa), sincronizando os links de entrega.</li>
        <li><b>Reenvio Automatizado:</b> Ao reprovar, o card vai para <i>"Refazer"</i>. O botão de reenvio manual nesta coluna foi ocultado em Social Media; o card retorna automaticamente para a coluna de revisão assim que o editor re-submeter o material ajustado na Edição.</li>
        <li><b>Visualização de Feedbacks:</b> Os feedbacks e áudios de reprovação anteriores ficam legíveis nos cards em formato <i>readOnly</i>, permitindo ouvi-los e baixar anexos sem poluir a tela com botões de edição inline redundantes.</li>
      </ul>

      <h3>🔗 Barra de Integração mLabs</h3>
      <p>A sub-aba de <b>Calendário</b> inclui um painel de <b>Integração mLabs</b> para sincronização direta com a API:</p>
      <ul>
        <li><b>Conexão Simplificada:</b> Configure o token da API e selecione o perfil mLabs do cliente diretamente na barra superior.</li>
        <li><b>Sincronização de Publicações:</b> Use os botões de controle para importar posts do mLabs ou exportar publicações programadas da plataforma para a conta mLabs.</li>
        <li><b>Otimização Mobile:</b> O layout do mLabs é responsivo, apresentando o status das postagens em badges compactos ("Pendente" ou "Sincronizado") e evitando quebra de textos.</li>
      </ul>

      <h3>⚙️ Ajustar e Ordenar Colunas do Kanban</h3>
      <p>Através do botão de engrenagem no Kanban, os colaboradores (caso tenham a permissão) podem personalizar a ordem e a estrutura de etapas do projeto:</p>
      <ul>
        <li><b>CRUD de Colunas:</b> Adicione novas colunas, altere seus nomes ou remova as que não fazem sentido para o fluxo.</li>
        <li><b>Arrastar Colunas:</b> Você pode reordenar as colunas segurando o topo delas e arrastando-as para a esquerda ou direita (tanto na tela principal quanto na listagem interna do modal de ajustes, com suporte a touch para mobile).</li>
      </ul>

      <h3>📱 Visualização Mobile Inteligente (Mini-Calendário)</h3>
      <p>Ao acessar o Calendário de Postagens pelo celular, a grade mensal se transforma em um <b>mini-calendário interativo</b> (semelhante ao da aba de Reuniões), mantendo a legibilidade intacta e garantindo que você visualize as postagens planejadas sem nenhuma quebra na interface.</p>

      <div className="ebook-tip">💡 Ações de aprovação ou refação realizadas pelo cliente atualizam o status das sub-abas em tempo real na sua tela.</div>
    </section>

    <section className="ebook-chapter" id="col-cap18">
      <h2>Capítulo 18 — Navegação Mobile — Novidades</h2>

      <h3>📱 Botão Voltar no Mobile</h3>
      <p>No celular, a barra superior agora exibe um <b>botão de seta (←)</b> posicionado entre o menu hamburguer e a foto do seu perfil. Ele funciona como "Voltar" e é inteligente:</p>
      <ul>
        <li>Se você entrou em um card específico (ex: detalhe de cliente em Financeiro), ele te leva de volta para a lista de onde veio.</li>
        <li>Disponível em <b>todas as abas e sub-abas</b> do sistema.</li>
        <li>Só aparece quando há tela anterior para retornar.</li>
      </ul>

      <h3>📲 Layout Otimizado para Celular</h3>
      <ul>
        <li><b>Sem rolagem horizontal:</b> a página nunca mais "escorrega" para o lado. Tudo cabe na tela do celular.</li>
        <li><b>Tabelas com scroll local:</b> quando uma tabela tem muitas colunas, você rola somente dentro dela (dedo para o lado), sem mover a página inteira.</li>
        <li><b>Abas (tabs) em linha:</b> os botões de aba dividem o espaço igualmente e nunca quebram para uma segunda linha.</li>
        <li><b>Uma barra de rolagem:</b> somente a barra da direita fica visível. A barra lateral esquerda foi removida para liberar espaço na tela.</li>
      </ul>

      <div className="ebook-tip">💡 Se estiver no celular e a tela parecer "empurrada para o lado", tente dar zoom out (beliscar a tela para fora). O sistema foi atualizado para evitar isso automaticamente.</div>
    </section>
  </div>
);

export default CollaboratorEbook;
