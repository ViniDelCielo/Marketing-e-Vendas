import React from 'react';

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const AdminEbook = () => (
  <div className="ebook-content">
    <div className="ebook-cover">
      <h1>📕 Manual do Gestor e Administrador</h1>
      <p>Plataforma ROI Expert — Guia Completo de Gestão</p>
    </div>

    <nav className="ebook-index">
      <h3>📑 Índice</h3>
      <ol>
        <li><a onClick={() => scrollTo('adm-cap1')}>Visão Geral do Sistema</a></li>
        <li><a onClick={() => scrollTo('adm-cap2')}>Cadastro de Clientes</a></li>
        <li><a onClick={() => scrollTo('adm-cap3')}>Cadastro de Colaboradores</a></li>
        <li><a onClick={() => scrollTo('adm-cap4')}>Configurações Gerais</a></li>
        <li><a onClick={() => scrollTo('adm-cap5')}>Conectividade Global (WhatsApp)</a></li>
        <li><a onClick={() => scrollTo('adm-cap6')}>Chat Administrativo</a></li>
        <li><a onClick={() => scrollTo('adm-cap7')}>RH e Financeiro</a></li>
        <li><a onClick={() => scrollTo('adm-cap8')}>Sistema de Notificações</a></li>
        <li><a onClick={() => scrollTo('adm-cap9')}>Controle de Acesso</a></li>
        <li><a onClick={() => scrollTo('adm-cap10')}>Boas Práticas de Gestão</a></li>
        <li><a onClick={() => scrollTo('adm-cap11')}>CRM — Comparativo de Funis</a></li>
        <li><a onClick={() => scrollTo('adm-cap12')}>Agendamento de Reuniões</a></li>
        <li><a onClick={() => scrollTo('adm-cap13')}>Centro de Operações (Painel TV)</a></li>
        <li><a onClick={() => scrollTo('adm-cap14')}>Agenda Global Consolidada</a></li>
        <li><a onClick={() => scrollTo('adm-cap15')}>Hub Comercial e Vendas</a></li>
        <li><a onClick={() => scrollTo('adm-cap16')}>Sincronização Asaas</a></li>
        <li><a onClick={() => scrollTo('adm-cap17')}>Clientes Suspensos</a></li>
        <li><a onClick={() => scrollTo('adm-cap18')}>Gestão de Social Media e Aprovações</a></li>
        <li><a onClick={() => scrollTo('adm-cap19')}>Atualizações Mobile e RH/Financeiro</a></li>
      </ol>
    </nav>

    <section className="ebook-chapter" id="adm-cap1">
      <h2>Capítulo 1 — Visão Geral do Sistema</h2>
      <img src="/ebook-screenshots/dashboard.png" alt="Dashboard" className="ebook-img" />
      <p>Como Gestor ou Administrador, você tem acesso completo a <b>todos os módulos</b>. Seções extras na área de <b>GESTÃO</b>:</p>
      <ul>
        <li><b>Barra Lateral Retrátil:</b> Utilize o botão ao lado esquerdo para recolher o menu e maximizar seu espaço de trabalho.</li>
        <li><b>Configurações Gerais</b> — SLAs, permissões, performance</li>
        <li><b>Cadastro de Clientes e Colaboradores</b> — Gestão completa de acessos</li>
        <li><b>Conectividade Global</b> — WhatsApp, Chatbot, integrações</li>
        <li><b>Chat Administrativo</b> — Supervisão de todas as conversas</li>
      </ul>
      <div className="ebook-tip">💡 Todas as funcionalidades do Manual do Colaborador também estão disponíveis para você.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap2">
      <h2>Capítulo 2 — Cadastro de Clientes</h2>
      <img src="/ebook-screenshots/administrativo.png" alt="Administrativo" className="ebook-img" />
      <h3>Criar um Novo Cliente:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Acesse "Cadastro de Clientes e Colaboradores"</strong><p>Menu lateral → seção GESTÃO.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Clique em "+ Novo Cliente"</strong></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Preencha os dados</strong><p>Nome, E-mail, Telefone, Empresa, Segmento (veja abaixo), Serviços Contratados, Valor MRR, <b>Instagram</b> e <b>Link do Google Drive</b> da pasta raiz do cliente.</p></div></div>
      <div className="step-block"><span className="step-num">4</span><div><strong>Salve</strong><p>O cliente aparecerá nos departamentos ativados.</p></div></div>

      <h3>Campo Segmento (campo livre com sugestões):</h3>
      <ul>
        <li>Digite qualquer segmento livremente (ex: Clínica Odontológica, Concessionária...)</li>
        <li>Ao focar no campo, serão exibidos os segmentos já usados em outros clientes como sugestões clicáveis.</li>
        <li>Segmentos novos exibem o badge <b>"novo"</b> e são salvos automaticamente para uso futuro.</li>
        <li>Use o botão ✕ para limpar o campo rapidamente.</li>
      </ul>

      <h3>Campo Instagram:</h3>
      <ul>
        <li>Digite o @ do cliente (ex: @nomedocliente).</li>
        <li>Um botão com o <b>ícone do Instagram</b> aparecerá automaticamente ao lado direito do campo.</li>
        <li>Ao clicar no ícone, o perfil do cliente abrirá diretamente em uma nova aba.</li>
        <li>Funciona com ou sem o @ — o sistema normaliza automaticamente.</li>
      </ul>

      <h3>Editar:</h3>
      <p>Clique no ícone de edição do cliente → abrirá o modal → altere os dados → clique em "Salvar".</p>
      <h3>Campos Especiais do Cadastro:</h3>
      <ul>
        <li><b>Nome de Exibição (Card):</b> Campo opcional que define o nome curto exibido no card da lista, nos dropdowns de agendamento e no calendário do Sucesso do Cliente. Ex: "ALIFORT" em vez de "ALIFORT INDÚSTRIA E COMÉRCIO DE EMBALAGENS LTDA".</li>
        <li><b>Nome Fantasia / Nome do Cliente:</b> Nome oficial de registro (aparece no subtítulo do card).</li>
        <li><b>Razão Social / Nome Completo:</b> Nome jurídico completo da empresa.</li>
      </ul>
      <h3>Proteção de dados x Sincronização Asaas:</h3>
      <ul>
        <li>Ao <b>Salvar</b> manualmente qualquer dado do cliente, o sistema marca o registro como <b>editado manualmente</b>. A partir desse momento, a sincronização automática do Asaas <b>nunca mais sobrescreve</b> Nome, Empresa ou Endereço desse cliente.</li>
        <li>O Asaas só atualiza dados financeiros: status de pagamento, parcelas e datas — armazenados separadamente no campo <b>metadata</b>.</li>
      </ul>
      <h3>Subtítulo dos cards:</h3>
      <p>Na lista de clientes, o subtítulo de cada card exibe o <b>Nome Fantasia</b> (campo <i>Nome de Exibição</i> se preenchido, caso contrário o nome cadastrado). Nunca mais a Razão Social.</p>
      <h3>Filtros e Seletores:</h3>
      <ul>
        <li>Todos, Ativos (apenas da agência), Inativos, Configurando, Suspenso</li>
        <li>Busca por nome, Upload Excel, Exportar</li>
        <li>Botão <b>"CLIENTES SUSPENSOS"</b> exibe somente clientes com status Suspenso para ação rápida.</li>
      </ul>
      <div className="ebook-tip">💡 Os cards no topo mostram: Total de Clientes, Clientes Ativos (Agência), MRR Total e Configurando.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap3">
      <h2>Capítulo 3 — Cadastro de Colaboradores</h2>
      <div className="step-block"><span className="step-num">1</span><div><strong>Clique na aba "Colaboradores"</strong></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Clique em "+ Novo Colaborador"</strong></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Preencha: Nome, E-mail, Cargo, Departamento</strong></div></div>
      <div className="step-block"><span className="step-num">4</span><div><strong>Defina permissões</strong><p>Para cada departamento: <b>Colaborador</b> ou <b>Gestor</b>.</p></div></div>
      <div className="step-block"><span className="step-num">5</span><div><strong>Criar Acesso</strong><p>Marque "Criar acesso" para gerar login automático.</p></div></div>
      <div className="ebook-warning">⚠️ Colaboradores só verão os departamentos e clientes atribuídos a eles.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap4">
      <h2>Capítulo 4 — Configurações Gerais</h2>
      <img src="/ebook-screenshots/configuracoes.png" alt="Configurações" className="ebook-img" />
      <h3>Abas disponíveis:</h3>
      <ul>
        <li><b>Área do Gestor</b> — Painel de performance (eficiência, tarefas, atrasos)</li>
        <li><b>Prazos e SLAs</b> — Regras de prazo por tipo de atividade</li>
        <li><b>WhatsApp API</b> — Configuração da Evolution API</li>
        <li><b>Colaboradores</b> — Visão rápida de todos os acessos</li>
        <li><b>Clientes</b> — Visão rápida de clientes ativos</li>
      </ul>
      <h3>Configurar SLA:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Vá em "Configurar Regras e SLAs"</strong></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Selecione o departamento</strong><p>Use os botões coloridos para filtrar.</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Crie uma nova regra</strong><p>Nome da atividade, prazo em dias e departamento.</p></div></div>
    </section>

    <section className="ebook-chapter" id="adm-cap5">
      <h2>Capítulo 5 — Conectividade Global (WhatsApp)</h2>
      <p>Menu lateral → <b>Conectividade Global</b>.</p>
      <ul>
        <li><b>Interface WhatsApp Web</b> — Conversas em tempo real</li>
        <li><b>Chatbot & Fluxos</b> — Mensagens automáticas e redirecionamento por departamento</li>
        <li><b>Conexões</b> — Gerenciamento de instâncias do WhatsApp</li>
      </ul>
      <div className="ebook-tip">💡 O chatbot redireciona automaticamente mensagens recebidas para o departamento correto.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap6">
      <h2>Capítulo 6 — Chat Administrativo</h2>
      <p>Supervisione todas as conversas. Menu lateral → <b>Chat Administrativo</b>.</p>
      <ul>
        <li>Visualize conversas de todos os departamentos</li>
        <li>Filtre por cliente ou departamento</li>
        <li>Modere mensagens quando necessário</li>
      </ul>
    </section>

    <section className="ebook-chapter" id="adm-cap7">
      <h2>Capítulo 7 — RH e Financeiro</h2>
      <p>Menu lateral → <b>RH e Financeiro</b>.</p>
      <ul>
        <li><b>Visão de cobranças</b> — Integrado com Asaas. Configure o <b>Ambiente do Asaas</b> (Produção ou Sandbox) e a Chave da API diretamente na aba Pagamentos.</li>
        <li><b>MRR total</b> — Receita mensal consolidada</li>
        <li><b>Gestão de equipe</b> — Performance e alocação</li>
      </ul>
    </section>

    <section className="ebook-chapter" id="adm-cap8">
      <h2>Capítulo 8 — Sistema de Notificações</h2>
      <p>O sino 🔔 na barra superior é a <b>Central de Notificações Unificada</b>:</p>
      <ul>
        <li>🟡 <b>Alertas:</b> Clientes em "Configurando" ou "Suspenso" e SLAs atrasados.</li>
        <li>🔵 <b>Ações e Aprovações:</b> Quando a equipe envia materiais ou copies para aprovação, o cliente é notificado com atalhos diretos para o <b>Portal de Aprovações</b>.</li>
        <li>🔄 <b>Feedback Síncrono (Bidirecional):</b> Ações de aprovação ou solicitações de correção pelo cliente enviam alertas instantâneos com ícones de controle (✅/🔄) para o chat da equipe em tempo real.</li>
        <li>📲 <b>WhatsApp Integrado:</b> Disparo de avisos automáticos a até 5 números do cliente para engajamento imediato.</li>
      </ul>
      <p>Ao clicar no aviso, o sistema redireciona os clientes diretamente ao Portal de Aprovações e a equipe ao departamento correto.</p>
    </section>

    <section className="ebook-chapter" id="adm-cap9">
      <h2>Capítulo 9 — Controle de Acesso</h2>
      <table className="ebook-table">
        <thead><tr><th>Perfil</th><th>Cor</th><th>Acesso</th></tr></thead>
        <tbody>
          <tr><td><b>Gestor Geral (Owner)</b></td><td>🟢 Verde</td><td>Acesso irrestrito</td></tr>
          <tr><td><b>Administrador (Admin)</b></td><td>🟣 Roxo</td><td>Acesso irrestrito</td></tr>
          <tr><td><b>Colaborador (Employee)</b></td><td>🔵 Azul</td><td>Apenas departamentos atribuídos</td></tr>
          <tr><td><b>Cliente (Client)</b></td><td>🟡 Amarelo</td><td>Apenas Sucesso do Cliente e Chat</td></tr>
        </tbody>
      </table>
    </section>

    <section className="ebook-chapter" id="adm-cap10">
      <h2>Capítulo 10 — Boas Práticas de Gestão</h2>
      <ul>
        <li>✅ Defina SLAs realistas para cada tipo de atividade</li>
        <li>✅ Atribua colaboradores aos clientes corretos</li>
        <li>✅ Monitore o Painel de Performance semanalmente</li>
        <li>✅ Use o Chat Administrativo para supervisionar</li>
        <li>✅ Mantenha as pastas do Google Drive organizadas</li>
        <li>✅ Configure o Chatbot do WhatsApp</li>
        <li>✅ Exporte relatórios regularmente</li>
        <li>✅ Sincronize a receita dos clientes pelo botão 🔄 na coluna Receita</li>
        <li>✅ Monitore clientes suspensos pela aba "CLIENTES SUSPENSOS"</li>
      </ul>
    </section>

    <section className="ebook-chapter" id="adm-cap11">
      <h2>Capítulo 11 — CRM: Comparativo de Funis</h2>
      <p>O módulo CRM possui um painel <b>Comparativo de Funis</b> estilo Kommo, que mostra a evolução do funil de vendas entre o mês anterior e o mês atual.</p>
      <h3>Visualização:</h3>
      <ul>
        <li><b>Barras comparativas:</b> Cada etapa (Novos Leads, Qualificados, Em Negociação, Proposta Enviada, Fechados, Perdidos) exibe barras do mês anterior (cinza) e atual (roxo).</li>
        <li><b>Indicador %:</b> Setas ▲/▼ com porcentagem de variação. Para "Perdidos", a lógica é invertida.</li>
      </ul>
      <h3>Métricas de Resumo:</h3>
      <ul>
        <li>📊 <b>Taxa de Conversão</b> | 💰 <b>Ticket Médio</b> | ⏱️ <b>Ciclo de Venda</b> | 📈 <b>ROI do Funil</b></li>
      </ul>
      <div className="ebook-tip">💡 Use este comparativo nas reuniões de acompanhamento com o cliente para demonstrar a evolução dos resultados.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap12">
      <h2>Capítulo 12 — Agendamento de Reuniões (Sucesso do Cliente)</h2>
      <p>Sistema completo de agendamento disponível em <b>todos os 7 departamentos</b>. Na aba <b>Sucesso do Cliente</b>, o agendamento possui regras especiais:</p>
      <h3>Filtros automáticos no dropdown de clientes:</h3>
      <ul>
        <li>Somente clientes <b>da Agência</b> (marcados como show_in_agency=true) aparecem no dropdown.</li>
        <li>Somente clientes com <b>status Ativo</b> são listados.</li>
        <li>O nome exibido é o <b>Nome de Exibição (Card)</b> — o nome curto que você cadastrou (ex: "ALIFORT").</li>
      </ul>
      <h3>Calendário — chips de evento (3 linhas):</h3>
      <ul>
        <li><b>Linha 1:</b> Hora + Nome de Exibição da empresa</li>
        <li><b>Linha 2:</b> Título da reunião</li>
        <li><b>Linha 3:</b> Tipo (Online ou Presencial)</li>
      </ul>
      <h3>Tipos de reunião:</h3>
      <ul>
        <li>🖥️ <b>Online</b> — Reunião via Google Meet ou outra plataforma (link obrigatório)</li>
        <li>📍 <b>Presencial</b> — Reunião no local do cliente (endereço do campo Local)</li>
      </ul>
      <h3>Outras funcionalidades:</h3>
      <ul>
        <li><b>Assunto obrigatório</b> — O colaborador deve informar a pauta</li>
        <li><b>Sistema Anti-Conflito</b> — O sistema verifica automaticamente se o cliente já possui reunião marcada no mesmo dia.</li>
        <li><b>Reunião Conjunta</b> — Departamentos podem se unir em uma única reunião compartilhando o link do Google Meet com 1 clique.</li>
        <li><b>Lembretes &amp; WhatsApp</b> — 1 dia e 30 min antes na plataforma e até 5 contatos de WhatsApp.</li>
        <li><b>Ata de Reunião com IA e Armazenamento Resiliente:</b> O sistema conta com uma gaveta de Ata de Reunião com gerador/assistente de IA integrado para redigir o resumo da reunião de forma automática. As anotações e atas são salvas no campo <code>metadata.ata</code> (formato JSONB) para evitar conflitos de salvamento e garantir resiliência contra falhas no banco de dados.</li>
      </ul>
      <div className="ebook-tip">💡 O modal de confirmação de exclusão de reunião agora tem estilo dark (igual ao modal de exclusão de clientes).</div>
    </section>

    <section className="ebook-chapter" id="adm-cap13">
      <h2>Capítulo 13 — Centro de Operações (Painel TV)</h2>
      <p>Localizado no menu <b>GESTÃO {'>'} Painel Global (TV)</b>, este é um poderoso painel (estilo NOC/SOC) feito exclusivamente para Líderes, Gestores e Administradores acompanharem a produção em tempo real, ideal para ser exibido em TVs no escritório.</p>
      <h3>Funcionalidades Principais:</h3>
      <ul>
        <li><b>Visão Global x Visão Departamental:</b> No topo, use as abas para alternar entre "Visão Global" (todos os departamentos lado a lado) e o detalhamento de um departamento específico (ex: Captação), que abre um Kanban dinâmico estendido.</li>
        <li><b>Tela Cheia & Auto-Refresh:</b> Utilize o botão de "Expandir" no canto superior direito para ocultar os menus. O painel atualiza automaticamente os dados a cada 30 segundos, sem necessidade de recarregar a página.</li>
        <li><b>Integração de Agendas:</b> A barra lateral puxa as próximas reuniões da empresa de forma cronológica, sinalizando em verde as agendadas para "hoje".</li>
        <li><b>Alerta de Refação:</b> Tarefas movidas para "Refazer" aparecerão imediatamente numa gaveta vermelha de alta prioridade na barra lateral.</li>
      </ul>
      <div className="ebook-tip">💡 Conecte este painel a monitores nas salas de equipe para manter todos alinhados de forma autônoma.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap14">
      <h2>Capítulo 14 — Agenda Global Consolidada</h2>
      <p>Localizada no menu <b>GESTÃO {'>'} Agenda Global</b>, é uma página exclusiva para acompanhamento de todos os agendamentos realizados dentro do ROI Expert, de qualquer setor ou cliente.</p>
      <h3>Funcionalidades:</h3>
      <ul>
        <li><b>Agrupamento Automático:</b> Divide a visualização em "Reuniões de Hoje", "Próximos 7 Dias" e "Futuro".</li>
        <li><b>Calendário Mensal (Estilo Google):</b> Exibe a grade mensal de dias onde os eventos estão visualmente distribuídos.</li>
        <li><b>Modal de Detalhes Dinâmico:</b> Clique em qualquer card de reunião para exibir um pop-up flutuante contendo informações cruciais (participantes, pauta e formato do encontro).</li>
        <li><b>Segurança:</b> Por ser um painel de consulta cruzada, ele atua em formato "Somente Leitura" (sem opções de exclusão).</li>
      </ul>
      <div className="ebook-tip">💡 Utilize esta página para analisar o gargalo de atendimento dos clientes antes de planejar grandes lançamentos.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap15">
      <h2>Capítulo 15 — Hub Comercial e Vendas</h2>
      <p>O <b>Comercial</b> não é mais um painel estático, agora ele é um <b>Hub Completo de CRM e Gestão de Prospecção</b>, desenvolvido nos moldes das melhores ferramentas do mercado.</p>
      <h3>Abas Estratégicas:</h3>
      <ul>
        <li><b>Dashboard:</b> Acompanhe em tempo real as vendas ganhas, o valor total do pipeline e as taxas de conversão. Gestores também visualizam a aba de "Metas por Vendedor" vs Realizado.</li>
        <li><b>Pipeline de Vendas:</b> Um Kanban exclusivo para Leads. Movimente oportunidades desde "Novo Lead" até "Ganho" ou "Perdido". Arrastar cards atualiza o valor da previsão de vendas na hora.</li>
        <li><b>Raio-X (Leads):</b> Uma visão 360º de todos os contatos. Clique em um lead para abrir a gaveta lateral e conferir/registrar todas as interações (ligações, reuniões, anotações).</li>
        <li><b>Agenda Comercial:</b> Visão macro de todas as reuniões de vendas. Agende chamadas ou reuniões presenciais e vincule-as diretamente a um Lead.</li>
      </ul>
      <div className="ebook-tip">💡 Utilize a gaveta do Raio-X para registrar cada e-mail ou ligação feita. Ter um histórico preciso é o segredo para altas conversões!</div>
    </section>

    <section className="ebook-chapter" id="adm-cap16">
      <h2>Capítulo 16 — Sincronização Asaas</h2>
      <p>A aba <b>Sincronizar Asaas</b> dentro de "Cadastro de Clientes" permite importar clientes diretamente da sua base do Asaas para a plataforma ROI Expert.</p>
      <h3>O que a sincronização ATUALIZA (apenas metadata financeira):</h3>
      <ul>
        <li>✅ <b>Status financeiro</b> — PAGO / DEVENDO / A VENCER</li>
        <li>✅ <b>Datas de cobrança</b> e parcelas</li>
        <li>✅ <b>ID e referência do Asaas</b> (vínculo interno)</li>
      </ul>
      <h3>O que a sincronização NUNCA sobrescreve:</h3>
      <ul>
        <li>🔒 <b>Nome</b> do cliente (campo Nome Fantasia / Nome do Cliente)</li>
        <li>🔒 <b>Empresa</b> (Razão Social)</li>
        <li>🔒 <b>Endereço</b></li>
        <li>🔒 <b>E-mail</b>, Telefone, Instagram e quaisquer outros dados preenchidos manualmente</li>
      </ul>
      <h3>Proteção automática:</h3>
      <p>Ao salvar qualquer dado manualmente, o registro recebe um carimbo de <b>"editado manualmente"</b> e a deduplicação automática <b>nunca mais apagará ou sobrescreverá</b> esse registro. Ele se torna o mestre definitivo.</p>
      <h3>Como usar:</h3>
      <div className="step-block"><span className="step-num">1</span><div><strong>Acesse a aba "Sincronizar Asaas"</strong><p>Clique no seletor de abas no topo da área de clientes.</p></div></div>
      <div className="step-block"><span className="step-num">2</span><div><strong>Clique em "Buscar Novos Clientes"</strong><p>O sistema buscará <b>todos</b> os clientes do Asaas (paginação automática, sem limite).</p></div></div>
      <div className="step-block"><span className="step-num">3</span><div><strong>Revise a lista</strong><p>A tabela exibe 20 clientes por página. Clientes já cadastrados aparecem como "Já existe".</p></div></div>
      <div className="step-block"><span className="step-num">4</span><div><strong>Importe</strong><p>Clientes novos aparecem com o botão "Importar". Cliques ignorados (sem e-mail válido) aparecem no painel de "Clientes Ignorados".</p></div></div>
      <div className="ebook-tip">💡 A sincronização é segura: apenas dados financeiros são atualizados nos clientes existentes. Dados cadastrais preenchidos manualmente estão protegidos.</div>
    </section>

    <section className="ebook-chapter" id="adm-cap17">
      <h2>Capítulo 17 — Clientes Suspensos</h2>
      <p>O botão <b>"CLIENTES SUSPENSOS"</b> exibe exclusivamente os clientes com status <b>Suspenso</b>, facilitando o acompanhamento e a regularização desses casos.</p>
      <ul>
        <li>Clique no botão para filtrar instantaneamente apenas os suspensos.</li>
        <li>Altere o status diretamente na coluna <b>Status</b> da tabela para reativar ou inativar o cliente.</li>
        <li>Use a coluna <b>Receita</b> para verificar se o cliente tem cobranças pendentes no Asaas (botão 🔄 sincroniza na hora).</li>
      </ul>
      <div className="ebook-warning">⚠️ Clientes suspensos perdem o acesso ao portal até que seu status seja alterado para "Ativo" ou "Configurando".</div>
    </section>

    <section className="ebook-chapter" id="adm-cap18">
      <h2>Capítulo 18 — Gestão de Social Media e Aprovações Unificadas</h2>
      <p>A gestão de <b>Social Media</b> foi otimizada para divisão em 4 sub-abas focadas no fluxo de trabalho (workflow):</p>
      <ul>
        <li>📋 <b>Kanban:</b> Gerenciamento dinâmico de cartões operacionais.</li>
        <li>📅 <b>Calendário:</b> Grade mensal com posts planejados por canal e status de postagem.</li>
        <li>👥 <b>Reuniões:</b> Criação e controle de encontros internos e com clientes.</li>
        <li>📤 <b>Solicitar Aprovações:</b> Espaço de envio estruturado de criativos e cópias.</li>
      </ul>

      <h3>🔗 Integração mLabs e Sincronização de Postagens</h3>
      <p>No topo da sub-aba de <b>Calendário</b>, foi adicionado o painel de <b>Integração mLabs</b>. Este recurso permite sincronizar postagens criadas na plataforma diretamente com o agendador do mLabs via API:</p>
      <ul>
        <li><b>Conectar & Configurar:</b> Vincule sua conta mLabs inserindo o token da API e selecione o perfil do cliente desejado.</li>
        <li><b>Sincronizar Publicações:</b> Importe publicações agendadas do mLabs para o calendário interno ou exporte novos rascunhos de posts com um único clique.</li>
        <li><b>Layout Responsivo:</b> O painel se adapta perfeitamente ao mobile, exibindo badges de status claros (como <b>Pendente</b> ou <b>Sincronizado</b>) e mantendo a escrita limpa.</li>
      </ul>

      <h3>⚙️ Ajuste e Reordenação de Colunas do Kanban</h3>
      <p>O Kanban de produção conta com uma funcionalidade avançada de personalização de colunas:</p>
      <ul>
        <li><b>Ajuste de Colunas:</b> Através do botão de engrenagem/ajuste, o administrador e a equipe podem adicionar novas etapas, renomear colunas existentes ou excluir colunas desnecessárias.</li>
        <li><b>Arraste e Solte (Drag & Drop):</b> É possível reorganizar a ordem das colunas segurando a barra superior de cada coluna e arrastando-a horizontalmente para a nova posição (tanto no Kanban principal quanto na listagem interna do modal de ajustes, com total compatibilidade touch para dispositivos móveis).</li>
      </ul>

      <h3>🖥️ Kanban em Tela Cheia & Navegação Horizontal (Drag-Scroll)</h3>
      <p>Para otimizar o monitoramento de projetos em telas maiores:</p>
      <ul>
        <li><b>Modo Tela Cheia:</b> Clique no botão de expandir no canto superior direito para ocultar menus e focar unicamente no pipeline de produção.</li>
        <li><b>Navegação com Mouse (Drag-Scroll):</b> Segure e arraste o cursor do mouse horizontalmente em qualquer espaço livre do Kanban para rolar a tela suavemente, sem necessidade de barras de rolagem convencionais.</li>
      </ul>

      <h3>📱 Mini-Calendário Responsivo</h3>
      <p>Para garantir que a equipe de gestão acompanhe as postagens em qualquer lugar:</p>
      <ul>
        <li>O calendário completo de postagens se adapta de forma inteligente em telas de smartphones, transformando-se em um <b>calendário em miniatura</b> perfeitamente otimizado (no mesmo estilo de exibição do módulo de Reuniões), evitando quebras de layout e facilitando o clique sobre os dias agendados.</li>
      </ul>

      <h3>✅ Fluxo de Aprovação Interna e Pessoal (Social Media)</h3>
      <p>Para otimizar o fluxo de trabalho interno do departamento de Social Media, os botões e regras de movimentação foram reestruturados:</p>
      <ul>
        <li><b>Remoção da Ação Manual 'Aprovar p/ Cliente':</b> Essa ação manual foi retirada para assegurar que a revisão interna seja feita de forma dedicada antes de enviar ao cliente.</li>
        <li><b>Ações Diretas no Kanban:</b> Na coluna de revisão, os cards exibem os botões explícitos <b>Aprovar Demanda</b> (que move o card diretamente para a coluna de revisão do cliente, <i>Aguardando Cliente</i>) e <b>Reprovar Demanda</b> (que abre o modal de feedback).</li>
        <li><b>Modal de Reprovação Integrado:</b> O modal de reprovação permite ao revisor digitar observações detalhadas, anexar arquivos e gravar notas de áudio com timer e controle de player.</li>
        <li><b>Retorno e Sincronização Automatizada:</b> Ao reprovar, a demanda retorna para a coluna <i>Refazer</i> da Edição. A re-submissão do material editado reativa automaticamente o card na coluna <i>Em Revisão</i> de Social Media, limpando logs de aprovação anteriores, copiando os novos links do arquivo e notificando a equipe sem a necessidade de intervenção manual ou seletores de status.</li>
        <li><b>Visualização de Histórico:</b> Feedbacks de revisões anteriores são renderizados nos cards de forma legível em modo <i>readOnly</i>, garantindo histórico contínuo para consulta.</li>
      </ul>

      <h3>O Portal de Aprovações Unificado (Cliente)</h3>
      <p>Para evitar dispersão de dados, todas as solicitações enviadas pela equipe de qualquer setor (vídeos de Edição, layouts de Design, posts de Social Media) são centralizadas em um único inbox limpo no painel do cliente: o <b>Portal de Aprovações</b>. O cliente pode revisar arquivos, assistir a vídeos inline e aprovar ou recusar direto dessa página, gerando notificações síncronas para a equipe.</p>
    </section>

    <section className="ebook-chapter" id="adm-cap19">
      <h2>Capítulo 19 — Atualizações Mobile, RH e Financeiro</h2>

      <h3>📱 Navegação Mobile — Botão Voltar</h3>
      <p>Em todas as telas do sistema no celular, um <b>botão de seta (&larr;)</b> aparece entre o menu hamburguer e a foto do usuário no topo. Ele funciona como um botão de voltar inteligente:</p>
      <ul>
        <li>Ao entrar em um card específico (ex: Financeiro → ALIFORT), o botão retorna para a tela anterior exatamente de onde você veio.</li>
        <li>Disponível em <b>todas as abas, sub-abas e telas de detalhe</b> sem exceção.</li>
        <li>Só aparece quando há histórico de navegação disponível.</li>
      </ul>

      <h3>📏 Layout Responsivo — Sem Scroll Horizontal</h3>
      <ul>
        <li>A página nunca mais rola horizontalmente no celular. O conteúdo sempre se adapta à largura da tela.</li>
        <li>Tabelas longas (ex: faturas, contratos, colaboradores) ganham <b>scroll horizontal local</b>, rolando somente dentro do próprio card — sem mover a página.</li>
        <li>Botões de aba (tabs) no mobile ficam em linha com tamanho igualado, sem quebrar para a próxima linha.</li>
        <li>Barras de rolagem: apenas a barra da direita permanece ativa. A barra lateral esquerda foi removida.</li>
      </ul>

      <h3>📋 Contratos — Filtros e Exibição Corrigida</h3>
      <ul>
        <li><b>Contratos de Clientes:</b> exibe somente clientes <b>Ativos e da Agência</b> (com <code>show_in_agency = true</code>). Inativos, colaboradores e registros avulsos do Asaas não aparecem.</li>
        <li><b>Contratos de Colaboradores:</b> exibe somente funcionários cadastrados na tabela de colaboradores.</li>
        <li>O nome exibido na coluna Cliente é o <b>Nome de Exibição (Card)</b> — o nome curto cadastrado (ex: <b>ALIFORT</b> em vez de "ALIFORT INDÚSTRIA E COMÉRCIO DE EMBALAGENS LTDA"). Fallback para o nome completo se não preenchido.</li>
        <li>Botões e abas no mobile nunca mais ficam cortados — o campo de busca ocupa o espaço disponível e o botão "Novo Contrato" fica sempre visível.</li>
      </ul>

      <h3>💰 Pagamentos da Agência — Recebimentos (Clientes)</h3>
      <ul>
        <li>A lista de Recebimentos exibe somente os <b>Clientes da Agência</b> ativos (<code>show_in_agency === true</code> e sem registros sombra de funcionários).</li>
        <li>O nome do cliente na tabela usa o <b>Nome de Exibição (Card)</b>, igual ao comportamento de Contratos.</li>
        <li>Registros importados automaticamente pelo Asaas (CPFs, CNPJs avulsos sem vínculo com a agência) <b>não aparecem mais</b> na lista.</li>
      </ul>

      <div className="ebook-tip">💡 O nome de exibição do card é configurado em Gestão → Cadastro de Clientes → editar cliente → campo "Nome de Exibição (Card)".</div>
    </section>
  </div>
);

export default AdminEbook;
