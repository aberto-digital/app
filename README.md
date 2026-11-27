# AbertoCore

Sistema integrado de atendimento da **abertodigital**. Ele junta mensagens, funil de vendas, agenda, follow-up, assistente de IA, produtos e relatórios num lugar só.

- **No ar:** https://app.abertodigital.com
- **Status:** protótipo navegável (fase 1). Usa dados de exemplo e roda só no navegador, sem servidor.
- **Para que serve:**
  - case e portfólio do pacote **Enterprise**;
  - base reaproveitável para os sistemas personalizados dos clientes.

## Módulos

| Módulo | O que faz hoje (demo) | Na versão real |
| --- | --- | --- |
| Mensagens | Caixa única com WhatsApp, Instagram, Facebook e e-mail. Abas Entrada, Esperando e Finalizados, filtro de origem com seleção múltipla, busca e resposta sugerida pela IA. | Mensagens reais pelas APIs da Meta e por e-mail |
| Contato (painel lateral) | Classifica como Lead ou Cliente e define etapa do funil, valor, próximo retorno e anotações. Também agenda compromissos. | O mesmo, salvo no banco |
| Ligação (aba Prospecção) | Botão Ligar (`tel:`), roteiro, anotação e 7 resultados (não atendeu, caixa postal, não é o dono, retornar, sem interesse, número errado, reunião marcada). Cada tentativa fica em `c.lig.t` e o retorno usa o `followup`. A lista se ordena em Retornar agora, Ligar, Voltam em outro dia e Esgotados (3 tentativas sem atender). O funil não muda. | O mesmo, com histórico de tentativas no banco |
| Funil | Quadro com 6 etapas e cards arrastáveis (no celular, toque no card para mover). Mostra o total em R$ por etapa. Ao fechar, o contato vira Cliente. | O mesmo, salvo no banco |
| Agenda e follow-up | Próximos 7 dias e retornos atrasados, de hoje e futuros. Novo compromisso com confirmação automática ao cliente. | Integração com Google Agenda e lembretes reais |
| Dashboard | Conversas abertas, novos leads, conversão, valor em negociação, leads por dia, mensagens por canal, funil e números da IA. | Números calculados do banco |
| Produtos e serviços | Cadastro com implantação, mensalidade e ativo/inativo. | O mesmo, salvo no banco |
| Assistente de IA | Liga e desliga, passa para humano, pré-agenda e tem base de conhecimento, com chat de teste. | Respostas geradas por modelo de IA usando a base de conhecimento |
| Canais | Estado de cada canal conectado e botão para restaurar os dados de exemplo. | Conexão real de cada conta |
| Configurações (celular) | No celular, Produtos, Assistente de IA e Canais ficam agrupados no botão de engrenagem no topo, e a barra de baixo mostra só Mensagens, Funil, Agenda e Painel. | O mesmo |
| Ao vivo | Simula mensagens chegando a cada 25 s e a IA respondendo. | Mensagens chegando de verdade |

## Auditoria de presença digital

Página separada em https://app.abertodigital.com/auditoria/ (também em Configurações, no celular).

- Avalia 24 itens em 4 áreas, com estes pesos na nota geral: Ser encontrado (30), Confiança e reputação (25), Atendimento (25) e Redes sociais (20).
- Gera uma nota de 0 a 100, um gráfico de medidor e barras por área.
- Lista o que a empresa está perdendo, ordenado por impacto.
- Pode comparar com o concorrente principal.
- Sugere um pacote: Start, Presença, Completo ou Enterprise.
- "Imprimir / PDF" gera o relatório em A4, com o nome do arquivo "Auditoria Empresa data".
- As auditorias ficam salvas no navegador (botão Salvar e a lista "Salvas").
- Os critérios, pesos e textos ficam no bloco `AREAS` do `auditoria/index.html`. As regras do pacote sugerido ficam na função `pacote()`.

## Documentos conectados ao contato

A auditoria, o briefing, a proposta e o contrato são páginas próprias que leem e gravam no mesmo contato do CRM (`?c=<id do contato>`). Nada precisa ser digitado duas vezes.

| Página | O que grava no contato | Usa |
| --- | --- | --- |
| `auditoria/` | `c.auditoria`: notas, perdas e recomendação de pacote e módulos. Se não houver contato, cria um (canal Presencial). | Respostas da visita |
| `briefing/` | `c.empresa` (razão social, CNPJ, endereço, responsáveis) e `c.briefing`. Salva sozinho. | Dados do contato |
| `proposta/` | `c.proposta`: pacote, módulos, valores, prazo e pagamento. Pode mover o card para "Proposta enviada". | Auditoria, briefing, preços em Produtos |
| `contrato/` | `c.contrato`, e completa `c.empresa`. Move o card para "Negociação". | Empresa, responsável que assina, proposta |

- No CRM, o painel do contato mostra o bloco "Empresa e documentos", com o status de cada documento e um botão para abrir.
- Cada documento salvo também deixa um registro na conversa do contato.
- Os dados da abertodigital usados no contrato (razão social, CNPJ, endereço) são preenchidos uma vez e valem para todos.
- O código comum está em `core/dados.js`: catálogo de produtos, pacotes e o que cada um inclui, além das funções de leitura e gravação. O estilo comum está em `core/estilo.css`.
- Cada item da auditoria aponta para a solução que o resolve (campo `sol`). A recomendação escolhe o menor pacote que cobre os itens fracos e soma os módulos que faltam.

## Estrutura dos arquivos

```
index.html            o app inteiro (HTML, CSS e JavaScript num arquivo só)
manifest.webmanifest  permite instalar no celular como app ("Adicionar à tela inicial")
icone-192.png         ícone do app
icone-512.png
CNAME                 domínio app.abertodigital.com (GitHub Pages)
```

Dentro do `index.html`, o código está dividido em blocos, nesta ordem:

1. **`CONFIG`**: tudo que muda de um cliente para outro, como nome do sistema, empresa, responsável, WhatsApp, e-mail, etapas do funil e suas cores, e as regras de resposta da IA.
2. **`semente()`**: os dados de exemplo (contatos, conversas, compromissos, produtos e configuração da IA).
3. **Utilidades**: ícones, datas, formatação em R$ e avatares.
4. **`respostaIA()`**: escolhe a resposta pela primeira regra do `CONFIG.regrasIA` que bater com a mensagem.
5. **Vistas**: `vMensagens`, `vFunil`, `vAgenda`, `vDash`, `vProdutos`, `vAssistente` e `vCanais`. Cada uma desenha uma tela.
6. **Simulação ao vivo**: a lista `FILA` de mensagens que chegam sozinhas.

Os dados ficam salvos no `localStorage` do navegador, com a chave `<sistema>-demo-v1`. A tela Canais tem o botão "Restaurar dados de exemplo".

## Modelo de dados

```
contato   { id, nome, negocio, canal, tipo (Lead|Cliente), etapa, valor, followup (AAAA-MM-DD),
            status (entrada|esperando|finalizado), tel, origem, nota, naoLidas, msgs[] }
mensagem  { de (cli|eq|ia), txt, ts }
evento    { id, contato, titulo, data, hora, tipo (Reunião|Visita|Ligação) }
produto   { id, nome, tipo, setup, mensal (null = sob consulta), ds, ativo }
ia        { ativo, nome, tom, horario, base, humano, agendar }
```

Esse mesmo modelo vira as tabelas do banco na versão real: `contatos`, `mensagens`, `eventos`, `produtos` e `config_ia`.

## Cliente novo (checklist de onboarding)

Modelo: Mega Hair Marcela (nov/2026). Um AbertoCore só, com várias empresas: cada cliente é uma empresa com perfil próprio, não um repositório novo.

**1. Briefing e materiais**
- Instagram, Facebook, Google, WhatsApp, fotos, logo, preços e diferenciais.
- Diagnóstico em `08-Clientes/<Cliente>/Diagnostico (dd-mm).md` (pasta local da agência).

**2. Domínio**
- Preferência: `.com.br`, comprado **no nome do cliente** (CPF/CNPJ dele) ou registrado por nós e transferido se ele sair.
- DNS: registro **A** do domínio e do `www` → `187.53.122.214` (VPS). Nada de CNAME para hospedagens antigas.

**3. Site**
- Pasta `infra/sites/<cliente>/` (HTML estático, fotos otimizadas em `fotos/`, `privacidade/`, `robots.txt`, `sitemap.xml`).
- Bloco no `infra/Caddyfile` (copiar o da Marcela: domínio com `root * /srv/sites/<cliente>` e o `www` redirecionando).
- Rodapé "Feito com carinho por abertodigital" com o logo e o link.
- Formulário e chat do site postam em `https://api.abertodigital.com/api/site/...` com a `chave` do cliente.
- **Publicar = commit na `main`.** O GitHub Actions dispara o deploy na VPS (ver "Deploy automático") e o Caddy emite o HTTPS sozinho.

**4. AbertoCore do cliente**
- Migração `infra/pocketbase/pb_migrations/<timestamp>_<cliente>.js` (copiar `1764000000_perfil_convites.js`): cria a empresa com `perfil` (segmento, etapas do funil, tipos de evento, métodos, catálogo, site, WhatsApp), `configuracoes` (texto base da IA e produtos com preços), `ia_config` e `canais_site` (chave do chat, `ia=true`, saudação).
- Convite: no app, Configurações → Clientes → **Dar acesso** (só dono/admin da abertodigital). Gera o link `https://app.abertodigital.com/#convite=...`, válido por 7 dias e de uso único. Mandar **pelo WhatsApp** (não temos SMTP). O cliente cria a própria senha.

**5. E-mail no domínio**
- Zoho Mail grátis (`contato@dominio`), o cliente como administrador. DNS: TXT de verificação, MX `mx/mx2/mx3.zoho.com` (10/20/50), SPF `v=spf1 include:zohomail.com ~all`, DKIM `zmail._domainkey`. Plano grátis não tem encaminhamento nem IMAP.

**6. Redes e Google**
- Capas no estilo do site (WhatsApp com a foto no centro, Facebook com a foto à esquerda), bio e textos prontos em `08-Clientes/<Cliente>/redes/`.
- Perfil da Empresa no Google: criado por nós como administradores; a **verificação é do cliente**.
- Não mexer em contas pessoais logadas do cliente (Instagram, WhatsApp); no Facebook só pelo nosso papel de administrador da página.

**7. WhatsApp, Instagram e Messenger no AbertoCore** (depois que o app da Meta estiver publicado)
- O cliente adiciona a abertodigital como parceira no portfólio dele, ou faz o cadastro incorporado.
- Criar o registro em `canais` (empresa, tipo, phone_number_id/página, token) pelo painel do PocketBase.

**8. Vitrine**
- Prints (desktop 1200×703 e celular 300×600) em `producoes/` do repositório `aberto-digital/site` e um slide novo no carrossel de Produções.

**Cuidados**
- Este repositório é **público**: nunca colocar senha, token ou dado de cliente aqui. Segredos ficam só na VPS e no PocketBase.
- Sites estáticos são leves (cabem dezenas na VPS). Sistema pesado (app com banco próprio) vai para uma pasta e um compose separados, com a infra no repositório do próprio projeto (exemplo: `/srv/tj-site/*.caddy`).

## Roteiro para a versão real (fases 2 a 4)

| Fase | Entrega | Tecnologia prevista |
| --- | --- | --- |
| 2 (pronta) | Login e dados salvos de verdade (contatos, funil, agenda, produtos) | Servidor próprio: PocketBase na VPS Hostinger, backup na Cloudflare R2 |
| 3 (em andamento) | WhatsApp real, chatbot de menu e IA respondendo | WhatsApp Cloud API direto, webhook no PocketBase (`pb_hooks`) |
| 3 | Instagram Direct e Messenger | Graph API da Meta (exige app aprovado pela Meta e conta comercial) |
| 3 | E-mail | Gmail API ou IMAP/SMTP do provedor do domínio |
| 4 | IA de verdade | Modelo de linguagem com a base de conhecimento do cliente, regras de passar para humano e registro de cada resposta |
| 4 | Relatórios reais e Google Agenda | Consultas no banco e API do Google Agenda |

## Hospedagem e deploy

- **App (app.abertodigital.com) e site (abertodigital.com):** GitHub Pages. Publicar = commit na `main` (cerca de 1 minuto). DNS na Hostinger: `CNAME app → aberto-digital.github.io`.
- **VPS (API, sites de clientes, infra):** deploy automático pelo GitHub Actions (`.github/workflows/deploy-vps.yml`). Todo push na `main` que muda `infra/**` conecta por SSH e roda `deploy-vps infra` (que executa `/srv/infra/atualiza.sh`).
  - Secret `VPS_SSH_KEY` no repositório. A chave só roda o deploy: `restrict,command="/usr/local/bin/deploy-vps"` no `authorized_keys` do servidor. A chave do servidor está fixada no workflow.
  - Pedidos aceitos pelo `deploy-vps`: `infra` e `tradingjourney` (o TradingJourney dispara do repositório dele).
  - Log: `/var/log/deploy-vps.log`. Deploys simultâneos esperam na fila.
  - Rodar na mão: GitHub → Actions → "Deploy VPS (infra e sites)" → Run workflow. Emergência: console web da Hostinger e `bash /srv/infra/atualiza.sh`.
  - Recriar a chave: `bash /srv/infra/deploy-chave.sh` no servidor e atualizar o secret nos repositórios.

## Histórico

| Data | Mudança |
| --- | --- |
| 27 nov 2026 | Ligação na aba Prospecção: botão Ligar, roteiro, resultados e ordem de contato da lista, sem mudar o funil |
| 19 nov 2026 | Deploy automático da VPS pelo GitHub Actions; checklist de cliente novo (modelo Mega Hair Marcela) |
| 18 nov 2026 | AbertoCore com várias empresas: perfil por segmento, convites, ficha do cabelo e manutenções; primeiro cliente (Mega Hair Marcela) |
| 17 nov 2026 | WhatsApp Cloud API: webhook com assinatura, envio de texto, status de entrega, tempo real no app; chatbot de menu com botões e lista; tela Atendimento automático (chatbot + IA) |
| 17 nov 2026 | Servidor próprio (fase 2): login, dados no servidor, cadastro de contatos, backup diário com aviso por e-mail |
| 16 nov 2026 | Primeira versão do protótipo: 7 telas, dados de exemplo, simulação ao vivo |
| 17 nov 2026 | Auditoria, briefing, proposta e contrato conectados ao contato do CRM; proposta e contrato gerados com um clique; novos módulos Gestão mensal do Google e Instagram profissional |
| 17 nov 2026 | Página de auditoria com nota, gráficos, perdas, pacote sugerido e impressão em PDF |
| 16 nov 2026 | Celular: funil sem texto de instrução, colunas com altura fixa e só os cards rolando dentro; ícones centralizados na barra de baixo |
| 16 nov 2026 | Celular: barra de baixo só com ícones; topo e busca se escondem ao rolar a lista (abas ficam fixas); filtro de origem com seleção múltipla num botão ao lado das abas |
| 16 nov 2026 | Celular: barra superior clara e fixa (sem o borrão do Safari), sem zoom ao digitar, barra de baixo mais compacta e escondida enquanto digita, avisos no topo |
| 16 nov 2026 | Janelas (modais) centralizadas no computador e como painel de baixo no celular; painel do contato com botões Fechar e Salvar |
| 16 nov 2026 | Celular: barra superior sólida na cor da marca; Produtos, Assistente de IA e Canais agrupados no botão de Configurações (engrenagem) no topo; produtos em cards |
| 16 nov 2026 | Nome AbertoCore, ícone da marca, navegação de app no celular, instalável na tela inicial, bloco `CONFIG` para reaproveitar com clientes |

## Servidor (fase 2, desde 17/11/2026)

- VPS Hostinger KVM 2 (Brasil), Ubuntu 26.04, Docker. Arquivos em `infra/`.
- `https://api.abertodigital.com`: PocketBase (banco, login e API), atrás do Caddy (HTTPS automático).
- Tabelas: `empresas`, `users` (com `empresa` e `papel`), `contatos`, `eventos`, `produtos`, `configuracoes`. Todas presas à empresa: cada usuário só vê e altera os dados da própria empresa (regras testadas).
- O app continua gravando no navegador; `core/nuvem.js` envia cada alteração ao servidor e baixa os dados ao abrir. Sem login, funciona como demonstração (só no navegador).
- Novo cliente: no painel `https://api.abertodigital.com/_/`, criar a empresa em `empresas` e o usuário em `users` ligado a ela.

## WhatsApp Cloud API e chatbot (fase 3, desde 17/11/2026)

- **Coleções (só superusuário):** `meta_app` (app_id, app_secret, verify_token, versao_api) e `canais` (empresa, phone_number_id, waba_id, numero, access_token, ativo). O token nunca vai para o navegador. `contatos.wa_id` guarda o número do WhatsApp do contato.
- **Rotas** (`infra/pocketbase/pb_hooks/whatsapp.pb.js` e `wa.js`):
  - `GET/POST /api/whatsapp/webhook`: verificação da Meta e recebimento, com conferência do `X-Hub-Signature-256`. Cria o contato se o número for novo e grava status (enviada, entregue, lida, falhou).
  - `GET /api/abertocore/whatsapp`: o app pergunta se a empresa tem número conectado.
  - `POST /api/abertocore/whatsapp/enviar`: envia texto pelo número da empresa do usuário logado. Avisa quando passou a janela de 24 horas.
  - Trava em `onRecordUpdateRequest(contatos)`: o app nunca apaga mensagens que só o servidor recebeu (união por `k`/`wa`).
- **Chatbot de menu:** configurado no app (`configuracoes.dados.bot`). Responde com botões (até 3), lista (4 a 9) ou texto numerado; `op_N` identifica a opção tocada. Opções podem passar para a equipe; quando a equipe responde, o robô fica quieto por `pausaHoras`. `0` ou `menu` traz o menu de volta.
- **Tempo real:** `core/nuvem.js` assina `contatos` pelo realtime do PocketBase (SSE) e junta as mensagens sem perder o rascunho digitado.
- **Meta:** portfólio Abertodigital (2323231835078676), app AbertoCore (2125617558075863, Provedor de Tecnologia), usuário do sistema `abertocore-servidor` com token sem validade. O app só recebe eventos reais depois de publicado, o que exige a verificação da empresa aprovada.
- **Testes locais:** `ABERTOCORE_GRAPH_BASE=http://127.0.0.1:9999 ./pocketbase serve` troca a API da Meta por um servidor de teste.
