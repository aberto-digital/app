/* AbertoCore: idioma da interface (pt padrão, en opcional). Vale por aparelho. */
(function () {
  var CHAVE = 'abertocore-idioma';
  var idioma = 'pt';
  try { idioma = localStorage.getItem(CHAVE) === 'en' ? 'en' : 'pt'; } catch (e) {}
  document.documentElement.lang = idioma === 'en' ? 'en' : 'pt-BR';

  var EN = {
    // navegação e menus
    "Modelo da sua empresa em preparação": "Your company's template is being prepared",
    "Avisos neste aparelho, mesmo com o app fechado.": "Alerts on this device, even with the app closed.",
    "Mensagens de clientes": "Customer messages",
    "Cliente sem resposta, pedido para falar com a equipe": "Customer without reply, request to talk to the team",
    "Demo": "Demo", "Ignorar": "Ignore", "Ignorado": "Ignored", "Parar de ignorar": "Stop ignoring", "Sem avisos e sem resposta automática para este contato": "No alerts and no automatic replies for this contact", "Voltar a receber avisos deste contato": "Get alerts from this contact again", "Mensagem junto com o arquivo (opcional)": "Message with the file (optional)", "Biblioteca": "Library", "Conecte o WhatsApp, o Instagram, o Messenger ou o e-mail em Canais para enviar arquivos a este contato. A biblioteca já pode ser montada.": "Connect WhatsApp, Instagram, Messenger or email in Channels to send files to this contact. You can already build the library.", "Gera o PDF e envia com link": "Creates the PDF and sends it with a link", "Contrato": "Contract",
    "Sincronizando…": "Syncing…",
    "Demonstração com dados de exemplo": "Demo with sample data",
    "Ao vivo": "Live",
    "Simula mensagens chegando em tempo real": "Simulates messages arriving in real time",
    "Simulação ao vivo pausada.": "Live simulation paused.",
    "Retorno hoje": "Follow-up today",
    "Empresa e documentos": "Company and documents",
    "Não feita": "Not done",
    "Confirmação": "Confirmation",
    "Mensagem de teste": "Test message",
    "Para o cliente": "For the customer",
    "Para você": "For you",
    "Conecte o e-mail da empresa em Canais": "Connect the company email in Channels",
    "Agenda aberta para": "Booking open for",
    "apontando para": "pointing to",
    "com nome": "named",
    "no WhatsApp.": "on WhatsApp.",
    "Importe uma lista de leads em": "Import a list of leads in",
    "Implantação prevista no funil": "Setup fees expected in the pipeline",
    "Deixe seus clientes marcarem horário sozinhos, com lembretes automáticos.": "Let your customers book on their own, with automatic reminders.",
    "Use a cara da sua marca: o cliente agenda sem sentir que saiu do seu site.": "Use your brand's look: customers book without feeling they left your site.",
    "Na demonstração a página não recebe agendamentos. Entre na sua conta para ativar.": "In the demo the page does not take bookings. Sign in to turn it on.",
    "Notificação neste aparelho. Ative em Conta e aparência → Notificações.": "Notification on this device. Turn it on in Account and appearance → Notifications.",
    "A página abre no endereço da sua marca. No painel do seu domínio, crie um registro": "The page opens at your brand's address. In your domain panel, create a record",
    ". O HTTPS é ativado sozinho no primeiro acesso.": ". HTTPS turns on by itself on first access.",
    "Ex.: Chegue 5 minutos antes. Endereço: Rua..., 123.": "E.g.: Arrive 5 minutes early. Address: Street..., 123.",
    ", sem repetir quem já está no AbertoCore e sem enviar nenhuma mensagem.": ", without repeating who is already on AbertoCore and without sending any message.",
    "Presença": "Presence",
    "Calendário mensal de conteúdo": "Monthly content calendar",
    "Cardápio ou catálogo com QR Code": "Menu or catalog with QR code",
    "Fotos e vídeos curtos com IA": "Photos and short videos with AI",
    "Gestão mensal do perfil no Google": "Monthly Google profile management",
    "Pós-venda que pede avaliação": "Post-sale review request",
    "Respostas às avaliações do Google": "Replies to Google reviews",
    "Auditoria gratuita": "Free audit",
    "Instagram profissional": "Professional Instagram",
    "Revisão mensal de resultados": "Monthly results review",
    "Assinatura do contrato": "Contract signing",
    "Atendemos de segunda a sexta, das 9h às 18h.": "We are open Monday to Friday, 9 am to 6 pm.",
    'Mensagens': 'Messages', 'Funil': 'Pipeline', 'Funil de vendas': 'Sales pipeline', 'Agenda': 'Calendar', 'Agenda e follow-up': 'Calendar and follow-up',
    'Dashboard': 'Dashboard', 'Configurações': 'Settings', 'Canais': 'Channels', 'Conta e aparência': 'Account and appearance',
    'Produtos e serviços': 'Products and services', 'Agendamento online': 'Online booking', 'Atendimento automático': 'Automated replies',
    'Importar leads': 'Import leads', 'Auditoria de presença digital': 'Digital presence audit', 'Clientes no AbertoCore': 'Clients on AbertoCore',
    'Auditoria': 'Audit', 'Conta': 'Account', 'Negócio': 'Business', 'Atendimento': 'Customer service', 'Vendas': 'Sales', 'Agência': 'Agency',
    'Ajustes': 'Settings', 'Painel': 'Panel', 'Voltar para Configurações': 'Back to Settings', 'Voltar para a lista': 'Back to list',
    'Sua conta, tema e notificações': 'Your account, theme and notifications',
    'Produtos, atendimento automático e canais': 'Products, automated replies and channels',
    'WhatsApp, Instagram, Messenger, e-mail e chat do site': 'WhatsApp, Instagram, Messenger, email and website chat',
    'WhatsApp, Instagram, Facebook e e-mail numa caixa só': 'WhatsApp, Instagram, Facebook and email in one inbox',
    'WhatsApp, Instagram e Facebook': 'WhatsApp, Instagram and Facebook',
    'Chatbot de menu e Assistente de IA no WhatsApp': 'Menu chatbot and AI assistant on WhatsApp',
    'Cada contato é um card. Arraste entre as etapas.': 'Each contact is a card. Drag it between stages.',
    'Compromissos da semana e retornos combinados': 'This week\'s appointments and agreed follow-ups',
    'Horários da semana, manutenções e retornos': 'Weekly schedule, maintenance and follow-ups',
    'Relatórios atualizados em tempo real': 'Reports updated in real time',
    'Página para o cliente marcar horário, com lembretes': 'Page for customers to book, with reminders',
    'Listas de prospecção em Excel ou CSV': 'Prospect lists in Excel or CSV',
    'Score, gráficos e relatório em PDF por empresa': 'Score, charts and PDF report per business',
    'Acesso das empresas clientes ao app': 'Client companies\' access to the app',
    'O que você vende e por quanto': 'What you sell and for how much', 'O que você faz e por quanto': 'What you do and for how much',
    // caixa de entrada e conversa
    'Entrada': 'Inbox', 'Prospecção': 'Prospecting', 'Arquivados': 'Archived', 'Para responder': 'To reply',
    'Aguardando retorno do cliente': 'Waiting for the customer', 'Escreva uma mensagem': 'Write a message', 'Enviar': 'Send',
    'Arquivar': 'Archive', 'Desarquivar': 'Unarchive', 'Excluir conversa': 'Delete conversation', 'Abrir conversa': 'Open conversation',
    'Buscar por nome, negócio ou telefone': 'Search by name, business or phone', 'Filtrar por origem': 'Filter by source', 'Todas': 'All',
    'Ninguém esperando sua resposta.': 'Nobody is waiting for your reply.', 'Nenhuma conversa em prospecção.': 'No conversations in prospecting.',
    'Sem mensagens ainda': 'No messages yet', 'Nenhum contato ainda.': 'No contacts yet.', 'Conversa': 'Conversation', 'Conversas': 'Conversations',
    'Passar para humano': 'Hand over to a person', 'Falar com uma pessoa': 'Talk to a person',
    'A equipe assumiu a conversa. O robô fica quieto.': 'The team took over the conversation. The bot stays quiet.',
    'Conversa passada para a equipe.': 'Conversation handed over to the team.',
    'Este contato não tem um canal conectado para envio.': 'This contact has no connected channel to send from.',
    'Resumo da conversa': 'Conversation summary', 'A IA ainda não leu esta conversa': 'The AI has not read this conversation yet',
    'Resumir agora': 'Summarize now', 'Lendo a conversa…': 'Reading the conversation…', 'Sem resumo ainda.': 'No summary yet.',
    'Enviar arquivo': 'Send file', 'Escolher arquivo': 'Choose file', 'Arquivo maior que 20 MB.': 'File larger than 20 MB.',
    'Não consegui ler essa imagem.': 'Could not read this image.', 'Não consegui ler esse arquivo.': 'Could not read this file.',
    'entregue': 'delivered', 'enviada': 'sent', 'lida': 'read', 'não enviada': 'not sent', 'enviando…': 'sending…',
    'hoje': 'today', 'ontem': 'yesterday', 'Hoje': 'Today', 'Últimas mensagens': 'Latest messages', 'Dados do contato': 'Contact details',
    'Dados do lead': 'Lead details', 'Editar contato': 'Edit contact', 'Novo contato': 'New contact', 'Abrir esse contato': 'Open this contact',
    'Selecione ou cadastre um contato.': 'Select or add a contact.', 'Cadastre o primeiro cliente ou lead.': 'Add your first customer or lead.',
    'Anotações': 'Notes', 'Observações': 'Notes', 'Interno, só a equipe vê': 'Internal, only the team sees it',
    'Interno, compartilhado com a equipe': 'Internal, shared with the team', 'Lembrar no WhatsApp': 'Remind on WhatsApp',
    'O que a pessoa precisa, o que foi combinado': 'What the person needs, what was agreed',
    // campos comuns
    'Nome': 'Name', 'Nome da pessoa': 'Person\'s name', 'E-mail': 'Email', 'E-mail da pessoa': 'Person\'s email', 'Telefone': 'Phone',
    'WhatsApp ou telefone': 'WhatsApp or phone', 'Outros telefones': 'Other phones', 'Empresa': 'Company', 'Empresa ou negócio': 'Company or business',
    'Endereço': 'Address', 'Origem': 'Source', 'Canal': 'Channel', 'Etapa do funil': 'Pipeline stage', 'Como chegou': 'How they found you',
    'Próximo passo': 'Next step', 'Próximo retorno': 'Next follow-up', 'Valor estimado (R$)': 'Estimated value (R$)', 'Valor (R$)': 'Value (R$)',
    'Preço': 'Price', 'Preço (R$)': 'Price (R$)', 'Data': 'Date', 'Hora': 'Time', 'Horário': 'Time', 'Duração': 'Duration', 'Tipo': 'Type',
    'Serviço': 'Service', 'Serviços': 'Services', 'Responsáveis': 'Owners', 'Equipe': 'Team', 'Dono': 'Owner', 'Nota': 'Rating',
    'Nota Google': 'Google rating', 'Seguidores Instagram': 'Instagram followers', 'Sem site': 'No website', 'Classificação': 'Classification',
    'Indicação': 'Referral', 'Contato': 'Contact', 'Cliente': 'Customer', 'Lead': 'Lead', 'Razão social': 'Legal name', 'Detalhes': 'Details',
    'Ex.: Maria Silva': 'E.g.: Maria Silva', 'Ex.: Orçamento': 'E.g.: Quote', 'Ex.: Padaria Pão Dourado': 'E.g.: Golden Bread Bakery',
    // etapas do funil
    'Novo': 'New', 'Qualificado': 'Qualified', 'Proposta': 'Proposal', 'Proposta enviada': 'Proposal sent', 'Negociação': 'Negotiation',
    'Em negociação': 'In negotiation', 'Fechado': 'Won', 'Perdido': 'Lost',
    // botões e avisos comuns
    'Salvar': 'Save', 'Cancelar': 'Cancel', 'Fechar': 'Close', 'Editar': 'Edit', 'Excluir': 'Delete', 'Configurar': 'Set up', 'Ativar': 'Enable',
    'Desligar': 'Turn off', 'Conectar': 'Connect', 'Gerenciar': 'Manage', 'Em breve': 'Coming soon', 'Copiar link': 'Copy link',
    'Copiar mensagem': 'Copy message', 'Link copiado.': 'Link copied.', 'Compartilhar': 'Share', 'Abrir página': 'Open page',
    'Carregando…': 'Loading…', 'Verificando…': 'Checking…', 'Escolha': 'Choose', 'Recusar': 'Decline', 'Desmarcar': 'Unmark',
    'Feito': 'Done', 'Fazer': 'To do', 'Preencher': 'Fill in', 'Pode preencher': 'You can fill it in', 'Não preenchido': 'Not filled in',
    'Ativo': 'Active', 'ligado': 'on', 'ligada': 'on', 'desligado': 'off', 'pausado': 'paused', 'conectada': 'connected', 'Grátis': 'Free',
    'Gerar': 'Generate', 'Gerado': 'Generated', 'Não gerado': 'Not generated', 'Não gerada': 'Not generated', 'Nenhuma': 'None',
    'Agendar': 'Schedule', 'para': 'for', 'às': 'at', 'até': 'until', 'novos': 'new', '(recomendado)': '(recommended)',
    // conta, tema, login
    'Tema': 'Theme', 'Claro': 'Light', 'Escuro': 'Dark', 'Igual ao aparelho': 'Same as device', 'Vale só para este aparelho.': 'Applies to this device only.',
    'Sair da conta': 'Sign out', 'Entrar': 'Sign in', 'Entrar no AbertoCore': 'Sign in to AbertoCore', 'Senha': 'Password', 'Entrando…': 'Signing in…',
    'Seus dados ficam salvos no servidor e aparecem em qualquer aparelho.': 'Your data is saved on the server and shows up on any device.',
    'Tudo salvo no servidor': 'Everything saved on the server', 'Salvando…': 'Saving…', 'Sem conexão com o servidor': 'No connection to the server',
    'Conectando': 'Connecting', 'Sessão expirada. Entre de novo.': 'Session expired. Please sign in again.',
    'Sem conexão com o servidor. Verifique a internet e tente de novo.': 'No connection to the server. Check your internet and try again.',
    'Os dados estão só neste navegador. Clique para entrar.': 'Data is only in this browser. Click to sign in.',
    'Sem conexão · tentar de novo': 'Offline · try again', 'Este usuário ainda não está ligado a uma empresa.': 'This user is not linked to a company yet.',
    'Você está vendo a demonstração, com dados só neste navegador.': 'You are viewing the demo, with data only in this browser.',
    'Senha (mínimo 8 caracteres)': 'Password (at least 8 characters)', 'Repita a senha': 'Repeat the password',
    'Criar senha e entrar': 'Create password and sign in', 'As duas senhas estão diferentes.': 'The two passwords do not match.',
    'Bem-vinda ao AbertoCore': 'Welcome to AbertoCore', 'Notificações': 'Notifications', 'Enviar notificação de teste': 'Send test notification',
    'Teste enviado. Deve chegar em segundos.': 'Test sent. It should arrive in seconds.', 'Permissão não concedida.': 'Permission not granted.',
    'Notificações atualizadas neste aparelho.': 'Notifications updated on this device.', 'Notificações desligadas neste aparelho.': 'Notifications turned off on this device.',
    'Nenhum aparelho inscrito recebeu.': 'No subscribed device received it.', 'Adicionar à Tela de Início': 'Add to Home Screen',
    'Avisa quando um cliente fica 3 horas sem resposta': 'Alerts when a customer goes 3 hours without a reply',
    'Avisos do Assistente de IA': 'AI Assistant alerts', 'Nova mensagem de': 'New message from', 'Idioma': 'Language',
    // canais
    'Conexão com a Meta': 'Meta connection', 'Não conectado': 'Not connected', 'Conectado:': 'Connected:', 'Ativo:': 'Active:',
    'Conectar WhatsApp': 'Connect WhatsApp', 'Conectar Instagram e Facebook': 'Connect Instagram and Facebook', 'Conectar e-mail': 'Connect email',
    'Chat do site': 'Website chat', 'Facebook Messenger': 'Facebook Messenger', 'Instagram Direct': 'Instagram Direct',
    'Conectado: Direct': 'Connected: Direct', 'Conectado: página da empresa': 'Connected: business Page',
    'Mensagens, áudios e fotos chegam na central. Assistente de IA ativo.': 'Messages, audio and photos arrive in the inbox. AI assistant on.',
    'Mensagens chegam na central e a IA ou o menu respondem. O número continua funcionando no app WhatsApp Business do celular.': 'Messages arrive in the inbox and the AI or the menu replies. The number keeps working in the WhatsApp Business app on the phone.',
    'Mensagens da Página da empresa. Conecta junto com o Instagram.': 'Messages from the business Page. Connects together with Instagram.',
    'Mensagens da página e de anúncios.': 'Messages from the Page and from ads.', 'Mensagens diretas do TikTok.': 'TikTok direct messages.',
    'Mensagens do Direct e respostas aos stories.': 'Direct messages and story replies.',
    'Mensagens do Direct, respostas e menções em stories. O perfil precisa ser profissional e estar ligado a uma Página do Facebook.': 'Direct messages, story replies and mentions. The profile must be a professional account linked to a Facebook Page.',
    'Mensagens e avaliações do perfil no Google.': 'Messages and reviews from the Google profile.',
    'Recebe e responde e-mails, e cada um vira Lead ou Cliente no funil.': 'Receives and replies to emails, and each one becomes a Lead or Customer in the pipeline.',
    'Recebe os e-mails da caixa da empresa e responde daqui. Cada remetente vira um contato no funil.': 'Receives the company mailbox emails and replies from here. Each sender becomes a contact in the pipeline.',
    'Conversas da janela do site e do formulário caem aqui. Responda pela conversa, o visitante vê na hora.': 'Chats from the website widget and form land here. Reply in the conversation and the visitor sees it instantly.',
    'Conversas da janela do site e do formulário caem aqui. A IA atende 24h quando ligada.': 'Chats from the website widget and form land here. The AI answers 24/7 when on.',
    'A abertodigital está concluindo a configuração do app na Meta. Assim que terminar, os botões de conectar aparecem aqui.': 'abertodigital is finishing the app setup with Meta. Once done, the connect buttons appear here.',
    'Canal desligado.': 'Channel turned off.', 'Conexão cancelada.': 'Connection cancelled.', 'Nenhuma Página escolhida.': 'No Page chosen.',
    'A Meta não devolveu o número. Conclua todas as etapas da janela e tente de novo.': 'Meta did not return the number. Complete all steps in the window and try again.',
    'Assinatura do e-mail': 'Email signature', 'Salvar assinatura': 'Save signature',
    'Assinatura salva. Ela vai nos próximos e-mails respondidos.': 'Signature saved. It goes on the next replied emails.',
    'Vai no fim de todo e-mail respondido pelo AbertoCore. Uma informação por linha; a primeira sai em destaque. Links e e-mails viram clicáveis.': 'Added at the end of every email replied from AbertoCore. One item per line; the first is highlighted. Links and emails become clickable.',
    'Dados da demonstração': 'Demo data', 'Restaurar dados de exemplo': 'Restore sample data', 'Dados de exemplo restaurados.': 'Sample data restored.',
    'As mudanças ficam salvas só neste navegador. Volte aos dados de exemplo quando quiser.': 'Changes are saved only in this browser. Go back to the sample data anytime.',
    // atendimento automático / IA
    'Chatbot de menu': 'Menu chatbot', 'Chatbot de menu (triagem)': 'Menu chatbot (triage)', 'Assistente de IA': 'AI assistant',
    'Assistente AbertoCore': 'AbertoCore assistant', 'Mensagem de boas-vindas': 'Welcome message', 'Opções do menu': 'Menu options',
    'Adicionar opção': 'Add option', 'Rodapé do menu': 'Menu footer', 'Menu principal': 'Main menu', 'Salvar chatbot': 'Save chatbot',
    'Chatbot salvo': 'Chatbot saved', 'Chatbot ligado': 'Chatbot on', 'Teste o menu': 'Test the menu', 'Salvar e testar': 'Save and test',
    'Botões para tocar': 'Tap buttons', 'Texto numerado': 'Numbered text', 'Botões e destaques': 'Buttons and highlights',
    'Como o menu aparece no WhatsApp': 'How the menu looks on WhatsApp', 'Manda o menu na primeira mensagem do cliente': 'Sends the menu on the customer\'s first message',
    'Até 3 opções: aparecem como botões embaixo da mensagem. Títulos com até 20 letras.': 'Up to 3 options: they show as buttons below the message. Titles up to 20 characters.',
    'Até 3 opções: aparecem como botões embaixo da mensagem.': 'Up to 3 options: they show as buttons below the message.', 'Títulos com até 20 letras.': 'Titles up to 20 characters.',
    'O cliente responde digitando o número da opção.': 'The customer replies by typing the option number.',
    'Adicione opções ao menu para testar.': 'Add options to the menu to test it.', 'Adicione pelo menos uma opção antes de ligar o chatbot.': 'Add at least one option before turning the chatbot on.',
    'Escreva como cliente, ex.: oi ou 1': 'Write as a customer, e.g.: hi or 1', 'Simulação. Nada é enviado ao WhatsApp.': 'Simulation. Nothing is sent to WhatsApp.',
    'Texto livre depois do menu: fica para a equipe ler.': 'Free text after the menu: left for the team to read.', 'Não encontrei essa opção.': 'I couldn\'t find that option.',
    'Digite 0 para ver o menu de novo.': 'Type 0 to see the menu again.', '☰ Ver opções': '☰ See options', '{empresa} vira o nome da empresa.': '{empresa} becomes the company name.',
    'Olá! 👋 Aqui é {empresa}. Como podemos ajudar? Escolha uma opção:': 'Hello! 👋 This is {empresa}. How can we help? Choose an option:',
    'Robô fica quieto depois que a equipe assume': 'Bot stays quiet after the team takes over',
    'Depois de responder, passar a conversa para a equipe': 'After replying, hand the conversation to the team',
    'Quando o cliente pede uma pessoa, pede preço personalizado ou reclama': 'When the customer asks for a person, a custom price, or complains',
    'Nome do assistente': 'Assistant name', 'Tom de voz': 'Tone of voice', 'Próximo e direto': 'Friendly and direct', 'Horário de atendimento': 'Business hours',
    'Horários de atendimento': 'Business hours', 'Horário e endereço': 'Hours and address', 'Serviços e preços': 'Services and prices',
    'Base de conhecimento': 'Knowledge base', 'Atender clientes sozinha': 'Answer customers on its own', 'Preencher o CRM sozinha': 'Fill in the CRM on its own',
    'Eu aprovo cada pedido': 'I approve each request', 'Automática': 'Automatic', 'Salvar configuração': 'Save settings',
    'Configuração do assistente salva.': 'Assistant settings saved.', 'Conexão com a IA': 'AI connection', 'Conectar a IA': 'Connect the AI',
    'IA não conectada': 'AI not connected', 'Conectado ao Gemini': 'Connected to Gemini', 'Provedor': 'Provider', 'Chave da API': 'API key',
    'Trocar a chave da API': 'Change the API key', 'Cole aqui a chave do Google AI Studio': 'Paste the Google AI Studio key here',
    'Cole a chave da API primeiro.': 'Paste the API key first.', 'Camada grátis só para testes.': 'Free tier for testing only.',
    'Claude e OpenAI entram depois.': 'Claude and OpenAI come later.', 'Chamadas à IA neste mês': 'AI calls this month', 'chamadas à IA': 'AI calls',
    'IA interna': 'Internal AI', 'Pergunta para o assistente': 'Question for the assistant', 'Perguntas ao assistente': 'Questions to the assistant',
    'Conversa com o assistente': 'Chat with the assistant', 'Conecte a IA para perguntar': 'Connect the AI to ask',
    'Entre na sua conta para usar o assistente.': 'Sign in to use the assistant.', 'pensando...': 'thinking...',
    'Pergunte algo, ex.: quem eu preciso retornar hoje?': 'Ask something, e.g.: who do I need to follow up with today?',
    'Quem eu preciso retornar hoje?': 'Who do I need to follow up with today?', 'Quanto está em negociação agora?': 'How much is in negotiation right now?',
    'Quem está esperando resposta da equipe?': 'Who is waiting for a reply from the team?', 'Quais orçamentos estão parados há mais de 5 dias?': 'Which quotes have been stalled for more than 5 days?',
    'Responde perguntas sobre contatos, funil e agenda': 'Answers questions about contacts, pipeline and calendar',
    'As perguntas, os resumos do dia e os avisos ficam na conversa': 'Questions, daily summaries and alerts stay in the conversation',
    'Resumo do dia': 'Daily summary', 'Resumo do dia às 18h': 'Daily summary at 6 pm', 'Gerar resumo agora': 'Generate summary now',
    'Atualizar resumo': 'Refresh summary', 'Resumo gerado. Ele também está na conversa do assistente.': 'Summary generated. It is also in the assistant chat.',
    'Cards atualizados pela IA': 'Cards updated by the AI', 'Precisa de atenção': 'Needs attention',
    // dashboard
    'Conversas abertas': 'Open conversations', 'Novos leads (7 dias)': 'New leads (7 days)', 'Novos leads por dia': 'New leads per day',
    'Taxa de conversão': 'Conversion rate', 'Receita fechada': 'Closed revenue', 'Mensagens por canal': 'Messages by channel',
    'Últimos 14 dias, todos os canais.': 'Last 14 days, all channels.', 'Últimos 30 dias.': 'Last 30 days.',
    'Quantos contatos chegaram a cada etapa. Perdidos ficam de fora.': 'How many contacts reached each stage. Lost ones are excluded.',
    'Respostas dadas pela IA (30 dias)': 'Replies given by the AI (30 days)', 'Conversas resolvidas sem humano': 'Conversations resolved without a person',
    'Tempo médio de 1ª resposta com IA': 'Average first response time with AI', 'Tempo médio de 1ª resposta da equipe': 'Average first response time by the team',
    'Atendimento e IA (30 dias)': 'Customer service and AI (30 days)', 'Nenhuma mensagem nos últimos 30 dias.': 'No messages in the last 30 days.',
    'Atrasados': 'Overdue', 'Nenhum retorno pendente.': 'No pending follow-ups.', 'Retornos combinados': 'Agreed follow-ups',
    // agenda
    'Novo compromisso': 'New appointment', 'Agendar compromisso': 'Schedule appointment', 'Próximos compromissos': 'Upcoming appointments',
    'Próximos dias': 'Next days', 'Próximos 7 dias': 'Next 7 days', 'Próximos 14 dias': 'Next 14 days', 'Próximos 30 dias': 'Next 30 days',
    'Próximos 60 dias': 'Next 60 days', 'Próximos 90 dias': 'Next 90 days', 'Reunião': 'Meeting', 'Ligação': 'Call', 'Visita': 'Visit',
    'Presencial': 'In person', 'Follow-up': 'Follow-up', 'Cadastre um contato antes de agendar.': 'Add a contact before scheduling.',
    'Segunda': 'Monday', 'Terça': 'Tuesday', 'Quarta': 'Wednesday', 'Quinta': 'Thursday', 'Sexta': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday',
    'seg': 'Mon', 'ter': 'Tue', 'qua': 'Wed', 'qui': 'Thu', 'sex': 'Fri', 'sáb': 'Sat', 'dom': 'Sun',
    // agendamento online
    'Agendamento online ligado': 'Online booking on', 'Salvar agendamento online': 'Save online booking', 'Cliente pode agendar online': 'Customers can book online',
    'Endereço da sua página': 'Your page address', 'Endereço próprio': 'Custom domain', 'Aparência da página': 'Page appearance',
    'Enviar logo': 'Upload logo', 'Sem logo': 'No logo', 'Topo da página': 'Page header', 'Fundo': 'Background', 'Estilo das letras': 'Font style',
    'Moderna (Inter)': 'Modern (Inter)', 'Elegante (Marcellus)': 'Elegant (Marcellus)', 'Clássica (Playfair Display)': 'Classic (Playfair Display)',
    'Suave (Nunito)': 'Soft (Nunito)', 'Voltar às cores do AbertoCore': 'Back to AbertoCore colors', 'Serviços na página': 'Services on the page',
    'Horários a cada': 'Time slots every', 'Intervalo entre clientes': 'Gap between customers', 'Sem intervalo': 'No gap', 'Antecedência mínima': 'Minimum notice',
    'Oferece horários livres da agenda': 'Offers free slots from the calendar', 'O horário livre escolhido pelo cliente já fica confirmado.': 'The free slot the customer picks is confirmed right away.',
    'Aguardando sua confirmação': 'Waiting for your confirmation', 'Enviar confirmação e lembrete automático ao cliente': 'Send confirmation and automatic reminder to the customer',
    'Recado na confirmação e nos lembretes': 'Note in the confirmation and reminders', 'Lembretes': 'Reminders', 'Próximos marcados online': 'Upcoming online bookings',
    'Endereço próprio inválido. Exemplo: agendar.seusite.com.br': 'Invalid custom domain. Example: agendar.yoursite.com',
    'Cadastre seus serviços em Produtos e serviços.': 'Add your services in Products and services.',
    // produtos
    'Novo produto': 'New product', 'Editar produto': 'Edit product', 'O que é': 'What it is', 'O que inclui': 'What it includes', 'O que ele faz': 'What it does',
    'Implantação': 'Setup fee', 'Implantação (R$)': 'Setup fee (R$)', 'Mensalidade': 'Monthly fee', 'Pacote': 'Package', 'Módulo': 'Module', 'Sob consulta': 'On request',
    'Biblioteca': 'Library', '⬆️ Adicionar arquivo à biblioteca': '⬆️ Add file to library',
    'Nenhum arquivo ainda. Adicione catálogo, tabela de preços, portfólio…': 'No files yet. Add a catalog, price list, portfolio…',
    'Apagar este arquivo da biblioteca? Links já enviados deixam de abrir.': 'Delete this file from the library? Links already sent will stop working.',
    // importar leads e clientes
    'Baixar modelo de planilha': 'Download spreadsheet template', 'ou arraste aqui (.xlsx ou .csv)': 'or drag it here (.xlsx or .csv)',
    'Use um arquivo .xlsx ou .csv.': 'Use an .xlsx or .csv file.', 'Nenhum lead novo nesse arquivo.': 'No new leads in this file.',
    '+ Nova empresa…': '+ New company…', 'Nome da empresa nova': 'New company name', 'Criar acesso e gerar link': 'Create access and generate link',
    'Acesso criado': 'Access created', 'Novo link gerado': 'New link generated', 'Acesso': 'Access',
    'Disponível só para a equipe da abertodigital.': 'Available only to the abertodigital team.'
  };

  var REGRAS = [
    [/^Tudo salvo no servidor\. (.*)$/, function () { return 'Everything saved on the server. The dot next to the AbertoCore name shows this: green saved, yellow saving, red offline.'; }],
    [/^Ativar (.+)$/, function (m) { return 'Enable ' + tr(m[1]); }],
    [/^Excluir (.+)$/, function (m) { return 'Delete ' + tr(m[1]); }],
    [/^Conectado: (.+)$/, function (m) { return 'Connected: ' + m[1]; }],
    [/^Ativo: (.+)$/, function (m) { return 'Active: ' + m[1]; }],
    [/^(\d\d:\d\d) (Reunião|Ligação|Visita)$/, function (m) { return m[1] + ' ' + tr(m[2]); }],
    [/^(\d+) produtos e serviços$/, function (m) { return m[1] + ' products and services'; }],
    [/^Retorno (\d\d\/\d\d)$/, function (m) { return 'Follow-up ' + m[1]; }],
    [/^Remover opção (\d+)$/, function (m) { return 'Remove option ' + m[1]; }],
    [/^Resposta da opção (\d+)$/, function (m) { return 'Option ' + m[1] + ' reply'; }],
    [/^Título da opção (\d+)$/, function (m) { return 'Option ' + m[1] + ' title'; }],
    [/^O que o robô responde quando o cliente digita (\d+)$/, function (m) { return 'What the bot replies when the customer types ' + m[1]; }],
    [/^(\d+) minutos?$/, function (m) { return m[1] + ' minutes'; }],
    [/^(\d+(?:\.\d+)?) horas?$/, function (m) { return m[1] + (m[1] === '1' ? ' hour' : ' hours'); }],
    [/^(\d+) (dias?|horas?|minutos?) antes$/, function (m) { return m[1] + ' ' + ({dia:'day', dias:'days', hora:'hour', horas:'hours', minuto:'minute', minutos:'minutes'})[m[2]] + ' before'; }],
    [/^(\d+) sem resposta$/, function (m) { return m[1] + ' without reply'; }]
  ];

  function tr(t) {
    if (Object.prototype.hasOwnProperty.call(EN, t)) return EN[t];
    for (var i = 0; i < REGRAS.length; i++) { var m = t.match(REGRAS[i][0]); if (m) return REGRAS[i][1](m); }
    return null;
  }
  function trTexto(v) {
    if (!v) return v;
    var a = v.match(/^\s*/)[0], z = v.match(/\s*$/)[0], meio = v.trim();
    if (!meio) return v;
    var r = tr(meio);
    return r == null ? v : a + r + z;
  }
  var ATTR = ['placeholder', 'title', 'aria-label'];
  function traduz(raiz) {
    if (raiz.nodeType === 3) { var nv = trTexto(raiz.nodeValue); if (nv !== raiz.nodeValue) raiz.nodeValue = nv; return; }
    if (raiz.nodeType !== 1 || raiz.closest && raiz.closest('script,style,[data-sem-traducao]')) return;
    var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null), n, lista = [];
    while ((n = w.nextNode())) lista.push(n);
    lista.forEach(function (x) {
      var p = x.parentElement; if (p && p.closest('script,style,textarea,[contenteditable],[data-sem-traducao]')) return;
      var nv = trTexto(x.nodeValue); if (nv !== x.nodeValue) x.nodeValue = nv;
    });
    var els = [raiz].concat([].slice.call(raiz.querySelectorAll('[placeholder],[title],[aria-label],input[type=button],input[type=submit]')));
    els.forEach(function (e) {
      if (!e.getAttribute) return;
      ATTR.forEach(function (a) { var v = e.getAttribute(a); if (v) { var nv = trTexto(v); if (nv !== v) e.setAttribute(a, nv); } });
      if (e.tagName === 'INPUT' && (e.type === 'button' || e.type === 'submit') && e.value) { var nv2 = trTexto(e.value); if (nv2 !== e.value) e.value = nv2; }
    });
  }

  function iniciar() {
    traduz(document.body);
    document.title = trTexto(document.title);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === 'characterData') { var nv = trTexto(m.target.nodeValue); if (nv !== m.target.nodeValue) m.target.nodeValue = nv; return; }
        if (m.type === 'attributes') { var v = m.target.getAttribute(m.attributeName); if (v) { var nv2 = trTexto(v); if (nv2 !== v) m.target.setAttribute(m.attributeName, nv2); } return; }
        m.addedNodes.forEach(function (x) { if (x.nodeType === 3 && x.parentElement && x.parentElement.closest('textarea,[contenteditable]')) return; traduz(x); });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
    var c = window.confirm, al = window.alert;
    window.confirm = function (t) { return c.call(window, trTexto(String(t))); };
    window.alert = function (t) { return al.call(window, trTexto(String(t))); };
  }

  window.I18n = {
    idioma: function () { return idioma; },
    t: function (t) { return idioma === 'en' ? (tr(t) || t) : t; },
    muda: function (novo) { try { localStorage.setItem(CHAVE, novo === 'en' ? 'en' : 'pt'); } catch (e) {} location.reload(); }
  };
  if (idioma !== 'en') return;
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
