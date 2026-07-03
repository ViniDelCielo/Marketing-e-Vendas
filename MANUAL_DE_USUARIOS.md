# Manual de Usuários - ROI Expert

Bem-vindo ao manual completo de operação do sistema ROI Expert. Este documento visa guiar os diferentes perfis de acesso na utilização da plataforma de chat, configurações e funcionalidades gerais.

---

## 1. Perfil: Gestor / Administrador

O perfil de Gestor/Dono possui controle total sobre a agência, o sistema de mensagens e o fluxo de aprovações.

### Principais Funcionalidades:
- **Visão Global de Chats:** O Gestor pode visualizar os chats na "Visão do Gestor" (onde vê as conversas de toda a empresa com os clientes) ou "Meus Chats" (apenas suas conversas delegadas).
- **Gerenciamento de Colaboradores e Clientes:** Permissão para criar, editar ou excluir contas da equipe (Colaboradores) e Clientes.
- **Moderação de Mensagens:**
  - O Gestor tem o poder exclusivo de **Aprovar ou Recusar** pedidos de exclusão de mensagens enviadas no Chat Externo (WhatsApp).
  - Pode apagar qualquer mensagem própria de forma direta.
- **Supervisão de Aprovações:** Gestores podem monitorar o envio de mídias/copies de Social Media e o andamento de tarefas em revisão em todos os departamentos.
- **Chat Interno da Equipe:**
  - Permite comunicação isolada e segura com qualquer membro da equipe.
  - Possui um **Sistema de Filtros** avançado para organizar as conversas por Departamentos, Lidas ou Não Lidas.
- **Relatórios:** Acesso completo a gráficos, faturamento e desempenho da equipe.

---

## 2. Perfil: Colaborador

O perfil de Colaborador (Ex: Tráfego Pago, Edição de Vídeo, Captação, Social Media) foca exclusivamente no atendimento e na execução das demandas da agência.

### Principais Funcionalidades:
- **Sub-abas no Setor de Social Media:** A área de Social Media agora conta com 4 sub-abas específicas para organização do trabalho:
  - **Kanban:** Fluxo visual de cartões e tarefas operacionais comuns do setor.
  - **Calendário de Postagens:** Planejamento e agendamento mensal de posts por canal (Instagram, TikTok, LinkedIn, etc.) com definição de data, horário, tipo e status.
  - **Reuniões:** Agenda de alinhamento com clientes e pautas internas.
  - **Solicitar Aprovações:** Envio estruturado de postagens (imagens/vídeos) e copies (legendas) diretamente para o cliente. Comentários de correção solicitados pelo cliente aparecem em tempo real diretamente neste painel.
- **Atendimento Omnichannel (WhatsApp):** O Colaborador pode se comunicar diretamente com os clientes da agência.
- **Notificações Síncronas (Feedback Instantâneo):** Ao enviar um material para aprovação, o cliente é notificado. Se o cliente aprovar (✅) ou solicitar correção (🔄), um alerta com o emoji correspondente é enviado ao chat do departamento em tempo real, atualizando o status do Kanban do colaborador de forma síncrona, sem necessidade de atualizar a página (F5).
- **Notas Ocultas / Comunicação Interna:** Mensagens marcadas com a "Bandeira Interna" no chat que somente a equipe da agência pode ver.
- **Sistema de Confirmação Unificado (Modal Pop-up):** Modais modernos de confirmação para ações destrutivas (excluir reuniões, demandas ou tarefas).

---

## 3. Perfil: Cliente

O perfil do Cliente tem uma visão simplificada e totalmente focada na revisão de entregas e no atendimento de sua empresa.

### Principais Funcionalidades:
- **Portal de Aprovações Unificado:** Nova área centralizada na barra lateral onde todas as solicitações pendentes de aprovação da agência (vídeos do editor, artes do designer, posts e legendas do Social Media) são organizadas em uma única página.
- **Visualização Integrada (Inline Preview):** O cliente pode revisar imagens e reproduzir vídeos (Reels, TikTok, etc.) direto no portal, sem precisar baixar os arquivos ou abrir outras abas.
- **Notificações de Alta Prioridade:** Quando o cliente clica no sino de notificações 🔔 no topo da tela, ele é direcionado de forma direta e precisa para a tarefa pendente no seu Portal de Aprovações.
- **Ações Rápidas:** Botões intuitivos para **Aprovar** ou **Solicitar Correção** (com campo para detalhar os ajustes desejados).
- **Espelho do WhatsApp:** Tudo que a agência envia no painel web, o Cliente recebe também em seu WhatsApp, com a possibilidade de aprovar respondendo "1" (Aprovar) ou "2" (Solicitar Revisão).
- **Privacidade:** Sem acesso aos chats internos, notas ocultas da equipe ou painéis de gestão.

---

## 4. Recursos do Sistema Atualizados

### Integração Bidirecional com Google Calendar (Todos os Perfis)
- **Gestor/Admin, Colaborador e Cliente** agora possuem a opção de vincular suas contas do Google Calendar ao sistema.
- **Sincronização em Tempo Real:** Eventos criados, editados ou excluídos no ROI Expert (Agenda CS, Captação, Agenda Pessoal) refletem instantaneamente no Google Calendar e vice-versa.
- **Controle de Privacidade:** O usuário pode conectar ou revogar o acesso ao calendário a qualquer momento.

### Feedback Imediato de Alterações
- Ao editar as informações de qualquer cliente e clicar em **Salvar Alterações** ou pressionar **Enter**, o sistema exibe instantaneamente um balão (toast) sobreposto no **canto inferior esquerdo** da própria janela flutuante (modal) com a mensagem *"Alteração salva com sucesso!"*, evitando que mensagens cruciais apareçam por trás do painel.

### Mesclagem Inteligente de Clientes (Asaas)
- O buscador do modal de mesclagem foi otimizado para tolerar termos parciais ou fora de ordem (ex: pesquisando por "twis" ou palavras separadas por espaço), exibindo corretamente clientes da base do Asaas mesmo que já estejam cadastrados na agência para facilitar a vinculação e a limpeza de duplicatas.

### Modais de Confirmação Customizados
- Todas as operações críticas (exclusão de demandas, remoção de equipe, cancelamento de reuniões) acionam um modal flutuante com visual moderno e fundo desfocado (glassmorphism), trazendo maior segurança operacional sem depender das telas padrão do navegador.

### Bloqueio de Agendamento Retroativo (Viagem no Tempo)
- Em todas as áreas do sistema que possuem um calendário (Agenda Captação, Agenda CS, Agenda Pessoal, Agenda Global e painéis do cliente), as datas e dias passados agora possuem um bloqueio visual e interativo. Os dias do passado ficam esmaecidos e o clique é totalmente desabilitado, prevenindo que a equipe ou o cliente façam agendamentos equivocados em datas que já passaram.

### Ajustes Responsivos de Layout em Calendários
- Corrigida a renderização do Grid (Tabela) mensal em telas de proporção estrita (Painéis Setoriais). Os dias passaram a usar altura mínima adaptável ao invés de proporção em bloco fixa, assegurando que o final do mês (dias 28 a 31) nunca "sumam" ou fiquem cortados por conta da borda inferior da tela.

### Agendamento e Sincronização Realtime de Captação
- **Notificação Automática:** Ao agendar ou reagendar uma gravação/captação na empresa do cliente, uma notificação ("chat_message") de aprovação de agendamento é disparada imediatamente para a aba de notificações do cliente.
- **Desmarcação Síncrona:** O painel de Captação passa a utilizar canais *WebSockets (Realtime)*. Ao cancelar ou clicar na "Lixeira" para desmarcar uma captação pelo colaborador ou cliente:
  - O evento some de ambos os calendários instantaneamente sem necessidade de atualizar a tela (F5).
  - O sistema emite automaticamente uma notificação push para a outra parte ("A Captação foi cancelada e logo remarcaremos uma nova data"), mantendo o histórico de controle de agenda centralizado no chat.

### CRM de Vendas & Kanban Customizável (Prospecção Ativa)
- **Gestão de Pipelines e Colunas (Gestor / Admin):**
  - Gestores podem criar múltiplos pipelines, reordená-los arrastando (com salvamento instantâneo) e customizar completamente as colunas/etapas de cada funil.
  - Ao renomear ou excluir colunas, as alterações propagam-se de forma inteligente: leads pertencentes às colunas editadas são migrados para a nova etapa ou para a primeira coluna padrão para evitar perda de dados.
- **Mapeamento de 8 Colunas Padrão (Colaborador):**
  - O Funil de Vendas vem pré-configurado com 8 etapas comerciais sequenciais: `Nova Consulta`, `Qualificado`, `Chamada Agendada`, `Preparando Proposta`, `Proposta Enviada`, `Acompanhamento`, `Negociação` e `Fatura Enviada`.
  - A exibição das colunas é otimizada para rolagem horizontal suave com efeito de inércia por arraste ("gelo"), permitindo deslizar e movimentar de forma ágil e natural em qualquer largura de tela.
- **Inserção de Leads e Menu de Estágios Dinâmico (Colaborador):**
  - Ao criar um Novo Lead, o menu de seleção de etapas puxa dinamicamente as colunas cadastradas no pipeline ativo.
  - Permite adição rápida de tags customizadas com inserção via tecla `Enter` ou pelo botão dinâmico de sugestão, exibindo pills com a opção `x` de exclusão imediata.
- **Persistência de Dados via LocalStorage:**
  - Todas as edições e adições feitas nas pipelines, colunas customizadas e leads cadastrados são armazenadas no banco de dados local do navegador (`localStorage`). 
  - Isso garante que nenhuma alteração se perca ou retorne ao estado anterior em recarregamentos da página, atualizações de aba ou recompilações do sistema.
- **Interface e Elementos em 1º Plano (UX / UI):**
  - As modais críticas (**Novo Lead**, **Ajustar Colunas** e **Reordenar Pipelines**) foram migradas para renderização via React Portals na raiz do documento, garantindo que sempre fiquem à frente de qualquer elemento (inclusive com o Kanban expandido em tela cheia).
  - O menu de navegação lateral (sidebar) teve sua barra de rolagem visual ocultada para um design premium de alta fidelidade visual, preservando o deslizar suave do scroll caso haja itens extras.

---

*Manual atualizado em junho de 2026 para consolidar os novos recursos de Prospecção Ativa (CRM), incluindo persistência local das pipelines/colunas/leads, menu lateral otimizado, empilhamento perfeito de modais com React Portals e os efeitos de inércia no Kanban.*
